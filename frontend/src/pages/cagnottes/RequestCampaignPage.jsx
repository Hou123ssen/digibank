import React, { useState, useRef, useCallback } from 'react';
import { Link, useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Upload, X, FileText, CheckCircle2,
  Copy, Check, Heart, ImageIcon, Loader2, AlertCircle,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from '../../components/ui/Button';
import cagnotteService from '../../services/cagnotteService';

// ── Category options ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'health',    label: 'Santé' },
  { value: 'education', label: 'Éducation' },
  { value: 'emergency', label: 'Urgence' },
  { value: 'family',    label: 'Famille' },
  { value: 'other',     label: 'Autre' },
];

const RELATIONSHIPS = [
  'Moi-même', 'Conjoint(e)', 'Enfant', 'Parent', 'Frère / Sœur',
  'Ami(e)', 'Collègue', 'Autre',
];

// ── Field wrapper ─────────────────────────────────────────────────────────────
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

const inputCls = (err) => cn(
  'w-full bg-white/5 border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-all',
  err ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/10 focus:border-emerald-500/40',
);

// ── Cover image dropzone ──────────────────────────────────────────────────────
const CoverDropzone = ({ file, onChange, onRemove }) => {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const preview = file ? URL.createObjectURL(file) : null;

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) onChange(f);
  }, [onChange]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !file && inputRef.current?.click()}
      className={cn(
        'relative rounded-2xl border-2 border-dashed overflow-hidden transition-all duration-200',
        file ? 'border-white/10 h-44 cursor-default' : 'border-white/10 h-44 cursor-pointer hover:border-emerald-500/40',
        dragging && 'border-emerald-500/60 bg-emerald-500/5',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); }}
      />
      {file ? (
        <>
          <img src={preview} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <X size={13} className="text-white" />
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
          <ImageIcon size={28} className="opacity-40" />
          <p className="text-xs text-center">
            Glissez une image ici ou <span className="text-emerald-400 underline">parcourir</span>
          </p>
          <p className="text-[10px] opacity-60">JPG, PNG, WEBP — max 5 Mo</p>
        </div>
      )}
    </div>
  );
};

// ── Documents dropzone ────────────────────────────────────────────────────────
const DocsDropzone = ({ files, onChange }) => {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const add = useCallback((newFiles) => {
    const arr = Array.from(newFiles).filter(f =>
      ['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)
    );
    onChange(prev => [...prev, ...arr].slice(0, 5));
  }, [onChange]);

  const remove = (i) => onChange(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'rounded-2xl border-2 border-dashed h-28 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 text-slate-500',
          'hover:border-emerald-500/40',
          dragging ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-white/10',
        )}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf,image/*" className="hidden"
          onChange={e => add(e.target.files)} />
        <Upload size={22} className="opacity-40" />
        <p className="text-xs text-center">
          Glissez vos documents ou <span className="text-emerald-400 underline">parcourir</span>
        </p>
        <p className="text-[10px] opacity-60">PDF, JPG, PNG — max 5 fichiers</p>
      </div>

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
              <FileText size={13} className="text-slate-400 shrink-0" />
              <span className="text-xs text-slate-300 flex-1 truncate">{f.name}</span>
              <span className="text-[10px] text-slate-500 shrink-0">{(f.size / 1024).toFixed(0)} Ko</span>
              <button type="button" onClick={() => remove(i)} className="text-slate-600 hover:text-rose-400 transition-colors shrink-0">
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── Success screen ────────────────────────────────────────────────────────────
const SuccessScreen = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center gap-8 py-12 max-w-md mx-auto"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
        className="relative"
      >
        <div className="w-24 h-24 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <Heart size={40} className="text-emerald-400 fill-emerald-400" />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center"
        >
          <CheckCircle2 size={16} className="text-white" />
        </motion.div>
      </motion.div>

      {/* Text */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Demande soumise !</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Votre demande de cagnotte est en cours d'examen par notre équipe.
          Conservez votre code de vérification — il vous sera demandé lors de la validation.
        </p>
      </div>

      {/* Verification code */}
      <div className="w-full bg-white/[0.03] border border-white/8 rounded-2xl p-6 space-y-3">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Code de vérification</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-3xl font-mono font-bold text-emerald-400 tracking-widest">{code}</span>
          <button
            onClick={copy}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
          >
            {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
          </button>
        </div>
        <p className="text-[11px] text-slate-500">Notez ce code et conservez-le précieusement</p>
      </div>

      {/* Info card */}
      <div className="w-full bg-sky-500/[0.07] border border-sky-500/20 rounded-2xl p-4 text-left">
        <p className="text-xs text-sky-300 font-semibold mb-1">Que se passe-t-il ensuite ?</p>
        <ul className="space-y-1 text-xs text-slate-400">
          <li>• Un conseiller DigiBank examinera votre demande dans les 24–48h.</li>
          <li>• Vous recevrez une notification dès que votre cagnotte sera activée.</li>
          <li>• En cas de questions, notre équipe peut vous contacter.</li>
        </ul>
      </div>

      <Link to="/cagnottes">
        <Button variant="primary">Retour aux cagnottes</Button>
      </Link>
    </motion.div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const STORY_MIN = 200;

const RequestCampaignPage = () => {
  const { addToast } = useOutletContext() || {};
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    category: '',
    target_amount: '',
    story: '',
    beneficiary_name: '',
    beneficiary_relationship: '',
    agree: false,
  });
  const [coverImage, setCoverImage] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successCode, setSuccessCode] = useState(null);

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [k]: val }));
    if (errors[k]) setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Le titre est requis';
    else if (form.title.length < 10) e.title = 'Le titre doit contenir au moins 10 caractères';
    const amt = Number(form.target_amount);
    if (!form.target_amount || isNaN(amt) || amt <= 0) e.target_amount = 'Montant invalide';
    if (!form.story.trim()) e.story = 'Décrivez votre situation';
    if (!form.agree) e.agree = 'Vous devez accepter les conditions';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const result = await cagnotteService.requestCagnotte({
        title: form.title.trim(),
        description: form.story.trim(),
        target_amount: Number(form.target_amount),
      });
      setSuccessCode(result?.verification_code || result?.cagnotte?.verification_code || 'CAG-XXXX');
    } catch (err) {
      const backend = err?.response?.data;
      const backendErrors = backend?.errors || {};
      const nextErrors = {};

      if (backendErrors.title?.[0]) nextErrors.title = backendErrors.title[0];
      if (backendErrors.description?.[0]) nextErrors.story = backendErrors.description[0];
      if (backendErrors.target_amount?.[0]) nextErrors.target_amount = backendErrors.target_amount[0];
      if (Object.keys(nextErrors).length) setErrors(nextErrors);

      const msg = Object.values(backendErrors).flat()[0] || backend?.message || 'Erreur lors de la soumission';
      addToast?.(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (successCode) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <SuccessScreen code={successCode} />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Demander une cagnotte</h1>
          <p className="text-sm text-slate-400">Votre demande sera examinée par notre équipe</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Card: Informations de base */}
        <div className="rounded-2xl bg-bg-card border border-white/5 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-white">Informations de base</h2>

          <Field label="Titre de la cagnotte" required error={errors.title}>
            <input
              type="text"
              placeholder="Ex : Aide pour les soins de Fatima…"
              value={form.title}
              onChange={set('title')}
              className={inputCls(errors.title)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Catégorie" required error={errors.category}>
              <select
                value={form.category}
                onChange={set('category')}
                className={cn(inputCls(errors.category), 'appearance-none')}
              >
                <option value="" disabled>Choisir…</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Montant cible" required hint="En MAD" error={errors.target_amount}>
              <div className="relative">
                <input
                  type="number"
                  placeholder="5 000"
                  min="500"
                  value={form.target_amount}
                  onChange={set('target_amount')}
                  className={cn(inputCls(errors.target_amount), 'pr-14')}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">MAD</span>
              </div>
            </Field>
          </div>
        </div>

        {/* Card: Histoire */}
        <div className="rounded-2xl bg-bg-card border border-white/5 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-white">Votre histoire</h2>

          <Field
            label="Description de la situation"
            required
            hint={`Décrivez en détail la situation et l'objectif de la collecte.`}
            error={errors.story}
          >
            <div className="relative">
              <textarea
                rows={7}
                placeholder="Expliquez votre situation en détail, l'utilisation des fonds, et pourquoi vous avez besoin de l'aide de la communauté…"
                value={form.story}
                onChange={set('story')}
                className={cn(inputCls(errors.story), 'resize-none')}
              />
              <div className={cn(
                'absolute bottom-2.5 right-3 text-[10px] font-mono transition-colors',
                form.story.length < STORY_MIN ? 'text-slate-600' : 'text-emerald-500',
              )}>
                {form.story.length}/{STORY_MIN}+
              </div>
            </div>
          </Field>

          <Field label="Photo de couverture" hint="Optionnel — une image représentative de votre campagne">
            <CoverDropzone
              file={coverImage}
              onChange={setCoverImage}
              onRemove={() => setCoverImage(null)}
            />
          </Field>
        </div>

        {/* Card: Bénéficiaire */}
        <div className="rounded-2xl bg-bg-card border border-white/5 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-white">Informations sur le bénéficiaire</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom complet" required error={errors.beneficiary_name}>
              <input
                type="text"
                placeholder="Nom du bénéficiaire"
                value={form.beneficiary_name}
                onChange={set('beneficiary_name')}
                className={inputCls(errors.beneficiary_name)}
              />
            </Field>

            <Field label="Relation avec le demandeur" required error={errors.beneficiary_relationship}>
              <select
                value={form.beneficiary_relationship}
                onChange={set('beneficiary_relationship')}
                className={cn(inputCls(errors.beneficiary_relationship), 'appearance-none')}
              >
                <option value="" disabled>Choisir…</option>
                {RELATIONSHIPS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Card: Documents */}
        <div className="rounded-2xl bg-bg-card border border-white/5 p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Documents justificatifs</h2>
            <p className="text-xs text-slate-500 mt-0.5">Optionnel — ordonnances, factures, certificats… (max 5 fichiers)</p>
          </div>
          <DocsDropzone files={documents} onChange={setDocuments} />
        </div>

        {/* Agreement */}
        <label className={cn(
          'flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all',
          errors.agree ? 'border-rose-500/40 bg-rose-500/[0.04]' : 'border-white/5 bg-white/[0.02] hover:border-white/10',
        )}>
          <input
            type="checkbox"
            checked={form.agree}
            onChange={set('agree')}
            className="mt-0.5 accent-emerald-500 w-4 h-4 shrink-0"
          />
          <span className="text-sm text-slate-300 leading-relaxed">
            Je confirme que toutes les informations fournies sont exactes et véridiques, et j'accepte que DigiBank procède à une vérification avant l'activation de ma cagnotte.
          </span>
        </label>
        {errors.agree && (
          <p className="flex items-center gap-1 text-xs text-rose-400 -mt-3">
            <AlertCircle size={11} /> {errors.agree}
          </p>
        )}

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? (
            <><Loader2 size={15} className="animate-spin mr-2" /> Envoi en cours…</>
          ) : (
            <><Heart size={15} className="mr-2" /> Soumettre ma demande</>
          )}
        </Button>
      </form>
    </div>
  );
};

export default RequestCampaignPage;
