import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Wallet, ArrowLeftRight, Send, Users, HeartHandshake,
  BadgeCheck, Star, LifeBuoy, Bell, Settings, LogOut, Menu, X,
  Search, ChevronDown, User, SlidersHorizontal, ShieldCheck, UserCog
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import notificationService from '../../services/notificationService';

const USER_NAV_ITEMS = [
  { label: 'Dashboard',     icon: LayoutDashboard, path: '/dashboard',     end: true },
  { label: 'Account',       icon: Wallet,          path: '/accounts' },
  { label: 'Transactions',  icon: ArrowLeftRight,  path: '/transactions' },
  { label: 'Transfer',      icon: Send,            path: '/transfer' },
  { label: 'Daret',         icon: Users,           path: '/darets' },
  { label: 'Cagnotte',      icon: HeartHandshake,  path: '/cagnottes' },
  { label: 'KYC',           icon: BadgeCheck,      path: '/kyc' },
  { label: 'Trust Score',   icon: Star,            path: '/trust-score' },
  { label: 'Tickets',       icon: LifeBuoy,        path: '/tickets' },
  { label: 'Notifications', icon: Bell,            path: '/notifications' },
];

const ADMIN_NAV_ITEMS = [
  { label: 'Admin Panel',   icon: ShieldCheck,     path: '/admin/dashboard', end: true },
  { label: 'Users',         icon: Users,           path: '/admin/users' },
  { label: 'Employees',     icon: UserCog,         path: '/admin/employees' },
  { label: 'KYC Reviews',    icon: BadgeCheck,      path: '/admin/kyc' },
  { label: 'Tickets',       icon: LifeBuoy,        path: '/tickets' },
  { label: 'Notifications', icon: Bell,            path: '/notifications' },
];

const EMPLOYEE_NAV_ITEMS = [
  { label: 'Dashboard',     icon: LayoutDashboard, path: '/dashboard',     end: true },
  { label: 'KYC Queue',     icon: BadgeCheck,      path: '/admin/kyc' },
  { label: 'Support Queue', icon: LifeBuoy,        path: '/tickets' },
  { label: 'Cagnottes',     icon: HeartHandshake,  path: '/cagnottes' },
  { label: 'Notifications', icon: Bell,            path: '/notifications' },
];

const LANGS = ['AR', 'FR', 'EN'];

// ── Sidebar nav link ──────────────────────────────────────────────────────────
const SidebarLink = ({ item, onNavigate }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'text-slate-400 hover:bg-white/5 hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'absolute left-0 w-0.5 h-5 rounded-r-full bg-emerald-400 transition-opacity duration-200',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
          />
          <Icon size={17} className="shrink-0" />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
};

// ── Sidebar content (shared between desktop + mobile drawer) ──────────────────
const SidebarContent = ({ user, logout, onNavigate }) => {
  const settingsPath = user?.role === 'admin'
    ? '/admin/settings'
    : user?.role === 'employee'
      ? '/employee/settings'
      : '/dashboard/settings';

  return (
  <div className="flex flex-col h-full">
    {/* Logo */}
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/50">
          <Wallet size={19} className="text-white" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-white tracking-tight leading-none">DigiBank</p>
          <p className="text-[9px] text-emerald-400 font-bold tracking-[0.22em] uppercase mt-0.5">
            System Bank
          </p>
        </div>
      </div>
    </div>

    {/* Nav */}
    <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-hide">
      <p className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">
        {user?.role === 'admin' ? 'Administration' : user?.role === 'employee' ? 'Staff Panel' : 'Navigation'}
      </p>
      {(user?.role === 'admin' 
          ? ADMIN_NAV_ITEMS 
          : user?.role === 'employee' 
            ? EMPLOYEE_NAV_ITEMS 
            : USER_NAV_ITEMS
      ).map(item => (
        <SidebarLink key={item.path} item={item} onNavigate={onNavigate} />
      ))}
    </nav>

    {/* Bottom */}
    <div className="p-3 border-t border-white/5 space-y-0.5">
      <NavLink
        to={settingsPath}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
            isActive
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'text-slate-400 hover:bg-white/5 hover:text-white',
          )
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={cn(
                'absolute left-0 w-0.5 h-5 rounded-r-full bg-emerald-400 transition-opacity duration-200',
                isActive ? 'opacity-100' : 'opacity-0',
              )}
            />
            <Settings size={17} className="shrink-0" />
            <span>Paramètres</span>
          </>
        )}
      </NavLink>
      <button
        onClick={logout}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
      >
        <LogOut size={17} className="shrink-0" />
        Déconnexion
      </button>
    </div>
  </div>
  );
};

// ── Main layout ───────────────────────────────────────────────────────────────
const DashboardLayout = ({ addToast }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [lang, setLang]                 = useState('FR');
  const [notifOpen, setNotifOpen]       = useState(false);
  const [profileOpen, setProfileOpen]   = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]   = useState(0);

  const notifRef   = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = e => {
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch notifications for topbar preview
  useEffect(() => {
    (async () => {
      try {
        const res    = await notificationService.getNotifications();
        const items  = Array.isArray(res?.notifications) ? res.notifications : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setNotifications(items.slice(0, 5));
        setUnreadCount(items.filter(n => !n.is_read).length);
      } catch { /* silent */ }
    })();
  }, []);

  const displayName = user?.first_name || user?.name?.split(' ')[0] || 'Utilisateur';
  const roleLabel   = user?.role === 'admin'    ? 'Administrateur'
                    : user?.role === 'employee'  ? 'Employé'
                    : 'Client Premium';
  const profilePath = user?.role === 'admin'
    ? '/admin/profile'
    : user?.role === 'employee'
      ? '/employee/profile'
      : '/dashboard/profile';
  const settingsPath = user?.role === 'admin'
    ? '/admin/settings'
    : user?.role === 'employee'
      ? '/employee/settings'
      : '/dashboard/settings';

  return (
    <div className="min-h-screen bg-bg-dark text-white font-sans selection:bg-emerald-500/30">

      {/* ── Desktop sidebar (fixed, always visible ≥ lg) ───────────────── */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 z-20 w-[260px] bg-bg-card border-r border-white/5 flex-col">
        <SidebarContent user={user} logout={logout} />
      </aside>

      {/* ── Mobile drawer ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              key="drawer"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-[260px] bg-bg-card border-r border-white/5 flex flex-col"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-3 p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
              <div className="p-6">
                <SidebarContent user={user} logout={logout} onNavigate={() => setSidebarOpen(false)} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main column ────────────────────────────────────────────────── */}
      <div className="lg:ml-[260px] flex flex-col min-h-screen">

        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 bg-bg-dark/80 backdrop-blur-xl border-b border-white/5 flex items-center px-4 lg:px-6 gap-3">

          {/* Hamburger (mobile only) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors shrink-0"
          >
            <Menu size={20} />
          </button>
          
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {user?.role === 'admin' ? 'Admin Mode' : user?.role === 'employee' ? 'Employee Mode' : 'Live Network'}
          </div>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-xs items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-emerald-500/40 transition-all">
            <Search size={15} className="text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="bg-transparent outline-none text-sm text-white placeholder:text-slate-500 w-full"
            />
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-500 font-mono shrink-0">
              ⌘K
            </span>
          </div>

          <div className="flex-1" />

          {/* Language switcher */}
          <div className="flex items-center gap-0.5 p-1 bg-white/5 rounded-lg border border-white/10">
            {LANGS.map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  'px-2 py-1 rounded-md text-[11px] font-bold transition-all',
                  lang === l
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-500 hover:text-slate-300',
                )}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Notifications bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => { setNotifOpen(p => !p); setProfileOpen(false); }}
              className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-[2px] border-bg-dark" />
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.13 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-bg-card border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <span className="text-sm font-semibold text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 bg-rose-500/15 text-rose-400 rounded-full font-bold">
                        {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-white/5 max-h-72 overflow-y-auto scrollbar-hide">
                    {notifications.length > 0 ? (
                      notifications.map((n, i) => (
                        <div
                          key={i}
                          className={cn(
                            'flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-white/[0.03]',
                            !n.is_read && 'bg-emerald-500/[0.04]',
                          )}
                        >
                          {!n.is_read && (
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          )}
                          <div className={cn('flex-1 min-w-0', n.is_read && 'pl-4')}>
                            <p className="text-xs font-medium text-white truncate">
                              {n.title || n.message || 'Notification'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {n.created_at
                                ? new Date(n.created_at).toLocaleDateString('fr-MA')
                                : ''}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center text-sm text-slate-500">
                        Aucune notification
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-2.5 border-t border-white/5">
                    <NavLink
                      to="/notifications"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    >
                      Voir toutes les notifications →
                    </NavLink>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-6 bg-white/10" />

          {/* Profile dropdown */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => { setProfileOpen(p => !p); setNotifOpen(false); }}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/5 transition-colors"
            >
              <Avatar name={displayName} src={user?.avatar} status="online" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-white leading-none">{displayName}</p>
                <p className="text-[10px] text-emerald-400 mt-0.5 font-bold tracking-wider uppercase">
                  {roleLabel}
                </p>
              </div>
              <ChevronDown size={13} className="text-slate-500 hidden sm:block ml-0.5" />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.13 }}
                  className="absolute right-0 top-full mt-2 w-52 bg-bg-card border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm font-semibold text-white truncate">
                      {user?.name || displayName}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{user?.email}</p>
                  </div>

                  <div className="py-1">
                    {[
                      { to: profilePath, icon: User,              label: 'Mon Profil' },
                      { to: settingsPath, icon: SlidersHorizontal, label: 'Paramètres' },
                    ].map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <item.icon size={15} />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>

                  <div className="border-t border-white/5 py-1">
                    <button
                      onClick={() => { setProfileOpen(false); logout(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut size={15} />
                      Déconnexion
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet context={{ addToast }} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
