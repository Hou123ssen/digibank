import React, { useState, useRef } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Zap, Paperclip, X, FileText,
  Loader2, Send, AlertCircle, Bot, Info,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from '../../components/ui/Button';
import ticketService from '../../services/ticketService';

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'transfer',    label: 'Virement / Transfert' },
  { value: 'account',     label: 'Compte bancaire' },
  { value: 'card',        label: 'Carte bancaire' },
  { value: 'loan',        label: 'Crédit / Prêt' },
  { value: 'daret',       label: 'Daret / Tontine' },
  { value: 'cagnotte',    label: 'Cagnotte solidaire' },
  { value: 'kyc',         label: "Vérification d'identité" },
  { value: 'technical',   label: 'Problème technique' },
  { value: 'other',       label: 'Autre' },
];

const LANGUAGES = [
  { value: 'fr', label: 'Français',  flag: '🇫🇷' },
  { value: 'ar', label: 'العربية',   flag: '🇲🇦' },
  { value: 'en', label: 'English',   flag: '🇬🇧' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const inputCls = (err) => cn(
  'w-full bg-white/5 border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-all',
  err
    ? 'border-rose-500/50 focus:border-rose-500'
    : 'border-white/10 focus:border-emerald-500/40',
);

const Field = ({ label, required, hint, error, children }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1 text-sm font-medium text-slate-300">
      {label}
      {required && <span className="text-emerald-400">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    {error && (
      <p className="flex items-center gap-1 text-xs text-rose-400">
        <AlertCircle size={11} /> {error}
      </p>
    )}
  </div>
);

// ── File attachment list ──────────────────────────────────────────────────────
const AttachmentList = ({ files, onRemove }) => {
  if (!files.length) return null;
  return (
    <ul className="space-y-1.5 mt-2">
      {files.map((f, i) => (
        <li key={i} className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
          <FileText size={12} className="text-slate-400 shrink-0" />
          <span className="text-xs text-slate-300 flex-1 truncate">{f.name}</span>
          <span className="text-[10px] text-slate-500 shrink-0">{(f.size / 1024).toFixed(0)} Ko</span>
          <button type="button" onClick={() => onRemove(i)} className="text-slate-600 hover:text-rose-400 transition-colors">
            <X size={12} />
          </button>
        </li>
      ))}
    </ul>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const CreateTicketPage = () => {
  const { addToast } = useOutletContext() || {};
  const navigate = useNavigate();
  const fileRef = useRef();

  const [form, setForm] = useState({
    subject:     '',
    category:    '',
    language:    'fr',
    description: '',
  });
  const [attachments, setAttachments] = useState([]);
  const [errors,      setErrors]      = useState({});
  const [submitting,  setSubmitting]  = useState(false);

  const set = (k) => (e) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }));
    if (errors[k]) setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
  };

  const addFiles = (newFiles) => {
    const arr = Array.from(newFiles).slice(0, 5 - attachments.length);
    setAttachments(prev => [...prev, ...arr]);
  };

  const validate = () => {
    const e = {};
    if (!form.subject.trim())     e.subject     = 'Le sujet est requis';
    else if (form.subject.length < 5) e.subject = 'Minimum 5 caractères';
    if (!form.category)           e.category    = 'Sélectionnez une catégorie';
    if (!form.description.trim()) e.description = 'Décrivez votre problème';
    else if (form.description.length < 20) e.description = 'Minimum 20 caractères';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      let payload;
      if (attachments.length) {
        payload = new FormData();
        payload.append('subject',     form.subject);
        payload.append('category',    form.category);
        payload.append('language',    form.language);
        payload.append('description', form.description);
        attachments.forEach(f => payload.append('attachments', f));
      } else {
        payload = { ...form };
      }
      const result = await ticketService.createTicket(payload);
      const id = result?.ticket?.id || result?.id;
      addToast?.('Ticket créé avec succès', 'success');
      navigate(id ? `/tickets/${id}` : '/tickets');
    } catch (err) {
      addToast?.(err?.response?.data?.message || 'Erreur lors de la création', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const detectedLang = LANGUAGES.find(l => l.value === form.language);

  return (
    <div className="dg-ticket-page max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Nouveau ticket</h1>
          <p className="text-sm text-slate-400">Notre IA analysera votre message automatiquement</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main form card */}
        <div className="rounded-2xl bg-bg-card border border-white/5 p-6 space-y-5">

          {/* Subject */}
          <Field label="Sujet" required error={errors.subject}>
            <input
              type="text"
              placeholder="Ex : Mon virement n'est pas arrivé"
              value={form.subject}
              onChange={set('subject')}
              className={inputCls(errors.subject)}
            />
          </Field>

          {/* Category + Language row */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Catégorie" required error={errors.category}>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={set('category')}
                  className={cn(inputCls(errors.category), 'appearance-none pr-8')}
                >
                  <option value="" disabled>Choisir…</option>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                {form.category && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-full px-1.5 py-0.5 pointer-events-none">
                    <Zap size={8} /> IA
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                <Zap size={9} className="text-teal-400" />
                L'IA affinera automatiquement la catégorie
              </p>
            </Field>

            <Field label="Langue" hint={`Auto-détectée : ${detectedLang?.flag} ${detectedLang?.label}`}>
              <div className="relative">
                <select
                  value={form.language}
                  onChange={set('language')}
                  className={cn(inputCls(false), 'appearance-none')}
                >
                  {LANGUAGES.map(l => (
                    <option key={l.value} value={l.value}>{l.flag} {l.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-full px-2 py-0.5 pointer-events-none font-medium">
                  Auto
                </div>
              </div>
            </Field>
          </div>

          {/* Description + attach */}
          <Field
            label="Description"
            required
            error={errors.description}
            hint="Décrivez votre problème en détail. Vous pouvez écrire en arabe, français, darija ou anglais."
          >
            <div className="relative">
              <textarea
                rows={6}
                placeholder="Décrivez votre problème ici…"
                value={form.description}
                onChange={set('description')}
                className={cn(inputCls(errors.description), 'resize-none pb-10')}
                dir={form.language === 'ar' ? 'rtl' : 'ltr'}
              />
              {/* Attach button inside textarea */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-2.5 left-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-400 transition-colors"
              >
                <Paperclip size={13} /> Joindre un fichier
              </button>
              <span className="absolute bottom-2.5 right-3 text-[10px] font-mono text-slate-600">
                {form.description.length}
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={e => addFiles(e.target.files)}
            />
            <AttachmentList files={attachments} onRemove={i => setAttachments(prev => prev.filter((_, idx) => idx !== i))} />
          </Field>

          {/* Priority (read-only) */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
              <Bot size={15} className="text-teal-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-300">Priorité</p>
              <p className="text-[11px] text-slate-500">Définie automatiquement par l'IA après analyse</p>
            </div>
            <div className="ml-auto text-[10px] font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-full px-2.5 py-1">
              Auto IA
            </div>
          </div>
        </div>

        {/* Submit */}
        <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
          {submitting
            ? <><Loader2 size={14} className="animate-spin mr-2" /> Envoi en cours…</>
            : <><Send size={14} className="mr-2" /> Créer le ticket</>
          }
        </Button>
      </form>

      {/* Info card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-teal-500/15 bg-teal-500/[0.04] p-5 flex gap-4"
      >
        <div className="w-9 h-9 rounded-xl bg-teal-500/15 flex items-center justify-center shrink-0 mt-0.5">
          <Info size={16} className="text-teal-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Traitement intelligent par IA</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Notre IA analyse votre message et assigne automatiquement la <span className="text-slate-300">catégorie</span>,
            la <span className="text-slate-300">priorité</span> et le <span className="text-slate-300">sentiment</span>.
            Un conseiller humain prendra en charge votre ticket dans les meilleurs délais.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateTicketPage;
