import React from 'react';
import { cn } from '../../utils/cn';
import Button from './Button';

const EmptyState = ({ 
  icon: Icon, 
  title, 
  subtitle, 
  actionLabel, 
  onAction,
  className 
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center space-y-4", className)}>
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500">
        {Icon && <Icon size={32} />}
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-slate-400 max-w-[280px]">
          {subtitle}
        </p>
      </div>
      {actionLabel && (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
