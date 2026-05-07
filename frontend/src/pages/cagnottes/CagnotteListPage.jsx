import React, { useState, useEffect, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Search, Heart, BookOpen, AlertTriangle, Users, Layers,
  Shield, ChevronRight, Clock, TrendingUp,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import cagnotteService from '../../services/cagnotteService';
import { safeNumber, formatAmount } from '../../utils/apiResponse';

// ── Category config ───────────────────────────────────────────────────────────
const CAT = {
  health:    { label: 'Santé',      icon: Heart,          grad: 'from-rose-800/70 via-rose-900/80',    ico: 'text-rose-300',    chip: 'bg-rose-500/10 text-rose-400 border border-rose-500/20'    },
  education: { label: 'Éducation',  icon: BookOpen,       grad: 'from-sky-800/70 via-sky-900/80',      ico: 'text-sky-300',     chip: 'bg-sky-500/10 text-sky-400 border border-sky-500/20'       },
  emergency: { label: 'Urgence',    icon: AlertTriangle,  grad: 'from-amber-800/70 via-amber-900/80',  ico: 'text-amber-300',   chip: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'  },
  family:    { label: 'Famille',    icon: Users,          grad: 'from-violet-800/70 via-violet-900/80',ico: 'text-violet-300',  chip: 'bg-violet-500/10 text-violet-400 border border-violet-500/20'},
  other:     { label: 'Autre',      icon: Layers,         grad: 'from-slate-700/70 via-slate-800/80',  ico: 'text-slate-400',   chip: 'bg-white/5 text-slate-400 border border-white/10'           },
};
const getCat = k => CAT[k] || CAT.other;

const STATUS_MAP = {
  active:    { label: 'Active',      variant: 'success' },
  pending:   { label: 'En attente',  variant: 'warning' },
  completed: { label: 'Terminée',    variant: 'neutral' },
  rejected:  { label: 'Rejetée',     variant: 'danger'  },
};
const getStatus = s => STATUS_MAP[s] || STATUS_MAP.pending;

const CATEGORY_CHIPS = [
  { id: 'all',       label: 'Toutes'    },
  { id: 'health',    label: 'Santé'     },
  { id: 'education', label: 'Éducation' },
  { id: 'emergency', label: 'Urgence'   },
  { id: 'family',    label: 'Famille'   },
  { id: 'other',     label: 'Autre'     },
];

const SORTS = [
  { id: 'newest', label: 'Plus récent'   },
  { id: 'funded', label: 'Plus financé'  },
  { id: 'ending', label: 'Fin imminente' },
];

// ── Cover placeholder / image ─────────────────────────────────────────────────
const CoverImage = ({ src, category, className }) => {
  const cat  = getCat(category);
  const Icon = cat.icon;
  if (src) {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <img src={src} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-card/60 to-transparent" />
      </div>
    );
  }
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br to-bg-card', cat.grad, className)}>
      <Icon size={56} className={cn('absolute bottom-4 right-4 opacity-20', cat.ico)} />
      <div className="absolute inset-0 bg-gradient-to-t from-bg-card/60 to-transparent" />
    </div>
  );
};

// ── Campaign Card ─────────────────────────────────────────────────────────────
const CampaignCard = ({ c }) => {
  const cat    = getCat(c.category);
  const st     = getStatus(c.status);
  const current = safeNumber(c.current_amount);
  const target  = safeNumber(c.target_amount, 1);
  const pct     = Math.min((current / target) * 100, 100);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-2xl bg-bg-card border border-white/5 hover:border-white/10 shadow-lg hover:shadow-xl overflow-hidden flex flex-col transition-all duration-300"
    >
      {/* Cover */}
      <CoverImage src={c.cover_image} category={c.category} className="h-40" />

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Category chip + status */}
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider', cat.chip)}>
            {cat.label}
          </span>
          <Badge variant={st.variant}>{st.label}</Badge>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">{c.title}</h3>

        {/* Description */}
        {c.description && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{c.description}</p>
        )}

        {/* Progress */}
        <div className="space-y-1.5 mt-auto">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white font-bold font-mono">
              {formatAmount(current)}
            </span>
            <span className="text-slate-500">
              sur {formatAmount(target)}
            </span>
          </div>
          <p className="text-[10px] text-emerald-400 font-medium">{Math.round(pct)}% financé</p>
        </div>

        {/* Verification code */}
        {c.verification_code && (
          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/5 rounded-lg px-2.5 py-1.5">
            <Shield size={11} className="text-slate-500 shrink-0" />
            <span className="text-[10px] font-mono text-slate-400">{c.verification_code}</span>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-white/5 mt-auto">
          {c.status === 'active' ? (
            <Link to={`/cagnottes/${c.id}`} className="block">
              <Button variant="primary" size="sm" className="w-full">
                <Heart size={13} className="mr-1.5" /> Faire un don
              </Button>
            </Link>
          ) : (
            <Link to={`/cagnottes/${c.id}`} className="block">
              <Button variant="ghost" size="sm" className="w-full group">
                Voir la cagnotte
                <ChevronRight size={13} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Skeleton card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="rounded-2xl bg-bg-card border border-white/5 overflow-hidden">
    <div className="h-40 bg-white/5 animate-pulse" />
    <div className="p-5 space-y-3">
      <div className="h-3 w-20 bg-white/5 animate-pulse rounded" />
      <div className="h-4 w-full bg-white/5 animate-pulse rounded" />
      <div className="h-3 w-3/4 bg-white/5 animate-pulse rounded" />
      <div className="h-2 w-full bg-white/5 animate-pulse rounded-full mt-3" />
    </div>
  </div>
);

// ── Stagger animation ─────────────────────────────────────────────────────────
const stagger  = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const cardAnim = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } };

// ── Main page ─────────────────────────────────────────────────────────────────
const CagnotteListPage = () => {
  const { addToast } = useOutletContext() || {};

  const [cagnottes,   setCagnottes]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [category,    setCategory]    = useState('all');
  const [sort,        setSort]        = useState('newest');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await cagnotteService.getCagnottes();
        setCagnottes(data);
      } catch {
        addToast?.('Impossible de charger les cagnottes', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = [...cagnottes];

    if (category !== 'all') {
      list = list.filter(c => c.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q),
      );
    }
    if (sort === 'newest') {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sort === 'funded') {
      list.sort((a, b) => safeNumber(b.current_amount) - safeNumber(a.current_amount));
    } else if (sort === 'ending') {
      list.sort((a, b) => new Date(a.expires_at || '9999') - new Date(b.expires_at || '9999'));
    }
    return list;
  }, [cagnottes, category, search, sort]);

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Cagnottes solidaires</h1>
          <p className="text-sm text-slate-400 mt-1">Soutenez des causes qui comptent pour votre communauté 💚</p>
        </div>
        <Link to="/cagnottes/request">
          <Button variant="primary" leftIcon={Plus}>Demander une cagnotte</Button>
        </Link>
      </div>

      {/* ── Category chips ───────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_CHIPS.map(chip => (
          <button
            key={chip.id}
            onClick={() => setCategory(chip.id)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200',
              category === chip.id
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:border-white/20',
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ── Search + Sort bar ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48 max-w-sm flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-emerald-500/40 transition-all">
          <Search size={15} className="text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Rechercher une cagnotte…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm text-white placeholder:text-slate-500 w-full"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
          {SORTS.map(s => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                sort === s.id
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length > 0 ? (
        <motion.div
          key={category + search + sort}
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {filtered.map(c => (
            <motion.div key={c.id} variants={cardAnim}>
              <CampaignCard c={c} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Heart size={28} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-white">Aucune cagnotte trouvée</p>
            <p className="text-sm text-slate-500 mt-1">
              Essayez de modifier vos filtres ou revenez plus tard
            </p>
          </div>
          <Link to="/cagnottes/request">
            <Button variant="primary" leftIcon={Plus} size="sm">Lancer une collecte</Button>
          </Link>
        </motion.div>
      )}
    </div>
  );
};

export default CagnotteListPage;
