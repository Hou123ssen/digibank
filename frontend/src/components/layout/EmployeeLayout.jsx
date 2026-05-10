import { BadgeCheck, HeartHandshake, LayoutDashboard, LifeBuoy, Shield } from 'lucide-react';
import AuthenticatedLayout from './AuthenticatedLayout';

const EMPLOYEE_NAV = [
  { labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/employee/dashboard', end: true },
  { labelKey: 'nav.kycQueue', icon: BadgeCheck, path: '/employee/kyc' },
  { labelKey: 'nav.cagnotte', icon: HeartHandshake, path: '/employee/cagnottes' },
  { labelKey: 'nav.tickets', icon: LifeBuoy, path: '/employee/tickets' },
];

const EmployeeLayout = ({ addToast }) => (
  <AuthenticatedLayout
    addToast={addToast}
    navItems={EMPLOYEE_NAV}
    variant="amber"
    mode="employee"
    brandIcon={Shield}
    brandLabelKey="app.employee"
    backLink={{ to: '/dashboard', labelKey: 'nav.clientSpace' }}
  />
);

export default EmployeeLayout;
