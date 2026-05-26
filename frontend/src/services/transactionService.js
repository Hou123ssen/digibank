import api from '../lib/api';

const transactionService = {
  getMyTransactions: async (params = {}) => {
    const response = await api.get('/transactions/me', { params });
    const d = response.data?.data ?? response.data;
    if (Array.isArray(d)) return { data: d };
    if (Array.isArray(d?.transactions)) return { data: d.transactions, summary: d.summary };
    if (Array.isArray(d?.transactions?.data)) return d.transactions;
    if (d?.transactions) return { ...d.transactions, summary: d.summary };
    return [];
  },
  getStatement: async (params = {}) => {
    const response = await api.get('/transactions/statement', { params });
    return response.data?.data || response.data;
  },
  exportPdf: async (params = {}) => {
    const response = await api.get('/transactions/export/pdf', {
      params,
      responseType: 'blob',
      headers: { Accept: 'application/pdf' },
    });
    return response.data;
  },
  exportExcel: async (params = {}) => {
    const response = await api.get('/transactions/export/excel', {
      params,
      responseType: 'blob',
      headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    });
    return response.data;
  },
  exportCsv: async (params = {}) => {
    const response = await api.get('/transactions/export/csv', {
      params,
      responseType: 'blob',
      headers: { Accept: 'text/csv' },
    });
    return response.data;
  },
  exportStatementPdf: async (params = {}) => {
    const response = await api.get('/transactions/statement/pdf', {
      params,
      responseType: 'blob',
      headers: { Accept: 'application/pdf' },
    });
    return response.data;
  },
};

export default transactionService;
