import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const Tabs = ({ 
  tabs = [], 
  activeTab, 
  onChange, 
  className 
}) => {
  return (
    <div className={cn("flex border-b border-white/5 w-full", className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange?.(tab.id)}
            className={cn(
              "relative px-6 py-3 text-sm font-medium transition-colors",
              isActive ? "text-emerald-500" : "text-slate-500 hover:text-slate-300"
            )}
          >
            {tab.label}
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
