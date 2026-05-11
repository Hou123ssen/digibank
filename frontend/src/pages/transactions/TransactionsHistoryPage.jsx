import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight, 
  Calendar,
  X,
  Copy,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  FileText as FilePdf
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import transactionService from '../../services/transactionService';

const TRANSACTION_TYPES = [
  { id: 'all', label: 'Toutes les opérations' },
  { id: 'deposit', label: 'Dépôts' },
  { id: 'withdraw', label: 'Retraits' },
  { id: 'transfer', label: 'Virements' },
  { id: 'daret', label: 'Daret' },
  { id: 'cagnotte', label: 'Cagnottes' },
];

const TransactionsHistoryPage = ({ addToast }) => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all',
    search: '',
    dateRange: 'all'
  });
  const [exporting, setExporting] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, transactions]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await transactionService.getMyTransactions();
      const rawTransactions = response?.transactions || response;
      setTransactions(Array.isArray(rawTransactions) ? rawTransactions : []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...transactions];

    if (filters.type !== 'all') {
      result = result.filter(t => t.type === filters.type);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(t => 
        (t.description?.toLowerCase().includes(search)) || 
        (t.reference?.toLowerCase().includes(search)) ||
        (t.type?.toLowerCase().includes(search))
      );
    }

    setFilteredTransactions(result);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const copyReference = (ref) => {
    navigator.clipboard.writeText(ref);
    setIsCopied(true);
    addToast?.('Référence copiée !');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const isPositiveTransaction = (type) => ['deposit', 'transfer_in', 'daret_payout'].includes(type);

  const signedAmount = (transaction) => {
    const amount = Math.abs(Number(transaction.amount || 0));
    return isPositiveTransaction(transaction.type) ? amount : -amount;
  };

  const formatTransactionAmount = (transaction) => {
    const amount = signedAmount(transaction);
    const formatted = new Intl.NumberFormat('fr-MA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));

    return `${amount >= 0 ? '+' : '-'}${formatted} MAD`;
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const blob = type === 'pdf'
        ? await transactionService.exportPdf()
        : await transactionService.exportExcel();

      downloadBlob(blob, type === 'pdf' ? 'transactions-digibank.pdf' : 'transactions-digibank.xlsx');
      addToast?.(`Export ${type === 'pdf' ? 'PDF' : 'Excel'} tÃ©lÃ©chargÃ©`, 'success');
    } catch (err) {
      console.error('Transaction export error:', err);
      addToast?.(`Impossible de gÃ©nÃ©rer l'export ${type === 'pdf' ? 'PDF' : 'Excel'}`, 'error');
    } finally {
      setExporting(null);
    }
  };

  const getTransactionIcon = (type) => {
    switch(type) {
      case 'deposit': return <ArrowDownLeft className="text-emerald-500" />;
      case 'withdraw': return <ArrowUpRight className="text-rose-500" />;
      case 'transfer': return <ArrowLeftRight className="text-sky-500" />;
      default: return <ArrowLeftRight className="text-slate-400" />;
    }
  };

  const getTransactionColor = (type) => {
    switch(type) {
      case 'deposit': return 'bg-emerald-500/10 text-emerald-500';
      case 'withdraw': return 'bg-rose-500/10 text-rose-500';
      case 'transfer': return 'bg-sky-500/10 text-sky-500';
      default: return 'bg-slate-500/10 text-slate-500';
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <PageHeader 
        title="Historique des transactions" 
        subtitle="Consultez et filtrez l'historique complet de vos activités financières."
        breadcrumbs={["Accueil", "Transactions"]}
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" leftIcon={FilePdf}>PDF</Button>
            <Button variant="secondary" size="sm" leftIcon={FileSpreadsheet}>Excel</Button>
          </div>
        }
      />

      {/* Filters Bar */}
      <Card className="p-4 bg-white/5 border-white/10 sticky top-4 z-30 backdrop-blur-xl shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Rechercher..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
          <Select 
            name="type" 
            value={filters.type} 
            onChange={handleFilterChange}
            className="bg-white/5 border-white/10 py-2"
          >
            {TRANSACTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
          <Select 
            name="dateRange" 
            value={filters.dateRange} 
            onChange={handleFilterChange}
            className="bg-white/5 border-white/10 py-2"
          >
            <option value="all">Toutes les dates</option>
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
          </Select>
          <Button variant="secondary" leftIcon={Filter} className="w-full bg-white/5 border-white/10 py-2">Filtres avancés</Button>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="p-1 overflow-hidden">
        {loading ? (
          <div className="p-12 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 w-full bg-white/5 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredTransactions.length > 0 ? (
          <>
            <Table 
              headers={["Opération", "Date", "Référence", "Montant", "Statut", ""]}
              data={filteredTransactions.map(t => [
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${getTransactionColor(t.type)}`}>
                    {getTransactionIcon(t.type)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-200">{t.description || t.type}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">{t.type}</p>
                  </div>
                </div>,
                <div className="space-y-0.5">
                  <p className="text-sm text-slate-300">{new Date(t.created_at).toLocaleDateString('fr-FR')}</p>
                  <p className="text-[10px] text-slate-500">{new Date(t.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>,
                <span className="font-mono text-xs text-slate-400 uppercase tracking-tight">{t.reference?.slice(0, 12)}...</span>,
                <span className={`font-mono font-bold text-lg ${
                  t.type === 'deposit' ? 'text-emerald-500' : 'text-rose-500'
                }`}>
                  {t.type === 'deposit' ? '+' : '-'}{t.amount}
                </span>,
                <Badge variant="success" className="text-[10px]">Terminé</Badge>,
                <button 
                  onClick={() => setSelectedTransaction(t)}
                  className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              ])}
            />
            <div className="p-6 border-t border-white/5 flex items-center justify-between">
              <p className="text-sm text-slate-500">Affichage de {filteredTransactions.length} transactions</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled>Précédent</Button>
                <Button variant="secondary" size="sm" disabled>Suivant</Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState 
            title="Aucune transaction trouvée"
            description="Essayez de modifier vos filtres ou de lancer une nouvelle recherche."
          />
        )}
      </Card>

      {/* Transaction Detail Drawer Overlay */}
      <AnimatePresence>
        {selectedTransaction && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex justify-end"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTransaction(null)} />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-bg-card border-l border-white/10 h-full overflow-y-auto"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Détails de l'opération</h3>
                  <button onClick={() => setSelectedTransaction(null)} className="p-2 rounded-xl hover:bg-white/5 text-slate-400">
                    <X size={20} />
                  </button>
                </div>

                <div className="text-center space-y-4 py-8 bg-white/5 rounded-3xl border border-white/5">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${getTransactionColor(selectedTransaction.type)}`}>
                    {React.cloneElement(getTransactionIcon(selectedTransaction.type), { size: 32 })}
                  </div>
                  <div className="space-y-1">
                    <h2 className={`text-4xl font-bold ${
                      selectedTransaction.type === 'deposit' ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {selectedTransaction.type === 'deposit' ? '+' : '-'}{selectedTransaction.amount} <span className="text-lg">MAD</span>
                    </h2>
                    <p className="text-slate-400 font-medium uppercase tracking-widest text-xs">{selectedTransaction.type}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Description</p>
                    <p className="text-white font-medium">{selectedTransaction.description || 'Opération DigiBank'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase tracking-widest">Date</p>
                      <p className="text-white font-medium">{new Date(selectedTransaction.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase tracking-widest">Heure</p>
                      <p className="text-white font-medium">{new Date(selectedTransaction.created_at).toLocaleTimeString('fr-FR')}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Référence de l'opération</p>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="font-mono text-sm text-slate-300 uppercase">{selectedTransaction.reference}</span>
                      <button 
                        onClick={() => copyReference(selectedTransaction.reference)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-emerald-500 transition-all"
                      >
                        {isCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Statut</p>
                    <div className="flex items-center gap-2 text-emerald-500 font-bold">
                      <CheckCircle2 size={16} />
                      <span>Opération confirmée par la banque</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5 space-y-4">
                  <Button variant="secondary" className="w-full" leftIcon={Download}>Télécharger le justificatif</Button>
                  <Button variant="ghost" className="w-full text-slate-500 hover:text-rose-500">Signaler un problème</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransactionsHistoryPage;
