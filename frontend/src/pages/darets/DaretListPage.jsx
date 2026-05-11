import React, { useState, useEffect, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Search, Calendar, Banknote, ChevronRight,
  CheckCircle2, AlertCircle, Star, Clock, ArrowRight,
  KeyRound,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import daretService from '../../services/daretService';
import { safeNumber, formatAmount, getErrorMessage } from '../../utils/apiResponse';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_MAP = {
  open:      { label: 'Ouvert',     variant: 'success', dot: 'bg-emerald-400', accent: 'from-emerald-500 to-teal-400' },
  active:    { label: 'En cours',   variant: 'info',    dot: 'bg-sky-400',     accent: 'from-sky-500 to-teal-400'     },
  waiting:   { label: 'En attente', variant: 'warning', dot: 'bg-amber-400',   accent: 'from-amber-500 to-orange-400' },
  pending:   { label: 'En attente', variant: 'warning', dot: 'bg-amber-400',   accent: 'from-amber-500 to-orange-400' },
  completed: { label: 'Terminé',    variant: 'neutral', dot: 'bg-slate-500',   accent: 'from-slate-600 to-slate-500'  },
};
const getStatus = s => STATUS_MAP[s] || STATUS_MAP.open;

// ── Avatar stack ──────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-emerald-600', 'bg-teal-600', 'bg-sky-600',
  'bg-violet-600',  'bg-amber-600', 'bg-rose-600',
];
const AvatarStack = ({ members = [], max = 4 }) => {
  const shown = members.slice(0, max);
  const extra = members.length - max;
  return (
    <div className="flex items-center">
      {shown.map((m, i) => (
        <div
          key={i}
          title={m.name || m.first_name || '?'}
          className={cn(
            'w-7 h-7 rounded-full border-2 border-bg-card flex items-center justify-center',
            'text-[10px] font-bold text-white shrink-0',
            AVATAR_COLORS[i % AVATAR_COLORS.length],
            i > 0 && '-ml-2',
          )}
        >
          {(m.name || m.first_name || '?')[0].toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div className="-ml-2 w-7 h-7 rounded-full border-2 border-bg-card bg-white/10 flex items-center justify-center text-[10px] font-bold text-slate-400">
          +{extra}
        </div>
      )}
    </div>
  );
};

// ── Daret Card ────────────────────────────────────────────────────────────────
const DaretCard = ({ daret, onJoin, onPay }) => {
  const { user } = useAuth();
  const st = getStatus(daret.status);

  const isCreator = daret.is_creator || String(daret.creator_id) === String(user?.id);
  const isMember  = daret.is_member;
  const hasPaid   = daret.has_paid_current_cycle;

  const fillPct  = Math.min(((daret.members_count ?? 0) / (daret.capacity || 1)) * 100, 100);
  const cyclePct = (daret.current_cycle && daret.total_cycles)
    ? Math.min((daret.current_cycle / daret.total_cycles) * 100, 100)
    : null;

  const actionLabel = isMember
    ? (daret.status === 'active' && !hasPaid ? 'Payer la contribution' : 'Voir le Daret')
    : (daret.status === 'open' ? 'Rejoindre' : 'Voir le Daret');

  const canJoin = !isMember && daret.status === 'open';
  const canPay  = isMember && daret.status === 'active' && !hasPaid;

  const freqLabel = { monthly: 'Mensuel', weekly: 'Hebdomadaire' }[daret.cycle_frequency] || 'Mensuel';

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative rounded-2xl bg-bg-card border border-white/5 hover:border-white/10 shadow-lg hover:shadow-xl flex flex-col overflow-hidden transition-all duration-300"
    >
      {/* top accent line */}
      <div className={cn('h-0.5 w-full bg-gradient-to-r', st.accent)} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Users size={18} className="text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight truncate">{daret.name}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{freqLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>
        </div>

        {/* Amount pill */}
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5">
          <Banknote size={15} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-bold text-white font-mono">
            {formatAmount(daret.contribution_amount)}
          </span>
          <span className="text-[10px] text-slate-500">/ cycle</span>
          {daret.capacity && (
            <span className="ml-auto text-[10px] text-slate-500 font-mono shrink-0">
              Pot: {formatAmount(safeNumber(daret.contribution_amount) * safeNumber(daret.capacity, 1))}
            </span>
          )}
        </div>

        {/* Members progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <AvatarStack members={daret.members || []} max={4} />
            <span className="text-xs text-slate-400 font-mono">
              {daret.members_count ?? 0}/{daret.capacity ?? '?'} membres
            </span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${fillPct}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                daret.status === 'active' ? 'bg-sky-500' : 'bg-emerald-500',
              )}
            />
          </div>
          <p className="text-[10px] text-slate-500">{Math.round(fillPct)}% rempli</p>
        </div>

        {/* Cycle progress (active only) */}
        {cyclePct !== null && daret.status === 'active' && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Cycle {daret.current_cycle} / {daret.total_cycles}</span>
              <span>{Math.round(cyclePct)}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${cyclePct}%` }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
                className="h-full bg-teal-500 rounded-full"
              />
            </div>
          </div>
        )}

        {/* Next payout date */}
        {daret.next_payout_date && (
          <div className="flex items-center gap-2 text-xs">
            <Calendar size={12} className="text-slate-500 shrink-0" />
            <span className="text-slate-400">Prochain versement :</span>
            <span className="text-white font-medium">
              {new Date(daret.next_payout_date).toLocaleDateString('fr-MA', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
          </div>
        )}

        {/* Contextual badges */}
        {isCreator && (
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
            <Star size={10} />
            <span>Vous êtes le créateur</span>
          </div>
        )}
        {isMember && hasPaid && daret.status === 'active' && (
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 rounded-lg px-2.5 py-1.5">
            <CheckCircle2 size={12} />
            <span>Contribution payée ce cycle</span>
          </div>
        )}

        {/* Action footer */}
        <div className="mt-auto pt-3 border-t border-white/5">
          {canJoin ? (
            <Button variant="secondary" size="sm" className="w-full" onClick={() => onJoin(daret)}>
              Rejoindre le Daret
            </Button>
          ) : canPay ? (
            <Button variant="primary" size="sm" className="w-full" onClick={() => onPay(daret)}>
              Payer la contribution
            </Button>
          ) : (
            <Link to={`/darets/${daret.id}`} className="block">
              <Button variant="ghost" size="sm" className="w-full group">
                Voir le Daret <ChevronRight size={14} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Join Modal ────────────────────────────────────────────────────────────────
const JOIN_RULES = [
  'Vous devez payer votre contribution à chaque cycle dans les délais impartis.',
  'Aucune double adhésion au même Daret n\'est autorisée.',
  'En cas de non-paiement répété, votre Trust Score sera impacté.',
  'L\'ordre des versements est fixé selon les règles choisies par le créateur.',
  'Le retrait avant la fin du cycle est soumis à approbation du créateur.',
];

const JoinDaretModal = ({ daret, isOpen, onClose, onConfirm, isLoading }) => {
  if (!daret) return null;
  const freqLabel = { monthly: 'Mensuel', weekly: 'Hebdomadaire' }[daret.cycle_frequency] || 'Mensuel';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rejoindre le Daret">
      {/* Summary card */}
      <div className="mb-5 p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Users size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{daret.name}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Créé par {daret.created_by?.name || daret.creator?.name || 'Anonyme'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Contribution', value: formatAmount(daret.contribution_amount) },
            { label: 'Membres',      value: `${daret.members_count ?? 0}/${daret.capacity ?? '?'}` },
            { label: 'Fréquence',    value: freqLabel },
          ].map(item => (
            <div key={item.label} className="bg-white/5 rounded-xl py-2.5 px-1">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider">{item.label}</p>
              <p className="text-xs font-bold text-white mt-1 font-mono leading-tight">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div className="mb-5">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
          Règles importantes
        </p>
        <ul className="space-y-2.5">
          {JOIN_RULES.map((rule, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-xs text-slate-400">{rule}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Trust score requirement */}
      {daret.min_trust_score && (
        <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">
            Score de confiance minimum requis :{' '}
            <span className="font-bold">{daret.min_trust_score}/1000</span>
          </p>
        </div>
      )}

      {/* Already member */}
      {daret.is_member && (
        <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
          <CheckCircle2 size={15} className="text-sky-400 shrink-0 mt-0.5" />
          <p className="text-xs text-sky-300">Vous êtes déjà membre de ce Daret.</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Annuler
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          isLoading={isLoading}
          disabled={daret.is_member || isLoading}
          onClick={() => onConfirm(daret.id)}
        >
          {daret.is_member ? 'Déjà membre' : 'Confirmer l\'adhésion'}
        </Button>
      </div>
    </Modal>
  );
};

const JoinByCodeModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const [inviteCode, setInviteCode] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!inviteCode.trim()) return;
    onConfirm(inviteCode.trim());
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rejoindre par code">
      <form onSubmit={submit} className="space-y-5">
        <div className="p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <KeyRound size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Code d'invitation</p>
            <p className="text-xs text-slate-400 mt-1">Saisissez le code partage par le createur du Daret.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">Code</label>
          <input
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
            placeholder="DRT-XXXXXX"
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white font-mono tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-600"
          />
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" className="flex-1" isLoading={isLoading} disabled={!inviteCode.trim() || isLoading}>
            Rejoindre
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ── Constants ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'my',        label: 'Mes Darets'  },
  { id: 'available', label: 'À rejoindre' },
  { id: 'completed', label: 'Terminés'    },
];

const AMOUNT_OPTS = [
  { label: 'Tous les montants', value: 'all'      },
  { label: '100 – 500 MAD',    value: '100-500'   },
  { label: '500 – 1 000 MAD',  value: '500-1000'  },
  { label: '1 000+ MAD',       value: '1000+'     },
];

const MEMBER_OPTS = [
  { label: 'Tous',  value: 'all'   },
  { label: '3 – 5', value: '3-5'   },
  { label: '6 – 10',value: '6-10'  },
  { label: '11+',   value: '11-20' },
];

const stagger  = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const cardAnim = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } };

const AnalyticsCards = ({ analytics, loading, error }) => {
  const stats = [
    { label: 'Darets actifs', value: safeNumber(analytics?.total_active_darets).toLocaleString('fr-MA'), icon: Users },
    { label: 'Darets termines', value: safeNumber(analytics?.completed_darets).toLocaleString('fr-MA'), icon: CheckCircle2 },
    { label: 'Paiements Daret', value: formatAmount(analytics?.total_daret_payments), icon: Banknote },
    { label: 'Pot distribue', value: formatAmount(analytics?.total_pot_distributed), icon: ArrowRight },
    { label: 'Retards', value: safeNumber(analytics?.late_payments_count).toLocaleString('fr-MA'), icon: AlertCircle },
    { label: 'Completion', value: `${safeNumber(analytics?.payment_completion_rate).toLocaleString('fr-MA')}%`, icon: Clock },
    { label: 'Mes actifs', value: safeNumber(analytics?.user_active_darets_count).toLocaleString('fr-MA'), icon: Star },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Icon size={15} className="text-emerald-400" />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-sm font-bold text-white mt-1 font-mono">{value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const DaretListPage = () => {
  const { addToast } = useOutletContext() || {};

  const [activeTab,    setActiveTab]    = useState('my');
  const [search,       setSearch]       = useState('');
  const [amountFilter, setAmountFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const [myDarets,     setMyDarets]     = useState([]);
  const [allDarets,    setAllDarets]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [analytics,    setAnalytics]    = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');
  const [joining,      setJoining]      = useState(false);
  const [joinModal,    setJoinModal]    = useState(null);
  const [codeModalOpen, setCodeModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [mine, all] = await Promise.allSettled([
        daretService.getMyDarets(),
        daretService.getAllDarets(),
      ]);

      setMyDarets(mine.status === 'fulfilled' && Array.isArray(mine.value) ? mine.value : []);
      setAllDarets(all.status === 'fulfilled' && Array.isArray(all.value) ? all.value : []);
    } catch {
      addToast?.('Impossible de charger les Darets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      setAnalytics(await daretService.getAnalytics());
    } catch {
      setAnalytics(null);
      setAnalyticsError('Impossible de charger les analytics Daret.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadAnalytics();
  }, []);

  const handleJoin = async (id) => {
    setJoining(true);
    try {
      await daretService.joinDaret(id);
      addToast?.('Vous avez rejoint le Daret avec succès !', 'success');
      setJoinModal(null);
      await load();
      await loadAnalytics();
    } catch (err) {
      addToast?.(err?.response?.data?.message || 'Erreur lors de l\'adhésion', 'error');
    } finally {
      setJoining(false);
    }
  };

  const handleJoinByCode = async (inviteCode) => {
    setJoining(true);
    try {
      await daretService.joinByCode(inviteCode);
      addToast?.('Vous avez rejoint le Daret avec succes !', 'success');
      setCodeModalOpen(false);
      await load();
      await loadAnalytics();
    } catch (err) {
      addToast?.(getErrorMessage(err) || 'Erreur lors de l\'adhesion', 'error');
    } finally {
      setJoining(false);
    }
  };

  const handlePay = async (daret) => {
    try {
      await daretService.payDaret(daret.id, {});
      addToast?.('Contribution payee avec succes !', 'success');
      await load();
      await loadAnalytics();
    } catch (err) {
      addToast?.(getErrorMessage(err) || 'Erreur lors du paiement', 'error');
    }
  };

  const applyFilters = (list) =>
    list.filter(d => {
      if (search && !d.name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (amountFilter !== 'all') {
        const amt = safeNumber(d.contribution_amount);
        if (amountFilter === '100-500'  && !(amt >= 100  && amt <=  500)) return false;
        if (amountFilter === '500-1000' && !(amt >= 500  && amt <= 1000)) return false;
        if (amountFilter === '1000+'    &&   amt < 1000)                  return false;
      }
      if (memberFilter !== 'all') {
        const cap = safeNumber(d.capacity);
        if (memberFilter === '3-5'   && !(cap >= 3  && cap <=  5)) return false;
        if (memberFilter === '6-10'  && !(cap >= 6  && cap <= 10)) return false;
        if (memberFilter === '11-20' &&   cap < 11)                return false;
      }
      return true;
    });

  const tabData = useMemo(() => {
    const base =
      activeTab === 'my'        ? myDarets.filter(d => d.status !== 'completed') :
      activeTab === 'available' ? allDarets.filter(d => !d.is_member && d.status === 'open') :
      myDarets.filter(d => d.status === 'completed');
    return applyFilters(base);
  }, [activeTab, myDarets, allDarets, search, amountFilter, memberFilter]);

  const myActiveCount = myDarets.filter(d => d.status !== 'completed').length;

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Daret Digital</h1>
          <p className="text-sm text-slate-400 mt-1">Tontine collaborative à la marocaine 🇲🇦</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" leftIcon={KeyRound} onClick={() => setCodeModalOpen(true)}>
            Code invitation
          </Button>
        <Link to="/darets/create">
          <Button variant="primary" leftIcon={Plus}>Créer un Daret</Button>
        </Link>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <AnalyticsCards analytics={analytics} loading={analyticsLoading} error={analyticsError} />

      <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              activeTab === tab.id
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-slate-400 hover:text-white',
            )}
          >
            {tab.label}
            {tab.id === 'my' && myActiveCount > 0 && (
              <span className="text-[10px] min-w-[18px] h-[18px] px-1 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold">
                {myActiveCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="flex-1 min-w-48 max-w-xs flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-emerald-500/40 transition-all">
          <Search size={15} className="text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Rechercher par nom…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm text-white placeholder:text-slate-500 w-full"
          />
        </div>

        {/* Amount range */}
        <select
          value={amountFilter}
          onChange={e => setAmountFilter(e.target.value)}
          className="bg-white/5 border border-white/10 text-sm text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-emerald-500/40 transition-all cursor-pointer"
        >
          {AMOUNT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Member count */}
        <select
          value={memberFilter}
          onChange={e => setMemberFilter(e.target.value)}
          className="bg-white/5 border border-white/10 text-sm text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-emerald-500/40 transition-all cursor-pointer"
        >
          {MEMBER_OPTS.map(o => <option key={o.value} value={o.value}>{o.label} membres</option>)}
        </select>
      </div>

      {/* ── Card grid ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : tabData.length > 0 ? (
        <motion.div
          key={activeTab + search + amountFilter + memberFilter}
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {tabData.map(d => (
            <motion.div key={d.id} variants={cardAnim}>
              <DaretCard daret={d} onJoin={setJoinModal} onPay={handlePay} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Users size={28} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-white">
              {activeTab === 'my'        ? 'Aucun Daret actif'       :
               activeTab === 'available' ? 'Aucun Daret disponible'  :
               'Aucun Daret terminé'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === 'my'        ? 'Créez ou rejoignez votre premier Daret'   :
               activeTab === 'available' ? 'Tous les Darets ouverts apparaîtront ici' :
               'Vos Darets terminés apparaîtront ici'}
            </p>
          </div>
          {activeTab === 'my' && (
            <Link to="/darets/create">
              <Button variant="primary" leftIcon={Plus} size="sm">Créer un Daret</Button>
            </Link>
          )}
        </motion.div>
      )}

      {/* ── Join modal ──────────────────────────────────────────────── */}
      <JoinDaretModal
        daret={joinModal}
        isOpen={!!joinModal}
        onClose={() => setJoinModal(null)}
        onConfirm={handleJoin}
        isLoading={joining}
      />
      <JoinByCodeModal
        isOpen={codeModalOpen}
        onClose={() => setCodeModalOpen(false)}
        onConfirm={handleJoinByCode}
        isLoading={joining}
      />
    </div>
  );
};

export default DaretListPage;
