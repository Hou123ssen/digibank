import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from './Button';

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
  return (
    <div className={cn("w-full overflow-hidden rounded-xl border border-white/5 bg-bg-card", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400 font-medium">
            <tr>
              {headers.map((header, i) => (
                <th key={i} className="px-6 py-4 border-b border-white/5">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {headers.map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-white/5 rounded w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length > 0 ? (
              data.map((row, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className="px-6 py-4 text-slate-300">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-6 py-12 text-center">
                  {EmptyStateComponent ? <EmptyStateComponent /> : (
                    <p className="text-slate-500 italic">No data available</p>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {pagination && data.length > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/[0.01]">
          <span className="text-xs text-slate-500">
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
