'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };
  
  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        placeholder="Search emails..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-800"
      />
      <button 
        type="submit"
        className="absolute left-0 top-0 h-full px-3 flex items-center justify-center"
        aria-label="Search"
      >
        <Search size={18} className="text-gray-500 dark:text-gray-400" />
      </button>
    </form>
  );
};

export default SearchBar; 