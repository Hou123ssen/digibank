import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import {
  HeartHandshake, CheckCircle2, XCircle, X, Loader2,
  FileText, Users, TrendingUp, Shield, Clock, ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import cagnotteService from '../../services/cagnotteService';
import CagnotteCodeLookup from '../../components/cagnottes/CagnotteCodeLookup';
import { safeNumber, formatAmount } from '../../utils/apiResponse';

// ── Config ────────────────────────────────────────────────────────────────────
const CAT_LABEL = {
  health: 'Santé', education: 'Éducation', emergency: 'Urgence',
  family: 'Famille', other: 'Autre',
};

const STATUS_CONFIG = {
  pending:   { label: 'En attente', variant: 'warning' },
  active:    { label: 'Active',     variant: 'success' },
  rejected:  { label: 'Rejetée',    variant: 'danger'  },
  completed: { label: 'Terminée',   variant: 'neutral'  },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ── Reject modal ──────────────────────────────────────────────────────────────
const RejectModal = ({ onConfirm, onCancel, loading }) => {
  const [reason, setReason] = useState('');
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-bg-card border border-white/10 p-6 space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center">
            <XCircle size={20} className="text-rose-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Rejeter la cagnotte</h3>
            <p className="text-xs text-slate-400 mt-0.5">Le demandeur sera notifié</p>
          </div>
        </div>
        <textarea
          rows={3}
          placeholder="Raison du refus…"
          value={reason}
          onChange={e => setReason(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-rose-500/30 resize-none transition-all"
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all">
            Annuler
          </button>
          <Button variant="danger" className="flex-1" onClick={() => onConfirm(reason)} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Rejeter'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Detail drawer ─────────────────────────────────────────────────────────────
const DetailDrawer = ({ cagnotte, onClose, onApprove, onReject, actionLoading }) => {
  if (!cagnotte) return null;
  const st  = STATUS_CONFIG[cagnotte.status] || STATUS_CONFIG.pending;
  const current = safeNumber(cagnotte.current_amount);
  const target = safeNumber(cagnotte.target_amount, 1);
  const pct = Math.min((current / target) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 420 }}
        animate={{ x: 0 }}
        exit={{ x: 420 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-bg-card border-l border-white/10 flex flex-col h-full overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0 sticky top-0 bg-bg-card z-10">
          <div className="flex items-center gap-2">
            <HeartHandshake size={16} className="text-emerald-400" />
            <span className="font-semibold text-white text-sm">Détail de la cagnotte</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Cover / placeholder */}
          {cagnotte.cover_image ? (
            <div className="h-36 rounded-2xl overflow-hidden">
              <img src={cagnotte.cover_image} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="h-36 rounded-2xl bg-gradient-to-br from-emerald-900/40 to-slate-900 flex items-center justify-center">
              <HeartHandshake size={40} className="text-emerald-400/30" />
            </div>
          )}

          {/* Title + badge */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold text-white text-base leading-snug flex-1">{cagnotte.title}</h2>
              <Badge variant={st.variant} className="shrink-0">{st.label}</Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {cagnotte.category && (
                <span className="text-[10px] bg-white/5 border border-white/10 text-slate-400 rounded-full px-2.5 py-1 uppercase tracking-wider font-bold">
                  {CAT_LABEL[cagnotte.category] || cagnotte.category}
                </span>
              )}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <Shield size={9} />
                <span className="font-mono">{cagnotte.verification_code}</span>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8 }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-bold text-white font-mono">{formatAmount(current)}</span>
              <span className="text-slate-500">/ {formatAmount(target)}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Users,      val: cagnotte.donor_count  || 0, label: 'Donateurs' },
              { icon: TrendingUp, val: `${Math.round(pct)}%`,      label: 'Financé' },
              { icon: Clock,      val: fmtDate(cagnotte.created_at),label: 'Soumis' },
            ].map(s => (
              <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
                <s.icon size={13} className="text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-white">{s.val}</p>
                <p className="text-[9px] text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Story */}
          {(cagnotte.story || cagnotte.description) && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Histoire</p>
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {cagnotte.story || cagnotte.description}
                </p>
              </div>
            </div>
          )}

          {/* Beneficiary */}
          {(cagnotte.beneficiary_name || cagnotte.organizer_name) && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bénéficiaire</p>
              <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-sm font-bold text-emerald-400">
                  {(cagnotte.beneficiary_name || cagnotte.organizer_name)?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{cagnotte.beneficiary_name || cagnotte.organizer_name}</p>
                  {cagnotte.beneficiary_relationship && (
                    <p className="text-xs text-slate-500">{cagnotte.beneficiary_relationship}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Supporting documents */}
          {cagnotte.documents?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Documents justificatifs</p>
              <div className="space-y-1.5">
                {cagnotte.documents.map((doc, i) => (
                  <a
                    key={i}
                    href={doc.url || doc}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2.5 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5 hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] transition-all group"
                  >
                    <FileText size={13} className="text-slate-400 group-hover:text-emerald-400 shrink-0 transition-colors" />
                    <span className="text-xs text-slate-300 flex-1 truncate">{doc.name || `Document ${i + 1}`}</span>
                    <ExternalLink size={11} className="text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {cagnotte.status === 'pending' && (
          <div className="p-5 border-t border-white/5 flex gap-3 shrink-0 sticky bottom-0 bg-bg-card">
            <Button
              variant="ghost"
              className="flex-1 border border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
              onClick={() => onReject(cagnotte.id)}
              disabled={actionLoading}
            >
              <XCircle size={14} className="mr-1.5" /> Rejeter
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => onApprove(cagnotte.id)} disabled={actionLoading}>
              {actionLoading
                ? <Loader2 size={14} className="animate-spin mr-1.5" />
                : <CheckCircle2 size={14} className="mr-1.5" />
              }
              Approuver
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const EmployeeCagnottePage = () => {
  const { addToast } = useOutletContext() || {};

  const [cagnottes,     setCagnottes]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState(null);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [rejectModal,   setRejectModal]   = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cagnotteService.getPendingCagnottes();
      setCagnottes(Array.isArray(data) ? data : []);
    } catch {
      addToast?.('Impossible de charger les cagnottes', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openDrawer = (cagnotte) => { setSelected(cagnotte); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setTimeout(() => setSelected(null), 300); };

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      await cagnotteService.approveCagnotte(id);
      setCagnottes(prev => prev.map(c => c.id === id ? { ...c, status: 'active' } : c));
      if (selected?.id === id) setSelected(prev => ({ ...prev, status: 'active' }));
      addToast?.('Cagnotte approuvée avec succès', 'success');
    } catch {
      addToast?.('Erreur lors de l\'approbation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id, reason) => {
    setActionLoading(true);
    try {
      await cagnotteService.rejectCagnotte(id, { reason });
      setCagnottes(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' } : c));
      if (selected?.id === id) setSelected(prev => ({ ...prev, status: 'rejected' }));
      addToast?.('Cagnotte rejetée', 'success');
      setRejectModal(false);
    } catch {
      addToast?.('Erreur lors du rejet', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {rejectModal && selected && (
          <RejectModal
            loading={actionLoading}
            onConfirm={reason => handleReject(selected.id, reason)}
            onCancel={() => setRejectModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {drawerOpen && (
          <DetailDrawer
            cagnotte={selected}
            onClose={closeDrawer}
            onApprove={handleApprove}
            onReject={() => setRejectModal(true)}
            actionLoading={actionLoading}
          />
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Cagnottes solidaires</h1>
          <p className="text-sm text-slate-400 mt-1">Recherche par code ou examen des campagnes en attente</p>
        </div>

        {/* Code lookup */}
        <div className="rounded-2xl bg-bg-card border border-white/5 p-6">
          <p className="text-sm font-semibold text-white mb-4">Recherche par code de vérification</p>
          <CagnotteCodeLookup addToast={addToast} />
        </div>

        {/* Pending table */}
        <div className="rounded-2xl bg-bg-card border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <HeartHandshake size={15} className="text-pink-400" />
              <h2 className="text-sm font-semibold text-white">Campagnes en attente</h2>
              {!loading && (
                <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full px-2 py-0.5 font-bold">
                  {cagnottes.filter(c => c.status === 'pending').length}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['Code', 'Titre', 'Organisateur', 'Objectif', 'Soumis', 'Statut', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {[2, 5, 3, 3, 2, 2, 1].map((w, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className={`h-3 bg-white/5 animate-pulse rounded w-${w}/12`} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : cagnottes.length > 0 ? (
                  cagnottes.map(c => {
                    const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer group transition-colors"
                        onClick={() => openDrawer(c)}
                      >
                        <td className="px-4 py-3.5 font-mono text-xs text-emerald-400 font-bold">{c.verification_code}</td>
                        <td className="px-4 py-3.5 max-w-[180px]">
                          <p className="text-sm text-white truncate group-hover:text-emerald-400 transition-colors">{c.title}</p>
                          {c.category && (
                            <span className="text-[10px] text-slate-500">{CAT_LABEL[c.category] || c.category}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-400">{c.organizer_name || c.beneficiary_name || '—'}</td>
                        <td className="px-4 py-3.5 font-mono text-sm text-white">
                          {formatAmount(c.target_amount)}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">{fmtDate(c.created_at)}</td>
                        <td className="px-4 py-3.5">
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <ChevronRight size={14} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <HeartHandshake size={28} className="text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Aucune cagnotte en attente</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmployeeCagnottePage;
