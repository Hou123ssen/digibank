import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  CheckCircle2, 
  Zap, 
  Clock, 
  ArrowUpRight,
  ChevronRight,
  Lock,
  Star,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import trustService from '../../services/trustService';

// ── Trust score SVG ring ──────────────────────────────────────────────────────
const LargeTrustRing = ({ score = 0, max = 1000 }) => {
  const r    = 100;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(score / max, 1);
  
  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 240 240" className="w-60 h-60 transform -rotate-90">
        {/* Track */}
        <circle 
          cx="120" cy="120" r={r} 
          fill="none" 
          stroke="rgba(255,255,255,0.05)" 
          strokeWidth="12" 
        />
        {/* Progress */}
        <motion.circle
          cx="120" cy="120" r={r}
          fill="none"
          stroke="url(#trustGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - pct) }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="trustGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <motion.span 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-6xl font-bold text-white tracking-tighter"
        >
          {score}
        </motion.span>
        <span className="text-emerald-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Points</span>
      </div>
    </div>
  );
};

const TrustScorePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrustData();
  }, []);

  const fetchTrustData = async () => {
    try {
      setLoading(true);
      const res = await trustService.getMyTrustScore();
      setData(res);
    } catch (err) {
      console.error('Error fetching trust score:', err);
    } finally {
      setLoading(false);
    }
  };

  const score = (data?.trust_score ?? 0) * 10; // Scaling 0-100 to 0-1000 for UI
  const level = data?.level || 'normal';

  const getLevelBadge = () => {
    switch (level) {
      case 'excellent': return <Badge variant="success" className="px-4 py-1 text-sm">Excellent</Badge>;
      case 'trusted': return <Badge variant="info" className="px-4 py-1 text-sm">Trusted</Badge>;
      case 'normal': return <Badge variant="neutral" className="px-4 py-1 text-sm">Normal</Badge>;
      case 'risky': return <Badge variant="danger" className="px-4 py-1 text-sm">Risky</Badge>;
      default: return <Badge variant="neutral" className="px-4 py-1 text-sm">Normal</Badge>;
    }
  };

  const tiers = [
    {
      id: 'normal',
      name: 'Normal',
      threshold: '0 - 690',
      benefits: ['Fonctionnalités de base', 'Accès standard aux services', 'Aucun découvert autorisé'],
      color: 'bg-slate-500/10 text-slate-400',
      active: level === 'normal' || level === 'risky'
    },
    {
      id: 'trusted',
      name: 'Trusted',
      threshold: '700 - 890',
      benefits: ['Découvert jusqu\'à 500 MAD', 'Approbation Daret accélérée', 'Support prioritaire'],
      color: 'bg-emerald-500/10 text-emerald-400',
      active: level === 'trusted'
    },
    {
      id: 'excellent',
      name: 'Excellent',
      threshold: '900+',
      benefits: ['Découvert premium', 'Frais de transaction réduits', 'Accès VIP aux Darets'],
      color: 'bg-amber-500/10 text-amber-400',
      active: level === 'excellent'
    }
  ];

  if (loading) {
    return (
      <div className="p-8 space-y-12 animate-pulse">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-60 h-60 rounded-full bg-white/5" />
          <div className="h-8 w-32 bg-white/5 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-white/5 rounded-3xl" />
          <div className="h-64 bg-white/5 rounded-3xl" />
          <div className="h-64 bg-white/5 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-12 max-w-7xl mx-auto">
      <PageHeader 
        title="Trust Score" 
        subtitle="Votre score de confiance détermine vos limites de crédit et vos privilèges DigiBank."
        breadcrumbs={["Accueil", "Trust Score"]}
      />

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center py-12 space-y-8">
        <div className="rounded-full border border-emerald-500/25 bg-emerald-500/[0.03] p-6 shadow-lg shadow-emerald-500/10">
          <LargeTrustRing score={score} />
        </div>
        <div className="text-center space-y-3">
          <div className="flex justify-center">{getLevelBadge()}</div>
          <p className="text-slate-400 font-medium">Votre indice de confiance en tant que membre DigiBank</p>
        </div>
      </section>

      {/* Tier Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {tiers.map((tier) => (
          <Card 
            key={tier.id} 
            className={`p-8 space-y-6 transition-all duration-500 ${
              tier.active 
                ? 'border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_40px_rgba(16,185,129,0.1)] scale-105 z-10' 
                : 'opacity-60 grayscale-[0.5]'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-2xl ${tier.color}`}>
                <Award size={24} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{tier.threshold}</span>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-xl font-bold text-white">{tier.name}</h4>
              <p className="text-xs text-slate-500">Avantages du niveau</p>
            </div>

            <ul className="space-y-4">
              {tier.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                  <div className="mt-1 shrink-0">
                    {tier.active ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Lock size={14} className="text-slate-600" />}
                  </div>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            {tier.active && (
              <div className="pt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase tracking-widest">
                  <Zap size={14} /> Niveau Actuel
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Score History Chart Placeholder */}
        <Card className="lg:col-span-2 p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-emerald-500" />
              <h3 className="text-xl font-bold text-white">Évolution du score</h3>
            </div>
            <div className="flex gap-2">
              {['6M', '1Y', 'ALL'].map(t => (
                <button key={t} className="px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:text-white border border-white/5 hover:border-white/20 transition-all">{t}</button>
              ))}
            </div>
          </div>

          <div className="h-64 relative flex items-end justify-between gap-4 px-4 pt-8">
            {/* Simple CSS Line Chart Visual */}
            <div className="absolute inset-0 flex flex-col justify-between py-8 px-4 opacity-10">
              {[...Array(5)].map((_, i) => <div key={i} className="w-full h-px bg-[#003d35]" />)}
            </div>
            {[45, 52, 48, 65, 72, 70].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ delay: i * 0.1, duration: 1 }}
                  className="w-full max-w-[20px] bg-gradient-to-t from-emerald-500/20 to-emerald-500 rounded-full relative"
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-bg-card border border-white/10 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap z-20">
                    {(h * 10)} pts
                  </div>
                </motion.div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">{['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin'][i]}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Tips Card */}
        <Card className="p-8 space-y-8 bg-gradient-to-br from-[#003d35] via-[#005447] to-[#006655] border-emerald-500/20">
          <div className="flex items-center gap-3">
            <Star className="text-[#00C2A8]" />
            <h3 className="text-xl font-bold !text-white">Améliorer votre score</h3>
          </div>
          
          <div className="space-y-6">
            {[
              { label: 'Compléter votre KYC', desc: 'Une identité vérifiée augmente votre score instantanément.' },
              { label: 'Éviter les découverts', desc: 'Maintenir un solde positif montre une gestion saine.' },
              { label: 'Participer aux Darets', desc: 'La régularité des paiements renforce la confiance.' },
              { label: 'Paiements à temps', desc: 'Éviter les retards de paiement de vos factures.' },
            ].map((tip, i) => (
              <div key={i} className="flex gap-4">
                <div className="mt-1 w-6 h-6 rounded-full bg-[#00C2A8]/15 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={14} className="text-[#00C2A8]" />
                </div>
                <div className="space-y-1">
                  <h5 className="text-sm font-bold text-emerald-50">{tip.label}</h5>
                  <p className="text-xs text-emerald-50/70 leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Button variant="secondary" className="w-full !text-white bg-white/10 border-white/20 hover:bg-white/15">Guide complet</Button>
        </Card>
      </div>

      {/* Activity Log Table */}
      <Card className="p-1 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-white">Journal d'activité</h3>
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-white">Tout exporter</Button>
        </div>
        {data?.logs && data.logs.length > 0 ? (
          <Table 
            headers={["Date", "Événement", "Impact", "Nouveau Score"]}
            data={data.logs.map(log => [
              new Date(log.created_at).toLocaleDateString('fr-FR'),
              <div className="flex flex-col">
                <span className="font-medium text-slate-200">{log.reason}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">{log.change_type}</span>
              </div>,
              <span className={`font-mono font-bold flex items-center gap-1 ${
                log.change_type === 'increase' ? 'text-emerald-500' : 'text-rose-500'
              }`}>
                {log.change_type === 'increase' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {log.change_type === 'increase' ? '+' : '-'}{(log.points ?? 0) * 10}
              </span>,
              <span className="font-mono text-slate-300">{((log.new_score ?? 0) * 10)}</span>
            ])}
          />
        ) : (
          <div className="p-12 text-center text-slate-500 text-sm">
            Aucun historique de score disponible pour le moment.
          </div>
        )}
      </Card>
    </div>
  );
};

export default TrustScorePage;
