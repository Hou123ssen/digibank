import { useState, useEffect } from 'react';
import {
  UserPlus, RefreshCw, X, Plus, Trash2, UserCog,
  BadgeCheck, Ticket, HeartHandshake, Eye,
  TrendingUp, RotateCcw, CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import adminService from '../../services/adminService';
import { cn } from '../../utils/cn';

/* ── helpers ──────────────────────────────────────────────────────── */
const DEPARTMENTS = ['kyc', 'tickets', 'cagnotte', 'audit', 'support'];
const DEPT_LABELS = {
  kyc: 'KYC',
  tickets: 'Tickets',
  cagnotte: 'Cagnotte',
  audit: 'Audit',
  support: 'Support',
};

const DEPT_META = {
  kyc:      { icon: BadgeCheck,    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  tickets:  { icon: Ticket,        color: 'text-blue-400    bg-blue-500/10    border-blue-500/20'    },
  cagnotte: { icon: HeartHandshake,color: 'text-rose-400    bg-rose-500/10    border-rose-500/20'    },
  audit:    { icon: CheckCircle2,  color: 'text-amber-400   bg-amber-500/10   border-amber-500/20'   },
  support:  { icon: UserCog,       color: 'text-purple-400  bg-purple-500/10  border-purple-500/20'  },
};

const genPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const perfColor = p => p >= 90 ? 'bg-emerald-500' : p >= 70 ? 'bg-blue-500' : p >= 50 ? 'bg-amber-500' : 'bg-rose-500';
const normalizeEmployee = emp => ({
  ...emp,
  department: emp?.department || 'support',
  status: emp?.status || 'active',
  performance: Number(emp?.performance ?? 0),
  phone: emp?.phone || '',
});

/* ── Create Employee Modal ─────────────────────────────────────────── */
const CreateModal = ({ onClose, onCreated, addToast }) => {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: genPassword(), department: 'kyc', sendInvite: true,
  });
  const [creating, setCreating] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = patch => setForm(f => ({ ...f, ...patch }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.department) { addToast?.('Select a department', 'error'); return; }
    setCreating(true);
    try {
      await adminService.createEmployee({
        name: form.name, email: form.email, phone: form.phone,
        password: form.password, department: form.department,
        status: 'active',
      });
      addToast?.('Employee created successfully', 'success');
      onCreated();
      onClose();
    } catch (err) {
      const errors = err.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat()[0] : null;
      addToast?.(firstError || err.response?.data?.message || 'Failed to create employee', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-bg-card border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden"
      >
        <div className="p-7 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">New Employee</h3>
            <p className="text-xs text-slate-500 mt-0.5">Create an administrative staff account.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-7 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Name + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Full Name</label>
              <input
                required placeholder="Full name"
                value={form.name} onChange={e => set({ name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/40 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Phone</label>
              <input
                placeholder="+212 6XXXXXXXX"
                value={form.phone} onChange={e => set({ phone: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/40 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Email Address</label>
            <input
              required type="email" placeholder="name.staff@digibank.ma"
              value={form.email} onChange={e => set({ email: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/40 transition-all"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400">Temporary Password</label>
              <button type="button" onClick={() => set({ password: genPassword() })}
                className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors">
                <RotateCcw size={10} /> Generate
              </button>
            </div>
            <div className="relative">
              <input
                required type={showPass ? 'text' : 'password'}
                value={form.password} onChange={e => set({ password: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 pr-10 text-sm text-white font-mono outline-none focus:border-violet-500/40 transition-all"
              />
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                <Eye size={14} />
              </button>
            </div>
          </div>

          {/* Department */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">Department</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEPARTMENTS.map(dept => {
                const meta = DEPT_META[dept];
                const DeptIcon = meta?.icon || UserCog;
                const active = form.department === dept;
                return (
                  <button key={dept} type="button" onClick={() => set({ department: dept })}
                    className={cn(
                      'flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all',
                      active ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'
                    )}
                  >
                    <DeptIcon size={13} /> {DEPT_LABELS[dept]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Send invite toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set({ sendInvite: !form.sendInvite })}
              className={cn(
                'w-10 h-5 rounded-full transition-all relative',
                form.sendInvite ? 'bg-violet-500' : 'bg-white/10'
              )}
            >
              <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', form.sendInvite ? 'left-5' : 'left-0.5')} />
            </div>
            <span className="text-sm text-slate-300">Send email invitation</span>
          </label>

          <div className="pt-2">
            <button
              type="submit"
              disabled={creating}
              className="w-full py-3 px-6 bg-violet-500 hover:bg-violet-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating…</> : <><UserPlus size={15} /> Confirm & Create</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

/* ── Edit/Performance Drawer ───────────────────────────────────────── */
const EmployeeDrawer = ({ employee, onClose, onUpdated, addToast }) => {
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({ name: employee.name, email: employee.email, department: employee.department, status: employee.status });
  const [saving, setSaving] = useState(false);
  const [perf, setPerf] = useState(null);

  useEffect(() => {
    if (tab === 'performance') {
      adminService.getEmployeePerformance(employee.id)
        .then(setPerf)
        .catch(() => {});
    }
  }, [tab, employee.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminService.updateEmployee(employee.id, form);
      addToast?.('Employee updated', 'success');
      onUpdated();
      onClose();
    } catch {
      addToast?.('Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      await adminService.deactivateEmployee(employee.id);
      addToast?.('Employee deactivated', 'success');
      onUpdated();
      onClose();
    } catch {
      addToast?.('Deactivation failed', 'error');
    }
  };

  const deptMeta = DEPT_META[employee.department] || DEPT_META.support;
  const DeptIcon = deptMeta.icon;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="fixed top-0 right-0 h-screen w-full max-w-md bg-bg-dark border-l border-white/5 z-[101] shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Employee Profile</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
              <X size={17} className="text-slate-400" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            {employee.avatar ? (
              <img src={employee.avatar} alt={employee.name}
                className="w-14 h-14 rounded-2xl object-cover border border-white/10 shrink-0"
                onError={e => { e.target.style.display = 'none'; }} />
            ) : null}
            <div className={cn('w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 items-center justify-center text-violet-400 font-bold shrink-0', employee.avatar && 'hidden')}>
              {employee.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm truncate">{employee.name}</p>
              <p className="text-xs text-slate-500 truncate">{employee.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border', deptMeta.color)}>
                  <DeptIcon size={10} /> {DEPT_LABELS[employee.department] || employee.department}
                </span>
                <Badge variant={employee.status === 'active' ? 'success' : 'neutral'}>{employee.status}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 shrink-0">
          {[{ id: 'profile', label: 'Profile' }, { id: 'performance', label: 'Performance' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('flex-1 py-3 text-xs font-semibold transition-colors border-b-2',
                tab === t.id ? 'text-violet-400 border-violet-500' : 'text-slate-500 border-transparent hover:text-white'
              )}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'profile' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/40 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/40 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Department</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEPARTMENTS.map(d => {
                    const m = DEPT_META[d] || {};
                    const DI = m.icon || UserCog;
                    return (
                      <button key={d} type="button" onClick={() => setForm(f => ({ ...f, department: d }))}
                        className={cn('flex items-center gap-1.5 p-2 rounded-lg border text-[11px] font-bold transition-all',
                          form.department === d ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
                        )}>
                        <DI size={12} /> {DEPT_LABELS[d]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</label>
                <div className="flex gap-2">
                  {['active', 'inactive'].map(s => (
                    <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))}
                      className={cn('flex-1 py-2 rounded-lg text-xs font-bold border transition-all capitalize',
                        form.status === s ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
                      )}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'performance' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Overall Score</span>
                  <span className={cn('text-2xl font-bold font-mono', employee.performance >= 80 ? 'text-emerald-400' : 'text-amber-400')}>
                    {employee.performance}%
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-full', perfColor(employee.performance))}
                    initial={{ width: 0 }}
                    animate={{ width: `${employee.performance}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
              {[
                { label: 'Tickets Resolved', val: perf?.tickets_resolved ?? 0, max: 60 },
                { label: 'KYC Processed',    val: perf?.kyc_processed    ?? 0, max: 30 },
                { label: 'Avg Response Time',val: perf?.response_time_score ?? 0, max: 100 },
                { label: 'Customer Rating',  val: perf?.customer_rating  ?? 0, max: 100 },
              ].map(m => (
                <div key={m.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{m.label}</span>
                    <span className="font-mono font-bold text-white">{m.val}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-violet-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(m.val / m.max) * 100}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 shrink-0 space-y-2">
          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 bg-violet-500 hover:bg-violet-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2">
            {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : 'Save Changes'}
          </button>
          {employee.status === 'active' && (
            <button onClick={handleDeactivate}
              className="w-full py-2 text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs font-semibold transition-colors border border-rose-500/20">
              Deactivate Employee
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
};

/* ── Main Page ──────────────────────────────────────────────────────── */
const AdminEmployeesPage = ({ addToast }) => {
  const [employees,      setEmployees]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [isCreateOpen,   setIsCreateOpen]   = useState(false);
  const [drawerEmployee, setDrawerEmployee] = useState(null);

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await adminService.getEmployees();
      const items = data?.data ?? data ?? [];
      setEmployees(Array.isArray(items) ? items.map(normalizeEmployee) : []);
    } catch {
      setEmployees([]);
      addToast?.('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deptCell = dept => {
    const meta = DEPT_META[dept] || DEPT_META.support;
    const DI = meta.icon;
    return (
      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border', meta.color)}>
        <DI size={12} /> {DEPT_LABELS[dept] || dept}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Employee Management"
        subtitle="Manage administrative accounts, assign departments, and track performance."
        breadcrumbs={['Admin', 'Employees']}
        actions={
          <Button variant="primary" size="sm" leftIcon={Plus} onClick={() => setIsCreateOpen(true)}>
            New Employee
          </Button>
        }
      />

      <Card className="overflow-hidden p-1">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-white pl-2">Staff Roster</h3>
          <Button variant="ghost" size="sm" leftIcon={RefreshCw} onClick={fetchEmployees}>Sync</Button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl" />)}
          </div>
        ) : (
          <Table
            headers={['Employee', 'Department', 'Status', 'Performance', 'Created', 'Actions']}
            data={employees.map(emp => [
              <div className="flex items-center gap-3">
                {emp.avatar ? (
                  <img
                    src={emp.avatar} alt={emp.name}
                    className="w-9 h-9 rounded-xl object-cover border border-white/10 shrink-0"
                    onError={e => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={cn('w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 items-center justify-center text-violet-400 font-bold shrink-0', emp.avatar ? 'hidden' : 'flex')}>
                  {emp.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{emp.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{emp.email}</p>
                </div>
              </div>,
              deptCell(emp.department),
              <Badge variant={emp.status === 'active' ? 'success' : 'neutral'}>{emp.status}</Badge>,
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 bg-white/5 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', perfColor(emp.performance))} style={{ width: `${emp.performance}%` }} />
                </div>
                <span className="text-[11px] font-bold text-white font-mono">{emp.performance}%</span>
              </div>,
              <span className="text-xs text-slate-500">{new Date(emp.created_at).toLocaleDateString('fr-FR')}</span>,
              <div className="flex items-center gap-1">
                <button onClick={() => setDrawerEmployee(emp)}
                  className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors" title="Edit">
                  <UserCog size={15} />
                </button>
                <button onClick={() => setDrawerEmployee(emp)}
                  className="p-1.5 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors" title="Performance">
                  <TrendingUp size={15} />
                </button>
                <button
                  onClick={() => adminService.deactivateEmployee(emp.id).then(fetchEmployees).catch(() => addToast?.('Deactivation failed', 'error'))}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Deactivate">
                  <Trash2 size={15} />
                </button>
              </div>,
            ])}
          />
        )}
        {!loading && employees.length === 0 && (
          <div className="py-16 text-center text-slate-500 text-sm">No employees found.</div>
        )}
      </Card>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <CreateModal
            onClose={() => setIsCreateOpen(false)}
            onCreated={fetchEmployees}
            addToast={addToast}
          />
        )}
      </AnimatePresence>

      {/* Edit Drawer */}
      <AnimatePresence>
        {drawerEmployee && (
          <EmployeeDrawer
            employee={drawerEmployee}
            onClose={() => setDrawerEmployee(null)}
            onUpdated={fetchEmployees}
            addToast={addToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminEmployeesPage;
