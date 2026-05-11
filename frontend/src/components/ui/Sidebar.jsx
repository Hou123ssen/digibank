import React, { useState } from 'react';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  ArrowUpRight, 
  Settings, 
  HelpCircle, 
  LogOut,
  Menu,
  X,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import logo from '../../images/logo digi.png';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ArrowUpRight },
  { id: 'cards', label: 'My Cards', icon: CreditCard },
  { id: 'savings', label: 'Savings', icon: Wallet },
];

const secondaryItems = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Support', icon: HelpCircle },
];

const Sidebar = ({ activeId = 'dashboard', onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);

  const NavLink = ({ item }) => {
    const isActive = activeId === item.id;
    const Icon = item.icon;
    
    return (
      <button
        onClick={() => {
          onNavigate?.(item.id);
          setIsOpen(false);
        }}
        className={cn(
          "relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
          isActive 
            ? "bg-emerald-500/10 text-emerald-500" 
            : "text-slate-400 hover:bg-white/5 hover:text-white"
        )}
      >
        <Icon size={20} />
        <span className="font-medium text-sm">{item.label}</span>
        {isActive && (
          <motion.div
            layoutId="sidebar-accent"
            className="absolute left-0 w-1 h-6 bg-emerald-500 rounded-r-full"
            initial={false}
          />
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[70] p-2 bg-bg-card border border-white/10 rounded-lg text-white"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 bottom-0 z-60 w-[260px] bg-bg-card border-r border-white/5 flex flex-col transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-emerald-900/40 ring-1 ring-emerald-400/20">
              <img src={logo} alt="DigiBank logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">DigiBank</h2>
              <p className="text-[10px] text-emerald-500 font-semibold tracking-[0.2em] uppercase">System Bank</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide">
          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Main Menu</p>
          {navItems.map(item => (
            <NavLink key={item.id} item={item} />
          ))}

          <div className="my-8 h-px bg-white/5 mx-4" />

          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Preferences</p>
          {secondaryItems.map(item => (
            <NavLink key={item.id} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors">
            <LogOut size={20} />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
