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
    return arr(Array.isArray(d) ? d : d?.kyc_verifications ?? d?.submissions ?? d?.kyc);
  },
  getAllKyc: async (params = {}) => {
    return kycService.getPendingKyc(params);
  },
  approveKyc: async (id) => {
    const response = await api.post(`/admin/kyc/${id}/approve`);
    return unwrap(response);
  },
  rejectKyc: async (id, data) => {
    const response = await api.post(`/admin/kyc/${id}/reject`, {
      rejection_reason: data?.rejection_reason ?? data?.reason ?? '',
    });
    return unwrap(response);
  },
  downloadKycPdf: async (id) => {
    const response = await api.get(`/employee/kyc/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
  bulkApprove: async (ids) => {
    return Promise.all(arr(ids).map(id => kycService.approveKyc(id)));
  },
  bulkReject: async (ids, reason) => {
    return Promise.all(arr(ids).map(id => kycService.rejectKyc(id, { rejection_reason: reason })));
  },
};

export default kycService;
