import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from './components/ui/Toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/routes/ProtectedRoute';
import { ThemeProvider } from './components/landing/ThemeContext';
import RoleBasedRoute from './components/routes/RoleBasedRoute';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';
import EmployeeLayout  from './components/layout/EmployeeLayout';
import AdminLayout     from './components/layout/AdminLayout';

// ── User pages ────────────────────────────────────────────────────────
import LandingPage             from './pages/LandingPage';
import LoginPage               from './pages/auth/LoginPage';
import RegisterPage            from './pages/auth/RegisterPage';
import UserDashboardPage       from './pages/dashboard/UserDashboardPage';
import AccountOverviewPage     from './pages/accounts/AccountOverviewPage';
import TransactionsHistoryPage from './pages/transactions/TransactionsHistoryPage';
import TransferPage            from './pages/transfer/TransferPage';
import KYCPage                 from './pages/kyc/KYCPage';
import TrustScorePage          from './pages/trust/TrustScorePage';
import NotificationsPage       from './pages/notifications/NotificationsPage';
import DaretListPage           from './pages/darets/DaretListPage';
import CreateDaretPage         from './pages/darets/CreateDaretPage';
import DaretDetailsPage        from './pages/darets/DaretDetailsPage';
import CagnotteListPage        from './pages/cagnottes/CagnotteListPage';
import CagnotteDetailsPage     from './pages/cagnottes/CagnotteDetailsPage';
import RequestCampaignPage     from './pages/cagnottes/RequestCampaignPage';
import MyTicketsPage           from './pages/tickets/MyTicketsPage';
import CreateTicketPage        from './pages/tickets/CreateTicketPage';
import TicketDetailPage        from './pages/tickets/TicketDetailPage';

// ── Employee pages ────────────────────────────────────────────────────
import EmployeeDashboardPage from './pages/employee/EmployeeDashboardPage';
import EmployeeKYCPage       from './pages/employee/EmployeeKYCPage';
import EmployeeCagnottePage  from './pages/employee/EmployeeCagnottePage';
import EmployeeTicketsPage   from './pages/employee/EmployeeTicketsPage';

// ── Admin pages ───────────────────────────────────────────────────────
import AdminDashboardPage  from './pages/admin/AdminDashboardPage';
import AdminUsersPage      from './pages/admin/AdminUsersPage';
import AdminEmployeesPage  from './pages/admin/AdminEmployeesPage';

// Minimal placeholder for routes that are not yet implemented
const ComingSoon = ({ title }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
      <span className="text-2xl">🚧</span>
    </div>
    <h2 className="text-xl font-bold text-white">{title}</h2>
    <p className="text-sm text-slate-400 max-w-xs">
      Cette section est en cours de développement. Revenez bientôt.
    </p>
  </div>
);

function App() {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = id => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <div className="min-h-screen bg-bg-dark text-white font-sans selection:bg-emerald-500/30">
            <Routes>
              {/* ── Public ───────────────────────────────────────────── */}
              <Route path="/"         element={<LandingPage />} />
              <Route path="/login"    element={<LoginPage    addToast={addToast} />} />
              <Route path="/register" element={<RegisterPage addToast={addToast} />} />

              {/* ── Protected (user) ─────────────────────────────────── */}
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout addToast={addToast} />}>
                  <Route path="/dashboard"          element={<UserDashboardPage />} />
                  <Route path="/accounts"           element={<AccountOverviewPage     addToast={addToast} />} />
                  <Route path="/transactions"       element={<TransactionsHistoryPage addToast={addToast} />} />
                  <Route path="/transfer"           element={<TransferPage            addToast={addToast} />} />
                  <Route path="/darets"             element={<DaretListPage           addToast={addToast} />} />
                  <Route path="/darets/create"      element={<CreateDaretPage         addToast={addToast} />} />
                  <Route path="/darets/:id"         element={<DaretDetailsPage />} />
                  <Route path="/cagnottes"          element={<CagnotteListPage        addToast={addToast} />} />
                  <Route path="/cagnottes/request"  element={<RequestCampaignPage     addToast={addToast} />} />
                  <Route path="/cagnottes/:id"      element={<CagnotteDetailsPage />} />
                  <Route path="/kyc"                element={<KYCPage                 addToast={addToast} />} />
                  <Route path="/trust-score"        element={<TrustScorePage />} />
                  <Route path="/tickets"            element={<MyTicketsPage           addToast={addToast} />} />
                  <Route path="/tickets/create"     element={<CreateTicketPage        addToast={addToast} />} />
                  <Route path="/tickets/:id"        element={<TicketDetailPage />} />
                  <Route path="/notifications"      element={<NotificationsPage       addToast={addToast} />} />
                  <Route path="/settings"           element={<ComingSoon title="Paramètres" />} />
                  <Route path="/profile"            element={<ComingSoon title="Mon Profil" />} />
                </Route>

                {/* ── Employee (role: employee | admin) ──────────────── */}
                <Route element={<RoleBasedRoute allowedRoles={['employee', 'admin']} />}>
                  <Route element={<EmployeeLayout addToast={addToast} />}>
                    <Route path="/employee/dashboard" element={<EmployeeDashboardPage addToast={addToast} />} />
                    <Route path="/employee/kyc"        element={<EmployeeKYCPage      addToast={addToast} />} />
                    <Route path="/employee/cagnottes"  element={<EmployeeCagnottePage addToast={addToast} />} />
                    <Route path="/employee/tickets"    element={<EmployeeTicketsPage  addToast={addToast} />} />
                    <Route path="/employee/tickets/:id" element={<TicketDetailPage />} />
                  </Route>
                </Route>

                {/* ── Admin (role: admin only) ────────────────────────── */}
                <Route element={<RoleBasedRoute allowedRoles={['admin']} />}>
                  <Route element={<AdminLayout addToast={addToast} />}>
                    <Route path="/admin/dashboard"  element={<AdminDashboardPage  addToast={addToast} />} />
                    <Route path="/admin/users"       element={<AdminUsersPage      addToast={addToast} />} />
                    <Route path="/admin/employees"   element={<AdminEmployeesPage  addToast={addToast} />} />
                  </Route>
                </Route>
              </Route>

              {/* ── Fallback ──────────────────────────────────────────── */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>

            <ToastContainer toasts={toasts} removeToast={removeToast} />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
