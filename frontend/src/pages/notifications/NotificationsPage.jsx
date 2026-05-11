import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  MoreVertical, 
  Trash2, 
  Eye, 
  Search, 
  Filter,
  BadgeCheck,
  Users,
  LifeBuoy,
  Star,
  HeartHandshake,
  Wallet,
  ArrowRight,
  Clock,
  ChevronRight,
  Mail,
  AlertTriangle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import notificationService from '../../services/notificationService';
import { cn } from '../../utils/cn';

const TABS = [
  { id: 'all',     label: 'Tout',      icon: Bell },
  { id: 'unread',  label: 'Non lus',   icon: Mail },
  { id: 'kyc',     label: 'KYC',       icon: BadgeCheck },
  { id: 'daret',    label: 'Daret',     icon: Users },
  { id: 'tickets',  label: 'Tickets',   icon: LifeBuoy },
  { id: 'trust',    label: 'Trust',     icon: Star },
  { id: 'cagnotte', label: 'Cagnotte', icon: HeartHandshake },
];

const NotificationsPage = ({ addToast }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await notificationService.getNotifications();
      // Backend returns { notifications: [...] }
      const items = res?.notifications || res?.data || res || [];
      setNotifications(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Impossible de charger les notifications.');
      addToast?.('Impossible de charger les notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isRead = (n) => n.is_read || !!n.read_at;

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: n.read_at || new Date().toISOString() } : n));
    } catch (err) {
      console.error('Error marking as read:', err);
      addToast?.('Impossible de marquer la notification comme lue', 'error');
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !isRead(n)).map(n => n.id);
    if (unreadIds.length === 0) return;

    try {
      // No bulk endpoint, so we iterate
      await Promise.all(unreadIds.map(id => notificationService.markAsRead(id)));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: n.read_at || new Date().toISOString() })));
      addToast?.('Toutes les notifications ont été marquées comme lues', 'success');
    } catch (err) {
      console.error('Error marking all as read:', err);
      addToast?.('Impossible de marquer toutes les notifications comme lues', 'error');
    }
  };

  const getNotificationIcon = (n) => {
    const text = (n.title + n.message).toLowerCase();
    if (text.includes('kyc')) return { icon: BadgeCheck, color: 'bg-blue-500/20 text-blue-400' };
    if (text.includes('daret')) return { icon: Users, color: 'bg-emerald-500/20 text-emerald-400' };
    if (text.includes('ticket')) return { icon: LifeBuoy, color: 'bg-purple-500/20 text-purple-400' };
    if (text.includes('trust')) return { icon: Star, color: 'bg-amber-500/20 text-amber-400' };
    if (text.includes('cagnotte')) return { icon: HeartHandshake, color: 'bg-rose-500/20 text-rose-400' };
    if (text.includes('virement') || text.includes('transfer')) return { icon: Wallet, color: 'bg-teal-500/20 text-teal-400' };
    
    switch(n.type) {
      case 'warning': return { icon: AlertTriangle, color: 'bg-amber-500/20 text-amber-400' };
      case 'success': return { icon: CheckCheck, color: 'bg-emerald-500/20 text-emerald-400' };
      default: return { icon: Info, color: 'bg-sky-500/20 text-sky-400' };
    }
  };

  const getRelatedRoute = (n) => {
    const text = (n.title + n.message).toLowerCase();
    if (text.includes('kyc')) return '/kyc';
    if (text.includes('daret')) return '/darets';
    if (text.includes('ticket')) return '/tickets';
    if (text.includes('trust')) return '/trust-score';
    if (text.includes('cagnotte')) return '/cagnottes';
    if (text.includes('virement') || text.includes('transfer')) return '/transactions';
    return null;
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchesSearch = (n.title + n.message).toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (activeTab === 'all') return true;
      if (activeTab === 'unread') return !isRead(n);
      
      const text = (n.title + n.message).toLowerCase();
      return text.includes(activeTab);
    });
  }, [notifications, activeTab, searchQuery]);

  const groupNotifications = (items) => {
    const groups = {
      "Aujourd'hui": [],
      "Hier": [],
      "Cette semaine": [],
      "Plus tôt": [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    items.forEach(n => {
      const date = new Date(n.created_at);
      if (date >= today) groups["Aujourd'hui"].push(n);
      else if (date >= yesterday) groups["Hier"].push(n);
      else if (date >= lastWeek) groups["Cette semaine"].push(n);
      else groups["Plus tôt"].push(n);
    });

    return Object.entries(groups).filter(([_, list]) => list.length > 0);
  };

  const grouped = groupNotifications(filteredNotifications);

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const diff = (new Date() - date) / 1000;
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const handleNotificationClick = (n) => {
    if (!isRead(n)) markAsRead(n.id);
    const route = getRelatedRoute(n);
    if (route) navigate(route);
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <PageHeader 
        title="Notifications" 
        subtitle="Restez informé des activités de votre compte DigiBank."
        breadcrumbs={["Accueil", "Notifications"]}
        actions={
          <Button 
            variant="secondary" 
            size="sm" 
            leftIcon={CheckCheck}
            onClick={markAllAsRead}
            disabled={notifications.every(n => isRead(n))}
          >
            Tout marquer comme lu
          </Button>
        }
      />

      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5 overflow-x-auto no-scrollbar max-w-full">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
                  activeTab === tab.id 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={15} />
            <input 
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="space-y-10">
          {loading ? (
            <div className="space-y-8 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="h-4 w-24 bg-white/5 rounded" />
                  <div className="space-y-2">
                    {[...Array(2)].map((_, j) => <div key={j} className="h-20 bg-white/5 rounded-2xl" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : grouped.length > 0 ? (
            grouped.map(([title, items]) => (
              <div key={title} className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-2">{title}</h3>
                <div className="space-y-2">
                  {items.map(n => {
                    const { icon: Icon, color } = getNotificationIcon(n);
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          'group relative flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer',
                          isRead(n)
                            ? 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03] hover:border-white/10'
                            : 'bg-emerald-500/[0.03] border-emerald-500/20 hover:bg-emerald-500/[0.05] hover:border-emerald-500/30'
                        )}
                        onClick={() => handleNotificationClick(n)}
                      >
                        {/* Left Icon */}
                        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110', color)}>
                          <Icon size={20} />
                        </div>

                        {/* Middle Content */}
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className={cn('text-sm truncate transition-colors', isRead(n) ? 'text-slate-200' : 'text-white font-bold')}>
                              {n.title}
                            </h4>
                            {!isRead(n) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1 group-hover:text-slate-400 transition-colors">{n.message}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Clock size={10} className="text-slate-600" />
                            <span className="text-[10px] text-slate-600 font-medium uppercase tracking-wider">{formatTime(n.created_at)}</span>
                          </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === n.id ? null : n.id); }}
                            className="p-2 text-slate-600 hover:text-white hover:bg-white/5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          <ChevronRight size={16} className="text-slate-700 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                        </div>

                        {/* Popover Menu */}
                        <AnimatePresence>
                          {menuOpenId === n.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); }} />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                className="absolute right-12 top-4 z-50 w-48 bg-bg-card border border-white/10 rounded-xl shadow-2xl py-1 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {!isRead(n) && (
                                  <button
                                    onClick={() => { markAsRead(n.id); setMenuOpenId(null); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                  >
                                    <Eye size={14} /> Marquer comme lu
                                  </button>
                                )}
                                <button 
                                  onClick={() => { /* Not implemented on backend */ setMenuOpenId(null); }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                                >
                                  <Trash2 size={14} /> Supprimer
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="py-24 text-center space-y-6">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                <Bell size={40} className="text-slate-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Vous êtes à jour ! 🎉</h3>
                <p className="text-sm text-slate-500">Aucune notification ne correspond à vos critères.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => { setActiveTab('all'); setSearchQuery(''); }}>Voir toutes les notifications</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
