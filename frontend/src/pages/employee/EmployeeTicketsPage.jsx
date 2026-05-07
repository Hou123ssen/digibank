import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, LifeBuoy, Table2, Columns,
  ChevronRight, Clock, Zap, UserPlus, Loader2,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ticketService from '../../services/ticketService';

// ── Config maps ───────────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  low:    { label: 'Faible', cls: 'bg-sky-500/10 text-sky-400 border-sky-500/20',      rowBg: '' },
  medium: { label: 'Moyen',  cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',rowBg: '' },
  high:   { label: 'Élevée', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20', rowBg: 'bg-orange-500/[0.03]' },
  urgent: { label: 'Urgent', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20',   rowBg: 'bg-rose-500/[0.04]'    },
};

const SENTIMENT_CONFIG = {
  positive: { emoji: '😊', label: 'Positif', cls: 'text-emerald-400' },
  neutral:  { emoji: '😐', label: 'Neutre',  cls: 'text-slate-400'   },
  negative: { emoji: '😞', label: 'Négatif', cls: 'text-rose-400'    },
};

const STATUS_CONFIG = {
  open:        { label: 'Ouvert',   variant: 'info',    kanbanCol: 'open'        },
  in_progress: { label: 'En cours', variant: 'warning', kanbanCol: 'in_progress' },
  resolved:    { label: 'Résolu',   variant: 'success', kanbanCol: 'resolved'    },
  closed:      { label: 'Fermé',    variant: 'neutral', kanbanCol: 'closed'      },
};

const LANG_FLAG = { fr: '🇫🇷', ar: '🇲🇦', en: '🇬🇧', darija: '🇲🇦' };

const CAT_LABEL = {
  transfer: 'Virement', account: 'Compte', card: 'Carte', loan: 'Crédit',
  daret: 'Daret', cagnotte: 'Cagnotte', kyc: 'KYC', technical: 'Tech', other: 'Autre',
};

const KANBAN_COLS = [
  { id: 'open',        label: 'Ouvert',   color: 'border-sky-500/30 bg-sky-500/5'        },
  { id: 'in_progress', label: 'En cours', color: 'border-amber-500/30 bg-amber-500/5'    },
  { id: 'resolved',    label: 'Résolu',   color: 'border-emerald-500/30 bg-emerald-500/5' },
  { id: 'closed',      label: 'Fermé',    color: 'border-white/5 bg-white/[0.02]'        },
];

const fmtRel = d => {
  if (!d) return '—';
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
};

// ── Filter bar ────────────────────────────────────────────────────────────────
const FilterSelect = ({ value, onChange, options, placeholder }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300 outline-none appearance-none cursor-pointer focus:border-emerald-500/40 transition-all"
  >
    <option value="all" className="bg-[#111817]">{placeholder}</option>
    {options.map(o => <option key={o.value} value={o.value} className="bg-[#111817]">{o.label}</option>)}
  </select>
);

// ── Kanban card ───────────────────────────────────────────────────────────────
const KanbanCard = ({ ticket, onAssign, assignLoading }) => {
  const pri  = PRIORITY_CONFIG[ticket.priority]  || PRIORITY_CONFIG.low;
  const sent = SENTIMENT_CONFIG[ticket.sentiment] || SENTIMENT_CONFIG.neutral;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn('rounded-xl bg-bg-card border border-white/5 p-3 space-y-2.5 cursor-pointer group transition-all hover:border-white/10 hover:shadow-lg', pri.rowBg)}
      onClick={() => window.location.href = `/employee/tickets/${ticket.id}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[10px] text-emerald-400 font-bold">{ticket.reference || `#${ticket.id}`}</span>
        <span className={cn('text-[10px] border rounded-full px-2 py-0.5', pri.cls)}>{pri.label}</span>
      </div>
      <p className="text-xs text-white font-medium leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors">
        {ticket.subject}
      </p>
      <div className="flex items-center justify-between">
        <span className={cn('text-xs', sent.cls)}>{sent.emoji} {sent.label}</span>
        <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
          <Clock size={9} /> {fmtRel(ticket.created_at)}
        </span>
      </div>
      {!ticket.assigned_to_me && !ticket.assignee && (
        <button
          onClick={e => { e.stopPropagation(); onAssign(ticket.id); }}
          className="w-full text-[10px] text-slate-500 hover:text-emerald-400 flex items-center justify-center gap-1 pt-1 border-t border-white/5 transition-colors"
          disabled={assignLoading}
        >
          {assignLoading ? <Loader2 size={10} className="animate-spin" /> : <UserPlus size={10} />}
          {assignLoading ? 'Assignation…' : 'Assigner à moi'}
        </button>
      )}
    </motion.div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const EmployeeTicketsPage = () => {
  const { addToast } = useOutletContext() || {};

  const [tickets,  setTickets]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState('table');
  const [search,   setSearch]   = useState('');
  const [sortField, setSortField] = useState('priority');
  const [sortDir,   setSortDir]   = useState('desc');
  const [assignLoading, setAssignLoading] = useState({});

  const [filters, setFilters] = useState({
    status: 'all', priority: 'all', category: 'all',
    sentiment: 'all', language: 'all', assigned: 'all',
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await ticketService.getEmployeeTickets();
        setTickets(Array.isArray(data) ? data : []);
      } catch {
        addToast?.('Impossible de charger les tickets', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setFilter = k => v => setFilters(prev => ({ ...prev, [k]: v }));

  const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

  const filtered = useMemo(() => {
    let list = [...tickets];
    if (filters.status   !== 'all') list = list.filter(t => t.status    === filters.status);
    if (filters.priority !== 'all') list = list.filter(t => t.priority  === filters.priority);
    if (filters.category !== 'all') list = list.filter(t => t.category  === filters.category);
    if (filters.sentiment!== 'all') list = list.filter(t => t.sentiment === filters.sentiment);
    if (filters.language !== 'all') list = list.filter(t => t.language  === filters.language);
    if (filters.assigned === 'me')         list = list.filter(t => t.assigned_to_me);
    if (filters.assigned === 'unassigned') list = list.filter(t => !t.assignee && !t.assigned_to_me);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.subject?.toLowerCase().includes(q) ||
        t.reference?.toLowerCase().includes(q) ||
        (t.user_name || t.user?.name || '').toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      if (sortField === 'priority') {
        const diff = (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4);
        return sortDir === 'asc' ? diff : -diff;
      }
      if (sortField === 'created_at') {
        const diff = new Date(a.created_at) - new Date(b.created_at);
        return sortDir === 'asc' ? diff : -diff;
      }
      return 0;
    });
    return list;
  }, [tickets, filters, search, sortField, sortDir]);

  const handleAssign = async (id) => {
    setAssignLoading(prev => ({ ...prev, [id]: true }));
    try {
      await ticketService.assignTicket(id);
      setTickets(prev => prev.map(t => t.id === id ? { ...t, assigned_to_me: true, status: 'in_progress' } : t));
      addToast?.('Ticket assigné', 'success');
    } catch {
      addToast?.('Erreur lors de l\'assignation', 'error');
    } finally {
      setAssignLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">File de tickets</h1>
          <p className="text-sm text-slate-400 mt-1">Gérez et traitez les tickets de support clients</p>
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl self-start">
          <button
            onClick={() => setView('table')}
            className={cn('p-2 rounded-lg transition-all', view === 'table' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-white')}
          >
            <Table2 size={16} />
          </button>
          <button
            onClick={() => setView('kanban')}
            className={cn('p-2 rounded-lg transition-all', view === 'kanban' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-white')}
          >
            <Columns size={16} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Ref, sujet, client…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm text-white placeholder:text-slate-500 w-full"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterSelect value={filters.status}    onChange={setFilter('status')}    placeholder="Tous statuts"    options={[{ value: 'open', label: 'Ouvert' }, { value: 'in_progress', label: 'En cours' }, { value: 'resolved', label: 'Résolu' }, { value: 'closed', label: 'Fermé' }]} />
          <FilterSelect value={filters.priority}  onChange={setFilter('priority')}  placeholder="Toutes priorités" options={[{ value: 'urgent', label: 'Urgent' }, { value: 'high', label: 'Élevé' }, { value: 'medium', label: 'Moyen' }, { value: 'low', label: 'Faible' }]} />
          <FilterSelect value={filters.category}  onChange={setFilter('category')}  placeholder="Catégories"      options={Object.entries(CAT_LABEL).map(([k, v]) => ({ value: k, label: v }))} />
          <FilterSelect value={filters.sentiment} onChange={setFilter('sentiment')} placeholder="Sentiment"       options={[{ value: 'positive', label: '😊 Positif' }, { value: 'neutral', label: '😐 Neutre' }, { value: 'negative', label: '😞 Négatif' }]} />
          <FilterSelect value={filters.language}  onChange={setFilter('language')}  placeholder="Langue"         options={[{ value: 'fr', label: '🇫🇷 FR' }, { value: 'ar', label: '🇲🇦 AR' }, { value: 'en', label: '🇬🇧 EN' }]} />
          <FilterSelect value={filters.assigned}  onChange={setFilter('assigned')}  placeholder="Assigné"        options={[{ value: 'me', label: 'À moi' }, { value: 'unassigned', label: 'Non assigné' }]} />
        </div>
        <span className="text-xs text-slate-600 ml-auto">
          {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table view ────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {view === 'table' && (
          <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-2xl bg-bg-card border border-white/5 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {[
                      { label: 'Réf', sortable: false },
                      { label: 'Sujet', sortable: false },
                      { label: 'Client', sortable: false },
                      { label: 'Catégorie', sortable: false },
                      { label: 'Priorité', sortable: true, field: 'priority' },
                      { label: 'Sentiment', sortable: false },
                      { label: 'Langue', sortable: false },
                      { label: 'Créé', sortable: true, field: 'created_at' },
                      { label: 'Assigné à', sortable: false },
                      { label: '', sortable: false },
                    ].map(h => (
                      <th
                        key={h.label}
                        onClick={h.sortable ? () => toggleSort(h.field) : undefined}
                        className={cn(
                          'px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap',
                          h.sortable && 'cursor-pointer hover:text-slate-300 select-none',
                        )}
                      >
                        {h.label}
                        {h.sortable && sortField === h.field && (
                          <span className="ml-1 text-emerald-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-white/5">
                        {Array.from({ length: 10 }).map((_, j) => (
                          <td key={j} className="px-4 py-4">
                            <div className="h-3 bg-white/5 animate-pulse rounded w-3/4" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length > 0 ? (
                    filtered.map(t => {
                      const pri  = PRIORITY_CONFIG[t.priority]  || PRIORITY_CONFIG.low;
                      const sent = SENTIMENT_CONFIG[t.sentiment] || SENTIMENT_CONFIG.neutral;
                      const st   = STATUS_CONFIG[t.status]       || STATUS_CONFIG.open;
                      const assignee = t.assignee?.name || t.assigned_employee?.name || (t.assigned_to_me ? 'Moi' : null);
                      return (
                        <tr
                          key={t.id}
                          className={cn(
                            'border-b border-white/5 cursor-pointer group transition-all hover:bg-white/[0.02]',
                            pri.rowBg,
                          )}
                          onClick={() => window.location.href = `/employee/tickets/${t.id}`}
                        >
                          <td className="px-4 py-3.5 font-mono text-xs text-emerald-400 font-bold whitespace-nowrap">
                            {t.reference || `#${t.id}`}
                          </td>
                          <td className="px-4 py-3.5 max-w-[180px]">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm text-white truncate group-hover:text-emerald-400 transition-colors">{t.subject}</p>
                              {t.ai_confidence && <Zap size={9} className="text-teal-400 shrink-0" />}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                            {t.user_name || t.user?.name || '—'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs bg-white/5 border border-white/10 text-slate-400 rounded-full px-2.5 py-1">
                              {CAT_LABEL[t.category] || t.category || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn('text-xs border rounded-full px-2.5 py-1', pri.cls)}>{pri.label}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn('text-xs', sent.cls)}>{sent.emoji} {sent.label}</span>
                          </td>
                          <td className="px-4 py-3.5 text-base">{LANG_FLAG[t.language] || '—'}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                              <Clock size={10} /> {fmtRel(t.created_at)}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {assignee ? (
                              <span className="text-xs text-slate-400">{assignee}</span>
                            ) : (
                              <button
                                onClick={e => { e.stopPropagation(); handleAssign(t.id); }}
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-400 transition-colors whitespace-nowrap"
                                disabled={assignLoading[t.id]}
                              >
                                {assignLoading[t.id]
                                  ? <Loader2 size={10} className="animate-spin" />
                                  : <UserPlus size={10} />
                                }
                                Assigner
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <ChevronRight size={14} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-16 text-center">
                        <LifeBuoy size={28} className="text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">Aucun ticket trouvé</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── Kanban view ─────────────────────────────────────────────── */}
        {view === 'kanban' && (
          <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-start"
          >
            {KANBAN_COLS.map(col => {
              const colTickets = filtered.filter(t => (STATUS_CONFIG[t.status]?.kanbanCol || 'open') === col.id);
              return (
                <div key={col.id} className={cn('rounded-2xl border p-3 space-y-2', col.color)}>
                  <div className="flex items-center justify-between px-1 pb-1">
                    <span className="text-xs font-bold text-white">{col.label}</span>
                    <span className="text-[10px] bg-white/10 text-slate-400 rounded-full px-2 py-0.5 font-bold">
                      {colTickets.length}
                    </span>
                  </div>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />
                    ))
                  ) : colTickets.length > 0 ? (
                    colTickets.map(t => (
                      <KanbanCard key={t.id} ticket={t} onAssign={handleAssign} assignLoading={assignLoading[t.id]} />
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-600">Aucun ticket</div>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeTicketsPage;
