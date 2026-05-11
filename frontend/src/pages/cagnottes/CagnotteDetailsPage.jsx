import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Heart, Shield, BadgeCheck, Users, Calendar,
  Copy, Share2, Flag, AlertTriangle, BookOpen, Layers,
  Check, X, Eye, EyeOff,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import cagnotteService from '../../services/cagnotteService';
import accountService   from '../../services/accountService';
import { safeNumber, formatAmount } from '../../utils/apiResponse';

// ── Shared helpers (same as list page) ───────────────────────────────────────
const CAT = {
  health:    { label: 'Santé',     icon: Heart,         grad: 'from-rose-800/70 via-rose-900/80',     ico: 'text-rose-300'    },
  education: { label: 'Éducation', icon: BookOpen,      grad: 'from-sky-800/70 via-sky-900/80',       ico: 'text-sky-300'     },
  emergency: { label: 'Urgence',   icon: AlertTriangle, grad: 'from-amber-800/70 via-amber-900/80',   ico: 'text-amber-300'   },
  family:    { label: 'Famille',   icon: Users,         grad: 'from-violet-800/70 via-violet-900/80', ico: 'text-violet-300'  },
  other:     { label: 'Autre',     icon: Layers,        grad: 'from-slate-700/70 via-slate-800/80',   ico: 'text-slate-400'   },
};
const getCat = k => CAT[k] || CAT.other;

const STATUS_MAP = {
  active:    { label: 'Active',     variant: 'success' },
  pending:   { label: 'En attente', variant: 'warning' },
  completed: { label: 'Terminée',   variant: 'neutral' },
  rejected:  { label: 'Rejetée',    variant: 'danger'  },
};

const Pulse = ({ className }) => <div className={cn('animate-pulse rounded-lg bg-white/5', className)} />;

const CoverImage = ({ src, category, className }) => {
  const cat  = getCat(category);
  const Icon = cat.icon;
  if (src) return (
    <div className={cn('relative overflow-hidden', className)}>
      <img src={src} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/70 to-transparent" />
    </div>
  );
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br to-bg-dark', cat.grad, className)}>
      <Icon size={72} className={cn('absolute bottom-6 right-6 opacity-20', cat.ico)} />
      <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/60 to-transparent" />
    </div>
  );
};

const daysLeft = expiresAt => {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt) - Date.now()) / 86400000));
};

// ── Donate Modal ──────────────────────────────────────────────────────────────
const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

const DonateModal = ({ campaign, isOpen, onClose, onSuccess }) => {
  const { addToast } = useOutletContext() || {};
  const [amount,    setAmount]    = useState('');
  const [message,   setMessage]   = useState('');
  const [anon,      setAnon]      = useState(false);
  const [balance,   setBalance]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);

  useEffect(() => {
    if (!isOpen) { setAmount(''); setMessage(''); setAnon(false); setSuccess(false); return; }
    accountService.getMyAccount().then(r => {
      const d = r?.data ?? r;
      setBalance(safeNumber(d?.balance ?? d?.data?.balance ?? d?.solde ?? 0));
    }).catch(() => {});
  }, [isOpen]);

  const amt    = safeNumber(amount);
  const after  = balance !== null ? balance - amt : null;
  const valid  = amt > 0 && (balance === null || amt <= balance);

  const handleDonate = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      await cagnotteService.donate(campaign.id, {
        amount:    amt,
        message:   message.trim() || undefined,
        anonymous: anon,
      });
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      addToast?.(err?.response?.data?.message || 'Erreur lors du don', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!campaign) return null;
  const cat = getCat(campaign.category);
  const CatIcon = cat.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={success ? '' : 'Faire un don'} className="max-w-lg">
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6 space-y-5"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto"
            >
              <Heart size={36} className="text-rose-400 fill-rose-400" />
            </motion.div>

            <div>
              <h3 className="text-xl font-bold text-white">Merci pour votre générosité&nbsp;💚</h3>
              <p className="text-sm text-slate-400 mt-2">
                Votre don de{' '}
                <span className="text-white font-bold font-mono">
                  {formatAmount(amt)}
                </span>{' '}
                a bien été enregistré.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={Share2}
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  addToast?.('Lien copié !', 'info');
                }}
              >
                Partager
              </Button>
              <Button variant="primary" size="sm" onClick={onClose}>
                Fermer
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {/* Campaign mini card */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br to-bg-card',
                cat.grad,
              )}>
                <CatIcon size={20} className={cat.ico} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{campaign.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatAmount(campaign.current_amount)} collectés
                </p>
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Montant du don *</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  placeholder="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 placeholder:text-slate-600"
                />
                <div className="flex items-center px-4 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-emerald-400 shrink-0">
                  MAD
                </div>
              </div>
              {/* Quick chips */}
              <div className="flex gap-2 flex-wrap">
                {QUICK_AMOUNTS.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(String(v))}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                      safeNumber(amount) === v
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:border-white/20',
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Balance summary */}
            {balance !== null && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-3 bg-white/[0.03] rounded-xl text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Votre solde</p>
                  <p className="text-sm font-bold text-white font-mono mt-0.5">
                    {formatAmount(balance)}
                  </p>
                </div>
                <div className={cn(
                  'p-3 rounded-xl text-center',
                  after !== null && after < 0
                    ? 'bg-rose-500/10 border border-rose-500/20'
                    : 'bg-emerald-500/10 border border-emerald-500/10',
                )}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Après le don</p>
                  <p className={cn(
                    'text-sm font-bold font-mono mt-0.5',
                    after !== null && after < 0 ? 'text-rose-400' : 'text-white',
                  )}>
                    {after !== null ? formatAmount(after) : '—'}
                  </p>
                </div>
              </div>
            )}
            {after !== null && after < 0 && (
              <p className="text-xs text-rose-400">Solde insuffisant pour ce montant.</p>
            )}

            {/* Optional message */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">
                Message à l'organisateur{' '}
                <span className="text-slate-600 font-normal">(optionnel)</span>
              </label>
              <textarea
                placeholder="Un message d'encouragement…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-600 resize-none"
              />
            </div>

            {/* Anonymous toggle */}
            <button
              type="button"
              onClick={() => setAnon(p => !p)}
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all text-left"
            >
              <div className={cn(
                'w-9 h-5 rounded-full flex items-center px-0.5 transition-all duration-300',
                anon ? 'bg-emerald-500 justify-end' : 'bg-white/10 justify-start',
              )}>
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Don anonyme</p>
                <p className="text-[10px] text-slate-500">Votre nom ne sera pas affiché publiquement</p>
              </div>
            </button>

            {/* Submit */}
            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Annuler
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                isLoading={loading}
                disabled={!valid || loading}
                onClick={handleDonate}
              >
                <Heart size={14} className="mr-1.5" />
                Confirmer le don
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};

// ── Story tabs ────────────────────────────────────────────────────────────────
const STORY_TABS = [
  { id: 'story',   label: 'Histoire'    },
  { id: 'updates', label: 'Mises à jour'},
  { id: 'donors',  label: 'Donateurs'   },
];

// ── Main page ─────────────────────────────────────────────────────────────────
const CagnotteDetailsPage = () => {
  const { id }       = useParams();
  const { addToast } = useOutletContext() || {};

  const [campaign,   setCampaign]   = useState(null);
  const [donors,     setDonors]     = useState([]);
  const [updates,    setUpdates]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [storyTab,   setStoryTab]   = useState('story');
  const [donateOpen, setDonateOpen] = useState(false);
  const [copied,     setCopied]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      cagnotteService.getCagnotteById(id).then(d => setCampaign(d)).catch(() => {}),
      cagnotteService.getDonors(id).then(d => setDonors(d)).catch(() => {}),
      cagnotteService.getUpdates(id).then(d => setUpdates(d)).catch(() => {}),
    ]);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast?.('Lien copié !', 'info');
  };

  if (loading) return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      <div className="flex-1 space-y-5">
        <Pulse className="h-60 rounded-2xl" />
        <Pulse className="h-6 w-64" />
        <Pulse className="h-40" />
      </div>
      <div className="lg:w-80 w-full space-y-4">
        <Pulse className="h-64" />
      </div>
    </div>
  );

  if (!campaign) return (
    <div className="py-24 text-center space-y-4">
      <AlertTriangle size={36} className="text-slate-600 mx-auto" />
      <p className="text-white font-semibold">Cagnotte introuvable</p>
      <Link to="/cagnottes">
        <Button variant="secondary" size="sm">Retour aux cagnottes</Button>
      </Link>
    </div>
  );

  const cat     = getCat(campaign.category);
  const CatIcon = cat.icon;
  const st      = STATUS_MAP[campaign.status] || STATUS_MAP.pending;
  const current = safeNumber(campaign.current_amount);
  const target  = safeNumber(campaign.target_amount, 1);
  const pct     = Math.min((current / target) * 100, 100);
  const days    = daysLeft(campaign.expires_at);

  return (
    <div className="dg-cagnotte-page space-y-6">
      {/* Breadcrumb */}
      <Link
        to="/cagnottes"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ChevronLeft size={16} />
        Cagnottes solidaires
      </Link>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* ── Left column ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Cover */}
          <CoverImage src={campaign.cover_image} category={campaign.category} className="h-60 rounded-2xl" />

          {/* Title + code chip */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={st.variant}>{st.label}</Badge>
              <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider', cat.chip ?? 'bg-white/5 text-slate-400 border border-white/10')}>
                {cat.label}
              </span>
              {campaign.verification_code && (
                <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/5 rounded-lg px-2.5 py-1">
                  <Shield size={11} className="text-slate-500" />
                  <span className="text-[10px] font-mono text-slate-400">{campaign.verification_code}</span>
                </div>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">{campaign.title}</h1>
          </div>

          {/* Organizer card */}
          {campaign.organizer && (
            <Card className="p-4 flex items-center gap-4">
              <Avatar
                name={campaign.organizer.name}
                src={campaign.organizer.avatar}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{campaign.organizer.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">Organisateur</p>
              </div>
              {campaign.organizer.is_kyc_verified && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full shrink-0">
                  <BadgeCheck size={14} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">KYC Vérifié</span>
                </div>
              )}
            </Card>
          )}

          {/* Story tabs */}
          <div>
            <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit mb-5">
              {STORY_TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setStoryTab(t.id)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    storyTab === t.id
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-slate-400 hover:text-white',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* Story */}
              {storyTab === 'story' && (
                <motion.div key="story" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Card className="p-6">
                    <div className="prose prose-sm prose-invert max-w-none">
                      <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                        {campaign.description || 'Aucune description disponible.'}
                      </p>
                    </div>
                    {(campaign.beneficiary_name || campaign.beneficiary_relationship) && (
                      <div className="mt-5 pt-5 border-t border-white/5 space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bénéficiaire</p>
                        <p className="text-sm font-medium text-white">{campaign.beneficiary_name}</p>
                        {campaign.beneficiary_relationship && (
                          <p className="text-xs text-slate-500">{campaign.beneficiary_relationship}</p>
                        )}
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}

              {/* Updates */}
              {storyTab === 'updates' && (
                <motion.div key="updates" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {updates.length > 0 ? (
                    <div className="space-y-4">
                      {updates.map((u, i) => (
                        <Card key={u.id || i} className="p-5">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-emerald-400">{i + 1}</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-slate-500 mb-1">
                                {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                              </p>
                              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{u.content}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500 text-sm">Aucune mise à jour pour l'instant.</div>
                  )}
                </motion.div>
              )}

              {/* Donors */}
              {storyTab === 'donors' && (
                <motion.div key="donors" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {donors.length > 0 ? (
                    <Card className="overflow-hidden">
                      <div className="divide-y divide-white/5">
                        {donors.map((d, i) => (
                          <div key={d.id || i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                            <Avatar name={d.anonymous ? 'Anonyme' : (d.name || d.user?.name || '?')} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">
                                {d.anonymous ? 'Anonyme' : (d.name || d.user?.name || 'Donateur')}
                              </p>
                              {d.message && (
                                <p className="text-xs text-slate-500 truncate mt-0.5 italic">"{d.message}"</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-emerald-400 font-mono">
                                {formatAmount(d.amount)}
                              </p>
                              <p className="text-[10px] text-slate-600 mt-0.5">
                                {d.created_at ? new Date(d.created_at).toLocaleDateString('fr-MA') : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ) : (
                    <div className="py-12 text-center text-slate-500 text-sm">
                      Soyez le premier à faire un don !
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right sticky column ──────────────────────────────────── */}
        <div className="lg:sticky lg:top-24 w-full lg:w-80 shrink-0 space-y-4">
          {/* Progress card */}
          <Card className="p-6 space-y-5">
            {/* Amount */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Collecté</p>
              <p className="text-3xl font-bold text-white font-mono">
                {formatAmount(current)}
              </p>
              <p className="text-sm text-slate-400 mt-0.5">
                sur {formatAmount(target)}
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                />
              </div>
              <p className="text-sm font-bold text-emerald-400">{Math.round(pct)}% atteint</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="text-center p-3 bg-white/[0.03] rounded-xl">
                <p className="text-lg font-bold text-white">{campaign.donors_count ?? donors.length}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Donateurs</p>
              </div>
              <div className="text-center p-3 bg-white/[0.03] rounded-xl">
                <p className="text-lg font-bold text-white">
                  {days !== null ? days : '∞'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Jours restants</p>
              </div>
            </div>

            {/* Donate button */}
            {campaign.status === 'active' && (
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setDonateOpen(true)}
              >
                <Heart size={16} className="mr-2" />
                Faire un don maintenant
              </Button>
            )}

            {/* Share buttons */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Partager</p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={copyLink}
                >
                  {copied ? <Check size={14} className="mr-1.5 text-emerald-400" /> : <Copy size={14} className="mr-1.5" />}
                  {copied ? 'Copié !' : 'Lien'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(window.location.href)}`, '_blank')}
                >
                  <Share2 size={14} className="mr-1.5" />
                  WhatsApp
                </Button>
              </div>
            </div>

            {/* Report */}
            <div className="pt-2 border-t border-white/5">
              <button className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-rose-400 transition-colors">
                <Flag size={11} />
                Signaler cette cagnotte
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Donate Modal */}
      <DonateModal
        campaign={campaign}
        isOpen={donateOpen}
        onClose={() => setDonateOpen(false)}
        onSuccess={() => { load(); }}
      />
    </div>
  );
};

export default CagnotteDetailsPage;
