'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ChevronDown, Plus, RefreshCcw } from 'lucide-react';
import { getUserJobs, COLUMN_MAP } from '@/lib/monday';
import { toast } from 'react-hot-toast';

// Types and Interfaces
interface Job {
  id: string;
  name: string;
  email: string;
  details: Record<string, string>;
}

interface CachedData {
  jobs: Job[];
  timestamp: number;
}

type Classification = 'Prospects' | 'Sold' | 'Estimating' | 'Production' | 'Accounting' | 'Completed' | 'Unclassified';

// Constants
const CACHE_KEY = 'dashboard_jobs';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

const STATUS_CLASSIFICATIONS: Record<string, Classification> = {
  'New Jobs': 'Prospects',
  'Previous Phase - Google Export': 'Prospects',
  'Researching/Need to call': 'Prospects',
  'Job Lost': 'Prospects',
  'No Damage/Keep an eye out': 'Prospects',
  'Gone Cold': 'Prospects',
  'Marketing - Future Sales': 'Prospects',
  'Authorized Inspection/Lead': 'Prospects',
  'Inspected / Schedule Close': 'Prospects',
  'Presented With Dec. Maker/s': 'Prospects',
  'Follow Up - Cold': 'Prospects',
  'Follow Up - Warm': 'Prospects',
  'Follow Up - Hot!': 'Prospects',
  'File Review Failed': 'Prospects',
  'File Review Team 3 days': 'Sold',
  'Need cash bid': 'Estimating',
  'Repair Bid Needed': 'Estimating',
  'Estimating Needs Info': 'Estimating',
  'Signed and Need Bid 10 days': 'Estimating',
  'Est review': 'Estimating',
  'Save the JOB!': 'Estimating',
  'Customer with atty/PA/3P WFA': 'Estimating',
  'Info Needed': 'Estimating',
  'Customer with Us only': 'Estimating',
  'FAILED TAKEOFF': 'Production',
  'ASSIGN PM - 3 DAYS': 'Production',
  'INITIAL TAKEOFF - 3 DAYS': 'Production',
  'REVIEW NEEDED - 3 DAYS': 'Production',
  'CREATE CONTRACT - 3 DAYS': 'Production',
  'CONTRACT PENDING - 10 DAYS': 'Production',
  'NEED SITE VISIT - 10 DAYS': 'Production',
  'CREATE MATERIALS LIST - 3 DAYS': 'Production',
  'AWAITING QUOTES - 10 DAYS': 'Production',
  'PM REVIEW FAILED - 1 DAY': 'Production',
  'PM REVIEW - 2 DAYS': 'Production',
  'PLANNING/LAYOUT - 3 DAYS': 'Production',
  'DIRECTOR REVIEW - 2 DAYS': 'Production',
  'SCHEDULING - 5 DAYS': 'Production',
  'MATERIALS 30+ DAYS': 'Production',
  'MATERIALS 30 DAYS OR LESS': 'Production',
  'MATERIALS 10 DAYS OR LESS': 'Production',
  'ACTIVE PROJECTS': 'Production',
  'EMS to be scheduled': 'Production',
  'EMS Scheduled': 'Production',
  'Warranty Jobs 48 Hr response': 'Production',
  'Warranty Scheduled': 'Production',
  '3rd party to schedule': 'Production',
  '3rd Part jobs in progress': 'Production',
  'QC - 7 DAYS': 'Production',
  'PUNCHOUT - 7 DAYS': 'Production',
  'FINAL JOB REVIEW - 5 DAYS': 'Production',
  'Supp info Needed': 'Accounting',
  'Supplement 10 Res/Com': 'Accounting',
  'Supp Review - 3 Days': 'Accounting',
  'File for Deprec 7 Res/Com': 'Accounting',
  'Invoiced to collect 21Res/Com': 'Accounting',
  '3rd party jobs to collect': 'Accounting',
  'Paid in full - cap 7 Res/Com': 'Accounting',
  'Paid/waiting for more funds': 'Accounting',
  'Completed': 'Completed'
};

// Custom Hooks
const useJobsData = (userEmail: string | null | undefined) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedJobs, setHasLoadedJobs] = useState(false);

  const loadJobsFromCache = useCallback((): Job[] | null => {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (!cachedData) return null;

    try {
      const { jobs, timestamp } = JSON.parse(cachedData) as CachedData;
      return Date.now() - timestamp > CACHE_DURATION ? null : jobs;
    } catch (error) {
      console.error('Error parsing cached jobs:', error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  }, []);

  const fetchAndCacheJobs = useCallback(async () => {
    if (!userEmail) return;

    try {
      setIsLoading(true);
      const fetchedJobs = await getUserJobs(userEmail);
      
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        jobs: fetchedJobs,
        timestamp: Date.now()
      }));
      
      setJobs(fetchedJobs);
      setHasLoadedJobs(true);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to fetch jobs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  const refreshJobs = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    fetchAndCacheJobs();
    toast.success('Refreshing jobs data...');
  }, [fetchAndCacheJobs]);

  useEffect(() => {
    if (!userEmail || hasLoadedJobs) return;

    const cachedJobs = loadJobsFromCache();
    if (cachedJobs) {
      setJobs(cachedJobs);
      setHasLoadedJobs(true);
      setIsLoading(false);
    } else {
      fetchAndCacheJobs();
    }
  }, [userEmail, hasLoadedJobs, loadJobsFromCache, fetchAndCacheJobs]);

  return { jobs, isLoading, refreshJobs };
};

// Components
const SearchBar = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <div className="relative group">
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search jobs..."
      className="block w-full bg-white dark:bg-gray-800 rounded-xl pl-11 pr-10 py-3 
                text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                border border-gray-200 dark:border-gray-700
                shadow-sm transition-all duration-200
                hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md
                focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:shadow-md
                focus:outline-none"
    />
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Search className="h-5 w-5 text-gray-400" />
    </div>
    {value && (
      <button
        onClick={() => onChange('')}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    )}
  </div>
);

const ClassificationFilter = ({ value, onChange }: { 
  value: string; 
  onChange: (value: string) => void 
}) => (
  <div className="relative group w-72">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none block w-full bg-white dark:bg-gray-800 rounded-xl pl-11 pr-10 py-3
                text-sm text-gray-900 dark:text-gray-100
                border border-gray-200 dark:border-gray-700 shadow-sm
                transition-all duration-200
                hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md
                focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:shadow-md
                focus:outline-none cursor-pointer font-medium"
    >
      <option value="">All Classifications</option>
      <option value="Prospects">Prospects</option>
      <option value="Sold">Sold</option>
      <option value="Estimating">Estimating</option>
      <option value="Production">Production</option>
      <option value="Accounting">Accounting</option>
      <option value="Completed">Completed</option>
      <option value="Unclassified">Unclassified</option>
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
  </div>
);

const JobCard = ({ job, isExpanded, onToggle }: { 
  job: Job; 
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const status = job.details['text95__1'] || '';
  const classification = STATUS_CLASSIFICATIONS[status] || 'Unclassified';
  const amount = Number(job.details['jp_total__1'] || 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.name}</h3>
            <div className="flex gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                {classification}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {status || 'No Stage'}
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              {job.details['job_address___text__1'] && (
                <span className="ml-2">• {job.details['job_address___text__1']}</span>
              )}
            </div>
          </div>
          <ChevronDown 
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-t dark:border-gray-700">
          <div className="space-y-3">
            {Object.entries(job.details)
              .filter(([key]) => Object.keys(COLUMN_MAP).includes(key))
              .map(([key, value]) => (
                <div key={key} className="flex justify-between items-baseline">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {COLUMN_MAP[key as keyof typeof COLUMN_MAP]}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {key === 'jp_total__1' 
                      ? `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                      : value || "Not Available"}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Component
export default function JobsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassification, setSelectedClassification] = useState('');
  const [isGridView, setIsGridView] = useState(true);
  const [expandedJobIds, setExpandedJobIds] = useState<string[]>([]);
  
  const { jobs, isLoading, refreshJobs } = useJobsData(session?.user?.email);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = job.name.toLowerCase().includes(searchLower) ||
        Object.values(job.details).some(value => value?.toLowerCase().includes(searchLower));
      
      const jobStatus = job.details['text95__1'] || '';
      const jobClassification = STATUS_CLASSIFICATIONS[jobStatus] || '';
      
      if (!selectedClassification) return matchesSearch;
      
      if (selectedClassification === 'Unclassified') {
        return matchesSearch && !STATUS_CLASSIFICATIONS[jobStatus];
      }
      return matchesSearch && jobClassification === selectedClassification;
    });
  }, [jobs, searchQuery, selectedClassification]);

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobIds(prev =>
      prev.includes(jobId)
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading jobs...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Job Board</h1>
              {session?.user?.email && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{session.user.email}</p>
              )}
            </div>
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/dashboard/jobs/fillout"
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 
                       text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 
                       bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700
                       shadow-sm transition-all duration-200 hover:shadow
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                       dark:focus:ring-offset-gray-900"
            >
              <Plus className="mr-2 h-5 w-5 text-gray-400" />
              Add New Job
            </Link>

            <button
              onClick={refreshJobs}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 
                       text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 
                       bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700
                       shadow-sm transition-all duration-200 hover:shadow
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                       dark:focus:ring-offset-gray-900"
            >
              <RefreshCcw className="mr-2 h-5 w-5 text-gray-400" />
              Refresh Jobs
            </button>
          </div>
          
            <ClassificationFilter
              value={selectedClassification}
              onChange={setSelectedClassification}
            />

          <div className="flex items-center justify-between">
            {/* Jobs Count */}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Found {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
            </div>
            <div className="ml-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1">
              <button
                onClick={() => setIsGridView(true)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isGridView
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setIsGridView(false)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  !isGridView
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                List
              </button>
            </div>
          </div>

          {/* Jobs Grid/List */}
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery ? 'No jobs found matching your search.' : 'No jobs found.'}
              </p>
            </div>
          ) : isGridView ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  isExpanded={expandedJobIds.includes(job.id)}
                  onToggle={() => toggleJobExpansion(job.id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  isExpanded={expandedJobIds.includes(job.id)}
                  onToggle={() => toggleJobExpansion(job.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}