import api from '../lib/api';

const transactionService = {
  getMyTransactions: async () => {
    const response = await api.get('/transactions/me');
    const d = response.data?.data ?? response.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.transactions)) return d.transactions;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  },
};

export default transactionService;
