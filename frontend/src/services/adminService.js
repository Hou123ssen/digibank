import api from '../lib/api';

const adminService = {
  // Real API calls
  createEmployee: async (data) => {
    const response = await api.post('/admin/create-employee', data);
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

  // Mock methods for missing backend routes
  getDashboardStats: async () => {
    // Simulating API delay
    await new Promise(r => setTimeout(r, 800));
    return {
      total_users: 1248,
      total_employees: 12,
      active_darets: 45,
      active_cagnottes: 28,
      transactions_today: 156,
      user_growth: [10, 15, 8, 22, 18, 25, 30, 28, 35, 40, 38, 45, 50, 48, 55, 60],
      kyc_distribution: { approved: 850, pending: 120, rejected: 45, not_submitted: 233 },
      trust_levels: { excellent: 150, trusted: 450, normal: 540, risky: 108 }
    };
  },

  getUsers: async () => {
    await new Promise(r => setTimeout(r, 600));
    return [
      { id: 1, name: 'Amine Slimani', email: 'amine@example.com', phone: '+212 612345678', kyc: 'approved', trust_score: 85, balance: 12500, role: 'user', status: 'active', created_at: '2024-01-15' },
      { id: 2, name: 'Siham Ennali', email: 'siham@example.com', phone: '+212 623456789', kyc: 'pending', trust_score: 65, balance: 4200, role: 'user', status: 'active', created_at: '2024-02-10' },
      { id: 3, name: 'Youssef Berrada', email: 'youssef@example.com', phone: '+212 634567890', kyc: 'not_submitted', trust_score: 45, balance: 0, role: 'user', status: 'frozen', created_at: '2024-03-01' },
      { id: 4, name: 'Layla Mansouri', email: 'layla@example.com', phone: '+212 645678901', kyc: 'approved', trust_score: 95, balance: 85000, role: 'user', status: 'active', created_at: '2023-11-20' },
    ];
  },

  getEmployees: async () => {
    await new Promise(r => setTimeout(r, 500));
    return [
      { id: 101, name: 'Mehdi Alami', email: 'mehdi.staff@digibank.ma', department: 'KYC', performance: 85, status: 'active', created_at: '2023-05-10', avatar: 'https://i.pravatar.cc/150?u=mehdi' },
      { id: 102, name: 'Fatima Zahra', email: 'fatima.staff@digibank.ma', department: 'Tickets', performance: 92, status: 'active', created_at: '2023-06-15', avatar: 'https://i.pravatar.cc/150?u=fatima' },
      { id: 103, name: 'Omar Kabbaj', email: 'omar.staff@digibank.ma', department: 'Cagnotte', performance: 78, status: 'inactive', created_at: '2023-08-20', avatar: 'https://i.pravatar.cc/150?u=omar' },
    ];
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
    return { id, ...data };
  },
  deactivateEmployee: async (id) => {
    return { id, status: 'inactive' };
  },
  getEmployeePerformance: async (id) => {
    return { id, tickets_resolved: 0, avg_response_time: 0 };
  },
};

export default adminService;
