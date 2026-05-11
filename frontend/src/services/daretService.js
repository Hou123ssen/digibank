import api from '../lib/api';

const unwrapData = (response) => response.data?.data ?? response.data;
const unwrapDaret = (response) => {
  const data = unwrapData(response);
  return data?.daret || data;
};
const unwrapDarets = (response) => {
  const data = unwrapData(response);
  const darets = Array.isArray(data) ? data : data?.darets || [];
  return Array.isArray(darets) ? darets : [];
};
const unwrapAnalytics = (response) => {
  const data = unwrapData(response);
  return data?.analytics || data || {};
};

const normalizeUser = (user) => {
  if (!user) return null;
  return {
    ...user,
    name: user.name || user.full_name,
  };
};

const normalizeMember = (member) => {
  const user = normalizeUser(member?.user);
  return {
    ...member,
    user,
    name: member?.name || user?.name,
    email: member?.email || user?.email,
    trust_score: member?.trust_score ?? user?.trust_score,
    payment_status: member?.payment_status || (member?.has_paid_current_cycle || member?.paid ? 'paid' : 'pending'),
    paid: member?.has_paid_current_cycle ?? member?.paid ?? member?.payment_status === 'paid',
  };
};

const normalizeCycle = (cycle, totalMembers = 0) => ({
  ...cycle,
  recipient: cycle?.recipient || cycle?.beneficiary || cycle?.payout_user,
  scheduled_date: cycle?.scheduled_date || cycle?.due_date,
  total_members: cycle?.total_members ?? totalMembers,
  paid_count: cycle?.paid_count ?? (Array.isArray(cycle?.payments) ? cycle.payments.length : 0),
});

const normalizePayment = (payment) => ({
  ...payment,
  user: normalizeUser(payment?.user),
  member: payment?.member || payment?.user,
});

const normalizeDaret = (daret) => {
  if (!daret) return daret;

  const members = Array.isArray(daret.members) ? daret.members.map(normalizeMember) : [];
  const totalMembers = Number(daret.total_members ?? daret.capacity ?? 0);
  const membersCount = Number(daret.members_count ?? daret.current_members ?? members.length ?? 0);
  const cycles = Array.isArray(daret.cycles) ? daret.cycles.map(cycle => normalizeCycle(cycle, totalMembers)) : [];
  const payments = Array.isArray(daret.payments) ? daret.payments.map(normalizePayment) : [];
  const currentCycle = cycles.find(cycle => ['pending', 'late', 'active', 'in_progress'].includes(cycle.status));

  return {
    ...daret,
    members,
    cycles,
    payments,
    creator: normalizeUser(daret.creator),
    created_by: normalizeUser(daret.created_by || daret.creator),
    capacity: totalMembers,
    total_members: totalMembers,
    current_members: Number(daret.current_members ?? membersCount),
    members_count: membersCount,
    cycle_frequency: daret.cycle_frequency || daret.frequency,
    frequency: daret.frequency || daret.cycle_frequency,
    payout_order: daret.payout_order || daret.payout_order_type,
    payout_order_type: daret.payout_order_type || daret.payout_order,
    current_cycle: daret.current_cycle ?? daret.current_cycle_number ?? currentCycle?.cycle_number ?? null,
    total_cycles: daret.total_cycles ?? totalMembers,
    next_payout_date: daret.next_payout_date || currentCycle?.due_date || currentCycle?.scheduled_date || null,
  };
};

const daretService = {
  getMyDarets: async () => {
    const response = await api.get('/darets/my');
    return unwrapDarets(response).map(normalizeDaret);
  },
  getAllDarets: async () => {
    const response = await api.get('/darets');
    return unwrapDarets(response).map(normalizeDaret);
  },
  getAnalytics: async () => {
    const response = await api.get('/darets/analytics');
    return unwrapAnalytics(response);
  },
  getDaretById: async (id) => {
    const response = await api.get(`/darets/${id}`);
    return normalizeDaret(unwrapDaret(response));
  },
  createDaret: async (data) => {
    const response = await api.post('/darets', data);
    return normalizeDaret(unwrapDaret(response));
  },
  joinDaret: async (id) => {
    const response = await api.post(`/darets/${id}/join`);
    return normalizeDaret(unwrapDaret(response));
  },
  joinByCode: async (inviteCode) => {
    const response = await api.post('/darets/join-by-code', { invite_code: inviteCode });
    return normalizeDaret(unwrapDaret(response));
  },
  startDaret: async (id) => {
    const response = await api.post(`/darets/${id}/start`);
    return normalizeDaret(unwrapDaret(response));
  },
  payDaret: async (id, data) => {
    const response = await api.post(`/darets/${id}/pay`, data);
    return unwrapData(response);
  },
};

export default daretService;
