import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, ArrowDownLeft, ArrowUpRight, Send, Users,
  Bell, Star, Wallet, Copy, ChevronRight, Zap, Plus,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../components/landing/ThemeContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import accountService      from '../../services/accountService';
import transactionService  from '../../services/transactionService';
import trustService        from '../../services/trustService';
import notificationService from '../../services/notificationService';
import daretService        from '../../services/daretService';

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
const TrustRing = ({ score = 0, max = 1000, dark = true }) => {
  const r    = 36;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(score / max, 1);
  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg viewBox="0 0 90 90" className="w-full h-full relative z-10">
        {/* Track */}
        <circle cx="45" cy="45" r={r} fill="none" stroke={dark ? "rgba(255,255,255,0.06)" : "rgba(37,99,235,0.1)"} strokeWidth="8" />
        
        {/* Rotating dashed ring */}
        <motion.circle
          cx="45" cy="45" r={r}
          fill="none"
          stroke={dark ? "rgba(0,194,168,0.3)" : "rgba(37,99,235,0.3)"}
          strokeWidth="2"
          strokeDasharray="4 16"
          style={{ transformOrigin: 'center' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />

        {/* Progress with drawing animation */}
        <motion.circle
          cx="45" cy="45" r={r}
          fill="none"
          stroke={dark ? "#00C2A8" : "#2563EB"}
          strokeWidth="8"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${circ * pct} ${circ}` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          transform="rotate(-90 45 45)"
          style={{ filter: dark ? 'drop-shadow(0 0 6px rgba(0,194,168,0.5))' : 'drop-shadow(0 0 6px rgba(37,99,235,0.3))', transformOrigin: 'center' }}
        />
        
        {/* Score label */}
        <text
          x="45" y="48"
          textAnchor="middle"
          fill={dark ? "white" : "#020617"}
          fontSize="16"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
        >
          {score}
        </text>
      </svg>
      {/* Outer pulsing ring for 'alive' feel */}
      <div className={cn("absolute inset-0 rounded-full border animate-pulse pointer-events-none", dark ? "border-[#00C2A8]/20" : "border-[#2563EB]/20")} />
    </div>
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
  const { dark } = useTheme();
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
        accountService.getMyAccount().then(r => {
          const d = r?.data ?? r;
          setAccount(d);
        }),
        transactionService.getMyTransactions().then(r => {
          const raw = r?.transactions || r;
          const d = Array.isArray(raw) ? raw : [];
          setTransactions(d.slice(0, 5));
        }),
        trustService.getMyTrustScore().then(r => {
          const d = r?.data ?? r;
          setTrustScore(d);
        }),
        notificationService.getNotifications().then(r => {
          const d = Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : [];
          setNotifications(d.slice(0, 3));
        }),
        daretService.getMyDarets().then(r => {
          const d = Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : [];
          if (d.length > 0) setDaret(d[0]);
        }),
      ]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const displayName = user?.first_name || user?.name?.split(' ')[0] || 'Utilisateur';
  const balance     = account?.balance ?? account?.solde ?? '—';
  const accountNo   = account?.account_number ?? account?.numero ?? '4521';
  const maskedNo    = `**** **** ${String(accountNo).slice(-4)}`;

  const score       = trustScore?.score ?? trustScore?.trust_score ?? 0;
  const { label: trustLabel, variant: trustVariant } = trustLevel(score);

  const daretProgress = daret
    ? Math.round(((daret.current_cycle ?? 1) / (daret.total_cycles ?? 1)) * 100)
    : 0;

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="space-y-6 relative"
    >


      {/* ── Greeting ─────────────────────────────────────────────────── */}
      <motion.div variants={item} className="relative z-10">
        <h1 className={cn("text-2xl font-bold transition-colors", dark ? "text-white" : "text-[#0B1F37]")}>
          Bonjour, {displayName}&nbsp;👋
        </h1>
        <p className={cn("text-sm mt-1 capitalize transition-colors", dark ? "text-slate-400" : "text-slate-600")}>{frDate()}</p>
      </motion.div>

      {/* ── Row 1: 3 stat cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-5 relative z-10">

        {/* Balance card */}
        <motion.div variants={item} className="col-span-12 md:col-span-4">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            whileHover={{
              y: -12,
              rotateX: 3,
              rotateY: -4,
              scale: 1.025,
              transition: { type: 'spring', stiffness: 260, damping: 18 },
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="group relative rounded-2xl overflow-hidden border border-[#00C2A8]/20 shadow-xl shadow-[#00C2A8]/10 h-full will-change-transform"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* gradient bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-800/60 via-emerald-900/80 to-bg-card" />
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background:
                  'radial-gradient(circle at 25% 20%, rgba(220,249,244,0.22), transparent 30%), linear-gradient(120deg, transparent 20%, rgba(255,255,255,0.16) 45%, transparent 70%)',
              }}
              animate={{ x: ['-35%', '35%', '-35%'] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#00C2A8]/20 blur-2xl transition-all duration-500 group-hover:scale-125 group-hover:bg-[#00C2A8]/30" />
            <div className="absolute -bottom-14 left-8 h-32 w-32 rounded-full bg-emerald-300/10 blur-3xl transition-all duration-500 group-hover:translate-x-8 group-hover:bg-emerald-300/20" />
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
                  <p className={cn("text-3xl font-bold font-mono tracking-tight", dark ? "text-white" : "text-[#020617]")}>
                    {balanceHidden
                      ? '••••••'
                      : `${Number(balance).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD`}
                  </p>
                  <p className="text-xs text-emerald-400/80 mt-1 font-mono">{maskedNo}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                  <ArrowUpRight size={13} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  <span className="font-medium">+2.4% cette semaine</span>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(accountNo); addToast?.('Numéro copié', 'info'); }}
                  className="flex items-center gap-1 text-[10px] text-[#00C2A8]/60 hover:text-[#00C2A8] transition-colors"
                >
                  <Copy size={11} />
                  Copier
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Trust Score card */}
        <motion.div variants={item} className="col-span-12 md:col-span-4">
          <Card className="p-6 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={cn("text-xs font-semibold uppercase tracking-wider", dark ? "text-slate-400" : "text-slate-500")}>
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
                  <div className={cn("w-24 h-24 rounded-full animate-pulse", dark ? "bg-white/5" : "bg-blue-600/10")} />
                ) : (
                  <TrustRing score={score} dark={dark} />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className={cn("text-xs", dark ? "text-slate-500" : "text-slate-600")}>
                {loading ? '' : `${score} / 1000 points`}
              </p>
              <Link
                to="/trust-score"
                className={cn("flex items-center gap-1 text-xs font-medium transition-colors", dark ? "text-[#00C2A8] hover:text-[#00A090]" : "text-blue-600 hover:text-blue-700")}
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
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", dark ? "bg-rose-500/10" : "bg-rose-500/20")}>
                  <Bell size={16} className={cn(dark ? "text-rose-400" : "text-rose-600")} />
                </div>
                <p className={cn("text-sm font-semibold", dark ? "text-white" : "text-[#020617]")}>Notifications</p>
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

                    <div className={cn('flex-1 min-w-0', n.read_at && 'pl-4')}>
                      <p className={cn("text-xs font-medium truncate", dark ? "text-white" : "text-[#020617]")}>
                        {n.title || n.message || 'Notification'}
                      </p>
                      <p className={cn("text-[10px] mt-0.5", dark ? "text-slate-500" : "text-slate-600")}>
                        {n.created_at ? new Date(n.created_at).toLocaleDateString('fr-MA') : ''}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className={cn("text-sm text-center py-6", dark ? "text-slate-500" : "text-slate-600")}>Aucune notification</p>
              )}
            </div>

            <Link
              to="/notifications"
              className={cn("mt-4 flex items-center gap-1 text-xs font-medium transition-colors", dark ? "text-[#00C2A8] hover:text-[#00A090]" : "text-blue-600 hover:text-blue-700")}
            >
              Voir toutes <ChevronRight size={13} />
            </Link>
          </Card>
        </motion.div>
      </div>

      {/* ── Row 2: Transactions + Daret ──────────────────────────────── */}
      <div className="grid grid-cols-12 gap-5 relative z-10">

        {/* Recent Transactions */}
        <motion.div variants={item} className="col-span-12 lg:col-span-8">
          <Card className="overflow-hidden">
            <div className={cn("flex items-center justify-between px-6 py-4 border-b", dark ? "border-white/5" : "border-[#2563EB]/10")}>
              <h3 className={cn("font-semibold", dark ? "text-white" : "text-[#020617]")}>Transactions récentes</h3>
              <Link
                to="/transactions"
                className={cn("text-xs font-medium transition-colors flex items-center gap-1", dark ? "text-[#00C2A8] hover:text-[#00A090]" : "text-blue-600 hover:text-blue-700")}
              >
                Voir tout <ChevronRight size={13} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={cn("text-[10px] font-bold uppercase tracking-widest border-b", dark ? "text-slate-500 border-white/5" : "text-slate-600 border-[#2563EB]/10")}>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-6 py-3 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", dark ? "divide-white/5" : "divide-[#2563EB]/5")}>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <td key={j} className="px-6 py-4">
                            <Pulse className="h-4" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : transactions.length > 0 ? (
                    transactions.map((tx, i) => {
                      const amount  = parseFloat(tx.amount ?? tx.montant ?? 0);
                      const isCredit = amount >= 0;
                      return (
                        <tr key={i} className={cn("transition-colors", dark ? "hover:bg-white/[0.02]" : "hover:bg-[#2563EB]/[0.02]")}>
                          <td className={cn("px-6 py-4 text-xs whitespace-nowrap", dark ? "text-slate-400" : "text-slate-500")}>
                            {tx.created_at
                              ? new Date(tx.created_at).toLocaleDateString('fr-MA')
                              : tx.date || '—'}
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant={txBadge(tx.type)}>
                              {txLabel(tx.type)}
                            </Badge>
                          </td>
                          <td className={cn("px-4 py-4 text-xs max-w-[160px] truncate", dark ? "text-slate-300" : "text-slate-700")}>
                            {tx.description || tx.label || tx.type || 'Transaction'}
                          </td>
                          <td className={cn(
                            'px-6 py-4 text-right text-sm font-bold font-mono whitespace-nowrap',
                            isCredit ? 'text-[#00C2A8]' : 'text-rose-400',
                          )}>
                            {isCredit ? '+' : ''}{amount.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className={cn("px-6 py-12 text-center text-sm", dark ? "text-slate-500" : "text-slate-600")}>
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
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", dark ? "bg-violet-500/10" : "bg-violet-500/20")}>
                <Users size={16} className={cn(dark ? "text-violet-400" : "text-violet-600")} />
              </div>
              <h3 className={cn("font-semibold", dark ? "text-white" : "text-[#020617]")}>Mon Daret Actif</h3>
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
                    <p className={cn("text-base font-bold", dark ? "text-white" : "text-[#020617]")}>{daret.name || 'Daret Familial'}</p>
                    <p className={cn("text-xs mt-0.5", dark ? "text-slate-400" : "text-slate-500")}>
                      Cycle {daret.current_cycle ?? 1} / {daret.total_cycles ?? '?'} &nbsp;·&nbsp;
                      {daret.members_count ?? daret.participants ?? '?'} membres
                    </p>
                  </div>

                  {daret.next_payment_date && (
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn(dark ? "text-slate-400" : "text-slate-500")}>Prochaine contribution</span>
                      <span className={cn("font-medium", dark ? "text-white" : "text-[#020617]")}>
                        {new Date(daret.next_payment_date).toLocaleDateString('fr-MA')}
                      </span>
                    </div>
                  )}

                  {daret.contribution_amount && (
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn(dark ? "text-slate-400" : "text-slate-500")}>Montant</span>
                      <span className={cn("font-mono font-bold", dark ? "text-white" : "text-[#020617]")}>
                        {Number(daret.contribution_amount).toLocaleString('fr-MA')} MAD
                      </span>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="space-y-1.5 pt-2">
                    <div className={cn("flex justify-between text-[10px]", dark ? "text-slate-500" : "text-slate-600")}>
                      <span>Progression</span>
                      <span>{daretProgress}%</span>
                    </div>
                    <div className={cn("h-2 rounded-full overflow-hidden", dark ? "bg-white/5" : "bg-blue-600/10")}>
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
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", dark ? "bg-violet-500/10 text-violet-400" : "bg-violet-500/20 text-violet-600")}>
                  <Users size={22} />
                </div>
                <div>
                  <p className={cn("text-sm font-medium", dark ? "text-white" : "text-[#020617]")}>Aucun Daret actif</p>
                  <p className={cn("text-xs mt-1", dark ? "text-slate-500" : "text-slate-600")}>Rejoignez ou créez un Daret</p>
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
      <motion.div variants={item} className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className={cn(dark ? "text-[#00C2A8]" : "text-[#009682]")} />
          <h3 className={cn("font-semibold", dark ? "text-white" : "text-[#020617]")}>Actions rapides</h3>
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
                    'relative p-5 rounded-2xl border cursor-pointer',
                    'ring-1 shadow-lg shadow-[#00C2A8]/10 transition-shadow duration-300 group',
                    dark ? "bg-bg-card border-[#00C2A8]/20 hover:border-[#00C2A8]/40" : "bg-white border-[#00C2A8]/30 hover:border-[#00C2A8]/50",
                    a.ring, a.glow,
                    'hover:shadow-xl',
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110',
                    a.icon_bg,
                  )}>
                    <Icon size={20} className={a.icon_fg} />
                  </div>
                  <p className={cn("text-sm font-bold", dark ? "text-white" : "text-[#020617]")}>{a.label}</p>
                  <p className={cn("text-[11px] mt-0.5", dark ? "text-slate-500" : "text-slate-600")}>{a.sub}</p>
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
