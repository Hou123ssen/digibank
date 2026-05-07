import React from 'react';
import { cn } from '../../utils/cn';

const Input = React.forwardRef(({
  className, label, error, helperText,
  leftIcon: LeftIcon, rightIcon: RightIcon,
  type = 'text', light = false, ...props
}, ref) => (
  <div className="w-full space-y-1.5">
    {label && (
      <label className="block text-sm font-medium"
        style={{ color: light ? 'rgba(0,41,32,0.75)' : 'rgba(203,213,225,1)' }}>
        {label}
      </label>
    )}
    <div className="relative group">
      {LeftIcon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:!text-[#00C2A8]"
          style={{ color: light ? 'rgba(0,120,90,0.5)' : 'rgba(100,116,139,1)' }}>
          <LeftIcon size={18} />
        </div>
      )}
      <input
        type={type} ref={ref}
        className={cn(
          'w-full rounded-lg py-2.5 px-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00C2A8]/25 focus:border-[#00C2A8]',
          LeftIcon && 'pl-11',
          RightIcon && 'pr-11',
          error && '!border-rose-500 focus:!border-rose-500 focus:!ring-rose-500/20',
          className
        )}
        style={{
          background: light ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.05)',
          border: error ? '1px solid rgb(244,63,94)'
                : light ? '1px solid rgba(0,194,168,0.3)' : '1px solid rgba(255,255,255,0.1)',
          color: light ? '#002920' : 'rgba(203,213,225,1)',
          backdropFilter: light ? 'blur(8px)' : 'none',
        }}
        {...props}
      />
      {RightIcon && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2"
          style={{ color: light ? 'rgba(0,120,90,0.5)' : 'rgba(100,116,139,1)' }}>
          <RightIcon size={18} />
        </div>
      )}
    </div>
    {error ? (
      <p className="text-xs text-rose-500">{error}</p>
    ) : helperText ? (
      <p className="text-xs" style={{ color: light ? 'rgba(0,41,32,0.45)' : 'rgba(100,116,139,1)' }}>{helperText}</p>
    ) : null}
  </div>
));

Input.displayName = 'Input';
export default Input;
