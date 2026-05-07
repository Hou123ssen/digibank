import api from '../lib/api';

const unwrap = r => r.data?.data ?? r.data;
const arr    = v => (Array.isArray(v) ? v : []);
const normalizeCagnotte = cagnotte => cagnotte ? ({
  ...cagnotte,
  story: cagnotte.story ?? cagnotte.description ?? '',
  donor_count: cagnotte.donor_count ?? arr(cagnotte.donations).length,
}) : null;
const unwrapCagnottes = response => {
  const d = unwrap(response);
  const cagnottes = Array.isArray(d) ? d : d?.cagnottes || [];
  return arr(cagnottes).map(normalizeCagnotte);
};

const cagnotteService = {
  getCagnottes: async (params) => {
    const response = await api.get('/cagnottes', { params });
    return unwrapCagnottes(response);
  },
  getCagnotteById: async (id) => {
    const [active, mine] = await Promise.allSettled([
      cagnotteService.getCagnottes(),
      cagnotteService.getMyRequests(),
    ]);

    const cagnottes = [
      ...(active.status === 'fulfilled' ? active.value : []),
      ...(mine.status === 'fulfilled' ? mine.value : []),
    ];

    return cagnottes.find(cagnotte => String(cagnotte.id) === String(id)) || null;
  },
  getDonors: async (_id) => [],
  getUpdates: async (_id) => [],
  requestCagnotte: async (data) => {
    const response = await api.post('/cagnottes/request', data);
    return unwrap(response);
  },
  getMyRequests: async () => {
    const response = await api.get('/cagnottes/my-requests');
    return unwrapCagnottes(response);
  },
  donate: async (id, data) => {
    const response = await api.post(`/cagnottes/${id}/donate`, data);
    return unwrap(response);
  },
  getPendingCagnottes: async () => {
    const response = await api.get('/employee/cagnottes/pending');
    return unwrapCagnottes(response);
  },
  findCagnotteByCode: async (code) => {
    const response = await api.get(`/employee/cagnottes/code/${code}`);
    const d = unwrap(response);
    return d?.cagnotte || d;
  },
  approveCagnotte: async (id) => {
    const response = await api.post(`/employee/cagnottes/${id}/approve`);
    return unwrap(response);
  },
  rejectCagnotte: async (id, data) => {
    const response = await api.post(`/employee/cagnottes/${id}/reject`, {
      rejection_reason: data?.rejection_reason ?? data?.reason ?? '',
    });
    return unwrap(response);
  },
};

export default cagnotteService;
