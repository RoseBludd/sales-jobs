'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
}

const SearchBar = ({ value, onChange, placeholder = 'Search...' }: SearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Update local state when value prop changes
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    
    // Debounce search to avoid too many updates
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    debounceTimeout.current = setTimeout(() => {
      onChange(newValue);
    }, 300);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange(searchQuery);
  };
  
  const handleClear = () => {
    setSearchQuery('');
    onChange('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // Clean up the debounce timeout
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);
  
  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={`flex items-center relative rounded-lg border transition-all duration-200 ${
        isFocused 
          ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800 shadow-sm' 
          : 'border-gray-300 dark:border-gray-600'
      } bg-white dark:bg-gray-800`}>
        <div className="flex items-center justify-center pl-3">
          <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="w-full py-2 px-3 focus:outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center justify-center pr-3"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        )}
      </div>
    </form>
  );
};

export default SearchBar; 