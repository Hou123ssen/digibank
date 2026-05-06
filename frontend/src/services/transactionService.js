import api from '../lib/api';

const transactionService = {
  getMyTransactions: async () => {
    const response = await api.get('/transactions/me');
    return response.data;
  },
};

export default transactionService;
