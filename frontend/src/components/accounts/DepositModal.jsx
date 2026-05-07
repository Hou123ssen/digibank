import React, { useState } from 'react';
import { 
  X, 
  ArrowRight, 
  CheckCircle2, 
  Wallet,
  CreditCard,
  Banknote,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import accountService from '../../services/accountService';

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

const DepositModal = ({ isOpen, onClose, onSuccess, currentBalance = 0 }) => {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('card');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    setIsLoading(true);
    setError(null);

    try {
      await accountService.deposit({
        amount: Number(amount),
        source,
        description: note || 'Dépôt de fonds'
      });
      setIsSuccess(true);
      onSuccess?.();
    } catch (err) {
      console.error('Deposit error:', err);
      setError(err.response?.data?.message || 'Une erreur est survenue lors du dépôt.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setAmount('');
    setNote('');
    setIsSuccess(false);
    setError(null);
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetState, 300);
  };

  const previewBalance = Number(currentBalance) + Number(amount || 0);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={!isSuccess ? "Déposer des fonds" : null}
      className="max-w-md"
    >
      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.form 
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit} 
            className="space-y-6"
          >
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
                {error}
              </div>
            )}

            {/* Amount Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Montant à déposer</label>
              <div className="relative">
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-4xl font-bold text-center text-white placeholder:text-white/10 focus:outline-none focus:border-emerald-500/50 transition-all"
                  required
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-bold text-emerald-500">MAD</div>
              </div>

              {/* Quick Amount Chips */}
              <div className="flex flex-wrap gap-2 pt-2">
                {QUICK_AMOUNTS.map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt.toString())}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-500 transition-all"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Source Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Source des fonds</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'transfer', label: 'Virement', icon: Banknote },
                  { id: 'cash', label: 'Espèces', icon: Wallet },
                  { id: 'card', label: 'Carte', icon: CreditCard },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSource(s.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                      source === s.id 
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' 
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <s.icon size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Note Input */}
            <Input 
              label="Note (optionnel)"
              placeholder="Ex: Remboursement ami"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-white/5 border-white/10"
            />

            {/* Summary Box */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Solde actuel</span>
                <span className="text-slate-300 font-mono">{Number(currentBalance).toLocaleString()} MAD</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-400">Nouveau solde</span>
                <div className="flex items-center gap-2 text-emerald-500">
                  <ArrowRight size={14} />
                  <span className="font-mono">{previewBalance.toLocaleString()} MAD</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleClose} 
                className="flex-1"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                variant="primary" 
                isLoading={isLoading} 
                className="flex-1"
                leftIcon={Plus}
              >
                Confirmer le dépôt
              </Button>
            </div>
          </motion.form>
        ) : (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center space-y-6"
          >
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Dépôt réussi !</h3>
              <p className="text-slate-400">Vos fonds ont été ajoutés instantanément à votre compte.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Nouveau solde</p>
              <p className="text-3xl font-bold text-white">{previewBalance.toLocaleString()} <span className="text-emerald-500">MAD</span></p>
            </div>
            <Button 
              onClick={handleClose} 
              variant="primary" 
              className="w-full"
            >
              Terminé
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};

export default DepositModal;
