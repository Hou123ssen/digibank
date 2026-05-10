import api from '../lib/api';

const adminService = {
  // Real API calls
  createEmployee: async (data) => {
    const response = await api.post('/admin/employees', data);
    return response.data?.data || response.data;
  },

  getPendingKyc: async () => {
    const response = await api.get('/admin/kyc/pending');
    return response.data?.data || response.data;
  },

  approveKyc: async (id) => {
    const response = await api.post(`/admin/kyc/${id}/approve`);
    return response.data?.data || response.data;
  },

  rejectKyc: async (id, reason) => {
    const response = await api.post(`/admin/kyc/${id}/reject`, { rejection_reason: reason });
    return response.data?.data || response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard/stats');
    return response.data?.data ?? {};
  },

  getUsers: async () => {
    const response = await api.get('/admin/users');
    const users = response.data?.data ?? [];
    return Array.isArray(users) ? users : [];
  },

  getEmployees: async () => {
    const response = await api.get('/admin/employees');
    const employees = response.data?.data ?? [];
    return Array.isArray(employees) ? employees : [];
  },

  getUserById: async (id) => {
    const users = await adminService.getUsers();
    return users.find(user => String(user.id) === String(id)) || null;
  },
  freezeUser: async (id) => {
    return { id, status: 'frozen' };
  },
  unfreezeUser: async (id) => {
    return { id, status: 'active' };
  },
  adjustTrustScore: async (id, data) => {
    return { id, ...data };
  },
  resetPassword: async (id) => {
    return { id, reset: true };
  },
  getUserTickets: async (id) => {
    return [];
  },
  getUserDarets: async (id) => {
    return [];
  },
  getUserLogs: async (id) => {
    return [];
  },
  updateEmployee: async (id, data) => {
    const response = await api.patch(`/admin/employees/${id}`, data);
    return response.data?.data || response.data;
  },
  deactivateEmployee: async (id) => {
    const response = await api.delete(`/admin/employees/${id}`);
    return response.data?.data || response.data;
  },
  getEmployeePerformance: async (id) => {
    return { id, tickets_resolved: 0, kyc_processed: 0, response_time_score: 0, customer_rating: 0 };
  },
};

export default adminService;
