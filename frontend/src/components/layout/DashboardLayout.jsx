import {
  ArrowLeftRight, BadgeCheck, Bell, HeartHandshake, LayoutDashboard,
  LifeBuoy, Send, ShieldCheck, Star, UserCog, Users, Wallet
} from 'lucide-react';
import AuthenticatedLayout from './AuthenticatedLayout';

const USER_NAV_ITEMS = [
  { labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/dashboard', end: true },
  { labelKey: 'nav.account', icon: Wallet, path: '/accounts' },
  { labelKey: 'nav.transactions', icon: ArrowLeftRight, path: '/transactions' },
  { labelKey: 'nav.transfer', icon: Send, path: '/transfer' },
  { labelKey: 'nav.daret', icon: Users, path: '/darets' },
  { labelKey: 'nav.cagnotte', icon: HeartHandshake, path: '/cagnottes' },
  { labelKey: 'nav.kyc', icon: BadgeCheck, path: '/kyc' },
  { labelKey: 'nav.trustScore', icon: Star, path: '/trust-score' },
  { labelKey: 'nav.tickets', icon: LifeBuoy, path: '/tickets' },
  { labelKey: 'nav.notifications', icon: Bell, path: '/notifications' },
];

const ADMIN_NAV_ITEMS = [
  { labelKey: 'nav.adminPanel', icon: ShieldCheck, path: '/admin/dashboard', end: true },
  { labelKey: 'nav.users', icon: Users, path: '/admin/users' },
  { labelKey: 'nav.employees', icon: UserCog, path: '/admin/employees' },
  { labelKey: 'nav.kycReviews', icon: BadgeCheck, path: '/admin/kyc' },
  { labelKey: 'nav.tickets', icon: LifeBuoy, path: '/tickets' },
  { labelKey: 'nav.notifications', icon: Bell, path: '/notifications' },
];

const EMPLOYEE_NAV_ITEMS = [
  { labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/dashboard', end: true },
  { labelKey: 'nav.kycQueue', icon: BadgeCheck, path: '/admin/kyc' },
  { labelKey: 'nav.supportQueue', icon: LifeBuoy, path: '/tickets' },
  { labelKey: 'nav.cagnotte', icon: HeartHandshake, path: '/cagnottes' },
  { labelKey: 'nav.notifications', icon: Bell, path: '/notifications' },
];

const DashboardLayout = ({ addToast }) => {
  const role = JSON.parse(localStorage.getItem('digibank_user') || '{}')?.role;
  const navItems = role === 'admin' ? ADMIN_NAV_ITEMS : role === 'employee' ? EMPLOYEE_NAV_ITEMS : USER_NAV_ITEMS;

  return (
    <AuthenticatedLayout
      addToast={addToast}
      navItems={navItems}
      variant="emerald"
      mode="client"
      brandIcon={Wallet}
      brandLabelKey="app.tagline"
    />
  );
};

export default DashboardLayout;
