import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useTheme } from '../landing/ThemeContext';

const Card = React.forwardRef(({ 
  className, 
  glass = false, 
  hover = false,
  children, 
  ...props 
}, ref) => {
  const { dark } = useTheme();
  const Component = hover ? motion.div : 'div';
  const motionProps = hover ? { whileHover: { scale: 1.01 } } : {};
  
  return (
    <Component
      ref={ref}
      {...motionProps}
      className={cn(
        "rounded-2xl border transition-all duration-300",
        dark 
          ? "border-[#00C2A8]/20 shadow-lg shadow-[#00C2A8]/10 hover:border-[#00C2A8]/40 hover:shadow-[0_8px_30px_rgba(0,194,168,0.2)] hover:-translate-y-1" 
          : "border-[#00C2A8]/30 shadow-xl shadow-[#00C2A8]/15 hover:border-[#00C2A8]/60 hover:shadow-[0_8px_30px_rgba(0,194,168,0.25)] hover:-translate-y-1",
        dark 
          ? (glass ? "backdrop-blur-xl bg-white/5" : "bg-bg-dark/80")
          : (glass ? "backdrop-blur-xl bg-white/70" : "bg-white"),
        "shadow-xl",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});

Card.displayName = "Card";

export default Card;
