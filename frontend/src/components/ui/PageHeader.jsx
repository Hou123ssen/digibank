import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

const PageHeader = ({ 
  title, 
  subtitle, 
  breadcrumbs = [], 
  actions,
  className 
}) => {
  return (
    <div className={cn("mb-8 space-y-4", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              <span className={cn(index === breadcrumbs.length - 1 ? "text-emerald-500" : "hover:text-slate-300 cursor-pointer")}>
                {item}
              </span>
              {index < breadcrumbs.length - 1 && <ChevronRight size={12} />}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-slate-400 mt-1 text-sm md:text-base">
              {subtitle}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
