import api from '../lib/api';

const trustService = {
  getMyTrustScore: async () => {
    const response = await api.get('/trust-score/me');
    return response.data;
  },
};

export default trustService;
