import React from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import Avatar from './Avatar';

const Topbar = ({ user }) => {
  return (
    <header className="h-20 border-b border-white/5 bg-bg-dark/50 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between">
      {/* Search */}
      <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-96 group focus-within:border-emerald-500/50 transition-all">
        <Search size={18} className="text-slate-500" />
        <input 
          type="text" 
          placeholder="Search for anything..." 
          className="bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500 w-full"
        />
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-500 font-mono">
          <span>⌘</span>
          <span>K</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-bg-dark" />
        </button>

        <div className="h-8 w-px bg-white/5" />

        {/* User Profile */}
        <button className="flex items-center gap-3 p-1 rounded-xl hover:bg-white/5 transition-colors text-left">
          <Avatar 
            name={user?.name || "Ahmed Benani"} 
            src={user?.avatar} 
            status="online"
          />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-white leading-none">{user?.name || "Ahmed Benani"}</p>
            <p className="text-[11px] text-slate-500 mt-1 uppercase font-bold tracking-wider">Premium Client</p>
          </div>
          <ChevronDown size={16} className="text-slate-500 ml-1" />
        </button>
      </div>
    </header>
  );
};

export default Topbar;
