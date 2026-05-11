import React, { useState, useEffect } from 'react';
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  FileText,
  Copy,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';
import StatCard from '../../components/ui/StatCard';
import DepositModal from '../../components/accounts/DepositModal';
import WithdrawModal from '../../components/accounts/WithdrawModal';
import { useTheme } from '../../components/landing/ThemeContext';
import { cn } from '../../utils/cn';

import accountService from '../../services/accountService';
import transactionService from '../../services/transactionService';

const AccountOverviewPage = ({ addToast }) => {
  const { dark } = useTheme();
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accRes, transRes] = await Promise.all([
        accountService.getMyAccount(),
        transactionService.getMyTransactions()
      ]);
      setAccount(accRes);
      // Backend may return { transactions: [...] } inside data
      const rawTransactions = transRes?.transactions || transRes;
      setTransactions(Array.isArray(rawTransactions) ? rawTransactions : []);
    } catch (err) {
      console.error('Error fetching account data:', err);
      // addToast('Impossible de charger les données du compte', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    addToast('Numéro de compte copié !');
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-8 w-64 bg-white/5 rounded-lg" />
        <div className="h-48 w-full bg-white/5 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-white/5 rounded-2xl" />
          <div className="h-32 bg-white/5 rounded-2xl" />
          <div className="h-32 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  const isOverdraft = account?.balance < 0;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <PageHeader
        title="Mon Compte"
        subtitle="Gérez vos fonds, effectuez des dépôts et suivez vos activités bancaires."
        breadcrumbs={["Accueil", "Mon Compte"]}
      />

      {/* Overdraft Warning Banner */}
      {isOverdraft && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-amber-500"
        >
          <AlertTriangle size={20} />
          <p className="text-sm font-medium">Vous utilisez actuellement votre découvert. Votre Trust Score pourrait diminuer.</p>
        </motion.div>
      )}

      {/* Hero Account Card */}
      <Card className="relative overflow-hidden p-0 border-none">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-transparent to-teal-600/10" />
        <div className="relative p-8 md:p-10 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Numéro de compte</span>
                <Badge variant={account?.status === 'active' ? 'success' : 'danger'} className="text-[10px]">
                  {account?.status === 'active' ? 'Actif' : 'Gelé'}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl md:text-2xl font-mono text-white font-bold">{account?.account_number}</h3>
                <button
                  onClick={() => copyToClipboard(account?.account_number)}
                  className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-emerald-500 transition-all"
                >
                  {isCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <div className="text-left md:text-right">
              <p className="text-slate-400 text-sm font-medium">Titulaire du compte</p>
              <h4 className="text-lg font-bold text-white">{account?.user?.name}</h4>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-slate-400 text-sm font-medium">Solde disponible</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-5xl md:text-6xl font-bold text-white tracking-tight">
                {Number(account?.balance).toLocaleString()} <span className="text-2xl text-emerald-500 font-medium">MAD</span>
              </h2>
            </div>
            {account?.overdraft_limit > 0 && (
              <p className="text-slate-500 text-sm">
                Limite de découvert : <span className="text-slate-300 font-semibold">{account?.overdraft_limit} MAD</span>
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 flex flex-col md:flex-row justify-between gap-4">
            <p className="text-slate-500 text-xs">Compte ouvert le {new Date(account?.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 size={14} />
              <span className="text-xs font-semibold uppercase tracking-widest">Compte vérifié par DigiBank</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button
          onClick={() => setIsDepositOpen(true)}
          variant="primary"
          leftIcon={Plus}
          className="h-14 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500 border-emerald-500/20 text-primary hover:text-white"
        >
          Déposer
        </Button>
        <Button
          onClick={() => setIsWithdrawOpen(true)}
          variant="secondary"
          leftIcon={ArrowUpRight}
          className={cn("h-14 rounded-2xl", dark ? "bg-white/5 hover:bg-white/10" : "bg-white/80 border-[#00C2A8]/20 text-[#006655] hover:bg-[#00C2A8]/10 hover:border-[#006655]/30")}
        >
          Retirer
        </Button>
        <Button
          variant="secondary"
          leftIcon={ArrowLeftRight}
          className={cn("h-14 rounded-2xl", dark ? "bg-white/5 hover:bg-white/10" : "bg-white/80 border-[#00C2A8]/20 text-[#006655] hover:bg-[#00C2A8]/10 hover:border-[#006655]/30")}
        >
          Virement
        </Button>
        <Button
          variant="secondary"
          leftIcon={FileText}
          className={cn("h-14 rounded-2xl", dark ? "bg-white/5 hover:bg-white/10" : "bg-white/80 border-[#00C2A8]/20 text-[#006655] hover:bg-[#00C2A8]/10 hover:border-[#006655]/30")}
        >
          Relevé PDF
        </Button>
      </div>

      {/* Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Entrées ce mois"
          value="MAD 12,450.00"
          delta="12%"
          icon={TrendingUp}
          trend="up"
        />
        <StatCard
          label="Sorties ce mois"
          value="MAD 8,200.00"
          delta="5%"
          icon={TrendingDown}
          trend="down"
        />
        <Card className="p-6 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Flux Net</h4>
            <Activity size={18} className="text-emerald-500" />
          </div>
          <div className="flex items-end justify-between gap-4">
            <h3 className="text-2xl font-bold text-white">+ MAD 4,250</h3>
            <div className="flex-1 h-12 flex items-end gap-1">
              {[40, 20, 60, 30, 80, 50, 90, 45, 70].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-emerald-500/20 rounded-t-sm"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card className="p-1 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-white">Activité récente</h3>
          <Button variant="ghost" size="sm" className="text-emerald-500 hover:text-[#006655] hover:bg-[#00C2A8]/10">Voir tout</Button>
        </div>
        <Table
          headers={["Transaction", "Date", "Montant", "Statut", "Compte"]}
          data={transactions.slice(0, 10).map(t => [
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' :
                  t.type === 'withdraw' ? 'bg-rose-500/10 text-rose-500' :
                    'bg-sky-500/10 text-sky-500'
                }`}>
                {t.type === 'deposit' ? <ArrowDownLeft size={14} /> :
                  t.type === 'withdraw' ? <ArrowUpRight size={14} /> :
                    <ArrowLeftRight size={14} />}
              </div>
              <span className="font-medium text-slate-200">{t.description || t.type}</span>
            </div>,
            new Date(t.created_at).toLocaleDateString('fr-FR'),
            <span className={`font-mono font-bold ${t.type === 'deposit' ? 'text-emerald-500' : 'text-rose-500'
              }`}>
              {t.type === 'deposit' ? '+' : '-'}{t.amount} MAD
            </span>,
            <Badge variant="success">Terminé</Badge>,
            <span className="text-slate-400 text-sm">•••• {t.account_number?.slice(-4)}</span>
          ])}
        />
      </Card>

      {/* Modals */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSuccess={fetchData}
        currentBalance={account?.balance}
      />
      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onSuccess={fetchData}
        currentBalance={account?.balance}
        overdraftLimit={account?.overdraft_limit}
      />
    </div>
  );
};

export default AccountOverviewPage;
