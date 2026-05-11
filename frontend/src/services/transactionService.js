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
  exportPdf: async () => {
    const response = await api.get('/transactions/export/pdf', {
      responseType: 'blob',
      headers: { Accept: 'application/pdf' },
    });
    return response.data;
  },
  exportExcel: async () => {
    const response = await api.get('/transactions/export/excel', {
      responseType: 'blob',
      headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    });
    return response.data;
  },
};

export default transactionService;
