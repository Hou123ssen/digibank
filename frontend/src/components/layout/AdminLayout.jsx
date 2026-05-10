import { LayoutDashboard, ShieldCheck, UserCog, Users } from 'lucide-react';
import AuthenticatedLayout from './AuthenticatedLayout';

const ADMIN_NAV = [
  { labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/admin/dashboard', end: true },
  { labelKey: 'nav.users', icon: Users, path: '/admin/users' },
  { labelKey: 'nav.employees', icon: UserCog, path: '/admin/employees' },
];

<<<<<<< HEAD
const LANGS = ['AR', 'FR', 'EN'];

const SidebarLink = ({ item, onNavigate }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) => cn(
        'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-violet-500/10 text-violet-400'
          : 'text-slate-400 hover:bg-white/5 hover:text-white',
      )}
    >
      {({ isActive }) => (
        <>
          <span className={cn(
            'absolute left-0 w-0.5 h-5 rounded-r-full bg-violet-400 transition-opacity',
            isActive ? 'opacity-100' : 'opacity-0',
          )} />
          <Icon size={17} className="shrink-0" />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
};

const SidebarContent = ({ logout, onNavigate, settingsPath = '/admin/settings' }) => (
  <div className="flex flex-col h-full">
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-900/40">
          <ShieldCheck size={19} className="text-white" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-white tracking-tight leading-none">DigiBank</p>
          <p className="text-[9px] text-violet-400 font-bold tracking-[0.18em] uppercase mt-0.5">
            Administration
          </p>
        </div>
      </div>
    </div>

    <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
      <p className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">
        Administration
      </p>
      {ADMIN_NAV.map(item => (
        <SidebarLink key={item.path} item={item} onNavigate={onNavigate} />
      ))}
    </nav>

    <div className="p-3 border-t border-white/5 space-y-0.5">
      <Link
        to="/employee/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft size={15} className="shrink-0" />
        <span>Espace employé</span>
      </Link>
      <NavLink
        to={settingsPath}
        onClick={onNavigate}
        className={({ isActive }) => cn(
          'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
          isActive ? 'bg-violet-500/10 text-violet-400' : 'text-slate-400 hover:bg-white/5 hover:text-white',
        )}
      >
        {({ isActive }) => (
          <>
            <span className={cn('absolute left-0 w-0.5 h-5 rounded-r-full bg-violet-400 transition-opacity', isActive ? 'opacity-100' : 'opacity-0')} />
            <Settings size={17} className="shrink-0" />
            <span>Paramètres</span>
          </>
        )}
      </NavLink>
      <button
        onClick={logout}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
      >
        <LogOut size={17} className="shrink-0" />
        Déconnexion
      </button>
    </div>
  </div>
);

const AdminLayout = ({ addToast }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lang,        setLang]        = useState('FR');
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef   = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handler = e => {
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res   = await notificationService.getNotifications();
        const items = Array.isArray(res?.notifications) ? res.notifications : Array.isArray(res) ? res : [];
        setNotifications(items.slice(0, 5));
        setUnreadCount(items.filter(n => !n.is_read).length);
      } catch { /* silent */ }
    })();
  }, []);

  const displayName = user?.first_name || user?.name?.split(' ')[0] || 'Admin';
  const profilePath = user?.role === 'admin'
    ? '/admin/profile'
    : user?.role === 'employee'
      ? '/employee/profile'
      : '/dashboard/profile';
  const settingsPath = user?.role === 'admin'
    ? '/admin/settings'
    : user?.role === 'employee'
      ? '/employee/settings'
      : '/dashboard/settings';

  return (
    <div className="min-h-screen bg-bg-dark text-white font-sans selection:bg-violet-500/20">
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 z-20 w-[260px] bg-bg-card border-r border-white/5 flex-col">
        <SidebarContent logout={logout} settingsPath={settingsPath} />
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
            <motion.aside key="d" initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-[260px] bg-bg-card border-r border-white/5 flex flex-col">
              <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-3 p-1.5 text-slate-400 hover:text-white rounded-lg">
                <X size={18} />
              </button>
              <SidebarContent logout={logout} settingsPath={settingsPath} onNavigate={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:ml-[260px] flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-16 bg-bg-dark/80 backdrop-blur-xl border-b border-white/5 flex items-center px-4 lg:px-6 gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg shrink-0">
            <Menu size={20} />
          </button>

          <div className="hidden md:flex flex-1 max-w-xs items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-violet-500/40 transition-all">
            <Search size={15} className="text-slate-500 shrink-0" />
            <input type="text" placeholder="Rechercher…" className="bg-transparent outline-none text-sm text-white placeholder:text-slate-500 w-full" />
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full">
            <ShieldCheck size={12} className="text-violet-400" />
            <span className="text-[11px] font-bold text-violet-400 tracking-wider uppercase">Admin</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-0.5 p-1 bg-white/5 rounded-lg border border-white/10">
            {LANGS.map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={cn('px-2 py-1 rounded-md text-[11px] font-bold transition-all', lang === l ? 'bg-violet-500/20 text-violet-400' : 'text-slate-500 hover:text-slate-300')}>
                {l}
              </button>
            ))}
          </div>

          <div ref={notifRef} className="relative">
            <button onClick={() => { setNotifOpen(p => !p); setProfileOpen(false); }}
              className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <Bell size={19} />
              {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-[2px] border-bg-dark" />}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-bg-card border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5"><span className="text-sm font-semibold text-white">Notifications</span></div>
                  <div className="divide-y divide-white/5 max-h-60 overflow-y-auto">
                    {notifications.length > 0 ? notifications.map((n, i) => (
                      <div key={i} className={cn('px-4 py-3 text-xs', !n.is_read && 'bg-violet-500/[0.03]')}>
                        <p className="text-slate-200 truncate">{n.title || n.message}</p>
                      </div>
                    )) : <div className="py-8 text-center text-sm text-slate-500">Aucune notification</div>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-6 bg-white/10" />

          <div ref={profileRef} className="relative">
            <button onClick={() => { setProfileOpen(p => !p); setNotifOpen(false); }}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/5 transition-colors">
              <Avatar name={displayName} src={user?.avatar} status="online" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-white leading-none">{displayName}</p>
                <p className="text-[10px] text-violet-400 mt-0.5 font-bold tracking-wider uppercase">Admin</p>
              </div>
              <ChevronDown size={13} className="text-slate-500 hidden sm:block" />
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  className="absolute right-0 top-full mt-2 w-52 bg-bg-card border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm font-semibold text-white truncate">{user?.name || displayName}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    {[{ to: profilePath, icon: User, label: 'Mon Profil' }, { to: settingsPath, icon: SlidersHorizontal, label: 'Paramètres' }].map(item => (
                      <NavLink key={item.to} to={item.to} onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                        <item.icon size={15} /> {item.label}
                      </NavLink>
                    ))}
                  </div>
                  <div className="border-t border-white/5 py-1">
                    <button onClick={() => { setProfileOpen(false); logout(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors">
                      <LogOut size={15} /> Déconnexion
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto">
            <Outlet context={{ addToast }} />
          </div>
        </main>
      </div>
    </div>
  );
};

=======
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

>>>>>>> 64b4c1eb2f7747c9bc84ef01dfafd23d74376b16
export default AdminLayout;
