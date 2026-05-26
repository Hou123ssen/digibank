import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Eye,
  RefreshCw,
  Search,
  X,
  CreditCard,
  ReceiptText,
  FileText,
} from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import adminService from '../../services/adminService';

const STATUS_BADGES = {
  pending: <Badge variant="warning">pending</Badge>,
  paid: <Badge variant="success">paid</Badge>,
  failed: <Badge variant="danger">failed</Badge>,
  cancelled: <Badge variant="neutral">cancelled</Badge>,
};

const emptyFilters = {
  status: '',
  search: '',
  date_from: '',
  date_to: '',
  amount_min: '',
  amount_max: '',
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatAmount = (amount, currency = 'MAD') =>
  `${Number(amount || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

const compact = (value) => value || '-';

const Field = ({ label, value }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
    <p className="mt-1 text-sm text-slate-200 break-all">{compact(value)}</p>
  </div>
);

const PaymentDetailsModal = ({ paymentId, onClose, addToast }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    adminService.getPaymentDetails(paymentId)
      .then((data) => {
        if (mounted) setDetail(data);
      })
      .catch(() => addToast?.('Impossible de charger le paiement.', 'error'))
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [paymentId]);

  const intent = detail?.payment_intent;
  const transaction = detail?.transaction;
  const logs = Array.isArray(detail?.audit_logs) ? detail.audit_logs : [];

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        className="relative w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-3xl border border-white/10 bg-bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Stripe payment</p>
            <h3 className="text-lg font-bold text-white">Payment #{paymentId}</h3>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(88vh-73px)] overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 rounded-2xl bg-white/5" />
              <div className="h-40 rounded-2xl bg-white/5" />
              <div className="h-32 rounded-2xl bg-white/5" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="User" value={detail?.user ? `${detail.user.name} (${detail.user.email})` : null} />
                <Field label="Account" value={detail?.account?.account_number} />
                <Field label="Status" value={intent?.status} />
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <CreditCard size={16} className="text-emerald-400" />
                  Stripe refs
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Stripe Session ID" value={intent?.gateway_reference} />
                  <Field label="Stripe Payment Intent ID" value={intent?.stripe_payment_intent_id} />
                  <Field label="Stripe Charge ID" value={intent?.stripe_charge_id} />
                  <Field label="Webhook Event ID" value={intent?.stripe_event_id} />
                  <Field label="Created At" value={formatDate(intent?.created_at)} />
                  <Field label="Paid At" value={formatDate(intent?.paid_at)} />
                  <Field label="Failed At" value={formatDate(intent?.failed_at)} />
                  <Field label="Cancelled At" value={formatDate(intent?.cancelled_at)} />
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <ReceiptText size={16} className="text-emerald-400" />
                  Transaction
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Reference" value={transaction?.reference} />
                  <Field label="Description" value={transaction?.description} />
                  <Field label="Amount" value={transaction ? formatAmount(transaction.amount, intent?.currency) : null} />
                  <Field label="Balance Before" value={transaction?.balance_before} />
                  <Field label="Balance After" value={transaction?.balance_after} />
                  <Field label="Idempotency Key" value={transaction?.idempotency_key} />
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <FileText size={16} className="text-emerald-400" />
                  Audit logs
                </div>
                <div className="space-y-2">
                  {logs.length > 0 ? logs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-200">{log.event}</p>
                        <p className="text-xs text-slate-500">{formatDate(log.created_at)}</p>
                      </div>
                      <pre className="mt-3 max-h-36 overflow-auto rounded-lg bg-black/20 p-3 text-xs text-slate-400">
                        {JSON.stringify(log.metadata || {}, null, 2)}
                      </pre>
                    </div>
                  )) : (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-500">
                      No audit logs found.
                    </div>
                  )}
                </div>
              </div>

              {intent?.failure_reason && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
                  {intent.failure_reason}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const AdminPaymentsPage = ({ addToast }) => {
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [payments, setPayments] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);

  const query = useMemo(() => {
    const params = { page, per_page: 15, sort_by: 'created_at', sort_dir: 'desc' };
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '') params[key] = value;
    });
    return params;
  }, [filters, page]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const result = await adminService.getPayments(query);
      setPayments(Array.isArray(result?.data) ? result.data : []);
      setMeta({
        current_page: result?.current_page || 1,
        last_page: result?.last_page || 1,
        total: result?.total || 0,
      });
    } catch {
      addToast?.('Impossible de charger les paiements Stripe.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [query]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const rows = payments.map((payment) => [
    <div>
      <p className="font-semibold text-white">{payment.user?.name || '-'}</p>
      <p className="text-xs text-slate-500">{payment.user?.email || '-'}</p>
    </div>,
    <span className="font-mono text-xs">{payment.account?.account_number || '-'}</span>,
    <span className="font-mono font-semibold">{formatAmount(payment.amount, payment.currency)}</span>,
    <span className="uppercase">{payment.currency}</span>,
    STATUS_BADGES[payment.status] || <Badge>{payment.status}</Badge>,
    <span className="uppercase">{payment.gateway}</span>,
    <span className="font-mono text-xs break-all">{compact(payment.gateway_reference)}</span>,
    <span className="font-mono text-xs break-all">{compact(payment.stripe_payment_intent_id)}</span>,
    formatDate(payment.created_at),
    formatDate(payment.paid_at),
    <span className="text-xs text-rose-300">{compact(payment.failure_reason)}</span>,
    <Button variant="ghost" size="sm" leftIcon={Eye} onClick={() => setSelectedPaymentId(payment.id)}>
      Details
    </Button>,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stripe Payments"
        subtitle="Monitor DigiBank deposit intents, Stripe events, and credited transactions."
        breadcrumbs={['Admin', 'Payments']}
      />

      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <div className="md:col-span-2 xl:col-span-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <Search size={16} className="text-slate-500" />
            <input
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="User, account, Stripe ref"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}
            className="rounded-xl border border-white/10 bg-bg-card px-3 py-2 text-sm text-white outline-none">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input type="date" value={filters.date_from} onChange={(event) => updateFilter('date_from', event.target.value)}
            className="rounded-xl border border-white/10 bg-bg-card px-3 py-2 text-sm text-white outline-none" />
          <input type="date" value={filters.date_to} onChange={(event) => updateFilter('date_to', event.target.value)}
            className="rounded-xl border border-white/10 bg-bg-card px-3 py-2 text-sm text-white outline-none" />
          <input type="number" min="0" value={filters.amount_min} onChange={(event) => updateFilter('amount_min', event.target.value)}
            placeholder="Min amount" className="rounded-xl border border-white/10 bg-bg-card px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500" />
          <input type="number" min="0" value={filters.amount_max} onChange={(event) => updateFilter('amount_max', event.target.value)}
            placeholder="Max amount" className="rounded-xl border border-white/10 bg-bg-card px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500" />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">{meta.total} payment intents</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setFilters(emptyFilters); setPage(1); }}>
              Clear
            </Button>
            <Button variant="primary" size="sm" leftIcon={RefreshCw} onClick={fetchPayments} isLoading={loading}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      <Table
        headers={[
          'User',
          'Account Number',
          'Amount',
          'Currency',
          'Status',
          'Gateway',
          'Stripe Session ID',
          'Stripe Payment Intent ID',
          'Created At',
          'Paid At',
          'Failure Reason',
          '',
        ]}
        data={rows}
        isLoading={loading}
        pagination
        currentPage={meta.current_page}
        totalPages={meta.last_page}
        onPageChange={setPage}
        emptyState={() => (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-2xl bg-white/5 p-4 text-slate-500">
              <CreditCard size={24} />
            </div>
            <div>
              <p className="font-semibold text-slate-300">No Stripe payments found</p>
              <p className="text-sm text-slate-500">Adjust filters or refresh after new deposits arrive.</p>
            </div>
          </div>
        )}
      />

      <AnimatePresence>
        {selectedPaymentId && (
          <PaymentDetailsModal
            paymentId={selectedPaymentId}
            onClose={() => setSelectedPaymentId(null)}
            addToast={addToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPaymentsPage;
