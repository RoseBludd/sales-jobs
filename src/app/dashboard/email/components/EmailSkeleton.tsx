'use client';

import React from 'react';

/**
 * Skeleton loader for email list items
 */
export const EmailListItemSkeleton: React.FC = () => {
  return (
    <div className="p-4 border-b dark:border-gray-700 animate-pulse">
      <div className="flex justify-between">
        <div className="w-1/3 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="w-1/6 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-700 rounded mt-2"></div>
      <div className="w-3/4 h-3 bg-gray-100 dark:bg-gray-800 rounded mt-2"></div>
    </div>
  );
};

/**
 * Skeleton loader for email list
 */
export const EmailListSkeleton: React.FC = () => {
  return (
    <div className="border dark:border-gray-700 rounded-lg overflow-hidden shadow-sm bg-white dark:bg-gray-800">
      <div className="h-14 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 flex justify-between animate-pulse">
        <div className="w-1/4 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="w-1/6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      
      {Array.from({ length: 5 }).map((_, index) => (
        <EmailListItemSkeleton key={index} />
      ))}
    </div>
  );
};

/**
 * Skeleton loader for email detail view
 */
export const EmailDetailSkeleton: React.FC = () => {
  return (
    <div className="p-6 animate-pulse">
      <div className="flex justify-between mb-6">
        <div className="w-1/3 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="w-1/6 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
        <div>
          <div className="w-40 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="w-24 h-4 bg-gray-100 dark:bg-gray-800 rounded mt-2"></div>
        </div>
      </div>
      
      <div className="space-y-3 mt-8">
        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="w-5/6 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="w-4/6 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      
      <div className="mt-6 space-y-3">
        <div className="w-full h-20 bg-gray-100 dark:bg-gray-800 rounded"></div>
        <div className="w-full h-4 bg-gray-100 dark:bg-gray-800 rounded"></div>
        <div className="w-full h-4 bg-gray-100 dark:bg-gray-800 rounded"></div>
      </div>
    </div>
  );
};

/**
 * Combined skeleton loader for the entire email page
 */
const EmailSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
      <div className="md:col-span-1 h-full">
        <EmailListSkeleton />
      </div>
      <div className="md:col-span-2 h-full bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <EmailDetailSkeleton />
      </div>
    </div>
  );
};

export default EmailSkeleton; 