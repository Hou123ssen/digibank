import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Shield, Heart, CheckCircle2, XCircle, Loader2,
  AlertTriangle, Users, TrendingUp, Clock, X,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import cagnotteService from '../../services/cagnotteService';

// ── Category label map ────────────────────────────────────────────────────────
const CAT_LABEL = {
  health: 'Santé', education: 'Éducation', emergency: 'Urgence',
  family: 'Famille', other: 'Autre',
};

const STATUS_MAP = {
  active:    { label: 'Active',      variant: 'success' },
  pending:   { label: 'En attente',  variant: 'warning' },
  completed: { label: 'Terminée',    variant: 'neutral' },
  rejected:  { label: 'Rejetée',     variant: 'danger'  },
};
const getStatus = s => STATUS_MAP[s] || STATUS_MAP.pending;

// ── Confirmation modal ────────────────────────────────────────────────────────
const ConfirmModal = ({ action, onConfirm, onCancel, loading, rejectReason, setRejectReason }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    onClick={onCancel}
  >
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.92, opacity: 0 }}
      onClick={e => e.stopPropagation()}
      className="w-full max-w-sm rounded-2xl bg-bg-card border border-white/10 p-6 space-y-5"
    >
      {/* Icon */}
      <div className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center mx-auto',
        action === 'approve' ? 'bg-emerald-500/15' : 'bg-rose-500/15',
      )}>
        {action === 'approve'
          ? <CheckCircle2 size={24} className="text-emerald-400" />
          : <XCircle size={24} className="text-rose-400" />
        }
      </div>

      {/* Text */}
      <div className="text-center space-y-1">
        <h3 className="font-semibold text-white">
          {action === 'approve' ? 'Approuver la cagnotte' : 'Rejeter la cagnotte'}
        </h3>
        <p className="text-sm text-slate-400">
          {action === 'approve'
            ? 'Cette cagnotte sera immédiatement activée et visible par tous les membres.'
            : 'La demande sera refusée et le demandeur sera notifié.'}
        </p>
      </div>

      {/* Reject reason */}
      {action === 'reject' && (
        <textarea
          rows={3}
          placeholder="Raison du refus (optionnel)…"
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-rose-500/40 resize-none transition-all"
        />
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all"
        >
          Annuler
        </button>
        <Button
          variant={action === 'approve' ? 'primary' : 'danger'}
          className="flex-1"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading
            ? <Loader2 size={14} className="animate-spin" />
            : action === 'approve' ? 'Approuver' : 'Rejeter'
          }
        </Button>
      </div>
    </motion.div>
  </motion.div>
);

// ── Campaign result card ──────────────────────────────────────────────────────
const CampaignResultCard = ({ cagnotte, onApprove, onReject }) => {
  const current = Number(cagnotte.current_amount || 0);
  const target  = Number(cagnotte.target_amount  || 1);
  const pct     = Math.min((current / target) * 100, 100);
  const st      = getStatus(cagnotte.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-bg-card border border-white/8 overflow-hidden"
    >
      {/* Cover */}
      {cagnotte.cover_image ? (
        <div className="h-36 overflow-hidden">
          <img src={cagnotte.cover_image} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-36 bg-gradient-to-br from-emerald-900/40 to-slate-900 flex items-center justify-center">
          <Heart size={40} className="text-emerald-400/30" />
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{cagnotte.title}</h3>
            {cagnotte.category && (
              <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 uppercase tracking-wider font-bold">
                {CAT_LABEL[cagnotte.category] || cagnotte.category}
              </span>
            )}
          </div>
          <Badge variant={st.variant}>{st.label}</Badge>
        </div>

        {/* Description */}
        {cagnotte.description && (
          <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{cagnotte.description}</p>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center space-y-0.5">
            <TrendingUp size={14} className="text-emerald-400 mx-auto" />
            <p className="text-xs font-mono font-bold text-white">{current.toLocaleString('fr-MA')}</p>
            <p className="text-[10px] text-slate-500">Collecté MAD</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center space-y-0.5">
            <Users size={14} className="text-sky-400 mx-auto" />
            <p className="text-xs font-mono font-bold text-white">{cagnotte.donor_count || 0}</p>
            <p className="text-[10px] text-slate-500">Donateurs</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center space-y-0.5">
            <Clock size={14} className="text-amber-400 mx-auto" />
            <p className="text-xs font-mono font-bold text-white">{target.toLocaleString('fr-MA')}</p>
            <p className="text-[10px] text-slate-500">Objectif MAD</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
            />
          </div>
          <p className="text-[11px] text-emerald-400 font-medium">{Math.round(pct)}% de l'objectif atteint</p>
        </div>

        {/* Verification code */}
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2">
          <Shield size={13} className="text-slate-400 shrink-0" />
          <span className="text-sm font-mono text-slate-300 font-medium">{cagnotte.verification_code}</span>
        </div>

        {/* Beneficiary */}
        {(cagnotte.beneficiary_name || cagnotte.organizer_name) && (
          <div className="text-sm text-slate-400">
            <span className="text-slate-500">Bénéficiaire : </span>
            <span className="text-white font-medium">{cagnotte.beneficiary_name || cagnotte.organizer_name}</span>
            {cagnotte.beneficiary_relationship && (
              <span className="text-slate-500"> · {cagnotte.beneficiary_relationship}</span>
            )}
          </div>
        )}

        {/* Action buttons — only for pending */}
        {cagnotte.status === 'pending' && (
          <div className="flex gap-3 pt-2 border-t border-white/5">
            <Button
              variant="ghost"
              className="flex-1 border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
              onClick={onReject}
            >
              <XCircle size={14} className="mr-1.5" /> Rejeter
            </Button>
            <Button variant="primary" className="flex-1" onClick={onApprove}>
              <CheckCircle2 size={14} className="mr-1.5" /> Approuver
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const CagnotteCodeLookup = ({ addToast }) => {
  const [code,         setCode]         = useState('');
  const [searching,    setSearching]    = useState(false);
  const [cagnotte,     setCagnotte]     = useState(null);
  const [notFound,     setNotFound]     = useState(false);
  const [confirm,      setConfirm]      = useState(null); // 'approve' | 'reject' | null
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const displayCode = code ? `CAG-${code.replace(/^CAG-?/i, '').toUpperCase()}` : '';

  const search = async () => {
    const raw = code.trim();
    if (!raw) return;
    setSearching(true);
    setCagnotte(null);
    setNotFound(false);
    try {
      const fullCode = raw.toUpperCase().startsWith('CAG-') ? raw : `CAG-${raw}`;
      const result = await cagnotteService.findCagnotteByCode(fullCode);
      if (result && result.id) {
        setCagnotte(result);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        setNotFound(true);
      } else {
        addToast?.('Erreur lors de la recherche', 'error');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') search();
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await cagnotteService.approveCagnotte(cagnotte.id);
      setCagnotte(prev => ({ ...prev, status: 'active' }));
      addToast?.('Cagnotte approuvée avec succès', 'success');
      setConfirm(null);
    } catch {
      addToast?.('Erreur lors de l\'approbation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await cagnotteService.rejectCagnotte(cagnotte.id, { reason: rejectReason });
      setCagnotte(prev => ({ ...prev, status: 'rejected' }));
      addToast?.('Cagnotte rejetée', 'success');
      setConfirm(null);
      setRejectReason('');
    } catch {
      addToast?.('Erreur lors du rejet', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const reset = () => {
    setCode('');
    setCagnotte(null);
    setNotFound(false);
  };

  return (
    <>
      <AnimatePresence>
        {confirm && (
          <ConfirmModal
            action={confirm}
            onConfirm={confirm === 'approve' ? handleApprove : handleReject}
            onCancel={() => { setConfirm(null); setRejectReason(''); }}
            loading={actionLoading}
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
          />
        )}
      </AnimatePresence>

      <div className="max-w-lg mx-auto space-y-6">
        {/* Search card */}
        <div className="rounded-2xl bg-bg-card border border-white/8 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Shield size={18} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">Recherche par code</h2>
              <p className="text-xs text-slate-400">Entrez le code de vérification de la cagnotte</p>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Prefix */}
            <div className="flex items-center px-3 bg-white/5 border border-white/10 rounded-xl text-sm font-mono text-slate-400 shrink-0">
              CAG-
            </div>
            {/* Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="XXXX"
                value={code.replace(/^CAG-?/i, '')}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/40 transition-all uppercase"
              />
              {code && (
                <button
                  onClick={reset}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {/* Search button */}
            <Button variant="primary" onClick={search} disabled={!code.trim() || searching}>
              {searching
                ? <Loader2 size={15} className="animate-spin" />
                : <Search size={15} />
              }
            </Button>
          </div>
        </div>

        {/* Result */}
        <AnimatePresence mode="wait">
          {cagnotte && (
            <motion.div key="found" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CampaignResultCard
                cagnotte={cagnotte}
                onApprove={() => setConfirm('approve')}
                onReject={() => setConfirm('reject')}
              />
            </motion.div>
          )}

          {notFound && (
            <motion.div
              key="notfound"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-bg-card border border-white/8 p-10 flex flex-col items-center gap-4 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle size={24} className="text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Aucune cagnotte trouvée</p>
                <p className="text-sm text-slate-400 mt-1">
                  Le code <span className="font-mono text-slate-300">CAG-{code.replace(/^CAG-?/i, '')}</span> ne correspond à aucune campagne.
                </p>
              </div>
              <button
                onClick={reset}
                className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-2"
              >
                Effacer et réessayer
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default CagnotteCodeLookup;
