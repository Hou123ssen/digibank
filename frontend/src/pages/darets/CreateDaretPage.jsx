import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Check, Users, Banknote,
  FileText, Settings2, Eye, Copy, Share2, ArrowRight,
  RotateCcw, Shuffle, ArrowDownUp, CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import daretService from '../../services/daretService';
import { safeNumber, formatAmount } from '../../utils/apiResponse';

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Informations',  icon: FileText   },
  { label: 'Règles',        icon: Settings2  },
  { label: 'Révision',      icon: Eye        },
];

const StepIndicator = ({ current }) => (
  <div className="flex items-center gap-0 mb-10">
    {STEPS.map((s, i) => {
      const done   = i < current;
      const active = i === current;
      const Icon   = s.icon;
      return (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-1.5">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
              done   ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'   :
              active ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40' :
                       'bg-white/5 text-slate-500',
            )}>
              {done ? <Check size={18} /> : <Icon size={17} />}
            </div>
            <p className={cn(
              'text-[10px] font-semibold tracking-wider uppercase transition-colors whitespace-nowrap',
              active ? 'text-emerald-400' : done ? 'text-slate-300' : 'text-slate-600',
            )}>
              {s.label}
            </p>
          </div>

          {i < STEPS.length - 1 && (
            <div className={cn(
              'flex-1 h-0.5 mx-3 mb-5 rounded-full transition-all duration-500',
              i < current ? 'bg-emerald-500' : 'bg-white/5',
            )} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ── Radio option ──────────────────────────────────────────────────────────────
const RadioOption = ({ selected, onSelect, icon: Icon, title, description }) => (
  <button
    type="button"
    onClick={onSelect}
    className={cn(
      'w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200',
      selected
        ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
        : 'bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20 hover:bg-white/5',
    )}
  >
    <div className={cn(
      'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
      selected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-500',
    )}>
      <Icon size={17} />
    </div>
    <div className="flex-1 min-w-0">
      <p className={cn('text-sm font-semibold', selected ? 'text-white' : 'text-slate-300')}>
        {title}
      </p>
      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
    </div>
    <div className={cn(
      'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
      selected ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600',
    )}>
      {selected && <div className="w-2 h-2 rounded-full bg-white" />}
    </div>
  </button>
);

// ── Capacity slider ───────────────────────────────────────────────────────────
const CapacitySlider = ({ value, onChange }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-slate-300">Nombre de membres</span>
      <span className="text-lg font-bold text-white font-mono">{value}</span>
    </div>
    <input
      type="range"
      min={3}
      max={20}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full h-2 appearance-none rounded-full cursor-pointer"
      style={{
        background: `linear-gradient(to right, #10b981 0%, #10b981 ${((value - 3) / 17) * 100}%, rgba(255,255,255,0.06) ${((value - 3) / 17) * 100}%, rgba(255,255,255,0.06) 100%)`,
      }}
    />
    <div className="flex justify-between text-[10px] text-slate-500">
      <span>3 min</span>
      <span>20 max</span>
    </div>
  </div>
);

// ── Review row ────────────────────────────────────────────────────────────────
const ReviewRow = ({ label, value, mono }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
    <span className="text-sm text-slate-400">{label}</span>
    <span className={cn('text-sm font-semibold text-white', mono && 'font-mono')}>{value}</span>
  </div>
);

// ── Animation ─────────────────────────────────────────────────────────────────
const slideIn = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

// ── Main page ─────────────────────────────────────────────────────────────────
const CreateDaretPage = () => {
  const { addToast } = useOutletContext() || {};
  const navigate     = useNavigate();

  const [step,       setStep]    = useState(0);
  const [isLoading,  setIsLoading]  = useState(false);
  const [created,    setCreated] = useState(null);   // success state
  const [errors,     setErrors]  = useState({});
  const [agreed,     setAgreed]  = useState(false);
  const [copied,     setCopied]  = useState(false);

  const [form, setForm] = useState({
    name:                '',
    description:         '',
    contribution_amount: '',
    capacity:            8,
    cycle_frequency:     'monthly',
    payout_order:        'sequential',
  });

  const set = (field, val) => {
    setForm(p => ({ ...p, [field]: val }));
    setErrors(p => ({ ...p, [field]: undefined }));
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!form.name.trim())                             e.name   = 'Le nom est requis';
      if (!form.contribution_amount || safeNumber(form.contribution_amount) <= 0)
        e.contribution_amount = 'Montant invalide';
    }
    if (step === 2 && !agreed) {
      e.agreed = 'Vous devez accepter les conditions';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const res = await daretService.createDaret({
        name:                form.name.trim(),
        contribution_amount: safeNumber(form.contribution_amount),
        total_members:       safeNumber(form.capacity),
      });
      setCreated(res);
      addToast?.('Daret créé avec succès !', 'success');
    } catch (err) {
      console.error('Daret creation error:', err.response?.data);
      const backendError = err.response?.data;
      
      if (backendError?.errors) {
        // Map backend validation errors to frontend error state
        const newErrors = {};
        if (backendError.errors.name) newErrors.name = backendError.errors.name[0];
        if (backendError.errors.contribution_amount) newErrors.contribution_amount = backendError.errors.contribution_amount[0];
        if (backendError.errors.total_members) newErrors.capacity = backendError.errors.total_members[0];
        
        // Capture specific eligibility errors
        if (backendError.errors.daret) newErrors.daret = backendError.errors.daret[0];
        
        setErrors(newErrors);
        
        // Also show a toast with combined messages
        const msg = Object.values(backendError.errors).flat().join(' ');
        addToast?.(msg || 'Veuillez corriger les erreurs.', 'error');
      } else {
        addToast?.(backendError?.message || 'Erreur lors de la création', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Copy invite code ────────────────────────────────────────────────────────
  const copyCode = () => {
    const code = created?.invite_code || created?.code || `DARET-${created?.id}`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast?.('Code copié !', 'info');
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const totalPot = safeNumber(form.contribution_amount) * safeNumber(form.capacity);
  const freqLabel = form.cycle_frequency === 'monthly' ? 'mois' : 'semaines';
  const duration  = `${form.capacity} ${freqLabel}`;

  // ── Success screen ──────────────────────────────────────────────────────────
  if (created) {
    const code = created?.invite_code || created?.code || `DARET-${created?.id}`;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto text-center py-8"
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 size={36} className="text-emerald-400" />
        </motion.div>

        <h2 className="text-2xl font-bold text-white mb-2">Daret créé !</h2>
        <p className="text-slate-400 text-sm mb-8">
          Votre Daret <span className="text-white font-semibold">«&nbsp;{created.name || form.name}&nbsp;»</span> est prêt.
          Partagez le code d'invitation avec vos proches.
        </p>

        {/* Invite code */}
        <Card className="p-6 mb-6">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            Code d'invitation
          </p>
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
            <span className="flex-1 text-lg font-bold text-emerald-400 font-mono tracking-widest">
              {code}
            </span>
            <button
              onClick={copyCode}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
            </button>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            className="w-full"
            leftIcon={Share2}
            onClick={copyCode}
          >
            Partager le code
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            rightIcon={ArrowRight}
            onClick={() => navigate(created?.id ? `/darets/${created.id}` : '/darets')}
          >
            Voir mon Daret
          </Button>
        </div>
      </motion.div>
    );
  }

  // ── Wizard ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => step > 0 ? back() : navigate('/darets')}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        {step > 0 ? 'Étape précédente' : 'Retour aux Darets'}
      </button>

      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white">Créer un Daret</h1>
        <p className="text-sm text-slate-400 mt-1">Configurez votre tontine en quelques étapes</p>
      </div>

      <Card className="p-8 mt-6">
        <StepIndicator current={step} />

        <AnimatePresence>
          {/* ── Eligibility Error Alert ─────────────────────────── */}
          {errors.daret && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-4"
            >
              <div className="flex gap-3 text-rose-500">
                <AlertCircle className="shrink-0" size={18} />
                <p className="text-sm font-medium">{errors.daret}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400 text-[10px]"
                  onClick={() => navigate('/kyc')}
                >
                  Aller au KYC
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400 text-[10px]"
                  onClick={() => navigate('/trust-score')}
                >
                  Voir mon Trust Score
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 0: Informations de base ──────────────────────── */}
          {step === 0 && (
            <motion.div key="step0" {...slideIn} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Informations de base</h2>
                <p className="text-sm text-slate-500">Donnez un nom et configurez la contribution.</p>
              </div>

              <Input
                label="Nom du Daret *"
                placeholder="ex: Daret Famille Benali"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                error={errors.name}
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">
                  Description <span className="text-slate-600 font-normal">(optionnel)</span>
                </label>
                <textarea
                  placeholder="Décrivez l'objectif de ce Daret…"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-600 resize-none"
                />
              </div>

              {/* Amount + currency lock */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">
                  Contribution par membre *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="500"
                    value={form.contribution_amount}
                    onChange={e => set('contribution_amount', e.target.value)}
                    className={cn(
                      'flex-1 bg-white/5 border rounded-lg py-2.5 px-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-600',
                      errors.contribution_amount ? 'border-rose-500' : 'border-white/10',
                    )}
                  />
                  <div className="flex items-center px-4 bg-white/5 border border-white/10 rounded-lg text-sm font-bold text-emerald-400 shrink-0">
                    MAD
                  </div>
                </div>
                {errors.contribution_amount && (
                  <p className="text-xs text-rose-500">{errors.contribution_amount}</p>
                )}
                <p className="text-[11px] text-slate-500">
                  Montant que chaque membre verse à chaque cycle.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Step 1: Règles ────────────────────────────────────── */}
          {step === 1 && (
            <motion.div key="step1" {...slideIn} className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Règles du Daret</h2>
                <p className="text-sm text-slate-500">Définissez la capacité, la fréquence et l'ordre de versement.</p>
              </div>

              {/* Capacity slider */}
              <Card className="p-5">
                <CapacitySlider value={form.capacity} onChange={v => set('capacity', v)} />
                {errors.capacity && (
                  <p className="text-xs text-rose-500 mt-3">{errors.capacity}</p>
                )}
                {form.contribution_amount && (
                  <p className="text-xs text-slate-500 mt-3 font-mono">
                    Pot total estimé :{' '}
                    <span className="text-emerald-400 font-bold">
                      {formatAmount(safeNumber(form.contribution_amount) * safeNumber(form.capacity))}
                    </span>
                  </p>
                )}
              </Card>

              {/* Frequency */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-300">Fréquence des cycles</p>
                <div className="grid grid-cols-2 gap-3">
                  <RadioOption
                    selected={form.cycle_frequency === 'monthly'}
                    onSelect={() => set('cycle_frequency', 'monthly')}
                    icon={RotateCcw}
                    title="Mensuel"
                    description="Un cycle par mois. La durée totale sera de plusieurs mois."
                  />
                  <RadioOption
                    selected={form.cycle_frequency === 'weekly'}
                    onSelect={() => set('cycle_frequency', 'weekly')}
                    icon={RotateCcw}
                    title="Hebdomadaire"
                    description="Un cycle par semaine. Plus rapide, idéal pour les petites tontines."
                  />
                </div>
              </div>

              {/* Payout order */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-300">Ordre des versements</p>
                <div className="space-y-2">
                  <RadioOption
                    selected={form.payout_order === 'sequential'}
                    onSelect={() => set('payout_order', 'sequential')}
                    icon={ArrowDownUp}
                    title="Séquentiel"
                    description="Chaque membre reçoit le pot dans l'ordre d'inscription, cycle après cycle."
                  />
                  <RadioOption
                    selected={form.payout_order === 'random'}
                    onSelect={() => set('payout_order', 'random')}
                    icon={Shuffle}
                    title="Aléatoire"
                    description="L'ordre est tiré au sort à la création du Daret pour plus d'équité."
                  />
                  <RadioOption
                    selected={form.payout_order === 'auto'}
                    onSelect={() => set('payout_order', 'auto')}
                    icon={Settings2}
                    title="Auto-rotation"
                    description="L'ordre est basé sur le besoin déclaré et le Trust Score de chaque membre."
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Révision ──────────────────────────────────── */}
          {step === 2 && (
            <motion.div key="step2" {...slideIn} className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Révision & Confirmation</h2>
                <p className="text-sm text-slate-500">Vérifiez les détails avant de créer le Daret.</p>
              </div>

              {/* Summary card */}
              <Card className="overflow-hidden">
                {/* Emerald header */}
                <div className="bg-gradient-to-r from-emerald-700/40 to-teal-700/30 border-b border-white/5 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <Users size={18} className="text-emerald-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{form.name || '—'}</p>
                      <p className="text-xs text-emerald-400/80 mt-0.5">Daret Digital</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4">
                  <ReviewRow label="Contribution / cycle" value={formatAmount(form.contribution_amount)} mono />
                  <ReviewRow label="Capacité"             value={`${form.capacity} membres`} />
                  <ReviewRow label="Pot total estimé"     value={formatAmount(totalPot)} mono />
                  <ReviewRow label="Fréquence"            value={form.cycle_frequency === 'monthly' ? 'Mensuel' : 'Hebdomadaire'} />
                  <ReviewRow label="Durée estimée"        value={duration} />
                  <ReviewRow
                    label="Ordre de versement"
                    value={
                      form.payout_order === 'sequential' ? 'Séquentiel' :
                      form.payout_order === 'random'     ? 'Aléatoire'  : 'Auto-rotation'
                    }
                  />
                  {form.description && (
                    <div className="py-3">
                      <p className="text-sm text-slate-400 mb-1">Description</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{form.description}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Agreement */}
              <button
                type="button"
                onClick={() => { setAgreed(p => !p); setErrors(e => ({ ...e, agreed: undefined })); }}
                className={cn(
                  'w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all',
                  agreed
                    ? 'bg-emerald-500/10 border-emerald-500/40'
                    : errors.agreed
                    ? 'bg-rose-500/5 border-rose-500/40'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20',
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
                  agreed ? 'bg-emerald-500 border-emerald-500' : errors.agreed ? 'border-rose-500' : 'border-slate-600',
                )}>
                  {agreed && <Check size={12} className="text-white" />}
                </div>
                <p className="text-sm text-slate-400">
                  Je comprends les règles du Daret et m'engage à honorer chaque contribution dans les délais impartis.
                  Je reconnais que le non-respect de cet engagement pourra impacter mon Trust Score.
                </p>
              </button>
              {errors.agreed && <p className="text-xs text-rose-500 -mt-3">{errors.agreed}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Navigation buttons ───────────────────────────────────── */}
        <div className={cn('flex gap-3 mt-8 pt-6 border-t border-white/5', step === 0 ? 'justify-end' : 'justify-between')}>
          {step > 0 && (
            <Button variant="secondary" leftIcon={ChevronLeft} onClick={back}>
              Précédent
            </Button>
          )}

          {step < 2 ? (
            <Button variant="primary" rightIcon={ChevronRight} onClick={next}>
              Suivant
            </Button>
          ) : (
            <Button
              variant="primary"
              isLoading={isLoading}
              onClick={handleCreate}
            >
              Créer le Daret
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CreateDaretPage;
