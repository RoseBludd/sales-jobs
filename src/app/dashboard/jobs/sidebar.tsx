'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, ClipboardList, FileText } from 'lucide-react';

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
      
      {/* Targets Button */}
      <div className="mb-4 px-1">
        <Link
          href="/dashboard/jobs/temp-jobs"
          className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md group"
        >
          <div className="flex items-center">
            <div className="p-2 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 mr-3">
              <ClipboardList size={16} />
            </div>
            <span className="font-medium">Targets</span>
          </div>
          <span className="text-gray-400 group-hover:translate-x-1 transition-transform duration-200">→</span>
        </Link>
      </div>
      
      {/* Notes Button */}
      <div className="mb-6 px-1">
        <Link
          href="/dashboard/jobs/notes"
          className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md group"
        >
          <div className="flex items-center">
            <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 mr-3">
              <FileText size={16} />
            </div>
            <span className="font-medium">Notes</span>
          </div>
          <span className="text-gray-400 group-hover:translate-x-1 transition-transform duration-200">→</span>
        </Link>
      </div>
      
      {/* You can add other sections here if needed */}
    </div>
  );
};

export default JobsSidebarContent;
