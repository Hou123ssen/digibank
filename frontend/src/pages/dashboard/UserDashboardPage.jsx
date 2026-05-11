import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, ArrowDownLeft, ArrowUpRight, Send, Users,
  Bell, Star, Wallet, Copy, ChevronRight, Zap, Plus,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import accountService      from '../../services/accountService';
import transactionService  from '../../services/transactionService';
import trustService        from '../../services/trustService';
import notificationService from '../../services/notificationService';
import daretService        from '../../services/daretService';
import { safeNumber } from '../../utils/apiResponse';

// ── Animation variants ────────────────────────────────────────────────────────
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

// ── Trust score SVG ring ──────────────────────────────────────────────────────
const TrustRing = ({ score = 0, max = 1000 }) => {
  const r    = 36;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(score / max, 1);
  return (
    <svg viewBox="0 0 90 90" className="w-24 h-24">
      {/* Track */}
      <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      {/* Progress */}
      <circle
        cx="45" cy="45" r={r}
        fill="none"
        stroke="#10b981"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${circ * pct} ${circ}`}
        transform="rotate(-90 45 45)"
        style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.5))' }}
      />
      {/* Score label */}
      <text
        x="45" y="48"
        textAnchor="middle"
        fill="white"
        fontSize="16"
        fontWeight="700"
        fontFamily="JetBrains Mono, monospace"
      >
        {score}
      </text>
    </svg>
  );
};

// ── Skeleton pulse ────────────────────────────────────────────────────────────
const Pulse = ({ className }) => (
  <div className={cn('animate-pulse rounded-lg bg-white/5', className)} />
);

// ── Transaction type → badge variant map ──────────────────────────────────────
const txBadge = type => {
  const t = (type || '').toLowerCase();
  if (t.includes('deposit') || t.includes('credit') || t.includes('receive'))
    return 'success';
  if (t.includes('transfer'))
    return 'info';
  if (t.includes('withdraw') || t.includes('debit'))
    return 'danger';
  return 'neutral';
};

const txLabel = type => {
  const t = (type || '').toLowerCase();
  if (t.includes('deposit'))  return 'Dépôt';
  if (t.includes('credit'))   return 'Crédit';
  if (t.includes('withdraw')) return 'Retrait';
  if (t.includes('transfer')) return 'Virement';
  if (t.includes('debit'))    return 'Débit';
  return type || 'Transaction';
};

// ── Trust level ───────────────────────────────────────────────────────────────
const trustLevel = score => {
  if (score >= 851) return { label: 'Excellent',  variant: 'success' };
  if (score >= 601) return { label: 'Bon',         variant: 'info'    };
  if (score >= 301) return { label: 'Fiable',      variant: 'warning' };
  return               { label: 'Normal',        variant: 'neutral' };
};

// ── French date ───────────────────────────────────────────────────────────────
const frDate = () =>
  new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

// ── Quick action tiles ────────────────────────────────────────────────────────
const ACTIONS = [
  {
    label: 'Déposer',      sub: 'Alimenter le compte',    icon: ArrowDownLeft,
    path: '/accounts',
    ring: 'ring-emerald-500/20', icon_bg: 'bg-emerald-500/10', icon_fg: 'text-emerald-400',
    glow: 'hover:shadow-emerald-900/30',
  },
  {
    label: 'Retirer',      sub: 'Retrait en espèces',     icon: ArrowUpRight,
    path: '/accounts',
    ring: 'ring-teal-500/20',    icon_bg: 'bg-teal-500/10',    icon_fg: 'text-teal-400',
    glow: 'hover:shadow-teal-900/30',
  },
  {
    label: 'Virement',     sub: 'Envoyer de l\'argent',   icon: Send,
    path: '/transfer',
    ring: 'ring-sky-500/20',     icon_bg: 'bg-sky-500/10',     icon_fg: 'text-sky-400',
    glow: 'hover:shadow-sky-900/30',
  },
  {
    label: 'Nouveau Daret', sub: 'Créer un cercle',       icon: Users,
    path: '/darets',
    ring: 'ring-violet-500/20',  icon_bg: 'bg-violet-500/10',  icon_fg: 'text-violet-400',
    glow: 'hover:shadow-violet-900/30',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
const UserDashboardPage = () => {
  const { user }  = useAuth();
  const { addToast } = useOutletContext() || {};

  const [account,       setAccount]       = useState(null);
  const [transactions,  setTransactions]  = useState([]);
  const [trustScore,    setTrustScore]    = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [daret,         setDaret]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [balanceHidden, setBalanceHidden] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.allSettled([
        // Services already unwrap the envelope — use the value directly
        accountService.getMyAccount().then(r => setAccount(r)),
        transactionService.getMyTransactions().then(r => {
          setTransactions(Array.isArray(r) ? r.slice(0, 5) : []);
        }),
        trustService.getMyTrustScore().then(r => setTrustScore(r)),
        notificationService.getNotifications().then(r => {
          const d = Array.isArray(r) ? r : [];
          setNotifications(d.slice(0, 3));
        }),
        daretService.getMyDarets().then(r => {
          const darets = Array.isArray(r) ? r : [];
          setDaret(darets.find(item => item.status !== 'completed') || null);
        }),
      ]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const displayName = user?.first_name || user?.name?.split(' ')[0] || 'Utilisateur';
  const balance = safeNumber(
    account?.balance ??
    account?.data?.balance ??
    0
  );
  const formattedBalance = balance.toLocaleString('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const accountNo   = account?.account_number ?? account?.numero ?? '4521';
  const maskedNo    = `**** **** ${String(accountNo).slice(-4)}`;

  const score       = trustScore?.score ?? trustScore?.trust_score ?? 0;
  const { label: trustLabel, variant: trustVariant } = trustLevel(score);

  const currentCycle = Number(daret?.current_cycle ?? 1);
  const totalCycles = Number(daret?.total_cycles ?? 1);
  const daretProgress = daret && Number.isFinite(currentCycle) && Number.isFinite(totalCycles) && totalCycles > 0
    ? Math.round((currentCycle / totalCycles) * 100)
    : 0;

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Greeting ─────────────────────────────────────────────────── */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-white">
          Bonjour, {displayName}&nbsp;👋
        </h1>
        <p className="text-sm text-slate-400 mt-1 capitalize">{frDate()}</p>
      </motion.div>

      {/* ── Row 1: 3 stat cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-5">

        {/* Balance card */}
        <motion.div variants={item} className="col-span-12 md:col-span-4">
          <div className="relative rounded-2xl overflow-hidden border border-emerald-500/20 shadow-xl shadow-emerald-900/20 h-full">
            {/* gradient bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-800/60 via-emerald-900/80 to-bg-card" />
            {/* subtle grid */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            <div className="relative p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-400/20 flex items-center justify-center">
                    <Wallet size={16} className="text-emerald-300" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                    Solde disponible
                  </span>
                </div>
                <button
                  onClick={() => setBalanceHidden(h => !h)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-300/70 hover:text-emerald-200 transition-colors"
                >
                  {balanceHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {loading ? (
                <Pulse className="h-10 w-40" />
              ) : (
                <div>
                  <p className="text-3xl font-bold text-white font-mono tracking-tight">
                    {balanceHidden
                      ? '••••••'
                      : `${formattedBalance} MAD`}
                  </p>
                  <p className="text-xs text-emerald-400/80 mt-1 font-mono">{maskedNo}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                  <ArrowUpRight size={13} />
                  <span className="font-medium">+2.4% cette semaine</span>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(accountNo); addToast?.('Numéro copié', 'info'); }}
                  className="flex items-center gap-1 text-[10px] text-emerald-400/60 hover:text-emerald-300 transition-colors"
                >
                  <Copy size={11} />
                  Copier
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Trust Score card */}
        <motion.div variants={item} className="col-span-12 md:col-span-4">
          <Card className="p-6 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Trust Score
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  {loading ? (
                    <Pulse className="h-5 w-20" />
                  ) : (
                    <Badge variant={trustVariant}>{trustLabel}</Badge>
                  )}
                </div>
              </div>
              <div className="relative">
                {loading ? (
                  <div className="w-24 h-24 rounded-full animate-pulse bg-white/5" />
                ) : (
                  <TrustRing score={score} />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {loading ? '' : `${score} / 1000 points`}
              </p>
              <Link
                to="/trust-score"
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                Voir détails <ChevronRight size={13} />
              </Link>
            </div>
          </Card>
        </motion.div>

        {/* Notifications card */}
        <motion.div variants={item} className="col-span-12 md:col-span-4">
          <Card className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <Bell size={16} className="text-rose-400" />
                </div>
                <p className="text-sm font-semibold text-white">Notifications</p>
              </div>
              {unreadCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 bg-rose-500/15 text-rose-400 rounded-full font-bold">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex-1 space-y-2.5">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Pulse key={i} className="h-9" />)
              ) : notifications.length > 0 ? (
                notifications.map((n, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-start gap-2.5 p-2.5 rounded-xl',
                      !n.read_at ? 'bg-emerald-500/[0.06]' : 'bg-white/[0.02]',
                    )}
                  >
                    {!n.read_at && (
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    )}
                    <div className={cn('flex-1 min-w-0', n.read_at && 'pl-4')}>
                      <p className="text-xs font-medium text-white truncate">
                        {n.title || n.message || 'Notification'}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {n.created_at ? new Date(n.created_at).toLocaleDateString('fr-MA') : ''}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-6">Aucune notification</p>
              )}
            </div>

            <Link
              to="/notifications"
              className="mt-4 flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              Voir toutes <ChevronRight size={13} />
            </Link>
          </Card>
        </motion.div>
      </div>

      {/* ── Row 2: Transactions + Daret ──────────────────────────────── */}
      <div className="grid grid-cols-12 gap-5">

        {/* Recent Transactions */}
        <motion.div variants={item} className="col-span-12 lg:col-span-8">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h3 className="font-semibold text-white">Transactions récentes</h3>
              <Link
                to="/transactions"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors flex items-center gap-1"
              >
                Voir tout <ChevronRight size={13} />
              </Link>
            </div>

            <div className="overflow-x-auto -mx-0">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
                    <th className="px-4 sm:px-6 py-3 text-left">Date</th>
                    <th className="px-3 sm:px-4 py-3 text-left">Type</th>
                    <th className="px-3 sm:px-4 py-3 text-left hidden sm:table-cell">Description</th>
                    <th className="px-4 sm:px-6 py-3 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <td key={j} className="px-4 sm:px-6 py-4">
                            <Pulse className="h-4" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : transactions.length > 0 ? (
                    transactions.map((tx, i) => {
                      const amount  = safeNumber(tx.amount ?? tx.montant ?? 0);
                      const isCredit = amount >= 0;
                      return (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 sm:px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                            {tx.created_at
                              ? new Date(tx.created_at).toLocaleDateString('fr-MA')
                              : tx.date || '—'}
                          </td>
                          <td className="px-3 sm:px-4 py-4">
                            <Badge variant={txBadge(tx.type)}>
                              {txLabel(tx.type)}
                            </Badge>
                          </td>
                          <td className="px-3 sm:px-4 py-4 text-xs text-slate-300 max-w-[120px] sm:max-w-[160px] truncate hidden sm:table-cell">
                            {tx.description || tx.label || tx.type || 'Transaction'}
                          </td>
                          <td className={cn(
                            'px-4 sm:px-6 py-4 text-right text-sm font-bold font-mono whitespace-nowrap',
                            isCredit ? 'text-emerald-400' : 'text-rose-400',
                          )}>
                            {isCredit ? '+' : ''}{amount.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 sm:px-6 py-12 text-center text-sm text-slate-500">
                        Aucune transaction récente
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* Daret Summary */}
        <motion.div variants={item} className="col-span-12 lg:col-span-4">
          <Card className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Users size={16} className="text-violet-400" />
              </div>
              <h3 className="font-semibold text-white">Mon Daret Actif</h3>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Pulse className="h-5 w-32" />
                <Pulse className="h-4 w-24" />
                <Pulse className="h-2 w-full mt-4" />
              </div>
            ) : daret ? (
              <>
                <div className="space-y-3 flex-1">
                  <div>
                    <p className="text-base font-bold text-white">{daret.name || 'Daret Familial'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cycle {daret.current_cycle ?? 1} / {daret.total_cycles ?? '?'} &nbsp;·&nbsp;
                      {daret.members_count ?? daret.participants ?? '?'} membres
                    </p>
                  </div>

                  {daret.next_payment_date && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Prochaine contribution</span>
                      <span className="text-white font-medium">
                        {new Date(daret.next_payment_date).toLocaleDateString('fr-MA')}
                      </span>
                    </div>
                  )}

                  {daret.contribution_amount && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Montant</span>
                      <span className="text-white font-mono font-bold">
                        {safeNumber(daret.contribution_amount).toLocaleString('fr-MA')} MAD
                      </span>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Progression</span>
                      <span>{daretProgress}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${daretProgress}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut', delay: 0.4 }}
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full mt-5"
                  onClick={() => addToast?.('Paiement de la contribution initié', 'info')}
                >
                  Payer la contribution
                </Button>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400">
                  <Users size={22} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Aucun Daret actif</p>
                  <p className="text-xs text-slate-500 mt-1">Rejoignez ou créez un Daret</p>
                </div>
                <Link to="/darets">
                  <Button variant="secondary" size="sm">
                    <Plus size={14} className="mr-1.5" /> Nouveau Daret
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* ── Row 3: Quick Actions ─────────────────────────────────────── */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-emerald-400" />
          <h3 className="font-semibold text-white">Actions rapides</h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {ACTIONS.map(a => {
            const Icon = a.icon;
            return (
              <Link key={a.label} to={a.path}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    'relative p-5 rounded-2xl bg-bg-card border border-white/5 cursor-pointer',
                    'ring-1 shadow-lg transition-shadow duration-300 group',
                    a.ring, a.glow,
                    'hover:border-white/10 hover:shadow-xl',
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110',
                    a.icon_bg,
                  )}>
                    <Icon size={20} className={a.icon_fg} />
                  </div>
                  <p className="text-sm font-bold text-white">{a.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{a.sub}</p>
                  <ChevronRight
                    size={14}
                    className={cn('absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity', a.icon_fg)}
                  />
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UserDashboardPage;
