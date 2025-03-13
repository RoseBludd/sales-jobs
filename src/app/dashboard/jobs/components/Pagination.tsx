import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, KeyboardEvent, useMemo } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange
}: PaginationProps) => {
  const [pageInput, setPageInput] = useState<string>(currentPage.toString());

  // Update input when currentPage changes
  useEffect(() => {
    if (!document.activeElement?.id?.includes('page-input')) {
      setPageInput(currentPage.toString());
    }
  }, [currentPage]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = () => {
    const pageNumber = parseInt(pageInput, 10);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      onPageChange(pageNumber);
    } else {
      // Reset to current page if invalid
      setPageInput(currentPage.toString());
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit();
    }
  };

  // Calculate page range
  const { visiblePages, startPage, endPage } = useMemo(() => {
    const maxVisiblePages = 3; // Reduced for cleaner look
    
    let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const end = Math.min(totalPages, start + maxVisiblePages - 1);
    
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }
    
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`w-10 h-10 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
            currentPage === i
              ? 'bg-blue-600 dark:bg-blue-700 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          aria-current={currentPage === i ? 'page' : undefined}
        >
          {i}
        </button>
      );
    }
    
    return { visiblePages: pages, startPage: start, endPage: end };
  }, [currentPage, totalPages, onPageChange]);
  
  return (
    <div className="flex items-center justify-center space-x-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors ${
          currentPage === 1
            ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      
      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="w-10 h-10 flex items-center justify-center rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            1
          </button>
          {startPage > 2 && (
            <span className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400">...</span>
          )}
        </>
      )}
      
      {/* First page numbers */}
      {visiblePages.slice(0, Math.floor(visiblePages.length / 2))}
      
      {/* Page input in the middle */}
      <div className="relative mx-1">
        <input
          id="page-input"
          type="text"
          value={pageInput}
          onChange={handlePageInputChange}
          onBlur={handlePageInputSubmit}
          onKeyDown={handleKeyDown}
          className="w-14 h-10 px-2 text-center rounded-md border border-gray-300 dark:border-gray-600 
                   text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
          aria-label="Go to page"
        />
      </div>
      
      {/* Last page numbers */}
      {visiblePages.slice(Math.floor(visiblePages.length / 2))}
      
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && (
            <span className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400">...</span>
          )}
          <button
            onClick={() => onPageChange(totalPages)}
            className="w-10 h-10 flex items-center justify-center rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {totalPages}
          </button>
        </>
      )}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors ${
          currentPage === totalPages
            ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        aria-label="Next page"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}; 