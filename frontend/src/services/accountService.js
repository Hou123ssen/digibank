import api from '../lib/api';

const accountService = {
  getMyAccount: async () => {
    const res = await api.get('/accounts/me');

    const accountData =
      res.data?.data?.account ??
      res.data?.data ??
      res.data ??
      null;

    if (!accountData) return null;

    return {
      ...accountData,
      balance: accountData?.balance ?? res.data?.data?.balance ?? 0,
    };
  },
  getMySummary: async () => {
    const response = await api.get('/accounts/me/summary');
    return response.data?.data ?? response.data ?? {
      monthly_inflows: 0,
      monthly_outflows: 0,
      net_flow: 0,
    };
  },
  downloadStatementPdf: async () => {
    return api.get('/accounts/me/statement-pdf', {
      responseType: 'blob',
    });
  },
  deposit: async (data) => {
    const response = await api.post('/accounts/deposit', data);
    return {
      success: response.data?.success ?? false,
      message: response.data?.message,
      ...(response.data?.data || {}),
    };
  },
  withdraw: async (data) => {
    const response = await api.post('/accounts/withdraw', data);
    return response.data?.data || response.data;
  },
  transfer: async (data) => {
    const response = await api.post('/accounts/transfer', data);
    return response.data?.data || response.data;
  },
};

export default accountService;
