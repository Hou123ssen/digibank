import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Wallet, ArrowLeftRight, Send, Users, HeartHandshake,
  BadgeCheck, Star, LifeBuoy, Bell, Settings, LogOut, Menu, X,
  Search, ChevronDown, User, SlidersHorizontal, ShieldCheck, UserCog,
  Sun, Moon
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../landing/ThemeContext';
import Avatar from '../ui/Avatar';
import notificationService from '../../services/notificationService';
import logo from '../../images/logo digi.png';

const USER_NAV_ITEMS = [
  { label: 'Dashboard',     icon: LayoutDashboard, path: '/dashboard',     end: true },
  { label: 'Account',       icon: Wallet,          path: '/accounts' },
  { label: 'Transactions',  icon: ArrowLeftRight,  path: '/transactions' },
  { label: 'Transfer',      icon: Send,            path: '/transfer' },
  { label: 'Daret',         icon: Users,           path: '/darets' },
  { label: 'Cagnotte',      icon: HeartHandshake,  path: '/cagnottes' },
  { label: 'KYC',           icon: BadgeCheck,      path: '/kyc' },
  { label: 'Trust Score',   icon: Star,            path: '/trust-score' },
  { label: 'Tickets',       icon: LifeBuoy,        path: '/tickets' },
  { label: 'Notifications', icon: Bell,            path: '/notifications' },
];

const ADMIN_NAV_ITEMS = [
  { label: 'Admin Panel',   icon: ShieldCheck,     path: '/admin/dashboard', end: true },
  { label: 'Users',         icon: Users,           path: '/admin/users' },
  { label: 'Employees',     icon: UserCog,         path: '/admin/employees' },
  { label: 'KYC Reviews',    icon: BadgeCheck,      path: '/admin/kyc' },
  { label: 'Tickets',       icon: LifeBuoy,        path: '/tickets' },
  { label: 'Notifications', icon: Bell,            path: '/notifications' },
];

const EMPLOYEE_NAV_ITEMS = [
  { label: 'Dashboard',     icon: LayoutDashboard, path: '/dashboard',     end: true },
  { label: 'KYC Queue',     icon: BadgeCheck,      path: '/admin/kyc' },
  { label: 'Support Queue', icon: LifeBuoy,        path: '/tickets' },
  { label: 'Cagnottes',     icon: HeartHandshake,  path: '/cagnottes' },
  { label: 'Notifications', icon: Bell,            path: '/notifications' },
];

const LANGS = ['AR', 'FR', 'EN'];

// ── Sidebar nav link ──────────────────────────────────────────────────────────
const SidebarLink = ({ item, onNavigate, dark }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isActive
            ? (dark ? 'bg-[#00C2A8]/10 text-[#00C2A8]' : 'bg-[#00C2A8]/10 text-[#009682]')
            : (dark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-[#00C2A8]/5 hover:text-[#009682]'),
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'absolute left-0 w-0.5 h-5 rounded-r-full transition-opacity duration-200',
              dark ? 'bg-[#00C2A8]' : 'bg-[#009682]',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
          />
          <Icon size={17} className="shrink-0" />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
};

// ── Sidebar content (shared between desktop + mobile drawer) ──────────────────
const SidebarContent = ({ user, logout, onNavigate, dark }) => (
  <div className="flex flex-col h-full">
    {/* Logo */}
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl overflow-hidden shadow-lg ring-1", dark ? "shadow-[#00C2A8]/20 ring-[#00C2A8]/20" : "shadow-[#00C2A8]/20 ring-[#00C2A8]/30")}>
          <img src={logo} alt="DigiBank logo" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className={cn("text-[15px] font-bold tracking-tight leading-none", dark ? "text-white" : "text-[#020617]")}>DigiBank</p>
          <p className={cn("text-[9px] font-bold tracking-[0.22em] uppercase mt-0.5", dark ? "text-[#00C2A8]" : "text-[#009682]")}>
            System Bank
          </p>
        </div>
      </div>
    </div>

    {/* Nav */}
    <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-hide">
      <p className={cn("px-3 text-[9px] font-bold uppercase tracking-widest mb-2.5", dark ? "text-slate-500" : "text-slate-400")}>
        {user?.role === 'admin' ? 'Administration' : user?.role === 'employee' ? 'Staff Panel' : 'Navigation'}
      </p>
      {(user?.role === 'admin' 
          ? ADMIN_NAV_ITEMS 
          : user?.role === 'employee' 
            ? EMPLOYEE_NAV_ITEMS 
            : USER_NAV_ITEMS
      ).map(item => (
        <SidebarLink key={item.path} item={item} onNavigate={onNavigate} dark={dark} />
      ))}
    </nav>

    {/* Bottom */}
    <div className={cn("p-3 border-t space-y-0.5", dark ? "border-white/5" : "border-[#2563EB]/10")}>
      <NavLink
        to="/settings"
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
            isActive
              ? (dark ? 'bg-[#00C2A8]/10 text-[#00C2A8]' : 'bg-[#00C2A8]/10 text-[#009682]')
              : (dark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-[#00C2A8]/5 hover:text-[#009682]'),
          )
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={cn(
                'absolute left-0 w-0.5 h-5 rounded-r-full transition-opacity duration-200',
                dark ? 'bg-[#00C2A8]' : 'bg-[#009682]',
                isActive ? 'opacity-100' : 'opacity-0',
              )}
            />
            <Settings size={17} className="shrink-0" />
            <span>Paramètres</span>
          </>
        )}
      </NavLink>
      <button
        onClick={logout}
        className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors", dark ? "text-slate-400 hover:bg-rose-500/10 hover:text-rose-400" : "text-slate-600 hover:bg-rose-50 hover:text-rose-600")}
      >
        <LogOut size={17} className="shrink-0" />
        Déconnexion
      </button>
    </div>
  </div>
);

// ── Main layout ───────────────────────────────────────────────────────────────
const DashboardLayout = ({ addToast }) => {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [lang, setLang]                 = useState('FR');
  const [notifOpen, setNotifOpen]       = useState(false);
  const [profileOpen, setProfileOpen]   = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]   = useState(0);

  const notifRef   = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = e => {
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch notifications for topbar preview
  useEffect(() => {
    (async () => {
      try {
        const res    = await notificationService.getNotifications();
        const items  = Array.isArray(res?.notifications) ? res.notifications : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setNotifications(items.slice(0, 5));
        setUnreadCount(items.filter(n => !n.is_read).length);
      } catch { /* silent */ }
    })();
  }, []);

  const displayName = user?.first_name || user?.name?.split(' ')[0] || 'Utilisateur';
  const roleLabel   = user?.role === 'admin'    ? 'Administrateur'
                    : user?.role === 'employee'  ? 'Employé'
                    : 'Client Premium';

  return (
    <div className={cn("min-h-screen font-sans selection:bg-[#00C2A8]/30 transition-colors duration-300", dark ? "bg-bg-dark text-white" : "bg-gradient-to-br from-[#f0fffe] via-[#e8fdfa] to-[#dcf9f4] text-[#020617]")}>

      {/* ── Global Animated Background (Both Modes) ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Animated Orbs */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} 
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className={cn("absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full", dark ? "bg-[#00C2A8]/10 blur-[120px]" : "bg-[#99f6e4]/20 blur-[110px]")}
        />
        <motion.div 
          animate={{ scale: [1, 1.5, 1], rotate: [0, -90, 0] }} 
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className={cn("absolute top-[40%] -left-[10%] w-[700px] h-[700px] rounded-full", dark ? "bg-[#00A090]/5 blur-[150px]" : "bg-[#ccfbf1]/25 blur-[130px]")}
        />

        {/* Soft green accent */}
        <motion.div 
          animate={{ scale: [1, 1.3, 1], rotate: [0, -45, 0] }} 
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className={cn("absolute bottom-[10%] left-[20%] w-[400px] h-[400px] rounded-full", dark ? "bg-[#00C2A8]/5 blur-[120px]" : "bg-[#a7f3d0]/18 blur-[115px]")}
        />

        {/* Corner circuit accents */}
        <div className={cn("absolute inset-0", dark ? "opacity-40" : "opacity-20")}>
          <svg className="h-full w-full" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <radialGradient id="cornerGlow" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor={dark ? "#00C2A8" : "#99f6e4"} stopOpacity={dark ? "0.14" : "0.10"} />
                <stop offset="100%" stopColor={dark ? "#00C2A8" : "#ccfbf1"} stopOpacity="0" />
              </radialGradient>
              <linearGradient id="cornerStroke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={dark ? "#00E0C8" : "#009682"} stopOpacity="1" />
                <stop offset="100%" stopColor={dark ? "#00C2A8" : "#00C2A8"} stopOpacity="0.8" />
              </linearGradient>
              <filter id="cornerBlur" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect x="0" y="0" width="1440" height="900" fill="url(#cornerGlow)" />
            <g stroke="url(#cornerStroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <g opacity="0.95">
                <path d="M-60 -20L72 112V154L134 216V262" />
                <path d="M28 -30L132 74V116L196 180V224" />
                <path d="M116 -28L216 72V118L282 184V226" />
                <path d="M-40 526L94 660V704L170 780V924" />
                <path d="M24 460L154 590V640L238 724V900" />
                <path d="M-20 358L112 490V548L198 634V688" />
              </g>
              <g opacity="0.95">
                <path d="M1500 -20L1360 120V168L1288 240V286" />
                <path d="M1420 -34L1314 72V116L1244 186V236" />
                <path d="M1348 -28L1246 74V118L1184 180V220" />
                <path d="M1488 330L1354 464V516L1288 582V640" />
                <path d="M1458 470L1324 604V660L1242 742V912" />
                <path d="M1370 512L1260 622V676L1182 754V904" />
              </g>
            </g>
            <g fill={dark ? "#00E0C8" : "#009682"} filter="url(#cornerBlur)">
              {[
                [72, 112, 5], [134, 216, 5], [132, 74, 4], [196, 180, 4], [216, 72, 4], [282, 184, 4],
                [94, 660, 5], [170, 780, 5], [154, 590, 4], [238, 724, 4], [112, 490, 4], [198, 634, 4],
                [1360, 120, 5], [1288, 240, 5], [1314, 72, 4], [1244, 186, 4], [1246, 74, 4], [1184, 180, 4],
                [1354, 464, 5], [1288, 582, 4], [1324, 604, 4], [1242, 742, 5], [1260, 622, 4], [1182, 754, 4],
                [620, 122, 2], [686, 92, 2], [760, 166, 2], [840, 108, 2], [920, 154, 2],
                [708, 520, 2], [826, 606, 2], [956, 548, 2], [1078, 626, 2],
              ].map(([x, y, r]) => {
                return <circle key={`${x}-${y}`} cx={x} cy={y} r={r} opacity={r > 3 ? "0.9" : "0.45"} />;
              })}
            </g>
            <g stroke={dark ? "#1D4ED8" : "#99f6e4"} strokeWidth="16" opacity={dark ? "0.22" : "0.18"}>
              <path d="M-80 760L180 1020" />
              <path d="M1340 -120L1520 60" />
              <path d="M1470 510L1300 340" />
            </g>
          </svg>
        </div>
      </div>

      {/* ── Desktop sidebar (fixed, always visible ≥ lg) ───────────────── */}
      <aside className={cn("hidden lg:flex fixed top-0 left-0 bottom-0 z-20 w-[260px] border-r flex-col transition-colors duration-300", dark ? "bg-bg-card border-white/5" : "bg-white border-[#2563EB]/10")}>
        <SidebarContent logout={logout} dark={dark} />
      </aside>

      {/* ── Mobile drawer ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              key="drawer"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={cn("lg:hidden fixed top-0 left-0 bottom-0 z-50 w-[260px] border-r flex flex-col", dark ? "bg-bg-card border-white/5" : "bg-white border-[#2563EB]/10")}
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className={cn("absolute top-4 right-3 p-1.5 rounded-lg transition-colors", dark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-blue-700 hover:bg-blue-50")}
              >
                <X size={18} />
              </button>
              <div className="p-6 h-full">
                <SidebarContent user={user} logout={logout} onNavigate={() => setSidebarOpen(false)} dark={dark} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main column ────────────────────────────────────────────────── */}
      <div className="lg:ml-[260px] flex flex-col min-h-screen relative z-10">

        {/* Topbar */}
        <header className={cn("dg-dashboard-topbar sticky top-0 z-30 h-16 backdrop-blur-xl border-b flex items-center px-4 lg:px-6 gap-3 transition-colors duration-300", dark ? "bg-bg-dark/80 border-white/5" : "bg-white/80 border-[#00C2A8]/20 shadow-sm shadow-[#00C2A8]/10")}>

          {/* Hamburger (mobile only) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors shrink-0"
          >
            <Menu size={20} />
          </button>
          
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {user?.role === 'admin' ? 'Admin Mode' : user?.role === 'employee' ? 'Employee Mode' : 'Live Network'}
          </div>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-xs items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-emerald-500/40 transition-all">
            <Search size={15} className="text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Rechercher..."
              className={cn("bg-transparent outline-none text-sm placeholder:text-slate-500 w-full", dark ? "text-white" : "text-[#006655]")}
            />
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-500 font-mono shrink-0">
              ⌘K
            </span>
          </div>

          <div className="flex-1" />

          {/* Language switcher */}
          <div className={cn("flex items-center gap-0.5 p-1 rounded-lg border transition-colors", dark ? "bg-white/5 border-white/10" : "bg-white/70 border-[#00C2A8]/20")}>
            {LANGS.map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  'px-2 py-1 rounded-md text-[11px] font-bold transition-all',
                  lang === l
                    ? 'bg-[#00C2A8]/20 text-[#00C2A8]'
                    : (dark ? 'text-slate-500 hover:bg-[#00C2A8]/10 hover:text-[#00C2A8]' : 'text-[#006655]/60 hover:bg-[#00C2A8]/15 hover:text-[#00A090]'),
                )}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className={cn("p-2 rounded-lg transition-colors border", dark ? "text-amber-400 hover:bg-white/5 border-white/5" : "text-emerald-500 hover:bg-[#00C2A8]/10 border-[#00C2A8]/20")}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => { setNotifOpen(p => !p); setProfileOpen(false); }}
              className={cn(
                "relative p-2 rounded-lg transition-colors",
                dark
                  ? "text-slate-400 hover:text-[#00C2A8] hover:bg-[#00C2A8]/10"
                  : "text-[#006655]/60 hover:text-[#00A090] hover:bg-[#00C2A8]/15",
              )}
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-[2px] border-bg-dark" />
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.13 }}
                  className={cn("absolute right-0 top-full mt-2 w-80 border rounded-2xl shadow-2xl overflow-hidden z-50", dark ? "bg-bg-card border-white/10 shadow-black/50" : "bg-white border-[#2563EB]/10 shadow-blue-900/10")}
                >
                  <div className={cn("flex items-center justify-between px-4 py-3 border-b", dark ? "border-white/5" : "border-[#2563EB]/5")}>
                    <span className={cn("text-sm font-semibold", dark ? "text-white" : "text-[#020617]")}>Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 bg-rose-500/15 text-rose-400 rounded-full font-bold">
                        {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-white/5 max-h-72 overflow-y-auto scrollbar-hide">
                    {notifications.length > 0 ? (
                      notifications.map((n, i) => (
                        <div
                          key={i}
                          className={cn(
                            'flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-white/[0.03]',
                            !n.is_read && 'bg-emerald-500/[0.04]',
                          )}
                        >
                          {!n.is_read && (
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          )}
                          <div className={cn('flex-1 min-w-0', n.is_read && 'pl-4')}>
                            <p className="text-xs font-medium text-white truncate">
                              {n.title || n.message || 'Notification'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {n.created_at
                                ? new Date(n.created_at).toLocaleDateString('fr-MA')
                                : ''}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center text-sm text-slate-500">
                        Aucune notification
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-2.5 border-t border-white/5">
                    <NavLink
                      to="/notifications"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    >
                      Voir toutes les notifications →
                    </NavLink>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-6 bg-white/10" />

          {/* Profile dropdown */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => { setProfileOpen(p => !p); setNotifOpen(false); }}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/5 transition-colors"
            >
              <Avatar name={displayName} src={user?.avatar} status="online" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-white leading-none">{displayName}</p>
                <p className="text-[10px] text-emerald-400 mt-0.5 font-bold tracking-wider uppercase">
                  {roleLabel}
                </p>
              </div>
              <ChevronDown size={13} className="text-slate-500 hidden sm:block ml-0.5" />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.13 }}
                  className="absolute right-0 top-full mt-2 w-52 bg-bg-card border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm font-semibold text-white truncate">
                      {user?.name || displayName}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{user?.email}</p>
                  </div>

                  <div className="py-1">
                    {[
                      { to: '/profile',  icon: User,              label: 'Mon Profil' },
                      { to: '/settings', icon: SlidersHorizontal, label: 'Paramètres' },
                    ].map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <item.icon size={15} />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>

                  <div className="border-t border-white/5 py-1">
                    <button
                      onClick={() => { setProfileOpen(false); logout(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut size={15} />
                      Déconnexion
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet context={{ addToast }} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
