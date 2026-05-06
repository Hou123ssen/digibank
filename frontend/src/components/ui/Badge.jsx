import React from 'react';
import { cn } from '../../utils/cn';

const Badge = ({ 
  className, 
  variant = 'neutral', 
  children, 
  ...props 
}) => {
  const variants = {
    success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    info: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    neutral: "bg-white/5 text-slate-400 border-white/10",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
