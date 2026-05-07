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
  deposit: async (data) => {
    const response = await api.post('/accounts/deposit', data);
    return response.data?.data || response.data;
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
