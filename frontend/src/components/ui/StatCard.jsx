import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import Card from './Card';

const StatCard = ({ 
  label, 
  value, 
  delta, 
  icon: Icon, 
  trend = 'up', // 'up' | 'down'
  className 
}) => {
  return (
    <Card hover className={cn("p-6 space-y-4", className)}>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
          {Icon && <Icon size={20} />}
        </div>
        {delta && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            trend === 'up' ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
          )}>
            {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {delta}
          </div>
        )}
      </div>
      
      <div>
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <h3 className="text-2xl font-bold text-white font-mono mt-1">{value}</h3>
      </div>
    </Card>
  );
};

export default StatCard;
