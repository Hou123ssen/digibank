import api from '../lib/api';

const kycService = {
  submitKyc: async (formData) => {
    const response = await api.post('/kyc/submit', formData);
    return response.data;
  },
  getMyKyc: async () => {
    const response = await api.get('/kyc/me');
    return response.data;
  },
  getPendingKyc: async () => {
    const response = await api.get('/admin/kyc/pending');
    return response.data;
  },
  approveKyc: async (id) => {
    const response = await api.post(`/admin/kyc/${id}/approve`);
    return response.data;
  },
  rejectKyc: async (id, data) => {
    const response = await api.post(`/admin/kyc/${id}/reject`, data);
    return response.data;
  },
};

export default kycService;
