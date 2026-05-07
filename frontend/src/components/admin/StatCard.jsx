import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/cn';

const StatCard = ({ 
  title, 
  value, 
  delta, 
  icon: Icon, 
  variant = 'A', 
  progress, 
  data = [], 
  color = 'emerald' 
}) => {
  const isPositive = delta && !delta.toString().startsWith('-');
  
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
    amber:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose:    'text-rose-400 bg-rose-500/10 border-rose-500/20',
    purple:  'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  const ringColors = {
    emerald: '#10b981',
    blue:    '#3b82f6',
    amber:   '#f59e0b',
    rose:    '#f43f5e',
    purple:  '#a855f7',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-3xl bg-bg-card border border-white/5 space-y-4 hover:border-white/10 transition-all group"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</span>
        {Icon && (
          <div className={cn('p-2 rounded-xl shrink-0', colors[color])}>
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-4">
        <h3 className="text-3xl font-bold text-white tracking-tighter">{value}</h3>
        {variant === 'A' && delta && (
          <div className={cn(
            'flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full',
            isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
          )}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {delta}
          </div>
        )}
      </div>

      {variant === 'B' && data.length > 0 && (
        <div className="h-8 flex items-end gap-1 px-1">
          {data.map((val, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${(val / Math.max(...data)) * 100}%` }}
              className={cn('flex-1 rounded-sm opacity-30 group-hover:opacity-60 transition-opacity', colors[color].split(' ')[1])}
            />
          ))}
        </div>
      )}

      {variant === 'C' && (
        <div className="space-y-2">
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={cn('h-full', colors[color].split(' ')[1])}
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}

      {variant === 'D' && (
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
              <motion.circle
                cx="18" cy="18" r="16" fill="none"
                stroke={ringColors[color]}
                strokeWidth="4"
                strokeDasharray="100, 100"
                initial={{ strokeDasharray: "0, 100" }}
                animate={{ strokeDasharray: `${progress}, 100` }}
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="flex-1 space-y-1">
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className={cn('h-full', colors[color].split(' ')[1])} style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Distribution ratio</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StatCard;
