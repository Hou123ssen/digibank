import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BadgeCheck, HeartHandshake, LifeBuoy, Clock,
  ChevronRight, TrendingUp, Star, Activity,
  CheckCircle2, XCircle, MessageSquare, UserCheck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '../../utils/cn';
import Badge from '../../components/ui/Badge';
import employeeService from '../../services/employeeService';
import { useAuth } from '../../context/AuthContext';

const PRIORITY_CONFIG = {
  low: { label: 'Faible', cls: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  medium: { label: 'Moyen', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  high: { label: 'Elevee', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  urgent: { label: 'Urgent', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

const SENTIMENT_CONFIG = {
  positive: { label: '+', cls: 'text-emerald-400' },
  neutral: { label: '-', cls: 'text-slate-400' },
  negative: { label: '!', cls: 'text-rose-400' },
};

const DEPARTMENT_LABELS = {
  kyc: 'KYC',
  tickets: 'Tickets',
  cagnotte: 'Cagnotte',
  audit: 'Audit',
  support: 'Support',
};

const fmtRel = d => {
  if (!d) return '-';
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
};

const asPercent = value => (Number.isFinite(Number(value)) ? `${Number(value)}%` : '0%');

const StatCard = ({ icon: Icon, color, label, value, link, loading }) => (
  <motion.div
    whileHover={{ y: -3 }}
    className="rounded-2xl bg-bg-card border border-white/5 p-5 flex flex-col gap-4 hover:border-white/10 transition-all"
  >
    <div className="flex items-center justify-between">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
        <Icon size={19} />
      </div>
      {link && (
        <Link to={link} className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 transition-colors">
          Voir <ChevronRight size={11} />
        </Link>
      )}
    </div>
    {loading ? (
      <div className="h-8 w-16 bg-white/5 animate-pulse rounded" />
    ) : (
      <div>
        <p className="text-3xl font-bold text-white font-mono">{value ?? 0}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    )}
  </motion.div>
);

const ACTIVITY_ICONS = {
  kyc_approved: { icon: CheckCircle2, color: 'bg-emerald-500/15 text-emerald-400' },
  kyc_rejected: { icon: XCircle, color: 'bg-rose-500/15 text-rose-400' },
  kyc_pending: { icon: BadgeCheck, color: 'bg-sky-500/15 text-sky-400' },
  kyc_needs_review: { icon: Clock, color: 'bg-amber-500/15 text-amber-400' },
  cagnotte_active: { icon: HeartHandshake, color: 'bg-pink-500/15 text-pink-400' },
  cagnotte_rejected: { icon: XCircle, color: 'bg-rose-500/15 text-rose-400' },
  cagnotte_pending: { icon: Clock, color: 'bg-amber-500/15 text-amber-400' },
  ticket_resolved: { icon: CheckCircle2, color: 'bg-emerald-500/15 text-emerald-400' },
  ticket_open: { icon: MessageSquare, color: 'bg-sky-500/15 text-sky-400' },
  ticket_in_progress: { icon: UserCheck, color: 'bg-violet-500/15 text-violet-400' },
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

const EmptyPanel = ({ children }) => (
  <div className="rounded-2xl bg-bg-card border border-white/5 p-8 text-center text-sm text-slate-500">
    {children}
  </div>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-bg-card px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs font-semibold text-white">{label}</p>
      {payload.map(item => (
        <p key={item.dataKey} className="text-[11px]" style={{ color: item.color }}>
          {item.name}: {item.value}
        </p>
      ))}
    </div>
  );
};

const AnalyticsCard = ({ label, value, sub, icon: Icon, color = 'text-emerald-400' }) => (
  <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="mt-0.5 text-[10px] text-slate-600">{sub}</p>
      </div>
      <Icon size={16} className={color} />
    </div>
    <p className={cn('mt-3 text-2xl font-bold font-mono', color)}>{value}</p>
  </div>
);

const ChartShell = ({ title, children, empty }) => (
  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
    <div className="mb-3 flex items-center justify-between">
      <p className="text-sm font-semibold text-white">{title}</p>
    </div>
    {empty ? (
      <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-white/10 text-sm text-slate-500">
        Aucune donnee disponible
      </div>
    ) : (
      <div className="h-56">
        {children}
      </div>
    )}
  </div>
);

const KycAnalyticsPanel = ({ loading, analytics }) => {
  const weekly = Array.isArray(analytics?.weekly_activity) ? analytics.weekly_activity : [];
  const breakdown = Array.isArray(analytics?.approval_breakdown) ? analytics.approval_breakdown : [];
  const performance = Array.isArray(analytics?.weekly_performance) ? analytics.weekly_performance : [];
  const hasWeeklyData = weekly.some(day => Number(day.reviewed || 0) > 0 || Number(day.approved || 0) > 0 || Number(day.rejected || 0) > 0);
  const hasBreakdown = breakdown.some(item => Number(item.count || 0) > 0);
  const hasPerformance = performance.some(day => Number(day.approval_rate || 0) > 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-white/5" />)}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="h-72 animate-pulse rounded-xl bg-white/5" />
          <div className="h-72 animate-pulse rounded-xl bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AnalyticsCard icon={BadgeCheck} label="KYC traites" value={analytics?.reviewed ?? 0} sub="cette semaine" />
        <AnalyticsCard icon={CheckCircle2} label="Approuves" value={analytics?.approved ?? 0} sub="dossiers valides" color="text-emerald-400" />
        <AnalyticsCard icon={XCircle} label="Rejetes" value={analytics?.rejected ?? 0} sub="dossiers refuses" color="text-rose-400" />
        <AnalyticsCard icon={TrendingUp} label="Approval rate" value={asPercent(analytics?.approval_rate)} sub="approbation" color="text-sky-400" />
        <AnalyticsCard icon={Clock} label="Temps moyen" value={analytics?.avg_processing_label ?? '0 min'} sub="traitement" color="text-amber-400" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartShell title="KYC traites par jour" empty={!hasWeeklyData}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar name="Traites" dataKey="reviewed" fill="#38bdf8" radius={[5, 5, 0, 0]} />
              <Bar name="Approuves" dataKey="approved" fill="#34d399" radius={[5, 5, 0, 0]} />
              <Bar name="Rejetes" dataKey="rejected" fill="#fb7185" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="KYC approuves vs rejetes" empty={!hasBreakdown}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdown}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="status" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar name="Dossiers" dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartShell title="Performance hebdomadaire" empty={!hasPerformance}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performance}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<ChartTooltip />} />
              <Line name="Approval rate %" type="monotone" dataKey="approval_rate" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Temps moyen de traitement" empty={!hasWeeklyData}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar name="Minutes" dataKey="avg_processing_minutes" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>
    </div>
  );
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const cardAnim = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const EmployeeDashboardPage = () => {
  const { user } = useAuth();
  const department = user?.role === 'admin' ? 'admin' : String(user?.department || '').trim().toLowerCase();
  const [stats, setStats] = useState({});
  const [performance, setPerformance] = useState({});
  const [analytics, setAnalytics] = useState({});
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      const [statsR, perfR, analyticsR, actR] = await Promise.allSettled([
        employeeService.getDashboardStats(),
        employeeService.getMyPerformance(),
        employeeService.getAnalytics(),
        employeeService.getActivityFeed(),
      ]);

      if (!mounted) return;

      const nextStats = statsR.status === 'fulfilled' ? statsR.value : {};
      const nextPerformance = perfR.status === 'fulfilled' ? perfR.value : {};
      const nextAnalytics = analyticsR.status === 'fulfilled' ? analyticsR.value : {};
      const nextActivity = actR.status === 'fulfilled' ? actR.value : nextStats.activity ?? [];

      setStats(nextStats || {});
      setPerformance(nextPerformance || {});
      setAnalytics(nextAnalytics || {});
      setActivity(Array.isArray(nextActivity) ? nextActivity.slice(0, 8) : []);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [user?.department, user?.role]);

  const cards = useMemo(() => {
    if (department === 'kyc') {
      return [
        { icon: BadgeCheck, color: 'bg-sky-500/15 text-sky-400', label: 'KYC en attente', value: stats.pending_kyc ?? 0, link: '/employee/kyc' },
        { icon: Clock, color: 'bg-amber-500/15 text-amber-400', label: 'A verifier', value: stats.needs_review ?? 0, link: '/employee/kyc' },
        { icon: CheckCircle2, color: 'bg-emerald-500/15 text-emerald-400', label: 'Approuves aujourd hui', value: stats.approved_today ?? 0, link: '/employee/kyc' },
        { icon: XCircle, color: 'bg-rose-500/15 text-rose-400', label: 'Rejetes aujourd hui', value: stats.rejected_today ?? 0, link: '/employee/kyc' },
      ];
    }

    if (department === 'tickets') {
      return [
        { icon: LifeBuoy, color: 'bg-violet-500/15 text-violet-400', label: 'Tickets ouverts', value: stats.open_tickets ?? 0, link: '/employee/tickets' },
        { icon: Star, color: 'bg-amber-500/15 text-amber-400', label: 'Mes tickets assignes', value: stats.assigned_tickets ?? 0, link: '/employee/tickets' },
        { icon: Clock, color: 'bg-rose-500/15 text-rose-400', label: 'Tickets urgents', value: stats.urgent_tickets ?? 0, link: '/employee/tickets' },
        { icon: CheckCircle2, color: 'bg-emerald-500/15 text-emerald-400', label: 'Tickets resolus', value: stats.resolved_tickets ?? 0, link: '/employee/tickets' },
      ];
    }

    if (department === 'cagnotte') {
      return [
        { icon: HeartHandshake, color: 'bg-pink-500/15 text-pink-400', label: 'Cagnottes a valider', value: stats.pending_cagnotte ?? 0, link: '/employee/cagnottes' },
        { icon: CheckCircle2, color: 'bg-emerald-500/15 text-emerald-400', label: 'Demandes approuvees', value: stats.approved_requests ?? 0, link: '/employee/cagnottes' },
        { icon: XCircle, color: 'bg-rose-500/15 text-rose-400', label: 'Demandes rejetees', value: stats.rejected_requests ?? 0, link: '/employee/cagnottes' },
        { icon: Activity, color: 'bg-sky-500/15 text-sky-400', label: 'Dons aujourd hui', value: stats.donation_activity ?? 0, link: '/employee/cagnottes' },
      ];
    }

    return [];
  }, [department, stats]);

  const performanceCards = useMemo(() => {
    if (department === 'tickets') {
      return [
        { label: 'Tickets resolus', value: performance.resolved_this_week ?? 0, sub: 'cette semaine', color: 'text-emerald-400' },
        { label: 'Tps de reponse moy.', value: performance.avg_response_time ?? '0 min', sub: 'premiere reponse', color: 'text-sky-400' },
        { label: 'Taux de satisfaction', value: asPercent(performance.satisfaction_rate), sub: 'clients satisfaits', color: 'text-amber-400' },
      ];
    }

    if (department === 'kyc') {
      return [
        { label: 'KYC traites', value: performance.processed_this_week ?? 0, sub: 'cette semaine', color: 'text-emerald-400' },
        { label: 'Taux approbation', value: asPercent(performance.approval_rate), sub: 'dossiers approuves', color: 'text-sky-400' },
      ];
    }

    if (department === 'cagnotte') {
      return [
        { label: 'Demandes traitees', value: performance.processed_this_week ?? 0, sub: 'cette semaine', color: 'text-emerald-400' },
        { label: 'Taux approbation', value: asPercent(performance.approval_rate), sub: 'demandes approuvees', color: 'text-sky-400' },
      ];
    }

    return [];
  }, [department, performance]);

  const tickets = Array.isArray(stats.recent_tickets) ? stats.recent_tickets : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
        <p className="text-sm text-slate-400 mt-1">
          {DEPARTMENT_LABELS[department] ? `Vue ${DEPARTMENT_LABELS[department]} et votre activite` : 'Vue de votre activite'}
        </p>
      </div>

      {cards.length > 0 ? (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(card => (
            <motion.div key={card.label} variants={cardAnim}>
              <StatCard {...card} loading={loading} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <EmptyPanel>Aucune donnee de tableau de bord pour ce departement.</EmptyPanel>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {department === 'tickets' && (
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
                    {['Ref', 'Sujet', 'Priorite', 'Sentiment', 'Statut'].map(h => (
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
                      const pri = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.low;
                      const sent = SENTIMENT_CONFIG[t.sentiment] || SENTIMENT_CONFIG.neutral;
                      const st = { open: 'info', in_progress: 'warning', resolved: 'success', closed: 'neutral' }[t.status] || 'neutral';

                      return (
                        <tr
                          key={t.id}
                          onClick={() => { window.location.href = `/employee/tickets/${t.id}`; }}
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
                              {t.title || t.subject}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn('text-xs border rounded-full px-2.5 py-1', pri.cls)}>{pri.label}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn('text-xs font-bold', sent.cls)}>{sent.label}</span>
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
        )}

        <div className={cn(department === 'tickets' ? 'lg:col-span-4' : 'lg:col-span-12', 'rounded-2xl bg-bg-card border border-white/5 p-5 space-y-5')}>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Ma performance</h2>
            <span className="ml-auto text-[10px] text-slate-500">Cette semaine</span>
          </div>

          {department === 'kyc' ? (
            <KycAnalyticsPanel loading={loading} analytics={analytics} />
          ) : loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-14 bg-white/5 animate-pulse rounded-xl" />)}
            </div>
          ) : performanceCards.length > 0 ? (
            <div className="space-y-3">
              {performanceCards.map(m => (
                <div key={m.label} className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-slate-400">{m.label}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{m.sub}</p>
                  </div>
                  <p className={cn('text-xl font-bold font-mono', m.color)}>{m.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-500">Aucune performance disponible</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-bg-card border border-white/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-white">Activite recente</h2>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 animate-pulse rounded" />)}
          </div>
        ) : activity.length > 0 ? (
          activity.map((item, i) => <ActivityItem key={`${item.type}-${item.created_at}-${i}`} item={item} />)
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500">Aucune activite recente</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;
