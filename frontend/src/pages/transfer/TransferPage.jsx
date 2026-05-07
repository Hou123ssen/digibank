import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Search, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  History,
  Users,
  ArrowLeftRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import accountService from '../../services/accountService';
import { safeNumber, formatAmount } from '../../utils/apiResponse';

const RECENT_RECIPIENTS = [
  { id: 1, name: 'Youssef Alami', account: 'MA64 1234 5678 9012', avatar: null },
  { id: 2, name: 'Sarah Benani', account: 'MA64 9876 5432 1098', avatar: null },
  { id: 3, name: 'Ahmed Mansouri', account: 'MA64 5544 3322 1100', avatar: null },
  { id: 4, name: 'Laila Kadiri', account: 'MA64 7788 9900 1122', avatar: null },
];

const TransferPage = ({ addToast }) => {
  const [step, setStep] = useState('form'); // form, confirm, success
  const [formData, setFormData] = useState({
    recipient: '',
    amount: '',
    reason: '',
    schedule: 'now',
    date: '',
    time: ''
  });
  const [recipientData, setRecipientData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const amountValue = safeNumber(formData.amount);
  const formattedAmount = formatAmount(amountValue);

  // Mock recipient validation
  useEffect(() => {
    if (formData.recipient.length >= 10) {
      // Simulate API call to fetch recipient
      setRecipientData({
        name: 'Mohamed Idrissi',
        account: formData.recipient,
        avatar: null
      });
    } else {
      setRecipientData(null);
    }
  }, [formData.recipient]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTransfer = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await accountService.transfer({
        account_number: formData.recipient,
        amount: amountValue
      });
      setStep('success');
      addToast('Virement effectué avec succès !');
    } catch (err) {
      console.error('Transfer validation error:', err.response?.data);
      const backendError = err.response?.data;
      
      if (backendError?.errors) {
        // Collect all validation errors into a single string for simplicity
        const messages = Object.values(backendError.errors).flat().join(' ');
        setError(messages || 'Données invalides.');
      } else {
        setError(backendError?.message || 'Une erreur est survenue lors du virement.');
      }
      
      setStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="p-8 max-w-2xl mx-auto min-h-[80vh] flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-8 w-full"
        >
          <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
            <CheckCircle2 size={48} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white">Virement envoyé !</h2>
            <p className="text-slate-400">Votre transfert de <span className="text-white font-bold">{formattedAmount}</span> vers <span className="text-white font-bold">{recipientData?.name}</span> a été traité avec succès.</p>
          </div>
          
          <Card className="p-6 bg-white/5 border-white/10 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Référence</span>
              <span className="text-white font-mono uppercase">TRX-{Math.random().toString(36).substr(2, 9)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Date & Heure</span>
              <span className="text-white">{new Date().toLocaleString('fr-FR')}</span>
            </div>
            <div className="border-t border-white/5 pt-4 flex justify-between font-bold">
              <span className="text-slate-400">Total débité</span>
              <span className="text-emerald-500">{formattedAmount}</span>
            </div>
          </Card>

          <div className="flex gap-4">
            <Button variant="secondary" className="flex-1" onClick={() => window.print()}>Télécharger reçu</Button>
            <Button variant="primary" className="flex-1" onClick={() => window.location.href = '/dashboard'}>Retour au tableau de bord</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <PageHeader 
        title="Effectuer un virement" 
        subtitle="Envoyez de l'argent instantanément à vos bénéficiaires DigiBank."
        breadcrumbs={["Accueil", "Virement"]}
      />

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Transfer Form */}
        <div className="lg:col-span-2">
          <Card className="p-8 space-y-8 border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-5">
              <ArrowLeftRight size={120} className="text-emerald-500" />
            </div>

            <div className="space-y-6">
              {/* Recipient Input */}
              <div className="space-y-4">
                <Input 
                  label="Bénéficiaire"
                  name="recipient"
                  value={formData.recipient}
                  onChange={handleInputChange}
                  placeholder="Numéro de compte (MA64...)"
                  leftIcon={Search}
                  className="bg-white/5 border-white/10"
                />

                <AnimatePresence>
                  {recipientData && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-4"
                    >
                      <Avatar name={recipientData.name} size="lg" className="bg-emerald-500/20 text-emerald-500" />
                      <div className="flex-1">
                        <p className="font-bold text-white">{recipientData.name}</p>
                        <p className="text-xs text-slate-400 font-mono uppercase">{recipientData.account}</p>
                      </div>
                      <Badge variant="success" className="text-[10px]">Vérifié</Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Amount Input */}
              <div className="grid md:grid-cols-2 gap-6">
                <Input 
                  label="Montant (MAD)"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="bg-white/5 border-white/10 text-xl font-bold"
                />
                <Input 
                  label="Motif du virement"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="Ex: Loyer, Cadeau..."
                  className="bg-white/5 border-white/10"
                />
              </div>

              {/* Schedule Toggle */}
              <div className="space-y-4">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Planification</label>
                <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl">
                  <button 
                    onClick={() => setFormData(p => ({ ...p, schedule: 'now' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                      formData.schedule === 'now' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock size={16} /> Envoyer maintenant
                  </button>
                  <button 
                    onClick={() => setFormData(p => ({ ...p, schedule: 'later' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                      formData.schedule === 'later' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Calendar size={16} /> Planifier
                  </button>
                </div>

                {formData.schedule === 'later' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <Input type="date" name="date" value={formData.date} onChange={handleInputChange} className="bg-white/5 border-white/10" />
                    <Input type="time" name="time" value={formData.time} onChange={handleInputChange} className="bg-white/5 border-white/10" />
                  </motion.div>
                )}
              </div>

              {/* Summary Block */}
              <div className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-4">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Frais de transfert</span>
                  <span className="text-emerald-500 font-bold uppercase">Gratuit</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-white pt-4 border-t border-white/5">
                  <span>Total à débiter</span>
                  <span>{formattedAmount}</span>
                </div>
              </div>

              <Button 
                variant="primary" 
                className="w-full h-14 text-lg font-bold" 
                disabled={!recipientData || !formData.amount}
                onClick={() => setStep('confirm')}
              >
                Envoyer {formattedAmount}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Recent & Saved */}
        <div className="space-y-8">
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-2 text-slate-200">
              <History size={18} className="text-emerald-500" />
              <h3 className="font-bold">Récents</h3>
            </div>
            <div className="space-y-4">
              {RECENT_RECIPIENTS.map(r => (
                <button 
                  key={r.id}
                  onClick={() => setFormData(p => ({ ...p, recipient: r.account }))}
                  className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all text-left group border border-transparent hover:border-white/5"
                >
                  <Avatar name={r.name} size="md" className="bg-white/10 group-hover:bg-emerald-500/20 group-hover:text-emerald-500 transition-all" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{r.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{r.account}</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6 space-y-4 bg-emerald-500/5 border-emerald-500/10">
            <div className="flex items-center gap-2 text-emerald-500">
              <Users size={18} />
              <h3 className="font-bold">Bénéficiaires enregistrés</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ajoutez des bénéficiaires à votre liste de confiance pour des virements plus rapides et sans vérification supplémentaire.
            </p>
            <Button variant="secondary" size="sm" className="w-full bg-white/5 hover:bg-emerald-500/10 border-white/5 hover:border-emerald-500/20 text-slate-300">
              Gérer la liste
            </Button>
          </Card>
        </div>
      </div>

      {/* Confirmation Overlay */}
      <AnimatePresence>
        {step === 'confirm' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-bg-dark/95 backdrop-blur-sm"
          >
            <Card className="w-full max-w-lg p-8 space-y-8 border-white/10 shadow-3xl bg-bg-card">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-white">Confirmer le virement</h3>
                <p className="text-slate-400 text-sm">Veuillez vérifier les détails avant de valider.</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
                  <Avatar name={recipientData?.name} size="lg" className="bg-emerald-500/20 text-emerald-500" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Vers</p>
                    <p className="text-lg font-bold text-white">{recipientData?.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{recipientData?.account}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Montant</span>
                    <span className="text-white font-bold">{formattedAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Motif</span>
                    <span className="text-white">{formData.reason || 'Non spécifié'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date d'exécution</span>
                    <span className="text-emerald-500 font-bold uppercase">
                      {formData.schedule === 'now' ? 'Instantané' : `${formData.date} à ${formData.time}`}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <Button variant="secondary" className="flex-1" onClick={() => setStep('form')} disabled={isLoading}>
                  Modifier
                </Button>
                <Button variant="primary" className="flex-1" onClick={handleTransfer} isLoading={isLoading}>
                  Confirmer & Envoyer
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransferPage;
