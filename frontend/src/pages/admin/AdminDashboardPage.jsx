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
  if (!data.length) return null;

  const W = 400, H = 120, PAD = 8;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
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
        {['Day 1', '', 'Day 8', '', 'Day 15', '', 'Day 22', '', 'Today'].map((l, i) => (
          <span key={i} className="text-[9px] text-slate-600 font-mono">{l}</span>
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

const EVENTS = [
  { event: 'New Employee Created',      user: 'Admin',      desc: 'Employee account for Mehdi Alami (KYC Dept) initialized.', time: '12m ago', type: 'info' },
  { event: 'Large Withdrawal Flagged',  user: 'System',     desc: 'Account #8841: withdrawal of 50,000 MAD exceeds daily average.', time: '1h ago', type: 'warning' },
  { event: 'Cagnotte Milestone',        user: 'Community',  desc: '"Education pour tous" reached 100,000 MAD funding goal.', time: '3h ago', type: 'success' },
  { event: 'KYC Batch Approval',        user: 'Fatima Z.',  desc: '45 pending verifications processed in bulk.', time: '5h ago', type: 'info' },
  { event: 'Suspicious Login Attempt',  user: 'Security',   desc: 'Multiple failed login attempts detected on account #2291.', time: '6h ago', type: 'danger' },
];

/* ── Main Component ─────────────────────────────────────────────────── */
const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Admin stats error:', err);
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

  const kycTotal = stats.kyc_distribution
    ? Object.values(stats.kyc_distribution).reduce((a, b) => a + b, 0) || 1
    : 1;
  const kycSegs = stats.kyc_distribution ? [
    { pct: Math.round((stats.kyc_distribution.approved   / kycTotal) * 100), color: '#10b981', label: 'Approved',      value: stats.kyc_distribution.approved },
    { pct: Math.round((stats.kyc_distribution.pending    / kycTotal) * 100), color: '#3b82f6', label: 'Pending',       value: stats.kyc_distribution.pending },
    { pct: Math.round((stats.kyc_distribution.rejected   / kycTotal) * 100), color: '#f43f5e', label: 'Rejected',      value: stats.kyc_distribution.rejected },
    { pct: Math.round((stats.kyc_distribution.not_submitted / kycTotal) * 100), color: '#475569', label: 'Not Submitted', value: stats.kyc_distribution.not_submitted },
  ] : [];

  const trustTotal = stats.trust_levels
    ? Object.values(stats.trust_levels).reduce((a, b) => a + b, 0) || 1
    : 1;
  const trustSegs = stats.trust_levels ? [
    { pct: Math.round((stats.trust_levels.excellent / trustTotal) * 100), color: '#a855f7', label: 'Excellent', value: stats.trust_levels.excellent },
    { pct: Math.round((stats.trust_levels.trusted   / trustTotal) * 100), color: '#10b981', label: 'Trusted',   value: stats.trust_levels.trusted },
    { pct: Math.round((stats.trust_levels.normal    / trustTotal) * 100), color: '#f59e0b', label: 'Normal',    value: stats.trust_levels.normal },
    { pct: Math.round((stats.trust_levels.risky     / trustTotal) * 100), color: '#f43f5e', label: 'Risky',     value: stats.trust_levels.risky },
  ] : [];

  const kycApprovedPct = Math.round((stats.kyc_distribution?.approved / kycTotal) * 100);

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

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { title: 'Total Users',       value: stats.total_users?.toLocaleString(),        delta: '+12%', icon: Users,         color: 'blue',   variant: 'A' },
          { title: 'Employees',          value: stats.total_employees,                       delta: '+1',   icon: UserPlus,      color: 'purple', variant: 'A' },
          { title: 'Active Darets',      value: stats.active_darets,                         delta: '+4',   icon: Target,        color: 'emerald',variant: 'A' },
          { title: 'Active Cagnottes',   value: stats.active_cagnottes,                      delta: '+2',   icon: HeartHandshake,color: 'rose',   variant: 'A' },
          { title: "Transactions Today", value: stats.transactions_today,                     delta: '+18%', icon: Activity,      color: 'amber',  variant: 'A' },
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
              <span className="text-[10px] font-bold text-violet-400">+24%</span>
            </div>
          </div>
          <LineChart data={stats.user_growth || []} color="#8b5cf6" />
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
              { label: 'Transfers',          val: 65, color: 'bg-emerald-500' },
              { label: 'Deposits',           val: 42, color: 'bg-blue-500' },
              { label: 'Daret Payments',     val: 88, color: 'bg-purple-500' },
              { label: 'Cagnotte Donations', val: 24, color: 'bg-rose-500' },
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
            centerLabel="724"
            centerSub="Avg Score"
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
          {EVENTS.map((ev, i) => {
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
