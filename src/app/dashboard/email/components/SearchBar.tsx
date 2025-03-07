'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialValue?: string;
}

const SearchBar = ({ onSearch, initialValue = '' }: SearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };
  
  const handleClear = () => {
    setSearchQuery('');
    onSearch('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // Trigger search on query change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);
  
  // Update searchQuery when initialValue changes
  useEffect(() => {
    setSearchQuery(initialValue);
  }, [initialValue]);
  
  return (
    <form 
      onSubmit={handleSubmit} 
      className={`relative flex-1 max-w-md transition-all duration-200 ${isFocused ? 'ring-2 ring-blue-500 bg-white dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-700'} rounded-md`}
    >
      <div className="flex items-center">
        <span className="absolute left-0 top-0 h-full px-3 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <Search size={18} />
        </span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search emails..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full pl-10 pr-10 py-2 border-0 bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
        />
        {searchQuery && (
          <button 
            type="button"
            onClick={handleClear}
            className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </form>
  );
};

export default SearchBar; 