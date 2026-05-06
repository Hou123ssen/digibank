import React from 'react';
import { cn } from '../../utils/cn';

const Input = React.forwardRef(({ 
  className, 
  label, 
  error, 
  helperText, 
  leftIcon: LeftIcon, 
  rightIcon: RightIcon, 
  type = 'text', 
  ...props 
}, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative group">
        {LeftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors">
            <LeftIcon size={18} />
          </div>
        )}
        
        <input
          type={type}
          ref={ref}
          className={cn(
            "w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-600",
            LeftIcon && "pl-11",
            RightIcon && "pr-11",
            error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20",
            className
          )}
          {...props}
        />

        {RightIcon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
            <RightIcon size={18} />
          </div>
        )}
      </div>
      
      {error ? (
        <p className="text-xs text-rose-500">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
