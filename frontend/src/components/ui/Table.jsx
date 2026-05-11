import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from './Button';
import { useTheme } from '../landing/ThemeContext';

const Table = ({ 
  headers = [], 
  data = [], 
  isLoading = false,
  emptyState: EmptyStateComponent,
  pagination = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className 
}) => {
  const { dark } = useTheme();

  return (
    <div className={cn(
      "w-full overflow-hidden rounded-xl border transition-colors",
      dark ? "border-white/5 bg-bg-card" : "border-[#00C2A8]/20 bg-white/95",
      className,
    )}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className={cn("font-medium", dark ? "bg-white/5 text-slate-400" : "bg-[#00C2A8]/10 text-[#006655]")}>
            <tr>
              {headers.map((header, i) => (
                <th key={i} className={cn("px-6 py-4 border-b", dark ? "border-white/5" : "border-[#00C2A8]/15")}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cn("divide-y", dark ? "divide-white/5" : "divide-[#00C2A8]/10")}>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {headers.map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className={cn("h-4 rounded w-full", dark ? "bg-white/5" : "bg-[#00C2A8]/10")} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length > 0 ? (
              data.map((row, i) => (
                <tr key={i} className={cn("transition-colors", dark ? "hover:bg-white/[0.02]" : "hover:bg-[#00C2A8]/[0.05]")}>
                  {row.map((cell, j) => (
                    <td key={j} className={cn("px-6 py-4", dark ? "text-slate-300" : "text-[#003d35]")}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-6 py-12 text-center">
                  {EmptyStateComponent ? <EmptyStateComponent /> : (
                    <p className={cn("italic", dark ? "text-slate-500" : "text-[#006655]/60")}>No data available</p>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {pagination && data.length > 0 && (
        <div className={cn("flex items-center justify-between px-6 py-4 border-t", dark ? "border-white/5 bg-white/[0.01]" : "border-[#00C2A8]/10 bg-[#f0fffe]/70")}>
          <span className={cn("text-xs", dark ? "text-slate-500" : "text-[#006655]/65")}>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              disabled={currentPage <= 1}
              onClick={() => onPageChange?.(currentPage - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange?.(currentPage + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
