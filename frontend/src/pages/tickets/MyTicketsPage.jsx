import React, { useState, useEffect, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, LifeBuoy, ChevronRight, Clock,
  Zap, Inbox, Filter,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ticketService from '../../services/ticketService';

// ── Config maps ───────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { id: 'all',         label: 'Tous'         },
  { id: 'open',        label: 'Ouverts'      },
  { id: 'in_progress', label: 'En cours'     },
  { id: 'resolved',    label: 'Résolus'      },
  { id: 'closed',      label: 'Fermés'       },
];

const STATUS_CONFIG = {
  open:        { label: 'Ouvert',    variant: 'info'    },
  in_progress: { label: 'En cours',  variant: 'warning' },
  resolved:    { label: 'Résolu',    variant: 'success' },
  closed:      { label: 'Fermé',     variant: 'neutral' },
};
const getStatusCfg = s => STATUS_CONFIG[s] || STATUS_CONFIG.open;

const PRIORITY_CONFIG = {
  low:    { label: 'Faible',  cls: 'bg-sky-500/10 text-sky-400 border-sky-500/20'    },
  medium: { label: 'Moyen',   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  high:   { label: 'Élevée',  cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  urgent: { label: 'Urgent',  cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' },
};
const getPriorityCfg = p => PRIORITY_CONFIG[p] || PRIORITY_CONFIG.low;

const SENTIMENT_CONFIG = {
  positive: { emoji: '😊', label: 'Positif',  cls: 'text-emerald-400' },
  neutral:  { emoji: '😐', label: 'Neutre',   cls: 'text-slate-400'   },
  negative: { emoji: '😞', label: 'Négatif',  cls: 'text-rose-400'    },
};
const getSentimentCfg = s => SENTIMENT_CONFIG[s] || SENTIMENT_CONFIG.neutral;

const CATEGORY_LABELS = {
  transfer:  'Virement',  account: 'Compte',    card:     'Carte',
  loan:      'Crédit',    daret:   'Daret',      cagnotte: 'Cagnotte',
  kyc:       'KYC',       technical: 'Technique', other:    'Autre',
};

const CATEGORIES_FILTER = [
  { value: 'all',       label: 'Toutes catégories' },
  { value: 'transfer',  label: 'Virement' },
  { value: 'account',   label: 'Compte' },
  { value: 'card',      label: 'Carte' },
  { value: 'loan',      label: 'Crédit' },
  { value: 'daret',     label: 'Daret' },
  { value: 'cagnotte',  label: 'Cagnotte' },
  { value: 'kyc',       label: 'KYC' },
  { value: 'technical', label: 'Technique' },
  { value: 'other',     label: 'Autre' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  const diff = (Date.now() - date) / 1000;
  if (diff < 60)     return "À l'instant";
  if (diff < 3600)   return `${Math.floor(diff / 60)} min`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

// ── Skeleton row ──────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="border-b border-white/5">
    {[3, 10, 5, 5, 5, 5, 4].map((w, i) => (
      <td key={i} className="px-4 py-4">
        <div className={cn('h-3 bg-white/5 animate-pulse rounded', `w-${w}/12`)} />
      </td>
    ))}
  </tr>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const MyTicketsPage = () => {
  const { addToast } = useOutletContext() || {};

  const [tickets,  setTickets]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('all');
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await ticketService.getMyTickets();
        setTickets(Array.isArray(data) ? data : []);
      } catch {
        addToast?.('Impossible de charger les tickets', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = [...tickets];
    if (tab !== 'all')      list = list.filter(t => t.status === tab);
    if (category !== 'all') list = list.filter(t => t.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        (t.title || t.subject)?.toLowerCase().includes(q) ||
        t.reference?.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  }, [tickets, tab, search, category]);

  const tabCount = (id) => id === 'all' ? tickets.length : tickets.filter(t => t.status === id).length;

  return (
    <div className="dg-ticket-page space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tickets support</h1>
          <p className="text-sm text-slate-400 mt-1">Suivez vos demandes et échanges avec notre équipe</p>
        </div>
        <Link to="/tickets/create">
          <Button variant="primary" leftIcon={Plus}>Nouveau ticket</Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/5 rounded-xl w-fit overflow-x-auto">
        {STATUS_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'relative px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
              tab === t.id
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-slate-400 hover:text-white',
            )}
          >
            {t.label}
            {tabCount(t.id) > 0 && (
              <span className={cn(
                'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                tab === t.id ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/10 text-slate-500',
              )}>
                {tabCount(t.id)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Category filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48 max-w-sm flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-emerald-500/40 transition-all">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Rechercher par sujet ou référence…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm text-white placeholder:text-slate-500 w-full"
          />
        </div>
        <div className="dg-ticket-category-filter flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <Filter size={13} className="text-emerald-400" />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="dg-ticket-category-select bg-transparent text-sm text-slate-300 outline-none appearance-none cursor-pointer"
          >
            {CATEGORIES_FILTER.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-bg-card border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Référence', 'Sujet', 'Catégorie', 'Priorité', 'Sentiment', 'Statut', 'Mise à jour'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length > 0 ? (
                filtered.map(ticket => {
                  const st   = getStatusCfg(ticket.status);
                  const pri  = getPriorityCfg(ticket.priority);
                  const sent = getSentimentCfg(ticket.sentiment);
                  return (
                    <motion.tr
                      key={ticket.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer group transition-colors"
                      onClick={() => window.location.href = `/tickets/${ticket.id}`}
                    >
                      {/* Reference */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-emerald-400 font-bold">
                          {ticket.reference || `#${ticket.id}`}
                        </span>
                      </td>
                      {/* Subject */}
                      <td className="px-4 py-3.5 max-w-[220px]">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-white font-medium truncate group-hover:text-emerald-400 transition-colors">
                            {ticket.title || ticket.subject}
                          </p>
                          {ticket.ai_confidence && (
                            <span className="shrink-0 flex items-center gap-1 text-[9px] text-teal-400 bg-teal-500/10 border border-teal-500/15 rounded-full px-1.5 py-0.5">
                              <Zap size={7} /> IA
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-slate-400 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                          {CATEGORY_LABELS[ticket.category] || ticket.category || '—'}
                        </span>
                      </td>
                      {/* Priority */}
                      <td className="px-4 py-3.5">
                        <span className={cn('text-xs border rounded-full px-2.5 py-1', pri.cls)}>
                          {pri.label}
                        </span>
                      </td>
                      {/* Sentiment */}
                      <td className="px-4 py-3.5">
                        <span className={cn('text-xs flex items-center gap-1 whitespace-nowrap', sent.cls)}>
                          <span>{sent.emoji}</span> {sent.label}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                      {/* Last update */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock size={11} />
                          <span className="text-xs whitespace-nowrap">{fmtDate(ticket.updated_at || ticket.created_at)}</span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7}>
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-4 py-20 text-center"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                          <Inbox size={24} className="text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-white">Aucun ticket trouvé</p>
                          <p className="text-sm text-slate-500 mt-1">
                            {search || category !== 'all' ? 'Modifiez vos filtres' : 'Créez votre premier ticket de support'}
                          </p>
                        </div>
                        {!search && category === 'all' && (
                          <Link to="/tickets/create">
                            <Button variant="primary" leftIcon={Plus} size="sm">Nouveau ticket</Button>
                          </Link>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-slate-500 text-center">
          {filtered.length} ticket{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

export default MyTicketsPage;
