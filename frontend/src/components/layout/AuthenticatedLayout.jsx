import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, Bell, ChevronDown, LogOut, Menu, Search,
  Settings, SlidersHorizontal, User, Wallet, X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';
import { cn } from '../../utils/cn';
import Avatar from '../ui/Avatar';
import LanguageSwitcher from '../i18n/LanguageSwitcher';

const variantStyles = {
  emerald: {
    iconBg: 'from-emerald-500 to-teal-600',
    accentText: 'text-emerald-400',
    active: 'bg-emerald-500/10 text-emerald-400',
    marker: 'bg-emerald-400',
    focus: 'focus-within:border-emerald-500/40',
    selection: 'selection:bg-emerald-500/30',
  },
  violet: {
    iconBg: 'from-violet-500 to-purple-700',
    accentText: 'text-violet-400',
    active: 'bg-violet-500/10 text-violet-400',
    marker: 'bg-violet-400',
    focus: 'focus-within:border-violet-500/40',
    selection: 'selection:bg-violet-500/20',
  },
  amber: {
    iconBg: 'from-amber-500 to-orange-600',
    accentText: 'text-amber-400',
    active: 'bg-amber-500/10 text-amber-400',
    marker: 'bg-amber-400',
    focus: 'focus-within:border-amber-500/40',
    selection: 'selection:bg-amber-500/20',
  },
};

const SidebarLink = ({ item, onNavigate, styles }) => {
  const { t } = useTranslation('common');
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) => cn(
        'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
        isActive ? styles.active : 'text-slate-400 hover:bg-white/5 hover:text-white'
      )}
    >
      {({ isActive }) => (
        <>
          <span className={cn('absolute left-0 h-5 w-0.5 rounded-r-full transition-opacity duration-200', styles.marker, isActive ? 'opacity-100' : 'opacity-0')} />
          <Icon size={17} className="shrink-0" />
          <span>{t(item.labelKey)}</span>
        </>
      )}
    </NavLink>
  );
};

const SidebarContent = ({ brandIcon: BrandIcon = Wallet, brandLabelKey, navItems, backLink, logout, onNavigate, styles, variant }) => {
  const { t } = useTranslation('common');

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg', styles.iconBg)}>
            <BrandIcon size={19} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold leading-none tracking-tight text-white">{t('app.name')}</p>
            <p className={cn('mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em]', styles.accentText)}>
              {brandLabelKey ? t(brandLabelKey) : t('app.tagline')}
            </p>
          </div>
        </div>
      </div>

      <nav className="scrollbar-hide flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        <p className="mb-2.5 px-3 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          {variant === 'admin' ? t('nav.adminPanel') : variant === 'employee' ? t('nav.management') : t('nav.navigation')}
        </p>
        {navItems.map(item => (
          <SidebarLink key={item.path} item={item} onNavigate={onNavigate} styles={styles} />
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-white/5 p-3">
        {backLink && (
          <Link
            to={backLink.to}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
          >
            <ArrowLeft size={15} className="shrink-0" />
            <span>{t(backLink.labelKey)}</span>
          </Link>
        )}
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) => cn(
            'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
            isActive ? styles.active : 'text-slate-400 hover:bg-white/5 hover:text-white'
          )}
        >
          {({ isActive }) => (
            <>
              <span className={cn('absolute left-0 h-5 w-0.5 rounded-r-full transition-opacity duration-200', styles.marker, isActive ? 'opacity-100' : 'opacity-0')} />
              <Settings size={17} className="shrink-0" />
              <span>{t('nav.settings')}</span>
            </>
          )}
        </NavLink>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
        >
          <LogOut size={17} className="shrink-0" />
          {t('actions.logout')}
        </button>
      </div>
    </div>
  );
};

const AuthenticatedLayout = ({
  addToast,
  navItems,
  variant = 'emerald',
  mode = 'client',
  brandIcon,
  brandLabelKey,
  backLink,
}) => {
  const { t, i18n } = useTranslation('common');
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const styles = variantStyles[variant] || variantStyles.emerald;

  useEffect(() => {
    const handler = e => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await notificationService.getNotifications();
        const items = Array.isArray(res?.notifications) ? res.notifications
          : Array.isArray(res?.data) ? res.data
          : Array.isArray(res) ? res : [];
        setNotifications(items.slice(0, 5));
        setUnreadCount(items.filter(n => !n.is_read).length);
      } catch {
        // Topbar notifications are non-blocking.
      }
    })();
  }, []);

  const displayName = user?.first_name || user?.name?.split(' ')[0] || t(mode === 'admin' ? 'roles.admin' : mode === 'employee' ? 'roles.employee' : 'roles.client');
  const roleLabel = useMemo(() => {
    if (mode === 'admin') return t('roles.admin');
    if (mode === 'employee') return t('roles.employee');
    return user?.role === 'admin' ? t('roles.admin') : user?.role === 'employee' ? t('roles.employee') : t('roles.client');
  }, [mode, t, user?.role]);
  const statusLabel = mode === 'admin' ? t('status.adminMode') : mode === 'employee' ? t('status.employeeMode') : t('status.liveNetwork');

  return (
    <div className={cn('min-h-screen bg-bg-dark text-white font-sans', styles.selection)}>
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 z-20 w-[260px] flex-col border-r border-white/5 bg-bg-card">
        <SidebarContent brandIcon={brandIcon} brandLabelKey={brandLabelKey} navItems={navItems} backLink={backLink} logout={logout} styles={styles} variant={mode} />
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              key="drawer"
              initial={{ x: document.documentElement.dir === 'rtl' ? 260 : -260 }}
              animate={{ x: 0 }}
              exit={{ x: document.documentElement.dir === 'rtl' ? 260 : -260 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 top-0 z-50 flex w-[260px] flex-col border-r border-white/5 bg-bg-card lg:hidden"
            >
              <button onClick={() => setSidebarOpen(false)} className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
                <X size={18} />
              </button>
              <SidebarContent brandIcon={brandIcon} brandLabelKey={brandLabelKey} navItems={navItems} backLink={backLink} logout={logout} onNavigate={() => setSidebarOpen(false)} styles={styles} variant={mode} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen flex-col lg:ml-[260px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/5 bg-bg-dark/80 px-4 backdrop-blur-xl lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white lg:hidden">
            <Menu size={20} />
          </button>

          <div className={cn('hidden max-w-xs flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition-all md:flex', styles.focus)}>
            <Search size={15} className="shrink-0 text-slate-500" />
            <input type="text" placeholder={t('actions.search')} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 md:flex">
            <div className={cn('h-1.5 w-1.5 rounded-full', styles.marker)} />
            {statusLabel}
          </div>

          <div className="flex-1" />

          <LanguageSwitcher accent={variant} compact />

          <div ref={notifRef} className="relative">
            <button onClick={() => { setNotifOpen(p => !p); setProfileOpen(false); }} className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
              <Bell size={19} />
              {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-[2px] border-bg-dark bg-rose-500" />}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.13 }}
                  className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-white/10 bg-bg-card shadow-2xl shadow-black/50"
                >
                  <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                    <span className="text-sm font-semibold text-white">{t('notifications.title')}</span>
                    {unreadCount > 0 && <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-400">{t('notifications.new', { count: unreadCount })}</span>}
                  </div>
                  <div className="scrollbar-hide max-h-72 divide-y divide-white/5 overflow-y-auto">
                    {notifications.length > 0 ? notifications.map((n, i) => (
                      <div key={i} className={cn('px-4 py-3 text-xs transition-colors hover:bg-white/[0.03]', !n.is_read && `${styles.active}`)}>
                        <p className="truncate font-medium text-white">{n.title || n.message || t('notifications.fallbackTitle')}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">{n.created_at ? new Date(n.created_at).toLocaleDateString(i18n.language) : ''}</p>
                      </div>
                    )) : <div className="py-10 text-center text-sm text-slate-500">{t('notifications.empty')}</div>}
                  </div>
                  <div className="border-t border-white/5 px-4 py-2.5">
                    <NavLink to="/notifications" onClick={() => setNotifOpen(false)} className={cn('text-xs font-medium transition-colors', styles.accentText)}>
                      {t('actions.viewAllNotifications')}
                    </NavLink>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <div ref={profileRef} className="relative">
            <button onClick={() => { setProfileOpen(p => !p); setNotifOpen(false); }} className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-white/5">
              <Avatar name={displayName} src={user?.avatar} status="online" />
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold leading-none text-white">{displayName}</p>
                <p className={cn('mt-0.5 text-[10px] font-bold uppercase tracking-wider', styles.accentText)}>{roleLabel}</p>
              </div>
              <ChevronDown size={13} className="ml-0.5 hidden text-slate-500 sm:block" />
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.13 }}
                  className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 bg-bg-card shadow-2xl shadow-black/50"
                >
                  <div className="border-b border-white/5 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-white">{user?.name || displayName}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    {[
                      { to: '/profile', icon: User, labelKey: 'nav.profile' },
                      { to: '/settings', icon: SlidersHorizontal, labelKey: 'nav.settings' },
                    ].map(item => (
                      <NavLink key={item.to} to={item.to} onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
                        <item.icon size={15} />
                        {t(item.labelKey)}
                      </NavLink>
                    ))}
                  </div>
                  <div className="border-t border-white/5 py-1">
                    <button onClick={() => { setProfileOpen(false); logout(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-rose-400 transition-colors hover:bg-rose-500/10">
                      <LogOut size={15} />
                      {t('actions.logout')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          <div className={cn(mode === 'admin' ? 'max-w-[1400px]' : 'max-w-7xl', 'mx-auto')}>
            <Outlet context={{ addToast }} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuthenticatedLayout;
