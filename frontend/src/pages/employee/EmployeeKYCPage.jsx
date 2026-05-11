import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CheckCircle2, XCircle, ZoomIn, X,
  ChevronDown, ChevronUp, Calendar, Loader2,
  BadgeCheck, User, Phone, AlertCircle, Shield,
  CheckSquare, Square, Download,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import kycService from '../../services/kycService';
import { useOutletContext } from 'react-router-dom';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { id: 'pending',  label: 'En attente', variant: 'warning' },
  { id: 'approved', label: 'Approuvés',  variant: 'success' },
  { id: 'rejected', label: 'Rejetés',    variant: 'danger'  },
  { id: 'all',      label: 'Tous'                           },
];

const STATUS_BADGE = {
  pending:  { label: 'En attente', variant: 'warning' },
  pending_review: { label: 'En attente', variant: 'warning' },
  needs_review: { label: 'En attente', variant: 'warning' },
  approved: { label: 'Approuvé',   variant: 'success' },
  rejected: { label: 'Rejeté',     variant: 'danger'  },
};

const PENDING_STATUSES = ['pending', 'pending_review', 'needs_review'];
const isPendingStatus = status => PENDING_STATUSES.includes(status);

const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

// ── Lightbox ──────────────────────────────────────────────────────────────────
const Lightbox = ({ src, alt, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}
      className="relative max-w-3xl w-full"
      onClick={e => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
      >
        <X size={16} />
      </button>
      <img src={src} alt={alt} className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh]" />
      {alt && <p className="text-center text-sm text-slate-400 mt-3">{alt}</p>}
    </motion.div>
  </motion.div>
);

// ── Reject modal ──────────────────────────────────────────────────────────────
const RejectModal = ({ loading, onConfirm, onCancel, isBulk, count }) => {
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
            <h3 className="font-semibold text-white">Rejeter {isBulk ? `${count} demandes` : 'la demande'}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Le demandeur sera notifié</p>
          </div>
        </div>
        <textarea
          rows={3}
          placeholder="Raison du refus (recommandé)…"
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

// ── KYC Card (expandable) ─────────────────────────────────────────────────────
const KYCCard = ({ sub, selected, onSelect, onApprove, onReject, onZoom, onDownloadPdf, approveLoading, rejectLoading, pdfLoading }) => {
  const [expanded, setExpanded] = useState(false);
  const st = STATUS_BADGE[sub.status] || STATUS_BADGE.pending;
  const user = sub.user || {};

  return (
    <motion.div
      layout
      className={cn(
        'rounded-2xl bg-bg-card border transition-all',
        selected ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-white/5 hover:border-white/10',
      )}
    >
      {/* Card header — always visible */}
      <div className="flex items-center gap-3 p-4">
        {/* Checkbox */}
        <button
          onClick={e => { e.stopPropagation(); onSelect(sub.id); }}
          className="text-slate-500 hover:text-emerald-400 transition-colors shrink-0"
        >
          {selected
            ? <CheckSquare size={18} className="text-emerald-400" />
            : <Square size={18} />
          }
        </button>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0">
          {(user.first_name?.[0] || user.name?.[0] || 'U').toUpperCase()}
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white truncate">
              {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.name || 'Utilisateur'}
            </p>
            <Badge variant={st.variant} className="shrink-0">{st.label}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-slate-500 truncate">{user.email}</span>
            <span className="text-[10px] text-slate-600 shrink-0">Soumis {fmtDate(sub.created_at || sub.submitted_at)}</span>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 space-y-5 border-t border-white/5">

              {/* CIN images */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                {[
                  { label: 'CIN Recto', key: 'cin_front', src: sub.cin_front_url },
                  { label: 'CIN Verso', key: 'cin_back',  src: sub.cin_back_url  },
                ].map(img => (
                  <div key={img.key} className="space-y-1.5">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{img.label}</p>
                    {img.src ? (
                      <div
                        className="relative h-32 rounded-xl overflow-hidden bg-white/5 border border-white/10 cursor-zoom-in group"
                        onClick={() => onZoom(img.src, img.label)}
                      >
                        <img src={img.src} alt={img.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-32 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-600 text-xs">
                        Non fourni
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Profile info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: User,      label: 'Prénom',      value: user.first_name },
                  { icon: User,      label: 'Nom',         value: user.last_name  },
                  { icon: Calendar,  label: 'Date de nais.',value: sub.date_of_birth ? fmtDate(sub.date_of_birth) : user.date_of_birth },
                  { icon: Phone,     label: 'Téléphone',   value: sub.phone || user.phone },
                  { icon: BadgeCheck,label: 'CIN numéro',  value: sub.national_id_number || sub.cin_number },
                  { icon: BadgeCheck,label: 'CIN OCR',     value: sub.detected_cin_number },
                  { icon: Shield,    label: 'Confiance OCR', value: sub.ocr_confidence_score != null ? `${sub.ocr_confidence_score}%` : null },
                  { icon: AlertCircle,label: 'Suspicion OCR', value: sub.ocr_suspicious ? 'Oui' : sub.ocr_suspicious === false ? 'Non' : null },
                  { icon: Shield,    label: 'Trust Score', value: sub.trust_score != null ? `${sub.trust_score} pts` : user.trust_score != null ? `${user.trust_score} pts` : '—' },
                ].filter(r => r.value).map(r => (
                  <div key={r.label} className="bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <r.icon size={9} /> {r.label}
                    </p>
                    <p className="text-sm text-white font-medium mt-0.5">{r.value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Rejection reason if rejected */}
              {sub.rejection_reason && (
                <div className="flex items-start gap-2 bg-rose-500/[0.05] border border-rose-500/20 rounded-xl px-3 py-2.5">
                  <AlertCircle size={13} className="text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-300">{sub.rejection_reason}</p>
                </div>
              )}

              <Button
                variant="ghost"
                className="w-full border border-white/10"
                onClick={() => onDownloadPdf(sub)}
                disabled={pdfLoading}
              >
                {pdfLoading ? <Loader2 size={13} className="animate-spin" /> : <><Download size={13} className="mr-1.5" /> Download KYC PDF</>}
              </Button>

              {/* Actions (only for pending) */}
              {isPendingStatus(sub.status) && (
                <div className="flex gap-3 pt-1">
                  <Button
                    variant="ghost"
                    className="flex-1 border border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
                    onClick={() => onReject(sub.id)}
                    disabled={rejectLoading}
                  >
                    {rejectLoading ? <Loader2 size={13} className="animate-spin" /> : <><XCircle size={13} className="mr-1.5" /> Rejeter</>}
                  </Button>
                  <Button variant="primary" className="flex-1" onClick={() => onApprove(sub.id)} disabled={approveLoading}>
                    {approveLoading ? <Loader2 size={13} className="animate-spin" /> : <><CheckCircle2 size={13} className="mr-1.5" /> Approuver</>}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const EmployeeKYCPage = () => {
  const { addToast } = useOutletContext() || {};

  const [submissions,   setSubmissions]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState('pending');
  const [search,        setSearch]        = useState('');
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');
  const [selectedIds,   setSelectedIds]   = useState(new Set());
  const [lightbox,      setLightbox]      = useState(null);
  const [rejectTarget,  setRejectTarget]  = useState(null); // { id, isBulk }
  const [actionLoading, setActionLoading] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await kycService.getPendingKyc();
      const items = data?.data ?? data ?? [];
      setSubmissions(Array.isArray(items) ? items : []);
    } catch {
      addToast?.('Impossible de charger les demandes KYC', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    const byStatus = submissions.filter(s => {
      if (activeTab === 'all') return true;
      if (activeTab === 'pending') return isPendingStatus(s.status);
      return s.status === activeTab;
    });

    if (!search.trim()) return byStatus;
    const q = search.toLowerCase();
    return byStatus.filter(s => {
      const u = s.user || {};
      return (u.email || '').toLowerCase().includes(q)
          || (u.first_name || u.name || '').toLowerCase().includes(q)
          || (u.last_name || '').toLowerCase().includes(q)
          || (s.cin_number || '').toLowerCase().includes(q)
          || (s.national_id_number || '').toLowerCase().includes(q)
          || (s.detected_cin_number || '').toLowerCase().includes(q);
    });
  }, [submissions, activeTab, search]);

  const setLoaderFor = (id, val) => setActionLoading(prev => ({ ...prev, [id]: val }));

  const handleApprove = async (id) => {
    setLoaderFor(`app-${id}`, true);
    try {
      await kycService.approveKyc(id);
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s));
      addToast?.('Demande KYC approuvée', 'success');
    } catch {
      addToast?.('Erreur lors de l\'approbation', 'error');
    } finally {
      setLoaderFor(`app-${id}`, false);
    }
  };

  const handleReject = async (id, reason) => {
    setLoaderFor(`rej-${id}`, true);
    try {
      await kycService.rejectKyc(id, { reason });
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'rejected', rejection_reason: reason } : s));
      addToast?.('Demande KYC rejetée', 'success');
      setRejectTarget(null);
    } catch {
      addToast?.('Erreur lors du rejet', 'error');
    } finally {
      setLoaderFor(`rej-${id}`, false);
    }
  };

  const handleBulkApprove = async () => {
    const ids = [...selectedIds];
    setActionLoading(prev => ({ ...prev, bulkApp: true }));
    try {
      await kycService.bulkApprove(ids);
      setSubmissions(prev => prev.map(s => ids.includes(s.id) ? { ...s, status: 'approved' } : s));
      setSelectedIds(new Set());
      addToast?.(`${ids.length} demande(s) approuvée(s)`, 'success');
    } catch {
      addToast?.('Erreur lors de l\'approbation groupée', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, bulkApp: false }));
    }
  };

  const handleBulkReject = async (reason) => {
    const ids = [...selectedIds];
    setActionLoading(prev => ({ ...prev, bulkRej: true }));
    try {
      await kycService.bulkReject(ids, reason);
      setSubmissions(prev => prev.map(s => ids.includes(s.id) ? { ...s, status: 'rejected' } : s));
      setSelectedIds(new Set());
      setRejectTarget(null);
      addToast?.(`${ids.length} demande(s) rejetée(s)`, 'success');
    } catch {
      addToast?.('Erreur lors du rejet groupé', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, bulkRej: false }));
    }
  };

  const safeFileName = (value) => (value || 'utilisateur')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'utilisateur';

  const handleDownloadPdf = async (sub) => {
    setLoaderFor(`pdf-${sub.id}`, true);
    try {
      const blob = await kycService.downloadKycPdf(sub.id);
      const user = sub.user || {};
      const displayName = user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.name || `kyc-${sub.id}`;
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `kyc-report-${safeFileName(displayName)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      addToast?.('Impossible de telecharger le rapport KYC', 'error');
    } finally {
      setLoaderFor(`pdf-${sub.id}`, false);
    }
  };

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(s => s.id)));
    }
  };

  return (
    <>
      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
        )}
      </AnimatePresence>

      {/* Reject modal */}
      <AnimatePresence>
        {rejectTarget && (
          <RejectModal
            loading={rejectTarget.isBulk ? actionLoading.bulkRej : actionLoading[`rej-${rejectTarget.id}`]}
            isBulk={rejectTarget.isBulk}
            count={selectedIds.size}
            onConfirm={reason => rejectTarget.isBulk ? handleBulkReject(reason) : handleReject(rejectTarget.id, reason)}
            onCancel={() => setRejectTarget(null)}
          />
        )}
      </AnimatePresence>

      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">File KYC</h1>
          <p className="text-sm text-slate-400 mt-1">Examinez et validez les demandes de vérification d'identité</p>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/5 rounded-xl w-fit overflow-x-auto">
          {STATUS_TABS.map(t => {
            const count = t.id === 'all'
              ? submissions.length
              : submissions.filter(s => t.id === 'pending' ? isPendingStatus(s.status) : s.status === t.id).length;
            return (
              <button
                key={t.id}
                onClick={() => { setActiveTab(t.id); setSelectedIds(new Set()); }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5',
                  activeTab === t.id
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-400 hover:text-white',
                )}
              >
                {t.label}
                {count > 0 && (
                  <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold', activeTab === t.id ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/10 text-slate-500')}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search + Date filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-48 max-w-sm flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-emerald-500/40 transition-all">
            <Search size={14} className="text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Nom, email, numéro CIN…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent outline-none text-sm text-white placeholder:text-slate-500 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40 transition-all"
            />
            <span className="text-slate-600 text-xs">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40 transition-all"
            />
          </div>
        </div>

        {/* Bulk actions bar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
            >
              <CheckSquare size={15} className="text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium flex-1">
                {selectedIds.size} demande(s) sélectionnée(s)
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Désélectionner
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="border border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
                onClick={() => setRejectTarget({ isBulk: true })}
              >
                <XCircle size={13} className="mr-1.5" /> Rejeter tout
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleBulkApprove}
                disabled={actionLoading.bulkApp}
              >
                {actionLoading.bulkApp
                  ? <Loader2 size={13} className="animate-spin mr-1.5" />
                  : <CheckCircle2 size={13} className="mr-1.5" />
                }
                Approuver tout
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Select all */}
        {filtered.length > 0 && !loading && (
          <div className="flex items-center gap-2">
            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              {selectedIds.size === filtered.length
                ? <CheckSquare size={14} className="text-emerald-400" />
                : <Square size={14} />
              }
              {selectedIds.size === filtered.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
            <span className="text-slate-600 text-xs">({filtered.length} résultats)</span>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-bg-card border border-white/5 animate-pulse" />
            ))
          ) : filtered.length > 0 ? (
            filtered.map(sub => (
              <KYCCard
                key={sub.id}
                sub={sub}
                selected={selectedIds.has(sub.id)}
                onSelect={toggleSelect}
                onApprove={handleApprove}
                onReject={id => setRejectTarget({ id, isBulk: false })}
                onZoom={(src, alt) => setLightbox({ src, alt })}
                onDownloadPdf={handleDownloadPdf}
                approveLoading={!!actionLoading[`app-${sub.id}`]}
                rejectLoading={!!actionLoading[`rej-${sub.id}`]}
                pdfLoading={!!actionLoading[`pdf-${sub.id}`]}
              />
            ))
          ) : (
            <div className="py-20 text-center rounded-2xl bg-bg-card border border-white/5">
              <BadgeCheck size={32} className="text-emerald-400/30 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white">Aucune demande trouvée</p>
              <p className="text-xs text-slate-500 mt-1">Modifiez vos filtres ou revenez plus tard</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EmployeeKYCPage;
