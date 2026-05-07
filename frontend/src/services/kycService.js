import api from '../lib/api';

const unwrap = r => r.data?.data ?? r.data;
const arr    = v => (Array.isArray(v) ? v : []);

const kycService = {
  submitKyc: async (formData) => {
    const response = await api.post('/kyc/submit', formData);
    return unwrap(response);
  },
  getMyKyc: async () => {
    const response = await api.get('/kyc/me');
    return unwrap(response);
  },
  getPendingKyc: async () => {
    const response = await api.get('/admin/kyc/pending');
    const d = unwrap(response);
    return arr(Array.isArray(d) ? d : d?.submissions ?? d?.kyc);
  },
  getAllKyc: async (params = {}) => {
    const response = await api.get('/admin/kyc', { params });
    const d = unwrap(response);
    return arr(Array.isArray(d) ? d : d?.submissions ?? d?.kyc);
  },
  approveKyc: async (id) => {
    const response = await api.post(`/admin/kyc/${id}/approve`);
    return unwrap(response);
  },
  rejectKyc: async (id, data) => {
    const response = await api.post(`/admin/kyc/${id}/reject`, data);
    return unwrap(response);
  },
  bulkApprove: async (ids) => {
    const response = await api.post('/admin/kyc/bulk-approve', { ids });
    return unwrap(response);
  },
  bulkReject: async (ids, reason) => {
    const response = await api.post('/admin/kyc/bulk-reject', { ids, reason });
    return unwrap(response);
  },
};

export default kycService;
