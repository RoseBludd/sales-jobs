'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, Clock } from 'lucide-react';

const JobsSidebarContent: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Create Job Button */}
      <div className="mb-4 px-1">
        <Link
          href="/dashboard/jobs/fillout"
          className="w-full flex items-center justify-center p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Plus size={18} className="mr-2" />
          <span>New Job</span>
        </Link>
      </div>
      
      {/* Temporary Jobs Button */}
      <div className="mb-6 px-1">
        <Link
          href="/dashboard/jobs/temp-jobs"
          className="w-full flex items-center justify-center p-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Clock size={18} className="mr-2" />
          <span>Temporary Jobs</span>
        </Link>
      </div>
      
      {/* You can add other sections here if needed */}
    </div>
  );
};

export default JobsSidebarContent;
