import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import accountService from '../../services/accountService';
import { safeNumber, formatAmount, getErrorMessage } from '../../utils/apiResponse';

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

const DepositModal = ({ isOpen, onClose, onSuccess, addToast, currentBalance = 0 }) => {
  const [amount, setAmount] = useState('');
  const [gateway, setGateway] = useState('stripe');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);
  const inFlightKeyRef = useRef(null);

  const resetState = () => {
    setAmount('');
    setGateway('stripe');
    setNote('');
    setIsSuccess(false);
    setError(null);
    setIsLoading(false);
    inFlightKeyRef.current = null;
  };

  const handleClose = () => {
    if (isLoading) return;
    onClose();
    setTimeout(resetState, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || safeNumber(amount) <= 0 || isLoading || inFlightKeyRef.current) return;

    inFlightKeyRef.current = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    setIsLoading(true);
    setError(null);

    try {
      const response = await accountService.deposit({
        amount: safeNumber(amount),
        gateway,
        note,
        idempotency_key: inFlightKeyRef.current,
      });

      if (!response?.checkout_url || !response?.payment_intent_id) {
        throw new Error('Payment intent response was not confirmed by backend.');
      }

      setIsSuccess(true);
      await onSuccess?.(response);
      window.location.href = response.checkout_url;
    } catch (err) {
      const errorMessage = getErrorMessage(err) || 'Une erreur est survenue lors de la recharge.';
      setError(errorMessage);
      addToast?.(errorMessage, 'error');
      inFlightKeyRef.current = null;
    } finally {
      setIsLoading(false);
    }
  };

  const current = safeNumber(currentBalance);
  const depositAmount = safeNumber(amount);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={!isSuccess ? 'Recharge par paiement sécurisé' : null}
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

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Montant à recharger</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-4xl font-bold text-center text-white placeholder:text-white/10 focus:outline-none focus:border-emerald-500/50 transition-all"
                  required
                  disabled={isLoading}
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-bold text-emerald-500">MAD</div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {QUICK_AMOUNTS.map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt.toString())}
                    disabled={isLoading}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-500 transition-all disabled:opacity-50"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Passerelle de paiement</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'stripe', label: 'Stripe', icon: CreditCard },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setGateway(option.id)}
                    disabled={isLoading}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all disabled:opacity-50 ${
                      gateway === option.id
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <option.icon size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Note (optionnel)"
              placeholder="Ex: Recharge mensuelle"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-white/5 border-white/10"
              disabled={isLoading}
            />

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Solde actuel</span>
                <span className="text-slate-300 font-mono">{formatAmount(current)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-400">Montant à payer</span>
                <div className="flex items-center gap-2 text-emerald-500">
                  <ArrowRight size={14} />
                  <span className="font-mono">{formatAmount(depositAmount)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                disabled={isLoading || depositAmount <= 0}
                className="flex-1"
                leftIcon={ShieldCheck}
              >
                Payer sécurisé
              </Button>
            </div>
          </motion.form>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="py-8 text-center space-y-6"
          >
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Redirection paiement</h3>
              <p className="text-slate-400">Votre recharge sera créditée uniquement après confirmation sécurisée de la passerelle.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};

export default DepositModal;
