import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  theme = 'light'
}) {
  const isDark = theme === 'dark';
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(totalItems, currentPage * itemsPerPage);

  // Generate page numbers to display with smart ellipsis
  function getPageNumbers() {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  }

  const pages = getPageNumbers();

  const btnBase = `inline-flex items-center justify-center min-w-[34px] h-[34px] px-2 text-xs font-bold rounded-xl transition-all duration-150 select-none`;
  const activeBtn = `bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white shadow-md shadow-red-500/25 font-black scale-105`;
  const idleBtn = isDark
    ? `bg-[#1e1318] text-slate-300 border border-rose-950/50 hover:bg-[#2d1b24] hover:text-white`
    : `bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300`;
  const disabledBtn = isDark
    ? `bg-transparent text-slate-600 border border-transparent cursor-not-allowed`
    : `bg-transparent text-slate-300 border border-transparent cursor-not-allowed`;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 pb-2 px-1 text-xs select-none ${
      isDark ? 'text-slate-400' : 'text-slate-600'
    }`}>
      {/* Summary Text */}
      <div className="font-semibold flex items-center gap-1.5 text-center sm:text-left">
        <span>Showing</span>
        <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{startItem}</span>
        <span>to</span>
        <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{endItem}</span>
        <span>of</span>
        <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalItems}</span>
        <span>results</span>
        <span className={`ml-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
          isDark ? 'bg-rose-950/50 text-rose-300 border border-rose-900/40' : 'bg-red-50 text-red-600 border border-red-100'
        }`}>
          10 / page
        </span>
      </div>

      {/* Page Navigation Controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {/* First Page */}
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
            className={`${btnBase} ${currentPage <= 1 ? disabledBtn : idleBtn}`}
            title="First Page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className={`${btnBase} ${currentPage <= 1 ? disabledBtn : idleBtn}`}
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Number Buttons */}
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-1 text-slate-400 font-bold select-none">
                  •••
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p)}
                className={`${btnBase} font-mono ${isCurrent ? activeBtn : idleBtn}`}
              >
                {p}
              </button>
            );
          })}

          {/* Next Page */}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className={`${btnBase} ${currentPage >= totalPages ? disabledBtn : idleBtn}`}
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            className={`${btnBase} ${currentPage >= totalPages ? disabledBtn : idleBtn}`}
            title="Last Page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
