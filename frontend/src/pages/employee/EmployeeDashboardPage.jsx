import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BadgeCheck, HeartHandshake, LifeBuoy, Clock,
  ChevronRight, Zap, TrendingUp, Star, Activity,
  CheckCircle2, XCircle, MessageSquare, UserCheck,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import Badge from '../../components/ui/Badge';
import kycService from '../../services/kycService';
import cagnotteService from '../../services/cagnotteService';
import ticketService from '../../services/ticketService';
import employeeService from '../../services/employeeService';

// ── Config maps ───────────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  low:    { label: 'Faible',  cls: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  medium: { label: 'Moyen',   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  high:   { label: 'Élevée',  cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  urgent: { label: 'Urgent',  cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

const SENTIMENT_CONFIG = {
  positive: { emoji: '😊', cls: 'text-emerald-400' },
  neutral:  { emoji: '😐', cls: 'text-slate-400'   },
  negative: { emoji: '😞', cls: 'text-rose-400'    },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—';
const fmtRel  = d => {
  if (!d) return '—';
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 3600)   return `${Math.floor(diff / 60)} min`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, color, label, value, link, loading }) => (
  <motion.div
    whileHover={{ y: -3 }}
    className="rounded-2xl bg-bg-card border border-white/5 p-5 flex flex-col gap-4 hover:border-white/10 transition-all"
  >
    <div className="flex items-center justify-between">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
        <Icon size={19} />
      </div>
      <Link to={link} className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 transition-colors">
        Voir <ChevronRight size={11} />
      </Link>
    </div>
    {loading ? (
      <div className="h-8 w-16 bg-white/5 animate-pulse rounded" />
    ) : (
      <div>
        <p className="text-3xl font-bold text-white font-mono">{value ?? '—'}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    )}
  </motion.div>
);

// ── Activity item ─────────────────────────────────────────────────────────────
const ACTIVITY_ICONS = {
  kyc_approved:       { icon: CheckCircle2, color: 'bg-emerald-500/15 text-emerald-400' },
  kyc_rejected:       { icon: XCircle,      color: 'bg-rose-500/15 text-rose-400'       },
  cagnotte_approved:  { icon: HeartHandshake, color: 'bg-pink-500/15 text-pink-400'     },
  cagnotte_rejected:  { icon: XCircle,      color: 'bg-rose-500/15 text-rose-400'       },
  ticket_replied:     { icon: MessageSquare, color: 'bg-sky-500/15 text-sky-400'        },
  ticket_resolved:    { icon: CheckCircle2, color: 'bg-emerald-500/15 text-emerald-400' },
  ticket_assigned:    { icon: UserCheck,    color: 'bg-violet-500/15 text-violet-400'   },
};

const ActivityItem = ({ item }) => {
  const cfg = ACTIVITY_ICONS[item.type] || { icon: Activity, color: 'bg-white/10 text-slate-400' };
  const Icon = cfg.icon;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', cfg.color)}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium">{item.description}</p>
        {item.subject && <p className="text-xs text-slate-500 truncate mt-0.5">{item.subject}</p>}
      </div>
      <span className="text-[10px] text-slate-600 shrink-0">{fmtRel(item.created_at)}</span>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const stagger   = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const cardAnim  = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const EmployeeDashboardPage = () => {
  const [stats,       setStats]       = useState({});
  const [tickets,     setTickets]     = useState([]);
  const [performance, setPerformance] = useState(null);
  const [activity,    setActivity]    = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [statsR, kycR, cagR, tixR, perfR, actR] = await Promise.allSettled([
        employeeService.getDashboardStats(),
        kycService.getPendingKyc(),
        cagnotteService.getPendingCagnottes(),
        ticketService.getEmployeeTickets(),
        employeeService.getMyPerformance(),
        employeeService.getActivityFeed(),
      ]);

      const rawStats = statsR.status === 'fulfilled' ? statsR.value : {};
      const kyc      = kycR.status  === 'fulfilled' ? kycR.value  : [];
      const cag      = cagR.status  === 'fulfilled' ? cagR.value  : [];
      const tix      = tixR.status  === 'fulfilled' ? tixR.value  : [];

      setStats({
        pendingKyc:      rawStats.pending_kyc      ?? kyc.length,
        pendingCagnotte: rawStats.pending_cagnotte ?? cag.length,
        openTickets:     rawStats.open_tickets     ?? tix.filter(t => t.status === 'open').length,
        myTickets:       rawStats.my_tickets       ?? tix.filter(t => t.assigned_to_me).length,
      });

      const sorted = [...tix].sort((a, b) => {
        const ord = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (ord[a.priority] ?? 4) - (ord[b.priority] ?? 4);
      }).slice(0, 5);
      setTickets(sorted);

      if (perfR.status === 'fulfilled') setPerformance(perfR.value);
      if (actR.status  === 'fulfilled') setActivity(actR.value.slice(0, 8));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
        <p className="text-sm text-slate-400 mt-1">Vue d'ensemble des files d'attente et de votre activité</p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <motion.div
        variants={stagger} initial="hidden" animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { icon: BadgeCheck,    color: 'bg-sky-500/15 text-sky-400',      label: 'KYC en attente',        key: 'pendingKyc',      link: '/employee/kyc' },
          { icon: HeartHandshake,color: 'bg-pink-500/15 text-pink-400',    label: 'Cagnottes à valider',   key: 'pendingCagnotte', link: '/employee/cagnottes' },
          { icon: LifeBuoy,      color: 'bg-violet-500/15 text-violet-400',label: 'Tickets ouverts',       key: 'openTickets',     link: '/employee/tickets' },
          { icon: Star,          color: 'bg-amber-500/15 text-amber-400',  label: 'Mes tickets assignés',  key: 'myTickets',       link: '/employee/tickets' },
        ].map(c => (
          <motion.div key={c.key} variants={cardAnim}>
            <StatCard {...c} value={stats[c.key]} loading={loading} />
          </motion.div>
        ))}
      </motion.div>

      {/* ── Row 2: Ticket queue + Performance ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Ticket queue preview (col 8) */}
        <div className="lg:col-span-8 rounded-2xl bg-bg-card border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <LifeBuoy size={16} className="text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Tickets urgents</h2>
            </div>
            <Link to="/employee/tickets" className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5">
              Voir tout <ChevronRight size={11} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['Réf', 'Sujet', 'Priorité', 'Sentiment', 'Statut'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {[3, 8, 3, 3, 3].map((w, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className={`h-3 bg-white/5 animate-pulse rounded w-${w}/12`} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : tickets.length > 0 ? (
                  tickets.map(t => {
                    const pri  = PRIORITY_CONFIG[t.priority]  || PRIORITY_CONFIG.low;
                    const sent = SENTIMENT_CONFIG[t.sentiment] || SENTIMENT_CONFIG.neutral;
                    const st   = { open: 'info', in_progress: 'warning', resolved: 'success', closed: 'neutral' }[t.status] || 'neutral';
                    return (
                      <tr
                        key={t.id}
                        onClick={() => window.location.href = `/employee/tickets/${t.id}`}
                        className={cn(
                          'border-b border-white/5 cursor-pointer transition-colors group',
                          t.priority === 'urgent' ? 'hover:bg-rose-500/[0.04]' : 'hover:bg-white/[0.02]',
                        )}
                      >
                        <td className="px-4 py-3.5 font-mono text-xs text-emerald-400 font-bold">
                          {t.reference || `#${t.id}`}
                        </td>
                        <td className="px-4 py-3.5 max-w-[180px]">
                          <p className="text-sm text-white truncate group-hover:text-emerald-400 transition-colors">
                            {t.subject}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn('text-xs border rounded-full px-2.5 py-1', pri.cls)}>{pri.label}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn('text-xs', sent.cls)}>{sent.emoji}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant={st}>{t.status?.replace('_', ' ')}</Badge>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">
                      Aucun ticket en attente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* My performance (col 4) */}
        <div className="lg:col-span-4 rounded-2xl bg-bg-card border border-white/5 p-5 space-y-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Ma performance</h2>
            <span className="ml-auto text-[10px] text-slate-500">Cette semaine</span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-14 bg-white/5 animate-pulse rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Tickets résolus',    value: performance?.resolved_this_week ?? '—',  sub: 'cette semaine',    color: 'text-emerald-400' },
                { label: 'Tps de réponse moy.', value: performance?.avg_response_time  ?? '—',  sub: 'première réponse', color: 'text-sky-400'    },
                { label: 'Taux de satisfaction', value: performance?.satisfaction_rate  ? `${performance.satisfaction_rate}%` : '—', sub: 'clients satisfaits', color: 'text-amber-400' },
              ].map(m => (
                <div key={m.label} className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-slate-400">{m.label}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{m.sub}</p>
                  </div>
                  <p className={cn('text-xl font-bold font-mono', m.color)}>{m.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Activity feed ────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-bg-card border border-white/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-white">Activité récente</h2>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 animate-pulse rounded" />)}
          </div>
        ) : activity.length > 0 ? (
          activity.map((item, i) => <ActivityItem key={i} item={item} />)
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500">Aucune activité récente</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;
