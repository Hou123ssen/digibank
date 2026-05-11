import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTheme } from '../landing/ThemeContext';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className 
}) => {
  const { dark } = useTheme();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Modal Content */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={cn(
                "w-full max-w-lg border rounded-2xl shadow-2xl pointer-events-auto overflow-hidden transition-colors",
                dark
                  ? "bg-bg-card border-white/10 shadow-black/50"
                  : "bg-white/95 border-[#00C2A8]/25 shadow-[#006655]/10",
                className
              )}
            >
              {/* Header */}
              {(title || onClose) && (
                <div className={cn("flex items-center justify-between px-6 py-4 border-b", dark ? "border-white/5" : "border-[#00C2A8]/15")}>
                  <h3 className={cn("text-lg font-semibold", dark ? "text-white" : "text-[#003d35]")}>{title}</h3>
                  {onClose && (
                    <button
                      onClick={onClose}
                      className={cn(
                        "p-1 rounded-lg transition-colors",
                        dark
                          ? "text-slate-400 hover:bg-white/5 hover:text-white"
                          : "text-[#006655]/70 hover:bg-[#00C2A8]/10 hover:text-[#003d35]",
                      )}
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              )}
              
              {/* Body */}
              <div className="p-6">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;
