'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Job {
  id: string;
  name: string;
  email: string;
  details: Record<string, string>;
}

export default function JobsList() {
  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [orderBy, setOrderBy] = useState<'created_at' | 'updated_at' | 'name'>('updated_at');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch jobs on page load and when pagination/sorting changes
  useEffect(() => {
    fetchJobs();
  }, [page, pageSize, orderBy, orderDirection]);

  // Function to fetch jobs from the database
  const fetchJobs = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/jobs/database?page=${page}&pageSize=${pageSize}&orderBy=${orderBy}&orderDirection=${orderDirection}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      
      const data = await response.json();
      setJobs(data.jobs);
      setTotal(data.total);
      setLastSynced(data.lastSynced);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setError('Failed to fetch jobs from database');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate total pages
  const totalPages = Math.ceil(total / pageSize);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if there are few
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show a subset of pages with ellipsis
      if (page <= 3) {
        // Near the start
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        // Near the end
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Toggle sort direction
  const toggleSort = (field: 'created_at' | 'updated_at' | 'name') => {
    if (orderBy === field) {
      setOrderDirection(orderDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(field);
      setOrderDirection('desc');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Database Jobs</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Jobs stored in your local database
            {lastSynced && (
              <span className="block text-xs mt-1">
                Last synced: {formatDistanceToNow(new Date(lastSynced))} ago
              </span>
            )}
          </p>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
                </div>
              </div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No jobs found in the database. Sync with Monday.com to load jobs.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[100px]">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button 
                        className="flex items-center font-medium focus:outline-none"
                        onClick={() => toggleSort('name')}
                      >
                        Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Stage
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button 
                        className="flex items-center ml-auto font-medium focus:outline-none"
                        onClick={() => toggleSort('updated_at')}
                      >
                        Last Updated
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {job.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {job.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {job.details.text0__1} {job.details.text1__1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {job.details.job_address___text__1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {job.details.text95__1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-right">
                        Recently
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {jobs.length} of {total} jobs
            </span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(1); // Reset to first page when changing page size
                }}
                className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="5">5 per page</option>
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors ${
                page === 1
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            {getPageNumbers().map((pageNum, index) => (
              pageNum === -1 ? (
                <span key={`ellipsis-${index}`} className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={`page-${pageNum}`}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                    page === pageNum
                      ? 'bg-blue-600 dark:bg-blue-700 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {pageNum}
                </button>
              )
            ))}
            
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors ${
                page === totalPages
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              aria-label="Next page"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 