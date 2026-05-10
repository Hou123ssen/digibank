import { LayoutDashboard, ShieldCheck, UserCog, Users } from 'lucide-react';
import AuthenticatedLayout from './AuthenticatedLayout';

const ADMIN_NAV = [
  { labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/admin/dashboard', end: true },
  { labelKey: 'nav.users', icon: Users, path: '/admin/users' },
  { labelKey: 'nav.employees', icon: UserCog, path: '/admin/employees' },
];

const AdminLayout = ({ addToast }) => (
  <AuthenticatedLayout
    addToast={addToast}
    navItems={ADMIN_NAV}
    variant="violet"
    mode="admin"
    brandIcon={ShieldCheck}
    brandLabelKey="app.admin"
    backLink={{ to: '/employee/dashboard', labelKey: 'nav.employeeSpace' }}
  />
);

export default AdminLayout;
