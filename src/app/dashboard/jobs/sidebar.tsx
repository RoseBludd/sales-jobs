'use client';

import React from 'react';
import Link from 'next/link';

interface JobsSidebarProps {
  // We can add props here if needed in the future
}

const JobsSidebarContent: React.FC<JobsSidebarProps> = () => {
  return (
    <div className="mb-6">
      <p className="text-gray-400 text-sm mb-2">ACTIONS</p>
      <ul>
        <li className="mb-1">
          <Link
            href="/dashboard/fillout"
            className="flex items-center p-2 w-full text-left hover:bg-gray-700 rounded-md"
          >
            <svg
              className="mr-2 h-5 w-5 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            <span>Add New Job</span>
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default JobsSidebarContent;
