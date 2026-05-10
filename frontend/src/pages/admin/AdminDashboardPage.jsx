import React, { useState, useEffect, useRef } from 'react';
import {
  Users, UserPlus, Target, HeartHandshake, Activity,
  Download, TrendingUp, ArrowUpRight,
  ShieldCheck, AlertTriangle, CheckCircle2, Info
} from 'lucide-react';
import { motion, useInView } from 'framer-motion';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatCard from '../../components/admin/StatCard';
import adminService from '../../services/adminService';
import { cn } from '../../utils/cn';

/* ── SVG Line Chart ──────────────────────────────────────────────── */
const LineChart = ({ data = [], color = '#8b5cf6' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const pointsData = data.map(item => Number(typeof item === 'object' ? item.count : item) || 0);
  if (!pointsData.length) return null;
  const labels = data.map(item => {
    if (!item || typeof item !== 'object' || !item.date) return '';

    return new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  });

  const W = 400, H = 120, PAD = 8;
  const min = Math.min(...pointsData);
  const max = Math.max(...pointsData);
  const range = max - min || 1;

  const pts = pointsData.map((v, i) => ({
    x: PAD + (pointsData.length === 1 ? 0.5 : i / (pointsData.length - 1)) * (W - PAD * 2),
    y: H - PAD - ((v - min) / range) * (H - PAD * 2),
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const areaPath = [
    ...pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    `L ${pts[pts.length - 1].x.toFixed(1)} ${H}`,
    `L ${pts[0].x.toFixed(1)} ${H}`,
    'Z',
  ].join(' ');

  const last = pts[pts.length - 1];

  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={PAD} y1={H * f} x2={W - PAD} y2={H * f}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}

        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill="url(#lineGrad)"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
        />

        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : {}}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />

        {/* Last point dot */}
        <motion.circle
          cx={last.x} cy={last.y} r="4"
          fill={color}
          initial={{ scale: 0, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : {}}
          transition={{ delay: 1.2 }}
        />
        <circle cx={last.x} cy={last.y} r="8" fill={color} opacity="0.15" />
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between mt-1 px-2">
        {pointsData.map((_, i) => (
          <span key={i} className="text-[9px] text-slate-600 font-mono">
            {i === 0 || i === pointsData.length - 1 || i % 7 === 0 ? labels[i] : ''}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ── Animated Donut ──────────────────────────────────────────────── */
const DonutChart = ({ segments, centerLabel, centerSub }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const circumference = 2 * Math.PI * 16; // r=16

  let offset = 0;
  const arcs = segments.map(seg => {
    const dash = (seg.pct / 100) * circumference;
    const gap  = circumference - dash;
    const arc  = { ...seg, dash, gap, offset: -offset };
    offset += dash;
    return arc;
  });

  return (
    <div ref={ref} className="relative w-36 h-36 shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" />
        {arcs.map((arc, i) => (
          <motion.circle
            key={i}
            cx="18" cy="18" r="16"
            fill="none"
            stroke={arc.color}
            strokeWidth="3.5"
            strokeLinecap="butt"
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={arc.offset}
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={inView ? { strokeDasharray: `${arc.dash} ${arc.gap}` } : {}}
            transition={{ duration: 0.9, delay: i * 0.15, ease: 'easeOut' }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white leading-none">{centerLabel}</span>
        <span className="text-[8px] text-slate-500 uppercase tracking-widest mt-0.5">{centerSub}</span>
      </div>
    </div>
  );
};

/* ── Bar Progress Row ──────────────────────────────────────────────── */
const BarRow = ({ label, val, color }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-mono font-bold text-white">{val}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={inView ? { width: `${val}%` } : {}}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

/* ── Event type config ─────────────────────────────────────────────── */
const EVENT_CONFIG = {
  info:    { icon: Info,          bg: 'bg-blue-500/10',   text: 'text-blue-400',   dot: 'bg-blue-500' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-500/10',  text: 'text-amber-400',  dot: 'bg-amber-500' },
  success: { icon: CheckCircle2,  bg: 'bg-emerald-500/10',text: 'text-emerald-400',dot: 'bg-emerald-500' },
  danger:  { icon: ShieldCheck,   bg: 'bg-rose-500/10',   text: 'text-rose-400',   dot: 'bg-rose-500' },
};

const EMPTY_DASHBOARD_STATS = {
  total_users: 0,
  employees_count: 0,
  active_darets: 0,
  active_cagnottes: 0,
  transactions_today: 0,
  user_growth: [],
  transaction_volume: {
    transfers: 0,
    deposits: 0,
    withdrawals: 0,
    daret_payments: 0,
    cagnotte_donations: 0,
  },
  kyc_distribution: {
    approved: 0,
    pending: 0,
    needs_review: 0,
    rejected: 0,
    not_submitted: 0,
  },
  trust_level_distribution: {
    excellent: 0,
    trusted: 0,
    normal: 0,
    risky: 0,
  },
  system_events: [],
};

/* ── Main Component ─────────────────────────────────────────────────── */
const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminService.getDashboardStats();
      setStats({ ...EMPTY_DASHBOARD_STATS, ...(data || {}) });
    } catch {
      setStats(EMPTY_DASHBOARD_STATS);
      setError('Impossible de charger les statistiques du tableau de bord.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-32 bg-white/5 rounded-3xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-white/5 rounded-3xl" />
          <div className="h-72 bg-white/5 rounded-3xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-60 bg-white/5 rounded-3xl" />
          <div className="h-60 bg-white/5 rounded-3xl" />
        </div>
        <div className="h-80 bg-white/5 rounded-3xl" />
      </div>
    );
  }

  const safeStats = { ...EMPTY_DASHBOARD_STATS, ...(stats || {}) };
  const kycDistribution = { ...EMPTY_DASHBOARD_STATS.kyc_distribution, ...(safeStats.kyc_distribution || {}) };
  const trustDistribution = { ...EMPTY_DASHBOARD_STATS.trust_level_distribution, ...(safeStats.trust_level_distribution || {}) };
  const transactionVolume = { ...EMPTY_DASHBOARD_STATS.transaction_volume, ...(safeStats.transaction_volume || {}) };
  const systemEvents = Array.isArray(safeStats.system_events) ? safeStats.system_events : [];
  const kycTotal = Object.values(kycDistribution).reduce((a, b) => a + Number(b || 0), 0);
  const trustTotal = Object.values(trustDistribution).reduce((a, b) => a + Number(b || 0), 0);
  const volumeTotal = Object.values(transactionVolume).reduce((a, b) => a + Number(b || 0), 0);
  const growthTotal = (safeStats.user_growth || []).reduce((sum, item) => sum + Number(item?.count || 0), 0);
  const pct = (value, total) => total > 0 ? Math.round((Number(value || 0) / total) * 100) : 0;

  const kycSegs = [
    { pct: pct(kycDistribution.approved, kycTotal), color: '#10b981', label: 'Approved', value: kycDistribution.approved },
    { pct: pct(kycDistribution.pending, kycTotal), color: '#3b82f6', label: 'Pending', value: kycDistribution.pending },
    { pct: pct(kycDistribution.needs_review, kycTotal), color: '#f59e0b', label: 'Needs Review', value: kycDistribution.needs_review },
    { pct: pct(kycDistribution.rejected, kycTotal), color: '#f43f5e', label: 'Rejected', value: kycDistribution.rejected },
    { pct: pct(kycDistribution.not_submitted, kycTotal), color: '#475569', label: 'Not Submitted', value: kycDistribution.not_submitted },
  ];

  const trustSegs = [
    { pct: pct(trustDistribution.excellent, trustTotal), color: '#a855f7', label: 'Excellent', value: trustDistribution.excellent },
    { pct: pct(trustDistribution.trusted, trustTotal), color: '#10b981', label: 'Trusted', value: trustDistribution.trusted },
    { pct: pct(trustDistribution.normal, trustTotal), color: '#f59e0b', label: 'Normal', value: trustDistribution.normal },
    { pct: pct(trustDistribution.risky, trustTotal), color: '#f43f5e', label: 'Risky', value: trustDistribution.risky },
  ];

  const kycApprovedPct = pct(kycDistribution.approved, kycTotal);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Administration Dashboard"
        subtitle="Vue d'ensemble des opérations et de la croissance de DigiBank."
        breadcrumbs={['Admin', 'Dashboard']}
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" leftIcon={Download}>Exporter</Button>
            <Button variant="primary" size="sm" leftIcon={Activity}>Rapport Live</Button>
          </div>
        }
      />

      {error && (
        <Card className="p-4 border-rose-500/20 bg-rose-500/[0.04]">
          <p className="text-sm text-rose-300">{error}</p>
        </Card>
      )}

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { title: 'Total Users',       value: safeStats.total_users.toLocaleString(),       icon: Users,         color: 'blue',   variant: 'A' },
          { title: 'Employees',          value: safeStats.employees_count.toLocaleString(),   icon: UserPlus,      color: 'purple', variant: 'A' },
          { title: 'Active Darets',      value: safeStats.active_darets.toLocaleString(),     icon: Target,        color: 'emerald',variant: 'A' },
          { title: 'Active Cagnottes',   value: safeStats.active_cagnottes.toLocaleString(),  icon: HeartHandshake,color: 'rose',   variant: 'A' },
          { title: "Transactions Today", value: safeStats.transactions_today.toLocaleString(), icon: Activity,      color: 'amber',  variant: 'A' },
        ].map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <StatCard {...c} />
          </motion.div>
        ))}
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line chart — user growth */}
        <Card className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-white">User Growth</h3>
              <p className="text-xs text-slate-500 mt-0.5">Last 30 days signups</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full">
              <TrendingUp size={11} className="text-violet-400" />
              <span className="text-[10px] font-bold text-violet-400">{growthTotal.toLocaleString()}</span>
            </div>
          </div>
          <LineChart data={safeStats.user_growth || []} color="#8b5cf6" />
        </Card>

        {/* Horizontal bar progress — transaction volume */}
        <Card className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Transaction Volume</h3>
              <p className="text-xs text-slate-500 mt-0.5">Distribution by operation type</p>
            </div>
            <button className="px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500 border border-white/5 bg-white/5">Weekly</button>
          </div>
          <div className="space-y-4 pt-2">
            {[
              { label: 'Transfers',          val: pct(transactionVolume.transfers, volumeTotal), color: 'bg-emerald-500' },
              { label: 'Deposits',           val: pct(transactionVolume.deposits, volumeTotal), color: 'bg-blue-500' },
              { label: 'Withdrawals',        val: pct(transactionVolume.withdrawals, volumeTotal), color: 'bg-amber-500' },
              { label: 'Daret Payments',     val: pct(transactionVolume.daret_payments, volumeTotal), color: 'bg-purple-500' },
              { label: 'Cagnotte Donations', val: pct(transactionVolume.cagnotte_donations, volumeTotal), color: 'bg-rose-500' },
            ].map(t => <BarRow key={t.label} {...t} />)}
          </div>
        </Card>
      </div>

      {/* ── Donut Charts Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KYC distribution */}
        <Card className="p-6 flex items-center gap-8">
          <DonutChart
            segments={kycSegs}
            centerLabel={`${kycApprovedPct}%`}
            centerSub="Verified"
          />
          <div className="flex-1 space-y-3">
            <h4 className="font-bold text-white text-sm mb-3">KYC Status Distribution</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {kycSegs.map(seg => (
                <div key={seg.label} className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: seg.color }} />
                    {seg.label}
                  </div>
                  <p className="text-lg font-bold text-white leading-none">{seg.value?.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-600">{seg.pct}% of total</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Trust level distribution */}
        <Card className="p-6 flex items-center gap-8">
          <DonutChart
            segments={trustSegs}
            centerLabel={trustTotal.toLocaleString()}
            centerSub="Users"
          />
          <div className="flex-1 space-y-3">
            <h4 className="font-bold text-white text-sm mb-3">Trust Level Distribution</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {trustSegs.map(seg => (
                <div key={seg.label} className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: seg.color }} />
                    {seg.label}
                  </div>
                  <p className="text-lg font-bold text-white leading-none">{seg.value?.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-600">{seg.pct}% of users</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ── System Events Feed ──────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-white">System Events</h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time activity log</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={ArrowUpRight}>Full Audit Trail</Button>
        </div>
        <div className="space-y-1">
          {systemEvents.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-500">
              Aucun événement système.
            </div>
          )}
          {systemEvents.map((ev, i) => {
            const cfg = EVENT_CONFIG[ev.type] || EVENT_CONFIG.info;
            const EvIcon = cfg.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-start gap-4 p-3.5 rounded-2xl hover:bg-white/[0.025] transition-colors border-b border-white/[0.04] last:border-0 group cursor-default"
              >
                <div className={cn('p-2 rounded-xl shrink-0 mt-0.5', cfg.bg)}>
                  <EvIcon size={13} className={cfg.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h5 className="text-sm font-bold text-white truncate">{ev.event}</h5>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">{ev.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed truncate">{ev.desc}</p>
                  <div className="mt-1.5">
                    <span className={cn('text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', cfg.bg, cfg.text)}>
                      {ev.user}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboardPage;
