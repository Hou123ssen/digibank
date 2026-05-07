import api from '../lib/api';

const accountService = {
  getMyAccount: async () => {
    const response = await api.get('/accounts/me');
    return response.data?.data || response.data;
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
