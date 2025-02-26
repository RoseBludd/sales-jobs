'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getUserJobs, COLUMN_MAP } from '@/lib/monday';
import Header from '@/components/Header';
import { toast } from 'react-hot-toast';

interface Job {
  id: string;
  name: string;
  email: string;
  details: Record<string, string>;
}

// Helper function to get friendly column names
function getColumnPurpose(columnName: string): string {
  return COLUMN_MAP[columnName as keyof typeof COLUMN_MAP] || columnName;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGridView, setIsGridView] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [hasLoadedJobs, setHasLoadedJobs] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const loadJobs = useCallback(async () => {
    if (!session?.user?.email || hasLoadedJobs) return;

    try {
      setIsLoading(true);
      const userJobs = await getUserJobs(session.user.email);
      setJobs(userJobs);
      setHasLoadedJobs(true);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.email, hasLoadedJobs]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const filteredJobs = jobs.filter((job) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      job.name.toLowerCase().includes(searchLower) ||
      Object.values(job.details).some((value) =>
        value?.toLowerCase().includes(searchLower)
      )
    );
  });

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showSignOut={true} />
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <p className="text-gray-500">Loading jobs...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showSignOut={true} />
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Job Board</h1>
                {session?.user?.email && (
                  <p className="mt-1 text-sm text-gray-600">{session.user.email}</p>
                )}
              </div>
              
              {/* Modern Search Bar */}
              <div className="sm:w-96">
                <div className="relative group">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search jobs..."
                    className="block w-full bg-white rounded-xl pl-11 pr-10 py-3 
                             text-sm text-gray-900 placeholder:text-gray-400
                             border border-gray-200
                             shadow-sm transition-all duration-200
                             hover:border-gray-300 hover:shadow-md
                             focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:shadow-md
                             focus:outline-none"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* View Toggle and Job Count */}
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Found {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                <button
                  onClick={() => setIsGridView(true)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isGridView
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setIsGridView(false)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    !isGridView
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          {isGridView ? (
            // Grid View
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{job.name}</h3>
                    <div className="space-y-3">
                      {/* Job Stage and Total */}
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                          {job.details['text95__1'] || 'No Stage'}
                        </span>
                        <span className="text-lg font-semibold text-gray-900">
                          ${Number(job.details['jp_total__1'] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      {/* Address */}
                      {job.details['job_address___text__1'] && (
                        <div className="flex items-start gap-2 text-gray-600">
                          <svg className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm">{job.details['job_address___text__1']}</span>
                        </div>
                      )}
                      
                      {/* Customer Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-sm text-gray-600">
                            {job.details['text0__1']} {job.details['text1__1']}
                          </span>
                        </div>
                        
                        {job.details['phone_1__1'] && (
                          <div className="flex items-center gap-2">
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="text-sm text-gray-600">{job.details['phone_1__1']}</span>
                          </div>
                        )}
                        
                        {job.details['email4__1'] && (
                          <div className="flex items-center gap-2">
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm text-gray-600">{job.details['email4__1']}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Job Details */}
                      {job.details['text'] && (
                        <div className="mt-4 pt-3 border-t border-gray-100">
                          <p className="text-sm text-gray-600">{job.details['text']}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // List View
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-lg shadow overflow-hidden"
                >
                  <button
                    onClick={() => toggleJobExpansion(job.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{job.name}</h3>
                      <p className="text-gray-600">
                        {job.details['text95__1'] || 'Stage not set'} • 
                        <span className="ml-2">${Number(job.details['jp_total__1'] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        {job.details['job_address___text__1'] && (
                          <span className="ml-2">• {job.details['job_address___text__1']}</span>
                        )}
                      </p>
                    </div>
                    <svg
                      className={`h-5 w-5 text-gray-400 transform transition-transform ${
                        expandedJobId === job.id ? 'rotate-180' : ''
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  
                  {/* Expanded Details */}
                  {expandedJobId === job.id && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                      <div className="space-y-3">
                        {Object.entries(job.details)
                          .filter(([key]) => Object.keys(COLUMN_MAP).includes(key))
                          .map(([key, value]) => (
                            <div key={key} className="flex justify-between items-baseline">
                              <span className="text-sm font-medium text-gray-500">{getColumnPurpose(key)}</span>
                              <span className="text-sm text-gray-900">
                                {key === 'jp_total__1' 
                                  ? `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                  : value || "Not Available"}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {filteredJobs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">
                {searchQuery ? 'No jobs found matching your search.' : 'No jobs found.'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}