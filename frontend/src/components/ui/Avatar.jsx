import React from 'react';
import { cn } from '../../utils/cn';

const Avatar = ({ 
  src, 
  name, 
  size = 'md', 
  status, 
  className 
}) => {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  const getInitials = (n) => {
    if (!n) return '?';
    return n.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
  };

  const statusColors = {
    online: "bg-emerald-500",
    offline: "bg-slate-500",
    away: "bg-amber-500",
    busy: "bg-rose-500",
  };

  return (
    <div className="relative inline-flex">
      <div className={cn(
        "relative flex items-center justify-center rounded-full overflow-hidden bg-emerald-700/20 border border-emerald-500/20 text-emerald-500 font-semibold uppercase",
        sizes[size],
        className
      )}>
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>
      
      {status && (
        <span className={cn(
          "absolute bottom-0 right-0 block rounded-full ring-2 ring-bg-dark",
          size === 'sm' ? "w-2 h-2" : "w-3 h-3",
          statusColors[status]
        )} />
      )}
    </div>
  );
};

export default Avatar;
