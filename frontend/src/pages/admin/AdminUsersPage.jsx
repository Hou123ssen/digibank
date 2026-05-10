import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Download, Eye, Lock, Unlock,
  ShieldAlert, RefreshCw, Mail, TrendingUp, Wallet,
  X, ChevronDown, User, CreditCard, BadgeCheck, Star,
  Target, HeartHandshake, Ticket, FileText,
  CheckCircle2, XCircle, Clock, RotateCcw,
  Minus, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import adminService from '../../services/adminService';
import { cn } from '../../utils/cn';
import { safeNumber, formatAmount } from '../../utils/apiResponse';

/* ── helpers ──────────────────────────────────────────────────────── */
const KYC_BADGE = {
  approved:      <Badge variant="success">Approved</Badge>,
  pending:       <Badge variant="warning">Pending</Badge>,
  needs_review:  <Badge variant="warning">Needs Review</Badge>,
  rejected:      <Badge variant="danger">Rejected</Badge>,
  not_submitted: <Badge variant="neutral">Not Sub.</Badge>,
};

const trustColor = score => {
  if (score == null) return 'text-slate-400';
  if (score >= 90) return 'text-emerald-400';
  if (score >= 70) return 'text-blue-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-rose-400';
};
const trustBg = score => trustColor(score).replace('text', 'bg');

const normalizeAdminUser = user => {
  const score = user?.trust_score?.score ?? user?.trust_score ?? null;

  return {
    ...user,
    phone: user?.phone || 'Non fourni',
    status: user?.status || user?.account?.status || 'active',
    balance: Number(user?.account?.balance ?? user?.balance ?? 0),
    account_number: user?.account?.account_number ?? user?.account_number ?? null,
    kyc: user?.kyc?.status ?? user?.kyc ?? 'not_submitted',
    trust_score: score == null ? null : Number(score),
    trust_level: user?.trust_score?.level ?? user?.trust_level ?? null,
    trust_history: Array.isArray(user?.trust_history) ? user.trust_history : [],
    darets: Array.isArray(user?.darets) ? user.darets : [],
    cagnottes: Array.isArray(user?.cagnottes) ? user.cagnottes : [],
    tickets: Array.isArray(user?.tickets) ? user.tickets : [],
    logs: Array.isArray(user?.logs) ? user.logs : [],
  };
};

/* ── FilterPill ───────────────────────────────────────────────────── */
const FilterPill = ({ label, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
          value ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
        )}
      >
        {value || label}
        <ChevronDown size={11} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            className="absolute left-0 top-full mt-1.5 w-40 bg-bg-card border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden py-1"
          >
            <button
              onClick={() => { onChange(''); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              All
            </button>
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs transition-colors',
                  value === opt.value ? 'text-violet-400 bg-violet-500/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                )}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Tab Button ───────────────────────────────────────────────────── */
const TabBtn = ({ active, icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
      active ? 'bg-violet-500/15 text-violet-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
    )}
  >
    <Icon size={13} />
    {label}
  </button>
);

/* ── Adjust Trust Modal ───────────────────────────────────────────── */
const AdjustTrustModal = ({ user, onClose, onSave, addToast }) => {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!delta || !reason.trim()) return;
    setSaving(true);
    try {
      await adminService.adjustTrustScore(user.id, { delta: Number(delta), reason });
      addToast?.('Trust score updated', 'success');
      onSave();
    } catch {
      addToast?.('Failed to update trust score', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        className="relative w-full max-w-sm bg-bg-card border border-white/10 rounded-3xl p-7 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-white text-lg">Adjust Trust Score</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
            <X size={17} className="text-slate-500" />
          </button>
        </div>
        <div className="space-y-1 mb-5">
          <p className="text-xs text-slate-500">Current score for <span className="text-white font-semibold">{user.name}</span></p>
          <p className={cn('text-3xl font-bold font-mono', trustColor(user.trust_score))}>{user.trust_score ?? '-'} pts</p>
        </div>
        <div className="flex items-center justify-center gap-4 mb-5">
          <button onClick={() => setDelta(d => d - 10)}
            className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center transition-colors">
            <Minus size={16} />
          </button>
          <div className="text-center">
            <span className={cn('text-2xl font-bold font-mono', delta >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {delta >= 0 ? '+' : ''}{delta}
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">adjustment</p>
          </div>
          <button onClick={() => setDelta(d => d + 10)}
            className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-colors">
            <Plus size={16} />
          </button>
        </div>
        <textarea
          placeholder="Reason for adjustment…"
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/50 resize-none mb-5 transition-colors"
        />
        <Button variant="primary" className="w-full" onClick={handleSave} isLoading={saving}>
          Save Adjustment
        </Button>
      </motion.div>
    </div>
  );
};

/* ── Drawer Tabs ─────────────────────────────────────────────── */
const TABS = [
  { id: 'overview',  icon: User,          label: 'Overview' },
  { id: 'account',   icon: CreditCard,    label: 'Account' },
  { id: 'kyc',       icon: BadgeCheck,    label: 'KYC' },
  { id: 'trust',     icon: Star,          label: 'Trust' },
  { id: 'darets',    icon: Target,        label: 'Darets' },
  { id: 'cagnottes', icon: HeartHandshake,label: 'Cagnottes' },
  { id: 'tickets',   icon: Ticket,        label: 'Tickets' },
  { id: 'logs',      icon: FileText,      label: 'Logs' },
];

const TabContent = ({ tab, user, detail, loading }) => {
  if (loading) return (
    <div className="space-y-3 pt-2 animate-pulse">
      {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-xl" />)}
    </div>
  );

  switch (tab) {
    case 'overview': return (
      <div className="space-y-5">
        {[
          ['Full Name',    user.name],
          ['Email',        user.email],
          ['Phone',        user.phone || '—'],
          ['Role',         user.role?.toUpperCase()],
          ['Status',       user.status],
          ['Member Since', new Date(user.created_at).toLocaleDateString('fr-FR')],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-0">
            <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">{k}</span>
            <span className="text-sm font-semibold text-white">{v}</span>
          </div>
        ))}
      </div>
    );

    case 'account': return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Balance</p>
            <p className="text-xl font-bold text-white font-mono">{formatAmount(user.balance)}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Trust Score</p>
            <p className={cn('text-xl font-bold font-mono', trustColor(user.trust_score))}>{user.trust_score ?? '-'} <span className="text-xs">pts</span></p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Account Status</p>
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', user.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500')} />
            <span className="text-sm font-semibold text-white capitalize">{user.status}</span>
          </div>
        </div>
      </div>
    );

    case 'kyc': return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className={cn('p-3 rounded-xl', user.kyc === 'approved' ? 'bg-emerald-500/10' : ['pending', 'needs_review'].includes(user.kyc) ? 'bg-amber-500/10' : 'bg-rose-500/10')}>
            {user.kyc === 'approved' ? <CheckCircle2 size={18} className="text-emerald-400" /> :
             ['pending', 'needs_review'].includes(user.kyc) ? <Clock size={18} className="text-amber-400" /> :
                                       <XCircle      size={18} className="text-rose-400"   />}
          </div>
          <div>
            <p className="text-sm font-bold text-white capitalize">{user.kyc?.replace('_', ' ')}</p>
            <p className="text-xs text-slate-500">KYC Verification Status</p>
          </div>
          {KYC_BADGE[user.kyc]}
        </div>
        {(detail?.kyc_docs || []).map((doc, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <FileText size={15} className="text-slate-400" />
            <span className="text-xs text-slate-300 flex-1">{doc.name}</span>
            <Badge variant="neutral">{doc.type}</Badge>
          </div>
        ))}
        {!(detail?.kyc_docs?.length) && (
          <p className="text-xs text-slate-600 text-center py-6">No KYC documents on record.</p>
        )}
      </div>
    );

    case 'trust': return (
      <div className="space-y-3">
        {(detail?.trust_history || []).map((h, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
            <div className={cn('p-2 rounded-lg', h.delta >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10')}>
              {h.delta >= 0 ? <TrendingUp size={13} className="text-emerald-400" /> : <TrendingUp size={13} className="text-rose-400 rotate-180" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white">{h.action}</p>
              <p className="text-[10px] text-slate-500">{h.by} · {new Date(h.date).toLocaleDateString('fr-FR')}</p>
            </div>
            <span className={cn('text-sm font-bold font-mono', h.delta >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {h.delta >= 0 ? '+' : ''}{h.delta}
            </span>
          </div>
        ))}
        {!(detail?.trust_history?.length) && (
          <p className="text-xs text-slate-600 text-center py-6">No trust history found for this user.</p>
        )}
      </div>
    );

    case 'darets': return (
      <div className="space-y-3">
        {detail?.darets?.length ? detail.darets.map((d, i) => (
          <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <p className="text-sm font-semibold text-white">{d.name}</p>
            <div className="flex gap-2">
              <Badge variant="neutral">{d.role}</Badge>
              <Badge variant={d.status === 'active' ? 'success' : 'neutral'}>{d.status}</Badge>
            </div>
          </div>
        )) : <p className="text-xs text-slate-600 text-center py-6">No darets found for this user.</p>}
      </div>
    );

    case 'cagnottes': return (
      <div className="space-y-3">
        {detail?.cagnottes?.length ? detail.cagnottes.map((c, i) => {
          const raised = safeNumber(c.raised);
          const goal = safeNumber(c.goal, 1);
          const progress = Math.min((raised / goal) * 100, 100);

          return (
            <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <p className="text-sm font-semibold text-white">{c.title}</p>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>{formatAmount(raised)} raised</span>
                <span>Goal: {formatAmount(goal)}</span>
              </div>
            </div>
          );
        }) : <p className="text-xs text-slate-600 text-center py-6">No cagnottes found for this user.</p>}
      </div>
    );

    case 'tickets': return (
      <div className="space-y-2">
        {detail?.tickets?.length ? detail.tickets.map((t, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
            <div className={cn('p-1.5 rounded-lg mt-0.5',
              t.priority === 'urgent' ? 'bg-rose-500/10' :
              t.priority === 'high'   ? 'bg-orange-500/10' : 'bg-slate-500/10')}>
              <Ticket size={13} className={
                t.priority === 'urgent' ? 'text-rose-400' :
                t.priority === 'high'   ? 'text-orange-400' : 'text-slate-400'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{t.subject}</p>
              <p className="text-[10px] text-slate-500 capitalize">{t.status} · {t.priority}</p>
            </div>
          </div>
        )) : <p className="text-xs text-slate-600 text-center py-6">No tickets found for this user.</p>}
      </div>
    );

    case 'logs': return (
      <div className="space-y-1">
        {detail?.logs?.length ? detail.logs.map((l, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mt-1.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white">{l.action}</p>
              <p className="text-[10px] text-slate-500">{l.description}</p>
              <p className="text-[9px] text-slate-600 mt-0.5 font-mono">{l.created_at}</p>
            </div>
          </div>
        )) : <p className="text-xs text-slate-600 text-center py-6">No logs found for this user.</p>}
      </div>
    );

    default: return null;
  }
};

/* ── User Detail Drawer ───────────────────────────────────────────── */
const UserDrawer = ({ user, onClose, addToast }) => {
  const [activeTab, setActiveTab]   = useState('overview');
  const [detail, setDetail]         = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [actionLoading, setActionLoading]   = useState(null);

  useEffect(() => {
    const load = async () => {
      setDetailLoading(true);
      try {
        setDetail({
          tickets: user.tickets || [],
          darets: user.darets || [],
          cagnottes: user.cagnottes || [],
          trust_history: user.trust_history || [],
          logs: user.logs || [],
        });
      } catch { /* silent */ }
      setDetailLoading(false);
    };
    load();
  }, [user.id]);

  const handleFreeze = async () => {
    setActionLoading('freeze');
    try {
      if (user.status === 'active') {
        await adminService.freezeUser(user.id);
        addToast?.('Account frozen', 'success');
      } else {
        await adminService.unfreezeUser(user.id);
        addToast?.('Account unfrozen', 'success');
      }
      onClose();
    } catch {
      addToast?.('Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async () => {
    setActionLoading('reset');
    try {
      await adminService.resetPassword(user.id);
      addToast?.('Password reset email sent', 'success');
    } catch {
      addToast?.('Reset failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="fixed top-0 right-0 h-screen w-full max-w-[520px] bg-bg-dark border-l border-white/5 z-[101] shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">User Profile</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
              <X size={18} className="text-slate-400" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center text-2xl font-bold text-violet-400 border border-violet-500/20 shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white truncate">{user.name}</h3>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
              <div className="flex gap-2 mt-2">
                {KYC_BADGE[user.kyc]}
                <Badge variant={user.status === 'active' ? 'success' : 'danger'}>{user.status}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-3 py-2 border-b border-white/5 flex gap-0.5 overflow-x-auto shrink-0 scrollbar-hide">
          {TABS.map(t => (
            <TabBtn key={t.id} active={activeTab === t.id} icon={t.icon} label={t.label} onClick={() => setActiveTab(t.id)} />
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <TabContent tab={activeTab} user={user} detail={detail} loading={detailLoading} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Actions footer */}
        <div className="p-4 border-t border-white/5 shrink-0">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mb-3">Admin Actions</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowTrustModal(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              <ShieldAlert size={14} className="text-violet-400" /> Adjust Trust
            </button>
            <button
              onClick={handleFreeze}
              disabled={actionLoading === 'freeze'}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all',
                user.status === 'active'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
              )}
            >
              {user.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
              {user.status === 'active' ? 'Freeze Account' : 'Unfreeze Account'}
            </button>
            <button
              onClick={handleResetPassword}
              disabled={actionLoading === 'reset'}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              <RotateCcw size={14} className="text-blue-400" /> Reset Password
            </button>
            <button className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all">
              <Wallet size={14} className="text-emerald-400" /> Adjust Balance
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showTrustModal && (
          <AdjustTrustModal
            user={user}
            onClose={() => setShowTrustModal(false)}
            onSave={() => { setShowTrustModal(false); onClose(); }}
            addToast={addToast}
          />
        )}
      </AnimatePresence>
    </>
  );
};

/* ── Main Page ─────────────────────────────────────────────────────── */
const AdminUsersPage = ({ addToast }) => {
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filterKyc,    setFilterKyc]    = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole,   setFilterRole]   = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsers();
      const items = data?.data ?? data ?? [];
      setUsers(Array.isArray(items) ? items.map(normalizeAdminUser) : []);
    } catch {
      setUsers([]);
      addToast?.('Impossible de charger les utilisateurs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => users.filter(u => {
    const q = search.toLowerCase();
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    if (filterKyc    && u.kyc    !== filterKyc)    return false;
    if (filterStatus && u.status !== filterStatus) return false;
    if (filterRole   && u.role   !== filterRole)   return false;
    return true;
  }), [users, search, filterKyc, filterStatus, filterRole]);

  const openDrawer = user => { setSelectedUser(user); setIsDrawerOpen(true); };

  const hasFilter = filterKyc || filterStatus || filterRole || search;

  const exportCsv = () => {
    const rows = [
      ['id', 'name', 'email', 'phone', 'role', 'status', 'kyc', 'trust_score', 'balance', 'account_number', 'created_at'],
      ...filtered.map(u => [
        u.id,
        u.name,
        u.email,
        u.phone || 'Non fourni',
        u.role,
        u.status,
        u.kyc || 'not_submitted',
        u.trust_score ?? '-',
        u.balance ?? 0,
        u.account_number || '',
        u.created_at,
      ]),
    ];

    const csv = rows
      .map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'admin-users.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="User Management"
        subtitle="Manage client accounts, review KYC status, and adjust trust scores."
        breadcrumbs={['Admin', 'Users']}
        actions={<Button variant="secondary" size="sm" leftIcon={Download} onClick={exportCsv}>Export CSV</Button>}
      />

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-bg-card border border-white/5 p-4 rounded-2xl">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40 transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <FilterPill label="KYC" value={filterKyc} onChange={setFilterKyc}
            options={[
              { label: 'Approved',      value: 'approved' },
              { label: 'Pending',       value: 'pending' },
              { label: 'Needs Review',  value: 'needs_review' },
              { label: 'Rejected',      value: 'rejected' },
              { label: 'Not Submitted', value: 'not_submitted' },
            ]} />
          <FilterPill label="Status" value={filterStatus} onChange={setFilterStatus}
            options={[{ label: 'Active', value: 'active' }, { label: 'Frozen', value: 'frozen' }]} />
          <FilterPill label="Role" value={filterRole} onChange={setFilterRole}
            options={[{ label: 'User', value: 'user' }, { label: 'Employee', value: 'employee' }, { label: 'Admin', value: 'admin' }]} />
          {hasFilter && (
            <button
              onClick={() => { setSearch(''); setFilterKyc(''); setFilterStatus(''); setFilterRole(''); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-white bg-white/5 border border-white/10 transition-colors"
            >
              <X size={11} /> Clear
            </button>
          )}
          <Button variant="ghost" size="sm" leftIcon={RefreshCw} onClick={fetchUsers}>Refresh</Button>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-1">
        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-xl" />)}
          </div>
        ) : (
          <>
            <Table
              headers={['User', 'KYC', 'Trust Score', 'Balance', 'Role', 'Status', 'Created', 'Actions']}
              data={filtered.map(u => [
                <div className="flex items-center gap-3 py-1">
                  <div className="w-9 h-9 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 font-bold border border-violet-500/20 text-sm shrink-0">
                    {u.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate text-sm">{u.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                  </div>
                </div>,
                KYC_BADGE[u.kyc] || <Badge variant="neutral">—</Badge>,
                <div className="flex items-center gap-2">
                  <span className={cn('font-mono font-bold text-sm', trustColor(u.trust_score))}>{u.trust_score ?? '-'}</span>
                  <div className="w-14 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', trustBg(u.trust_score))} style={{ width: `${u.trust_score ?? 0}%` }} />
                  </div>
                </div>,
                <span className="font-mono text-white text-sm">{formatAmount(u.balance)}</span>,
                <Badge variant="neutral" className="uppercase text-[9px]">{u.role}</Badge>,
                <div className="flex items-center gap-1.5">
                  <div className={cn('w-1.5 h-1.5 rounded-full', u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500')} />
                  <span className="text-xs text-slate-300 capitalize">{u.status}</span>
                </div>,
                <span className="text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString('fr-FR')}</span>,
                <div className="flex items-center gap-1">
                  <button onClick={() => openDrawer(u)}
                    className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors" title="View profile">
                    <Eye size={15} />
                  </button>
                  <button className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Freeze/Unfreeze">
                    {u.status === 'active' ? <Lock size={15} /> : <Unlock size={15} />}
                  </button>
                  <button className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Send email">
                    <Mail size={15} />
                  </button>
                </div>,
              ])}
            />
            {filtered.length === 0 && !loading && (
              <div className="py-16 text-center text-slate-500 text-sm">No users match your filters.</div>
            )}
          </>
        )}
      </Card>

      {/* Drawer */}
      <AnimatePresence>
        {isDrawerOpen && selectedUser && (
          <UserDrawer
            user={selectedUser}
            onClose={() => { setIsDrawerOpen(false); setSelectedUser(null); }}
            addToast={addToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsersPage;
