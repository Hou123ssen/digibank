import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const Button = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  leftIcon: LeftIcon, 
  rightIcon: RightIcon, 
  children, 
  disabled, 
  ...props 
}, ref) => {
  const variants = {
    primary: "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-900/20",
    secondary: "border border-white/10 bg-white/5 hover:bg-white/10 text-white",
    ghost: "hover:bg-white/5 text-slate-400 hover:text-white",
    danger: "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-900/20",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3.5 text-base",
  };

  return (
    <button
      ref={ref}
      disabled={isLoading || disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : LeftIcon && (
        <span className="mr-2">
          <LeftIcon size={size === 'sm' ? 14 : 18} />
        </span>
      )}
      
      {children}

      {!isLoading && RightIcon && (
        <span className="ml-2">
          <RightIcon size={size === 'sm' ? 14 : 18} />
        </span>
      )}
    </button>
  );
});

Button.displayName = "Button";

export default Button;
