import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const Card = React.forwardRef(({ 
  className, 
  glass = false, 
  hover = false,
  children, 
  ...props 
}, ref) => {
  const Component = hover ? motion.div : 'div';
  const motionProps = hover ? { whileHover: { scale: 1.01 } } : {};
  
  return (
    <Component
      ref={ref}
      {...motionProps}
      className={cn(
        "rounded-2xl border border-white/5",
        glass ? "backdrop-blur-xl bg-white/5 border-white/10" : "bg-bg-card",
        "shadow-xl shadow-emerald-900/5",
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
