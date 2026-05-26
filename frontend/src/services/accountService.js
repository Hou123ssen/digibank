import api from '../lib/api';

const makeIdempotencyConfig = (data = {}) => {
  const key = data.idempotency_key || data.idempotencyKey || crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  return {
    payload: Object.fromEntries(Object.entries(data).filter(([k]) => !['idempotency_key', 'idempotencyKey'].includes(k))),
    config: { headers: { 'Idempotency-Key': key } },
  };
};

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
    const { payload, config } = makeIdempotencyConfig(data);
    const response = await api.post('/deposits/create-payment-intent', payload, config);
    return {
      success: response.data?.success ?? false,
      message: response.data?.message,
      ...(response.data?.data || {}),
    };
  },
  getDepositStatus: async (id) => {
    const response = await api.get(`/deposits/${id}/status`);
    return response.data?.data || response.data;
  },
  simulateDepositSuccess: async (id) => {
    const response = await api.post(`/deposits/${id}/sandbox-confirm`);
    return response.data?.data || response.data;
  },
  withdraw: async (data) => {
    const { payload, config } = makeIdempotencyConfig(data);
    const response = await api.post('/accounts/withdraw', payload, config);
    return response.data?.data || response.data;
  },
  transfer: async (data) => {
    const { payload, config } = makeIdempotencyConfig(data);
    const response = await api.post('/accounts/transfer', payload, config);
    return response.data?.data || response.data;
  },
};

export default accountService;
