import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Paperclip, X, Bot, Zap,
  ChevronRight, ChevronDown, User,
  RefreshCw, Loader2, FileText, BarChart2,
  Globe, MessageSquare, LifeBuoy, StickyNote,
  UserCheck, CheckCheck, XCircle, RotateCcw, UserPlus,
  Copy, Check,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ticketService from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';

// ── Config ────────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  open:        { label: 'Ouvert',   variant: 'info'    },
  in_progress: { label: 'En cours', variant: 'warning' },
  resolved:    { label: 'Résolu',   variant: 'success' },
  closed:      { label: 'Fermé',    variant: 'neutral' },
};

const PRIORITY_CONFIG = {
  low:    { label: 'Faible',  bar: 'bg-sky-500',    pct: 25  },
  medium: { label: 'Moyen',   bar: 'bg-amber-500',  pct: 50  },
  high:   { label: 'Élevée',  bar: 'bg-orange-500', pct: 75  },
  urgent: { label: 'Urgent',  bar: 'bg-rose-500',   pct: 100 },
};

const SENTIMENT_CONFIG = {
  positive: { emoji: '😊', label: 'Positif', cls: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  neutral:  { emoji: '😐', label: 'Neutre',  cls: 'text-slate-400',   bg: 'bg-white/5'        },
  negative: { emoji: '😞', label: 'Négatif', cls: 'text-rose-400',    bg: 'bg-rose-500/10'    },
};

const LANG_LABEL = { fr: '🇫🇷 Français', ar: '🇲🇦 Arabe', en: '🇬🇧 Anglais' };

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtTime = d => d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

// ── AI Insights panel ─────────────────────────────────────────────────────────
const AIInsightsPanel = ({ ticket, onToggle, onUseSuggested, isEmployee }) => {
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [copied, setCopied]           = useState(false);

  const pri  = PRIORITY_CONFIG[ticket.priority]  || PRIORITY_CONFIG.low;
  const sent = SENTIMENT_CONFIG[ticket.sentiment] || SENTIMENT_CONFIG.neutral;
  const conf = Math.round((ticket.ai_confidence || 0) * 100);

  const handleCopy = () => {
    if (!ticket.ai_suggested_reply) return;
    navigator.clipboard.writeText(ticket.ai_suggested_reply).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col h-full border-l border-white/5 bg-bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-500/15 flex items-center justify-center">
            <Bot size={13} className="text-teal-400" />
          </div>
          <span className="text-xs font-semibold text-white">Analyse IA</span>
        </div>
        <button onClick={onToggle} className="text-slate-500 hover:text-white transition-colors">
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Category */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Catégorie</p>
          <div className="flex items-center gap-2">
            <Zap size={11} className="text-teal-400 shrink-0" />
            <span className="text-xs text-white font-medium capitalize">{ticket.category || '—'}</span>
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Priorité</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white font-medium">{pri.label}</span>
              <span className="text-[10px] text-slate-500">{pri.pct}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pri.pct}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className={cn('h-full rounded-full', pri.bar)}
              />
            </div>
          </div>
        </div>

        {/* Sentiment */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sentiment</p>
          <div className={cn('flex items-center gap-2 rounded-lg px-3 py-2', sent.bg)}>
            <span className="text-lg leading-none">{sent.emoji}</span>
            <div>
              <p className={cn('text-xs font-semibold', sent.cls)}>{sent.label}</p>
              {ticket.sentiment_confidence != null && (
                <p className="text-[10px] text-slate-500">{Math.round(ticket.sentiment_confidence * 100)}% confiance</p>
              )}
            </div>
          </div>
        </div>

        {/* AI Confidence */}
        {conf > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Confiance IA</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Score global</span>
                <span className="text-xs font-bold text-teal-400">{conf}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${conf}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Language */}
        {ticket.language && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Langue détectée</p>
            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
              <Globe size={12} className="text-slate-400 shrink-0" />
              <span className="text-xs text-white">{LANG_LABEL[ticket.language] || ticket.language}</span>
            </div>
          </div>
        )}

        {/* AI suggested reply */}
        {ticket.ai_suggested_reply && (
          <div className="space-y-1.5">
            <button
              onClick={() => setSuggestOpen(v => !v)}
              className="w-full flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-teal-400 transition-colors"
            >
              <span>Réponse suggérée (IA)</span>
              <ChevronDown size={12} className={cn('transition-transform', suggestOpen && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {suggestOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-teal-500/[0.06] border border-teal-500/15 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Bot size={10} className="text-teal-400" />
                      <span className="text-[10px] text-teal-400 font-semibold">Auto-generated</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{ticket.ai_suggested_reply}</p>
                    {/* Employee-only: use suggested reply */}
                    {isEmployee && (
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={handleCopy}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
                        >
                          {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                          {copied ? 'Copié' : 'Copier'}
                        </button>
                        <button
                          onClick={() => { onUseSuggested(ticket.ai_suggested_reply); setSuggestOpen(false); }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-500/15 border border-teal-500/20 text-[10px] font-bold text-teal-400 hover:bg-teal-500/25 transition-colors"
                        >
                          <Zap size={10} /> Utiliser cette réponse
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="border-t border-white/5" />

        {/* Meta */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Informations</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Créé le</span>
              <span className="text-slate-300 text-right">{fmtDate(ticket.created_at)}</span>
            </div>
            {ticket.assigned_employee && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Conseiller</span>
                <span className="text-slate-300">{ticket.assigned_employee?.name || ticket.assigned_employee}</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Mise à jour</span>
              <span className="text-slate-300 text-right">{fmtDate(ticket.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Message bubble ────────────────────────────────────────────────────────────
const Bubble = ({ msg, isRTL }) => {
  const isUser     = msg.sender_type === 'user';
  const isBot      = msg.sender_type === 'bot';
  const isSystem   = msg.sender_type === 'system';
  const isInternal = msg.is_internal;

  if (isSystem) {
    return (
      <div className="flex items-center justify-center gap-3 my-2">
        <div className="h-px flex-1 bg-white/5" />
        <span className="text-[10px] text-slate-600 font-medium px-2">{msg.content}</span>
        <div className="h-px flex-1 bg-white/5" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-2.5 max-w-[80%]', isUser ? 'ml-auto flex-row-reverse' : 'mr-auto')}
    >
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1',
        isUser     ? 'bg-emerald-600/30 border border-emerald-500/30' :
        isBot      ? 'bg-gradient-to-br from-teal-500 to-emerald-600' :
        isInternal ? 'bg-amber-500/20 border border-amber-500/30' :
                     'bg-white/10 border border-white/10',
      )}>
        {isBot      ? <Bot    size={13} className="text-white" />     :
         isInternal ? <StickyNote size={13} className="text-amber-400" /> :
                      <User   size={13} className="text-slate-300" />}
      </div>

      <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-medium">{msg.sender_name || (isUser ? 'Vous' : 'Conseiller')}</span>
          <span className="text-[10px] text-slate-600">{fmtTime(msg.created_at)}</span>
          {isBot      && <span className="text-[9px] text-teal-400 bg-teal-500/10 border border-teal-500/15 rounded-full px-1.5">AI</span>}
          {isInternal && <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-1.5">Note interne</span>}
        </div>

        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed border max-w-full',
            isUser
              ? 'bg-gradient-to-br from-emerald-600/30 to-emerald-800/30 border-emerald-500/20 text-white rounded-tr-sm'
              : isBot
              ? 'bg-teal-500/[0.07] border-teal-500/15 text-slate-200 rounded-tl-sm'
              : isInternal
              ? 'bg-amber-500/[0.08] border-amber-500/20 text-amber-100 rounded-tl-sm'
              : 'bg-white/[0.04] border-white/[0.08] text-slate-200 rounded-tl-sm',
          )}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {msg.content}
        </div>

        {msg.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {msg.attachments.map((att, i) => (
              <a key={i} href={att.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-[10px] bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/20 transition-colors">
                <FileText size={11} /> {att.name || `Fichier ${i + 1}`}
              </a>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ── Status change confirmation modal ─────────────────────────────────────────
const StatusModal = ({ action, onConfirm, onClose, loading }) => {
  const CONFIG = {
    resolve:  { label: 'Résoudre',   desc: 'Marquer ce ticket comme résolu ?',      btn: 'Résoudre',  color: 'bg-emerald-500 hover:bg-emerald-400' },
    close:    { label: 'Fermer',     desc: 'Fermer définitivement ce ticket ?',      btn: 'Fermer',    color: 'bg-slate-600   hover:bg-slate-500'   },
    reopen:   { label: 'Rouvrir',    desc: 'Rouvrir ce ticket ?',                   btn: 'Rouvrir',   color: 'bg-blue-500    hover:bg-blue-400'    },
    assign:   { label: 'Assigner',   desc: 'S\'assigner ce ticket ?',               btn: 'Assigner',  color: 'bg-violet-500  hover:bg-violet-400'  },
  };
  const c = CONFIG[action] || {};
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        className="relative w-full max-w-xs bg-bg-card border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4"
      >
        <p className="font-bold text-white text-base">{c.label}</p>
        <p className="text-sm text-slate-400">{c.desc}</p>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-white/10 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            Annuler
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={cn('flex-1 py-2 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50', c.color)}>
            {loading ? 'En cours…' : c.btn}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const TicketDetailPage = () => {
  const { id }        = useParams();
  const navigate      = useNavigate();
  const { addToast }  = useOutletContext() || {};
  const { user }      = useAuth();
  const fileRef       = useRef();
  const bottomRef     = useRef();
  const intervalRef   = useRef();

  const isEmployee = user?.role === 'employee' || user?.role === 'admin';

  const [ticket,       setTicket]       = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [text,         setText]         = useState('');
  const [attachments,  setAttachments]  = useState([]);
  const [panelOpen,    setPanelOpen]    = useState(true);
  const [internalMode, setInternalMode] = useState(false);
  const [statusAction, setStatusAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isClosed = ticket?.status === 'closed' || ticket?.status === 'resolved';
  const isRTL    = ticket?.language === 'ar';

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await ticketService.getTicketById(id, { employee: isEmployee });
      setTicket(data);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch {
      if (!silent) addToast?.('Impossible de charger le ticket', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, isEmployee, addToast]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(() => load(true), 30000);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content && !attachments.length) return;
    if (isClosed && !isEmployee) return;

    setSending(true);
    const optimistic = {
      id:          `opt-${Date.now()}`,
      content,
      sender_type: isEmployee ? 'employee' : 'user',
      sender_name: user?.first_name || user?.name?.split(' ')[0] || (isEmployee ? 'Conseiller' : 'Vous'),
      is_internal: internalMode,
      created_at:  new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setText('');

    try {
      let payload;
      if (attachments.length) {
        payload = new FormData();
        payload.append('message', content);
        if (internalMode) payload.append('is_internal', 'true');
        attachments.forEach(f => payload.append('attachments', f));
        setAttachments([]);
      } else {
        payload = { message: content, is_internal: internalMode };
      }
      if (isEmployee) {
        await ticketService.replyTicket(id, payload);
      } else {
        await ticketService.sendMessage(id, payload);
      }
      load(true);
    } catch {
      addToast?.('Erreur lors de l\'envoi', 'error');
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const handleStatusAction = async () => {
    if (!statusAction) return;
    setActionLoading(true);
    try {
      const actions = {
        resolve:  () => ticketService.updateTicketStatus?.(id, 'resolved'),
        close:    () => ticketService.updateTicketStatus?.(id, 'closed'),
        assign:   () => ticketService.assignTicket?.(id),
      };
      await actions[statusAction]?.();
      addToast?.('Ticket mis à jour', 'success');
      load(true);
    } catch {
      addToast?.('Échec de la mise à jour', 'error');
    } finally {
      setActionLoading(false);
      setStatusAction(null);
    }
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] rounded-2xl bg-bg-card border border-white/5 overflow-hidden animate-pulse">
        <div className="h-14 border-b border-white/5 bg-white/[0.02]" />
        <div className="flex-1 p-6 space-y-6">
          {[40, 60, 50, 70, 45].map((w, i) => (
            <div key={i} className={cn('h-10 rounded-2xl bg-white/5', i % 2 === 0 ? 'w-2/5 mr-auto' : 'w-3/5 ml-auto')} />
          ))}
        </div>
        <div className="h-16 border-t border-white/5 bg-white/[0.02]" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-[40vh] gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center">
          <MessageSquare size={24} className="text-rose-400" />
        </div>
        <div>
          <p className="font-semibold text-white">Ticket introuvable</p>
          <p className="text-sm text-slate-500 mt-1">Ce ticket n'existe pas ou vous n'y avez pas accès.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate(isEmployee ? '/employee/tickets' : '/tickets')}>
          <ArrowLeft size={14} className="mr-1.5" /> Retour aux tickets
        </Button>
      </div>
    );
  }

  const st = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-2xl bg-bg-card border border-white/5 overflow-hidden">

      {/* ── Main chat column ─────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0">
          <button
            onClick={() => navigate(isEmployee ? '/employee/tickets' : '/tickets')}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
          </button>

          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <LifeBuoy size={14} className="text-emerald-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-emerald-400 font-bold shrink-0">
                {ticket.reference || `#${ticket.id}`}
              </span>
              <p className="text-sm font-semibold text-white truncate">{ticket.subject}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={st.variant}>{st.label}</Badge>
            <button onClick={() => load(true)}
              className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 hover:text-emerald-400 transition-colors">
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setPanelOpen(v => !v)}
              className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                panelOpen ? 'bg-teal-500/15 text-teal-400' : 'bg-white/5 text-slate-500 hover:text-teal-400')}>
              <BarChart2 size={13} />
            </button>
          </div>
        </div>

        {/* Employee action toolbar */}
        {isEmployee && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/[0.01] shrink-0 overflow-x-auto">
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest shrink-0">Actions</span>
            <div className="flex gap-1.5">
              {!ticket.assigned_employee && (
                <button onClick={() => setStatusAction('assign')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[11px] font-bold text-violet-400 hover:bg-violet-500/20 transition-colors whitespace-nowrap">
                  <UserPlus size={11} /> Assigner
                </button>
              )}
              {ticket.assigned_employee && (
                <button onClick={() => setStatusAction('assign')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-slate-400 hover:text-white transition-colors whitespace-nowrap">
                  <UserCheck size={11} /> Réassigner
                </button>
              )}
              {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                <button onClick={() => setStatusAction('resolve')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors whitespace-nowrap">
                  <CheckCheck size={11} /> Résoudre
                </button>
              )}
              {ticket.status !== 'closed' && (
                <button onClick={() => setStatusAction('close')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-slate-400 hover:text-white transition-colors whitespace-nowrap">
                  <XCircle size={11} /> Fermer
                </button>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                <MessageSquare size={20} className="text-slate-500" />
              </div>
              <p className="text-sm text-slate-500">Aucun message pour l'instant</p>
            </div>
          ) : (
            messages.map(msg => <Bubble key={msg.id} msg={msg} isRTL={isRTL} />)
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className={cn('border-t border-white/5 p-3 space-y-2 shrink-0 transition-colors', internalMode && 'bg-amber-500/[0.03]')}>
          {/* Internal note toggle for employees */}
          {isEmployee && (
            <div className="flex items-center gap-3 px-1">
              <button
                onClick={() => setInternalMode(v => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all',
                  internalMode
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-white/5 border-white/10 text-slate-500 hover:text-amber-400 hover:border-amber-500/20'
                )}
              >
                <StickyNote size={11} />
                {internalMode ? 'Note interne (cachée du client)' : 'Note interne'}
              </button>
              {internalMode && (
                <span className="text-[10px] text-amber-400/60">Ce message ne sera pas visible par le client</span>
              )}
            </div>
          )}

          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1">
              {attachments.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-slate-400">
                  <FileText size={10} />
                  <span className="max-w-[100px] truncate">{f.name}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}>
                    <X size={10} className="hover:text-rose-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <button type="button" onClick={() => fileRef.current?.click()}
              disabled={isClosed && !isEmployee}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-emerald-400 hover:border-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0">
              <Paperclip size={14} />
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf" className="hidden"
              onChange={e => setAttachments(prev => [...prev, ...Array.from(e.target.files)])} />

            <div className="flex-1 relative">
              <textarea
                rows={1}
                placeholder={
                  (isClosed && !isEmployee) ? 'Ce ticket est fermé — vous ne pouvez plus envoyer de messages' :
                  internalMode ? 'Note interne (invisible par le client)…' :
                  isRTL ? 'اكتب رسالتك…' : 'Écrivez votre message… (Entrée pour envoyer)'
                }
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                disabled={isClosed && !isEmployee}
                dir={isRTL ? 'rtl' : 'ltr'}
                className={cn(
                  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none resize-none transition-all',
                  'focus:border-emerald-500/40 disabled:opacity-40 disabled:cursor-not-allowed',
                  internalMode && 'border-amber-500/20 focus:border-amber-500/40 placeholder:text-amber-400/40',
                )}
                style={{ maxHeight: 120 }}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
              />
            </div>

            <Button
              variant={internalMode ? 'secondary' : 'primary'}
              onClick={handleSend}
              disabled={(!text.trim() && !attachments.length) || (isClosed && !isEmployee) || sending}
              className={cn('w-9 h-9 p-0 shrink-0', internalMode && 'bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30')}
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </Button>
          </div>

          {isClosed && !isEmployee && (
            <p className="text-[10px] text-slate-600 text-center">
              Ticket {ticket.status === 'resolved' ? 'résolu' : 'fermé'} · Impossible d'envoyer de nouveaux messages
            </p>
          )}
        </div>
      </div>

      {/* ── AI Insights panel ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden shrink-0"
          >
            <AIInsightsPanel
              ticket={ticket}
              isEmployee={isEmployee}
              onToggle={() => setPanelOpen(false)}
              onUseSuggested={reply => { setText(reply); setPanelOpen(false); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status action modal */}
      <AnimatePresence>
        {statusAction && (
          <StatusModal
            action={statusAction}
            onConfirm={handleStatusAction}
            onClose={() => setStatusAction(null)}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TicketDetailPage;
