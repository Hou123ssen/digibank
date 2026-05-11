import React, { useState } from 'react';
import { 
  X, 
  ArrowRight, 
  CheckCircle2, 
  ArrowUpRight,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import accountService from '../../services/accountService';
import { useTheme } from '../landing/ThemeContext';
import { cn } from '../../utils/cn';

const QUICK_AMOUNTS = [100, 500, 1000, 2000];

const WithdrawModal = ({ isOpen, onClose, onSuccess, currentBalance = 0, overdraftLimit = 0 }) => {
  const { dark } = useTheme();
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);

  const availableFunds = Number(currentBalance) + Number(overdraftLimit);
  const willUseOverdraft = Number(amount) > Number(currentBalance);
  const isInsufficientFunds = Number(amount) > availableFunds;

  const handleAmountChange = (e) => {
    const normalized = e.target.value
      .replace(',', '.')
      .replace(/[^\d.]/g, '')
      .replace(/^(\d*\.)(.*)\./, '$1$2');

    if (!/^\d*(\.\d{0,2})?$/.test(normalized)) return;
    setAmount(normalized.startsWith('.') ? `0${normalized}` : normalized);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || isInsufficientFunds) return;

    setIsLoading(true);
    setError(null);

    try {
      await accountService.withdraw({
        amount: Number(amount),
        description: 'Retrait de fonds'
      });
      setIsSuccess(true);
      onSuccess?.();
    } catch (err) {
      console.error('Withdraw error:', err);
      setError(err.response?.data?.message || 'Une erreur est survenue lors du retrait.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setAmount('');
    setIsSuccess(false);
    setError(null);
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetState, 300);
  };

  const previewBalance = Number(currentBalance) - Number(amount || 0);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={!isSuccess ? "Retirer des fonds" : null}
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
              <label className={cn("text-sm font-medium uppercase tracking-wider", dark ? "text-slate-400" : "text-[#006655]/70")}>Montant à retirer</label>
              <div className="relative">
                <input 
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0.00"
                  className={cn(
                    "w-full border rounded-2xl p-6 pr-24 text-4xl font-bold text-center placeholder:text-current/20 focus:outline-none transition-all",
                    dark ? "bg-white/5 text-white" : "bg-[#f0fffe] text-[#003d35]",
                    isInsufficientFunds ? "border-rose-500/50" : (dark ? "border-white/10 focus:border-emerald-500/50" : "border-[#00C2A8]/20 focus:border-[#006655]/50"),
                  )}
                  required
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-bold text-emerald-500">MAD</div>
              </div>

              {/* Error Message */}
              {isInsufficientFunds && (
                <p className="text-rose-500 text-xs font-medium text-center">Fonds insuffisants (limite de découvert incluse).</p>
              )}

              {/* Overdraft Warning */}
              {willUseOverdraft && !isInsufficientFunds && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-medium">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <p>Cela utilisera votre découvert. Votre Trust Score pourrait diminuer.</p>
                </div>
              )}

              {/* Quick Amount Chips */}
              <div className="flex flex-wrap gap-2 pt-2">
                {QUICK_AMOUNTS.map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt.toString())}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl border text-sm font-semibold transition-all",
                      dark
                        ? "bg-white/5 border-white/10 text-slate-300 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-500"
                        : "bg-[#f0fffe] border-[#00C2A8]/20 text-[#006655] hover:bg-[#00C2A8]/10 hover:border-[#006655]/35 hover:text-[#003d35]",
                    )}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Box */}
            <div className={cn("p-4 rounded-2xl border space-y-2", dark ? "bg-black/40 border-white/5" : "bg-[#f0fffe]/80 border-[#00C2A8]/15")}>
              <div className="flex justify-between text-sm">
                <span className={cn(dark ? "text-slate-500" : "text-[#006655]/65")}>Disponible (incl. découvert)</span>
                <span className={cn("font-mono", dark ? "text-slate-300" : "text-[#003d35]")}>{availableFunds.toLocaleString()} MAD</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className={cn(dark ? "text-slate-400" : "text-[#006655]/75")}>Nouveau solde</span>
                <div className="flex items-center gap-2 text-rose-500">
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
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={isInsufficientFunds}
                leftIcon={ArrowUpRight}
              >
                Retirer
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
              <h3 className={cn("text-2xl font-bold", dark ? "text-white" : "text-[#003d35]")}>Retrait réussi !</h3>
              <p className={cn(dark ? "text-slate-400" : "text-[#006655]/70")}>Vos fonds ont été retirés avec succès.</p>
            </div>
            <div className={cn("p-4 rounded-2xl border", dark ? "bg-white/5 border-white/10" : "bg-[#f0fffe] border-[#00C2A8]/20")}>
              <p className={cn("text-xs uppercase tracking-widest mb-1", dark ? "text-slate-500" : "text-[#006655]/60")}>Nouveau solde</p>
              <p className={cn("text-3xl font-bold", dark ? "text-white" : "text-[#003d35]")}>{previewBalance.toLocaleString()} <span className="text-emerald-500">MAD</span></p>
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

export default WithdrawModal;
