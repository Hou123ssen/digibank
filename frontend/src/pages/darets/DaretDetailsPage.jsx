import React, { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Users, Banknote, Calendar, Clock, CheckCircle2,
  AlertCircle, Star, Crown, Play, RotateCcw, ArrowDownUp,
  Shuffle, Settings2, TrendingUp, BadgeCheck, User,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import daretService from '../../services/daretService';
import { safeNumber, formatAmount, getErrorMessage } from '../../utils/apiResponse';

// ── Helpers ───────────────────────────────────────────────────────────────────
const Pulse = ({ className }) => (
  <div className={cn('animate-pulse rounded-lg bg-white/5', className)} />
);

const AVATAR_COLORS = ['bg-emerald-600','bg-teal-600','bg-sky-600','bg-violet-600','bg-amber-600','bg-rose-600'];
const initials = name => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const Avatar = ({ name, size = 'md' }) => {
  const hash  = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  const sz    = size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold text-white shrink-0', color, sz)}>
      {initials(name)}
    </div>
  );
};

const STATUS_MAP = {
  open:       { label: 'Ouvert',      variant: 'success' },
  active:     { label: 'En cours',    variant: 'info'    },
  waiting:    { label: 'En attente',  variant: 'warning' },
  pending:    { label: 'En attente',  variant: 'warning' },
  completed:  { label: 'Terminé',     variant: 'neutral' },
};
const getStatus = s => STATUS_MAP[s] || STATUS_MAP.open;
const paymentStatus = s => ({
  paid: { label: 'Paye', variant: 'success' },
  pending: { label: 'En attente', variant: 'warning' },
  late: { label: 'En retard', variant: 'danger' },
  failed: { label: 'Echec', variant: 'danger' },
}[s] || { label: 'En attente', variant: 'warning' });

const freqLabel = f => ({ monthly: 'Mensuel', weekly: 'Hebdomadaire' }[f] || 'Mensuel');
const orderLabel = o => ({ sequential: 'Séquentiel', random: 'Aléatoire', auto: 'Auto-rotation', auto_rotation: 'Auto-rotation' }[o] || o || '—');

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',  label: 'Aperçu'     },
  { id: 'members',   label: 'Membres'    },
  { id: 'cycles',    label: 'Cycles'     },
  { id: 'payments',  label: 'Paiements'  },
];

// ── Tab content components ────────────────────────────────────────────────────

// Overview tab
const OverviewTab = ({ daret, user }) => {
  const isCreator = daret.is_creator || String(daret.creator_id) === String(user?.id);
  const isMember  = daret.is_member;

  const details = [
    { label: 'Contribution / cycle',  value: formatAmount(daret.contribution_amount), mono: true },
    { label: 'Capacité',              value: `${daret.capacity ?? '?'} membres`     },
    { label: 'Pot total estimé',      value: formatAmount(safeNumber(daret.contribution_amount) * safeNumber(daret.capacity)), mono: true },
    { label: 'Fréquence',             value: freqLabel(daret.cycle_frequency)       },
    { label: 'Ordre de versement',    value: orderLabel(daret.payout_order)         },
    { label: 'Créé par',             value: daret.created_by?.name || daret.creator?.name || '—' },
  ];

  return (
    <div className="dg-daret-page space-y-6">
      {/* Description */}
      {daret.description && (
        <Card className="p-5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Description</p>
          <p className="text-sm text-slate-300 leading-relaxed">{daret.description}</p>
        </Card>
      )}

      {/* Key details */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Informations clés</p>
        </div>
        <div className="px-5 divide-y divide-white/5">
          {details.map(d => (
            <div key={d.label} className="flex items-center justify-between py-3">
              <span className="text-sm text-slate-400">{d.label}</span>
              <span className={cn('text-sm font-semibold text-white', d.mono && 'font-mono')}>{d.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Your role */}
      <div className="flex items-center gap-3">
        <p className="text-sm text-slate-400">Votre rôle :</p>
        {isCreator ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <Crown size={13} className="text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">Créateur</span>
          </div>
        ) : isMember ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 border border-sky-500/20 rounded-full">
            <Users size={13} className="text-sky-400" />
            <span className="text-xs font-semibold text-sky-400">Membre</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
            <User size={13} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-400">Non membre</span>
          </div>
        )}
      </div>

      {/* Key dates */}
      {(daret.start_date || daret.next_payout_date || daret.end_date) && (
        <Card className="p-5 space-y-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dates clés</p>
          {[
            { label: 'Début',             date: daret.start_date        },
            { label: 'Prochain versement', date: daret.next_payout_date },
            { label: 'Fin estimée',        date: daret.end_date         },
          ].filter(r => r.date).map(r => (
            <div key={r.label} className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-slate-500 shrink-0" />
              <span className="text-slate-400">{r.label} :</span>
              <span className="text-white font-medium">
                {new Date(r.date).toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

// Members tab
const MembersTab = ({ members, daret }) => {
  if (!members.length) return (
    <div className="py-16 text-center">
      <Users size={32} className="text-slate-600 mx-auto mb-3" />
      <p className="text-slate-500 text-sm">Aucun membre pour l'instant</p>
    </div>
  );

  return (
    <Card className="overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
            <th className="px-5 py-3 text-left">Membre</th>
            <th className="px-4 py-3 text-left hidden sm:table-cell">Adhésion</th>
            <th className="px-4 py-3 text-center hidden md:table-cell">Tour</th>
            <th className="px-4 py-3 text-center">Statut</th>
            <th className="px-5 py-3 text-center hidden lg:table-cell">Trust</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {members.map((m, i) => {
            const name    = m.name || m.user?.name || `Membre ${i + 1}`;
            const status = paymentStatus(m.payment_status || (m.has_paid_current_cycle || m.paid ? 'paid' : 'pending'));
            return (
              <tr key={m.id || i} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={name} />
                    <span className="text-sm font-medium text-white truncate max-w-[120px]">{name}</span>
                    {m.is_creator && (
                      <Crown size={12} className="text-emerald-400 shrink-0" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-xs text-slate-400 hidden sm:table-cell">
                  {m.joined_at ? new Date(m.joined_at).toLocaleDateString('fr-MA') : '—'}
                </td>
                <td className="px-4 py-3.5 text-center hidden md:table-cell">
                  <span className="text-xs font-mono text-white">
                    {m.payout_order ?? m.order ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  {daret.status === 'active' ? (
                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>
                  ) : (
                    <Badge variant="neutral">—</Badge>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center hidden lg:table-cell">
                  {m.trust_score != null ? (
                    <span className="text-xs font-mono text-emerald-400">{m.trust_score}/1000</span>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};

// Cycles tab — vertical timeline
const CyclesTab = ({ cycles }) => {
  if (!cycles.length) return (
    <div className="py-16 text-center">
      <RotateCcw size={32} className="text-slate-600 mx-auto mb-3" />
      <p className="text-slate-500 text-sm">Les cycles apparaîtront une fois le Daret démarré</p>
    </div>
  );

  const cycleStatus = s => ({
    completed:   { label: 'Complété',    variant: 'success', dot: 'bg-emerald-500',  dotRing: 'ring-emerald-500/30' },
    active:      { label: 'En cours',    variant: 'info',    dot: 'bg-sky-400',      dotRing: 'ring-sky-400/30'     },
    in_progress: { label: 'En cours',    variant: 'info',    dot: 'bg-sky-400',      dotRing: 'ring-sky-400/30'     },
    upcoming:    { label: 'À venir',     variant: 'neutral', dot: 'bg-slate-600',    dotRing: ''                    },
    pending:     { label: 'À venir',     variant: 'neutral', dot: 'bg-slate-600',    dotRing: ''                    },
  }[s] || { label: 'À venir', variant: 'neutral', dot: 'bg-slate-600', dotRing: '' });

  return (
    <div className="relative pl-8 space-y-0">
      {/* vertical line */}
      <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-white/5" />

      {cycles.map((cycle, i) => {
        const cs         = cycleStatus(cycle.status);
        const recipName  = cycle.recipient?.name || cycle.beneficiary?.name || cycle.recipient_name || '—';
        const paidCount  = cycle.paid_count ?? 0;
        const total      = cycle.total_members ?? 0;
        return (
          <motion.div
            key={cycle.id || i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="relative pb-8 last:pb-0"
          >
            {/* Dot */}
            <div className={cn(
              'absolute -left-8 w-4 h-4 rounded-full ring-4',
              cs.dot,
              cs.dotRing || 'ring-transparent',
              cycle.status === 'active' || cycle.status === 'in_progress' ? 'animate-pulse' : '',
            )} style={{ top: '10px' }} />

            <Card className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-sm font-semibold text-white">Cycle {cycle.cycle_number ?? i + 1}</p>
                  {cycle.scheduled_date && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(cycle.scheduled_date).toLocaleDateString('fr-MA', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
                <Badge variant={cs.variant}>{cs.label}</Badge>
              </div>

              {recipName !== '—' && (
                <div className="flex items-center gap-2.5 mb-3">
                  <Avatar name={recipName} size="sm" />
                  <div>
                    <p className="text-xs text-slate-400">Bénéficiaire</p>
                    <p className="text-sm font-medium text-white">{recipName}</p>
                  </div>
                </div>
              )}

              {total > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Paiements</span>
                    <span>{paidCount}/{total}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${(paidCount / total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

// Payments tab
const PaymentsTab = ({ payments }) => {
  const [cycleFilter, setCycleFilter] = useState('all');
  const cycles = [...new Set(payments.map(p => p.cycle_number).filter(Boolean))].sort((a, b) => a - b);

  const filtered = cycleFilter === 'all'
    ? payments
    : payments.filter(p => String(p.cycle_number) === cycleFilter);

  if (!payments.length) return (
    <div className="py-16 text-center">
      <Banknote size={32} className="text-slate-600 mx-auto mb-3" />
      <p className="text-slate-500 text-sm">Aucun paiement enregistré</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {cycles.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">Cycle :</span>
          {['all', ...cycles.map(String)].map(c => (
            <button
              key={c}
              onClick={() => setCycleFilter(c)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                cycleFilter === c
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-white/5 text-slate-400 hover:text-white',
              )}
            >
              {c === 'all' ? 'Tous' : `Cycle ${c}`}
            </button>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
              <th className="px-5 py-3 text-left">Membre</th>
              <th className="px-4 py-3 text-center hidden sm:table-cell">Cycle</th>
              <th className="px-4 py-3 text-right">Montant</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Date</th>
              <th className="px-5 py-3 text-center">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((p, i) => {
              const name = p.member?.name || p.user?.name || p.member_name || `Membre`;
              const status = paymentStatus(p.status === 'completed' ? 'paid' : p.status);
              return (
                <tr key={p.id || i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={name} />
                      <span className="text-sm text-white truncate max-w-[120px]">{name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                    <span className="text-xs font-mono text-slate-400">
                      {p.cycle_number ? `#${p.cycle_number}` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-sm font-bold font-mono text-white">
                      {formatAmount(p.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400 hidden md:table-cell">
                    {p.paid_at || p.created_at
                      ? new Date(p.paid_at || p.created_at).toLocaleDateString('fr-MA')
                      : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const DaretDetailsPage = () => {
  const { id }          = useParams();
  const { addToast }    = useOutletContext() || {};
  const { user }        = useAuth();

  const [daret,     setDaret]    = useState(null);
  const [members,   setMembers]  = useState([]);
  const [cycles,    setCycles]   = useState([]);
  const [payments,  setPayments] = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [activeTab, setTab]      = useState('overview');
  const [starting,  setStarting] = useState(false);
  const [paying,    setPaying]   = useState(false);

  const applyDaretData = (data) => {
    const loadedMembers = Array.isArray(data?.members) ? data.members : [];
    const loadedCycles = Array.isArray(data?.cycles) ? data.cycles : [];
    const loadedPayments = Array.isArray(data?.payments) ? data.payments : [];
    const currentCycle = loadedCycles.find(c => ['pending', 'late', 'active', 'in_progress'].includes(c.status));
    const hasPaidCurrentCycle = loadedPayments.some(payment =>
      String(payment.user_id) === String(user?.id) &&
      (!currentCycle || Number(payment.cycle_number) === Number(currentCycle.cycle_number)) &&
      payment.status === 'paid'
    );

    setDaret({
      ...data,
      has_paid_current_cycle: data?.has_paid_current_cycle ?? hasPaidCurrentCycle,
    });
    setMembers(loadedMembers);
    setCycles(loadedCycles);
    setPayments(loadedPayments);
  };

  const loadDaret = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await daretService.getDaretById(id);
      applyDaretData(data);
    } catch {
      setDaret(null);
      setMembers([]);
      setCycles([]);
      setPayments([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadDaret();
  }, [id, user?.id]);

  const handleStart = async () => {
    setStarting(true);
    try {
      await daretService.startDaret(id);
      await loadDaret(false);
      addToast?.('Daret démarré avec succès !', 'success');
    } catch (err) {
      addToast?.(getErrorMessage(err) || 'Erreur lors du demarrage', 'error');
    } finally {
      setStarting(false);
    }
  };

  const handlePay = async () => {
    setPaying(true);
    try {
      await daretService.payDaret(id, {});
      addToast?.('Contribution payée avec succès !', 'success');
      await loadDaret(false);
    } catch (err) {
      addToast?.(getErrorMessage(err) || 'Erreur lors du paiement', 'error');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Pulse className="h-8 w-48" />
        <Pulse className="h-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Pulse className="lg:col-span-2 h-64" />
          <Pulse className="h-64" />
        </div>
      </div>
    );
  }

  if (!daret) {
    return (
      <div className="py-24 text-center space-y-5 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center mx-auto">
          <AlertCircle size={28} className="text-sky-400" />
        </div>
        <div className="space-y-2">
          <p className="text-white font-semibold text-lg">Détails du Daret non disponibles</p>
          <p className="text-sm text-slate-400 leading-relaxed">
            Ce Daret n'existe pas ou vous n'y avez pas accès.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            size="sm"
            isLoading={starting}
            onClick={handleStart}
          >
            Démarrer ce Daret
          </Button>
          <Button
            variant="secondary"
            size="sm"
            isLoading={paying}
            onClick={handlePay}
          >
            Payer la contribution
          </Button>
        </div>
        <Link to="/darets">
          <Button variant="ghost" size="sm">Retour aux Darets</Button>
        </Link>
      </div>
    );
  }

  const st        = getStatus(daret.status);
  const isCreator = daret.is_creator || String(daret.creator_id) === String(user?.id);
  const isMember  = daret.is_member;
  const hasPaid   = daret.has_paid_current_cycle;
  const currentPaymentStatus = daret.current_payment_status || (hasPaid ? 'paid' : 'pending');
  const isLatePayment = currentPaymentStatus === 'late' || currentPaymentStatus === 'failed';
  const isFull    = (daret.members_count ?? 0) >= (daret.capacity ?? Infinity);

  const canStart  = isCreator && daret.status === 'open' && isFull;
  const canPay    = isMember  && daret.status === 'active' && !hasPaid;

  const cycleProgress = (daret.current_cycle && daret.total_cycles)
    ? Math.min((daret.current_cycle / daret.total_cycles) * 100, 100)
    : null;

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <Link
        to="/darets"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ChevronLeft size={16} />
        Darets
      </Link>

      {/* ── Header card ─────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        {/* Gradient banner */}
        <div className="h-2 w-full bg-gradient-to-r from-emerald-500 to-teal-400" />
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-5">
            {/* Icon + title */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Users size={26} className="text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-white leading-tight">{daret.name}</h1>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('w-1.5 h-1.5 rounded-full', daret.status === 'active' ? 'bg-sky-400 animate-pulse' : 'bg-emerald-400')} />
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  Créé par{' '}
                  <span className="text-white font-medium">
                    {daret.created_by?.name || daret.creator?.name || '—'}
                  </span>
                </p>
              </div>
            </div>

            {/* Key stats row */}
            <div className="flex flex-wrap gap-4 lg:gap-6 shrink-0">
              {[
                { label: 'Membres',          value: `${daret.members_count ?? 0}/${daret.capacity ?? '?'}` },
                { label: 'Contribution',     value: formatAmount(daret.contribution_amount), mono: true },
                { label: 'Pot total',        value: formatAmount(safeNumber(daret.contribution_amount) * safeNumber(daret.capacity)), mono: true },
                { label: 'Fréquence',        value: freqLabel(daret.cycle_frequency) },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</p>
                  <p className={cn('text-sm font-bold text-white mt-0.5', s.mono && 'font-mono')}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Banners */}
          {daret.status === 'open' && !isFull && (
            <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Clock size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                En attente de membres — {(daret.capacity ?? 0) - (daret.members_count ?? 0)} place(s) disponible(s).
              </p>
            </div>
          )}
          {daret.status === 'open' && isFull && !isCreator && (
            <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <Clock size={15} className="text-sky-400 shrink-0 mt-0.5" />
              <p className="text-xs text-sky-300">
                Le Daret est complet — en attente que le créateur démarre la session.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* ── Tabs + content + sticky action card ─────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Left: tabs */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Tab bar */}
          <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  activeTab === t.id
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-400 hover:text-white',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {activeTab === 'overview' && <OverviewTab daret={daret} user={user} />}
              {activeTab === 'members'  && <MembersTab  members={members} daret={daret} />}
              {activeTab === 'cycles'   && <CyclesTab   cycles={cycles} />}
              {activeTab === 'payments' && <PaymentsTab payments={payments} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: sticky action card */}
        <div className="lg:sticky lg:top-24 w-full lg:w-72 shrink-0">
          <Card className="p-5 space-y-5">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                Ce cycle
              </p>
              {daret.current_cycle ? (
                <p className="text-lg font-bold text-white">
                  Cycle {daret.current_cycle}
                  <span className="text-slate-500 font-normal text-sm"> / {daret.total_cycles ?? '?'}</span>
                </p>
              ) : (
                <p className="text-sm text-slate-500">Pas encore démarré</p>
              )}
            </div>

            {/* Cycle progress */}
            {cycleProgress !== null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Progression</span>
                  <span>{Math.round(cycleProgress)}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cycleProgress}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                  />
                </div>
              </div>
            )}

            {/* Next payout */}
            {daret.next_payout_date && (
              <div className="flex items-center gap-2 p-3 bg-white/[0.03] rounded-xl">
                <Calendar size={14} className="text-slate-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500">Prochain versement</p>
                  <p className="text-xs font-medium text-white">
                    {new Date(daret.next_payout_date).toLocaleDateString('fr-MA', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Contribution status */}
            {isMember && daret.status === 'active' && (
              <div className={cn(
                'flex items-center gap-2 p-3 rounded-xl',
                hasPaid
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : isLatePayment
                    ? 'bg-rose-500/10 border border-rose-500/20'
                    : 'bg-amber-500/10 border border-amber-500/20',
              )}>
                {hasPaid
                  ? <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  : <AlertCircle  size={15} className={cn('shrink-0', isLatePayment ? 'text-rose-400' : 'text-amber-400')}   />
                }
                <p className={cn('text-xs font-medium', hasPaid ? 'text-emerald-300' : isLatePayment ? 'text-rose-300' : 'text-amber-300')}>
                  {hasPaid ? 'Contribution payee ce cycle' : isLatePayment ? 'Solde insuffisant. Veuillez alimenter votre compte pour payer votre contribution.' : 'Contribution en attente'}
                </p>
              </div>
            )}

            <div className="border-t border-white/5 pt-4 space-y-2.5">
              {/* Pay button */}
              {canPay && (
                <Button
                  variant="primary"
                  className="w-full"
                  isLoading={paying}
                  onClick={handlePay}
                >
                  Payer la contribution
                </Button>
              )}

              {/* Already paid */}
              {isMember && hasPaid && daret.status === 'active' && (
                <Button variant="secondary" className="w-full" disabled>
                  Contribution payée ✓
                </Button>
              )}

              {/* Start button */}
              {canStart && (
                <Button
                  variant="primary"
                  className="w-full"
                  leftIcon={Play}
                  isLoading={starting}
                  onClick={handleStart}
                >
                  Démarrer le Daret
                </Button>
              )}

              {/* Waiting message */}
              {!canPay && !canStart && !hasPaid && daret.status !== 'completed' && (
                <p className="text-xs text-center text-slate-500">
                  {daret.status === 'open'
                    ? 'Le Daret n\'a pas encore démarré'
                    : 'Aucune action requise'}
                </p>
              )}

              {/* View details always accessible */}
              <Link to={`/darets/${id}`} className="block" onClick={() => setTab('members')}>
                <Button variant="ghost" size="sm" className="w-full">
                  Voir les membres
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DaretDetailsPage;
