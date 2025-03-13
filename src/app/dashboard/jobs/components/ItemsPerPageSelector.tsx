import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface ItemsPerPageSelectorProps {
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
}

export const ItemsPerPageSelector = ({ 
  itemsPerPage, 
  onItemsPerPageChange 
}: ItemsPerPageSelectorProps) => {
  const [showDropdown, setShowDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showDropdown && !(e.target as Element).closest('.items-per-page-dropdown')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleItemsPerPageChange = (value: number) => {
    onItemsPerPageChange(value);
    setShowDropdown(false);
  };

  return (
    <div className="items-per-page-dropdown relative">
      <div className="flex items-center">
        <span className="text-sm text-gray-600 dark:text-gray-300 mr-2">Items per page:</span>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center justify-between w-20 h-10 px-3 rounded-md border border-gray-300 dark:border-gray-600 
                     bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 
                     hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Select items per page"
            aria-expanded={showDropdown}
          >
            <span>{itemsPerPage}</span>
            <ChevronDown className="h-4 w-4 ml-1 text-gray-500 dark:text-gray-400" />
          </button>
          
          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 w-20 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
                          rounded-md shadow-lg z-10 py-1">
              {[10, 20, 50, 100].map(value => (
                <button
                  key={value}
                  onClick={() => handleItemsPerPageChange(value)}
                  className={`block w-full text-left px-3 py-2 text-sm ${
                    itemsPerPage === value 
                      ? 'bg-blue-50 dark:bg-blue-800/40 text-blue-600 dark:text-blue-300' 
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 