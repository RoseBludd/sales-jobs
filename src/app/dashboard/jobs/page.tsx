'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { RefreshCcw, Loader2 } from 'lucide-react';
import { getUserJobs, getAllUserJobs } from '@/lib/monday';
import { toast } from 'react-hot-toast';

// Import types, constants, and components
import { Job, CachedData } from './types';
import { CACHE_KEY_PREFIX, CACHE_DURATION, ITEMS_PER_PAGE, STATUS_CLASSIFICATIONS } from './constants';
import { SearchBar, ClassificationFilter, Pagination, JobCard, ItemsPerPageSelector } from './components';
import { clearAllJobCaches } from './utils';


// Custom Hooks
const useJobsData = (userEmail: string | null | undefined, itemsPerPageParam: number = ITEMS_PER_PAGE) => {
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasLoadedJobs, setHasLoadedJobs] = useState(false);

  // Get cache key for the current user
  const getCacheKey = useCallback((email: string | null | undefined) => {
    if (!email) return null;
    return `${CACHE_KEY_PREFIX}${email.toLowerCase()}`;
  }, []);

  const loadJobsFromCache = useCallback((): CachedData | null => {
    if (!userEmail) return null;
    
    const cacheKey = getCacheKey(userEmail);
    if (!cacheKey) return null;
    
    const cachedData = localStorage.getItem(cacheKey);
    if (!cachedData) return null;

    try {
      const data = JSON.parse(cachedData) as CachedData;
      
      // Verify the cache belongs to the current user
      if (data.userEmail !== userEmail) {
        console.log('Cache user mismatch, clearing cache');
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      return Date.now() - data.timestamp > CACHE_DURATION ? null : data;
    } catch (error) {
      console.error('Error parsing cached jobs:', error);
      localStorage.removeItem(cacheKey);
      return null;
    }
  }, [userEmail, getCacheKey]);

  const saveJobsToCache = useCallback((jobs: Job[], cursor: string | null, hasMoreItems: boolean) => {
    if (!userEmail) return;
    
    const cacheKey = getCacheKey(userEmail);
    if (!cacheKey) return;
    
    localStorage.setItem(cacheKey, JSON.stringify({
      jobs,
      timestamp: Date.now(),
      lastCursor: cursor,
      hasMore: hasMoreItems,
      userEmail // Store the user email in the cache
    }));
  }, [userEmail, getCacheKey]);

  // Define syncLatestJobs first before it's used in fetchInitialJobs
  const syncLatestJobs = useCallback(async () => {
    if (isSyncing || !userEmail) {
      console.log('🔄 Sync already in progress or no user email, skipping');
      return;
    }
    
    try {
      console.log('🔄 Starting job sync process...');
      setIsSyncing(true);
      
      // Use cached jobs override if provided, otherwise use allJobs state
      // This helps avoid timing issues with React state updates
      let existingJobs: Job[] = [];
      
      // Try to load from cache directly if allJobs is empty
      if (allJobs.length === 0) {
        const cachedData = loadJobsFromCache();
        if (cachedData && cachedData.jobs.length > 0) {
          existingJobs = [...cachedData.jobs];
          console.log(`📊 Loaded ${existingJobs.length} jobs directly from cache`);
        } else {
          existingJobs = [...allJobs];
          console.log(`📊 Using current state with ${existingJobs.length} jobs`);
        }
      } else {
        existingJobs = [...allJobs];
        console.log(`📊 Using current state with ${existingJobs.length} jobs`);
      }
      
      // Create a Set of existing job IDs for faster lookup
      const existingIds = new Set(existingJobs.map(job => job.id));
      console.log(`🔢 Created lookup index with ${existingIds.size} job IDs`);
      
      // Fetch latest page of jobs (most recent 50)
      const response = await getUserJobs(userEmail, { 
        limit: 50,
        cursor: null // Always start from the beginning for sync
      });
      
      console.log(`📥 Fetched ${response.items.length} recent jobs for sync`);
      
      // Debug: Log the first few IDs from both sets to verify comparison
      const fetchedIds = response.items.map(job => job.id);
      console.log(`🔍 First 5 fetched job IDs: ${fetchedIds.slice(0, 5).join(', ')}`);
      console.log(`🔍 First 5 cached job IDs: ${Array.from(existingIds).slice(0, 5).join(', ')}`);
      
      // Find new jobs that aren't in our cache by ID comparison
      const newJobs = response.items.filter(job => !existingIds.has(job.id));
      
      console.log(`🔍 Found ${newJobs.length} new jobs not in cache`);
      
      // Create a Set of fetched job IDs for faster lookup
      const fetchedIdsSet = new Set(fetchedIds);
      
      // Find deleted jobs (jobs that are in cache but not in the fetched results)
      // Only check the first 50 jobs in cache since that's what we're comparing against
      const recentCachedJobs = existingJobs.slice(0, 50);
      const deletedJobs = recentCachedJobs.filter(job => !fetchedIdsSet.has(job.id));
      
      console.log(`🔍 Found ${deletedJobs.length} jobs that were deleted`);
      
      let updatedJobs = [...existingJobs];
      
      if (newJobs.length > 0 || deletedJobs.length > 0) {
        // Add new jobs to the beginning of the list
        if (newJobs.length > 0) {
          updatedJobs = [...newJobs, ...existingJobs];
          console.log(`📈 Adding ${newJobs.length} new jobs to list`);
        }
        
        // Remove deleted jobs from the list
        if (deletedJobs.length > 0) {
          const deletedIds = new Set(deletedJobs.map(job => job.id));
          updatedJobs = updatedJobs.filter(job => !deletedIds.has(job.id));
          console.log(`🗑️ Removing ${deletedJobs.length} deleted jobs from list`);
        }
        
        console.log(`📊 Updated job list: ${existingJobs.length} existing → ${updatedJobs.length} total`);
        
        setAllJobs(updatedJobs);
        
        // Update total pages
        const pages = Math.ceil(updatedJobs.length / itemsPerPageParam);
        setTotalPages(pages || 1);
        
        // Save to cache
        saveJobsToCache(updatedJobs, response.cursor, response.hasMore);
        console.log(`💾 Updated cache with ${updatedJobs.length} total jobs`);
        
        // Show appropriate toast notifications
        if (newJobs.length > 0) {
          toast.success(`Found ${newJobs.length} new job${newJobs.length === 1 ? '' : 's'}`);
        }
        
        if (deletedJobs.length > 0) {
          toast.success(`Removed ${deletedJobs.length} deleted job${deletedJobs.length === 1 ? '' : 's'}`);
        }
      } else {
        console.log('✅ No changes detected, cache is up to date');
      }
      
    } catch (error) {
      console.error('❌ Error syncing jobs:', error);
    } finally {
      console.log('🔄 Sync process completed');
      setIsSyncing(false);
    }
  }, [allJobs, isSyncing, saveJobsToCache, loadJobsFromCache, itemsPerPageParam, userEmail]);

  // Now define fetchInitialJobs which uses syncLatestJobs
  const fetchInitialJobs = useCallback(async (forceRefresh = false) => {
    if (!userEmail) return;

    try {
      console.log(`🚀 Initial jobs load started${forceRefresh ? ' (force refresh)' : ''}`);
      setIsLoading(true);
      
      // Check cache first
      const cachedData = loadJobsFromCache();
      
      if (cachedData) {
        // We have cached data, use it and sync in background
        console.log(`📂 Found cached data with ${cachedData.jobs.length} jobs from ${new Date(cachedData.timestamp).toLocaleString()}`);
        
        // Safety check - store the job count before any operations
        const cachedJobCount = cachedData.jobs.length;
        
        setAllJobs(cachedData.jobs);
        setHasLoadedJobs(true);
        setIsLoading(false);
        
        // Calculate total pages
        const pages = Math.ceil(cachedData.jobs.length / itemsPerPageParam);
        setTotalPages(pages || 1);
        
        // Sync in background to check for new jobs - exactly like refresh button
        console.log('🔄 Starting background sync to check for updates...');
        
        // Use a separate async function to avoid state issues
        const performSync = async () => {
          // Pass the cached jobs directly to avoid timing issues with state updates
          await syncLatestJobs();
          
          // Safety check - verify we didn't lose jobs after sync
          if (allJobs.length < cachedJobCount * 0.9) {
            console.warn(`⚠️ Job count decreased after sync: ${cachedJobCount} → ${allJobs.length}`);
            console.log('🔄 Restoring original cached data');
            
            // Restore the original cached data
            setAllJobs(cachedData.jobs);
            
            // Recalculate pages
            const pages = Math.ceil(cachedData.jobs.length / itemsPerPageParam);
            setTotalPages(pages || 1);
            
            // Re-save the original cache
            saveJobsToCache(cachedData.jobs, cachedData.lastCursor, cachedData.hasMore);
          }
        };
        
        performSync();
        return;
      }
      
      // No cache, fetch all jobs (first time only)
      console.log('🔍 No valid cache found, fetching all jobs (first time load)...');
      const fetchedJobs = await getAllUserJobs(userEmail);
      console.log(`📥 Fetched all ${fetchedJobs.length} jobs from API`);
      
      setAllJobs(fetchedJobs);
      setHasLoadedJobs(true);
      
      // Calculate total pages
      const pages = Math.ceil(fetchedJobs.length / itemsPerPageParam);
      setTotalPages(pages || 1);
      
      // Save to cache
      saveJobsToCache(fetchedJobs, null, false);
      console.log(`💾 Saved ${fetchedJobs.length} jobs to cache`);
      
    } catch (error) {
      console.error('❌ Error fetching jobs:', error);
      toast.error('Failed to fetch jobs. Please try again.');
    } finally {
      console.log('🏁 Initial jobs load completed');
      setIsLoading(false);
    }
  }, [userEmail, loadJobsFromCache, saveJobsToCache, syncLatestJobs, itemsPerPageParam]);

  const refreshJobs = useCallback(() => {
    if (!userEmail) return;
    
    // Start loading
    console.log('🔄 Manual refresh requested');
    setIsLoading(true);
    toast.success('Refreshing jobs data...');
    
    // First sync to check for new jobs
    syncLatestJobs()
      .then(() => {
        console.log('✅ Manual refresh completed');
        setIsLoading(false);
      })
      .catch(error => {
        console.error('❌ Error during manual refresh:', error);
        toast.error('Failed to refresh jobs. Please try again.');
        setIsLoading(false);
      });
  }, [userEmail, syncLatestJobs]);

  const changePage = useCallback((page: number, searchActive = false) => {
    if (page < 1 || page > totalPages) return;
    
    console.log(`📋 Changing to page ${page} of ${totalPages}`);
    setCurrentPage(page);
    
    // Remove the code that modifies allJobs
    // When searching or filtering, we're using paginatedFilteredJobs for display
    // which is calculated in the paginatedFilteredJobs useMemo
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [totalPages]);

  // Listen for storage events (when cache is modified in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith(CACHE_KEY_PREFIX) && userEmail) {
        const userCacheKey = getCacheKey(userEmail);
        if (userCacheKey === e.key) {
          console.log('🔄 Cache updated in another tab, reloading data');
          // Reload from cache without fetching
          const cachedData = loadJobsFromCache();
          if (cachedData) {
            console.log(`📂 Loaded ${cachedData.jobs.length} jobs from updated cache`);
            setAllJobs(cachedData.jobs);
            
            // Calculate total pages
            const pages = Math.ceil(cachedData.jobs.length / itemsPerPageParam);
            setTotalPages(pages || 1);
            
            // Don't slice and set allJobs again - this causes an infinite loop
            // The pagination is handled by paginatedFilteredJobs in the component
          }
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [userEmail, getCacheKey, loadJobsFromCache, currentPage, itemsPerPageParam]);

  useEffect(() => {
    if (!userEmail || hasLoadedJobs) return;
    console.log('🏁 First time load detected, initializing jobs data');
    fetchInitialJobs();
  }, [userEmail, hasLoadedJobs, fetchInitialJobs]);

  // Add a special effect to handle browser reload events
  useEffect(() => {
    const handleBeforeUnload = () => {
      // This will run right before the page unloads/reloads
      // We can set a flag in sessionStorage to indicate this is a reload
      sessionStorage.setItem('is_reload', 'true');
      sessionStorage.setItem('previous_job_count', allJobs.length.toString());
      console.log(`📝 Saving reload state with ${allJobs.length} jobs`);
    };

    const checkIfReload = () => {
      const isReload = sessionStorage.getItem('is_reload') === 'true';
      const previousJobCount = parseInt(sessionStorage.getItem('previous_job_count') || '0', 10);
      
      if (isReload && userEmail) {
        console.log(`🔄 Browser reload detected with previous job count: ${previousJobCount}`);
        // Clear the flags
        sessionStorage.removeItem('is_reload');
        sessionStorage.removeItem('previous_job_count');
        
        // If we have jobs already loaded, just sync like the refresh button
        if (allJobs.length > 0) {
          // If job count has dramatically decreased, something went wrong
          if (previousJobCount > 0 && allJobs.length < previousJobCount * 0.9) {
            console.warn(`⚠️ Job count decreased significantly: ${previousJobCount} → ${allJobs.length}`);
            console.log('🔄 Forcing full refresh to recover data');
            fetchInitialJobs(true);
          } else {
            console.log('🔄 Normal reload, syncing for updates');
            syncLatestJobs();
          }
        }
      }
    };

    // Add event listener for page unload
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Check if this is a reload when the component mounts
    checkIfReload();

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userEmail, syncLatestJobs, allJobs.length, fetchInitialJobs]);

  // Update pagination when itemsPerPage or allJobs length changes
  useEffect(() => {
    const pages = Math.ceil(allJobs.length / itemsPerPageParam);
    setTotalPages(pages || 1);
    
    // We don't need to update paginatedJobs here anymore
    // since we're using paginatedFilteredJobs for display
    // which is calculated in the paginatedFilteredJobs useMemo
  }, [allJobs.length, itemsPerPageParam]);

  // Add a clear cache function that will be returned from the hook
  const clearJobsCache = useCallback(() => {
    if (!userEmail) return;
    
    try {
      // Using the imported utility function to clear all job caches
      const clearedCount = clearAllJobCaches();
      console.log(`🗑️ Cleared ${clearedCount} job cache entries`);
      
      // Reset state
      setAllJobs([]);
      setHasLoadedJobs(false);
      
      toast.success(`Cache cleared. Reloading jobs data...`);
      
      // Refetch jobs
      fetchInitialJobs(true);
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      toast.error('Failed to clear cache. Please try again.');
    }
  }, [userEmail, fetchInitialJobs]);

  return { 
    allJobs,
    isLoading, 
    isSyncing,
    refreshJobs,
    currentPage,
    totalPages,
    changePage,
    clearJobsCache,
  };
};

// Main Component
export default function JobsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassification, setSelectedClassification] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isGridView, setIsGridView] = useState(true);
  const [expandedJobIds, setExpandedJobIds] = useState<string[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);
  const [loadingState, setLoadingState] = useState<'initial' | 'loading' | 'syncing' | 'loaded'>('initial');
  
  const { 
    allJobs,
    isLoading, 
    isSyncing,
    refreshJobs,
    currentPage,
    totalPages,
    changePage,
    clearJobsCache,
  } = useJobsData(session?.user?.email, itemsPerPage);

  // Update loading state based on isLoading and isSyncing
  useEffect(() => {
    if (isLoading && !isSyncing) {
      setLoadingState('loading');
    } else if (isSyncing) {
      setLoadingState('syncing');
    } else if (allJobs.length > 0) {
      setLoadingState('loaded');
    }
  }, [isLoading, isSyncing, allJobs.length]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Search through ALL jobs, not just the current page
  const filteredJobs = useMemo(() => {
    return allJobs.filter((job) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' || 
        job.name.toLowerCase().includes(searchLower) ||
        Object.values(job.details).some(value => 
          value && typeof value === 'string' && value.toLowerCase().includes(searchLower)
        );
      
      const jobStatus = job.details['text95__1'] || '';
      const jobClassification = STATUS_CLASSIFICATIONS[jobStatus] || '';
      
      // Check if job matches the selected classification
      let matchesClassification = true;
      if (selectedClassification) {
        if (selectedClassification === 'Unclassified') {
          matchesClassification = !STATUS_CLASSIFICATIONS[jobStatus];
        } else {
          matchesClassification = jobClassification === selectedClassification;
        }
      }
      
      // Check if job matches the selected status
      let matchesStatus = true;
      if (selectedStatus) {
        matchesStatus = jobStatus === selectedStatus;
      }
      
      return matchesSearch && matchesClassification && matchesStatus;
    });
  }, [allJobs, searchQuery, selectedClassification, selectedStatus]);

  // Create search-only filtered jobs for the classification filter
  const searchFilteredJobs = useMemo(() => {
    if (!searchQuery) return allJobs;
    
    const filtered = allJobs.filter((job) => {
      const searchLower = searchQuery.toLowerCase();
      return job.name.toLowerCase().includes(searchLower) ||
        Object.values(job.details).some(value => 
          value && typeof value === 'string' && value.toLowerCase().includes(searchLower)
        );
    });
    
    // If search returns zero results, return an empty array instead of undefined
    // This ensures the classification filter shows zero counts
    return filtered.length > 0 ? filtered : [];
  }, [allJobs, searchQuery]);

  const filteredTotal = useMemo(() => {
    return filteredJobs.length;
  }, [filteredJobs]);

  // Modified toggle function to handle individual job expansion
  const toggleJobExpansion = (jobId: string) => {
    if (isGridView) {
      // In grid view, we don't close other cards when one is opened
      setExpandedJobIds(prev => 
        prev.includes(jobId)
          ? prev.filter(id => id !== jobId)
          : [...prev, jobId]
      );
    } else {
      // In list view, maintain the same behavior
      setExpandedJobIds(prev =>
        prev.includes(jobId)
          ? prev.filter(id => id !== jobId)
          : [...prev, jobId]
      );
    }
  };

  // Calculate pagination for filtered results
  const paginatedFilteredJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredJobs.slice(startIndex, endIndex);
  }, [filteredJobs, currentPage, itemsPerPage]);

  // Toggle all jobs expansion - moved after paginatedFilteredJobs declaration
  const toggleExpandAll = useCallback(() => {
    if (expandAll) {
      // If currently expanded, collapse all
      setExpandedJobIds([]);
      setExpandAll(false);
    } else {
      // If currently collapsed, expand all visible jobs
      setExpandedJobIds(paginatedFilteredJobs.map(job => job.id));
      setExpandAll(true);
    }
  }, [expandAll, paginatedFilteredJobs]);

  // Reset expand all state when page changes
  useEffect(() => {
    setExpandAll(false);
    setExpandedJobIds([]);
  }, [currentPage, itemsPerPage, searchQuery, selectedClassification, selectedStatus]);

  // Reset status filter when classification changes
  useEffect(() => {
    setSelectedStatus('');
  }, [selectedClassification]);

  // Calculate total pages for filtered results
  const filteredTotalPages = useMemo(() => {
    if (searchQuery || selectedClassification || selectedStatus) {
      return Math.ceil(filteredTotal / itemsPerPage) || 1;
    }
    return totalPages;
  }, [filteredTotal, totalPages, searchQuery, selectedClassification, selectedStatus, itemsPerPage]);

  // Wrap the changePage function to include search state
  const handlePageChange = useCallback((page: number) => {
    const isSearchActive = searchQuery !== '' || selectedClassification !== '' || selectedStatus !== '';
    changePage(page, isSearchActive);
  }, [changePage, searchQuery, selectedClassification, selectedStatus]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    handlePageChange(1);
  }, [searchQuery, selectedClassification, selectedStatus, handlePageChange]);

  // Handle items per page change
  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    // Reset to page 1 when changing items per page
    handlePageChange(1);
    // Save preference to localStorage
    try {
      localStorage.setItem('jobsItemsPerPage', newItemsPerPage.toString());
    } catch (error) {
      console.error('Failed to save items per page preference:', error);
    }
  }, [handlePageChange]);

  // Load saved items per page preference
  useEffect(() => {
    try {
      const savedItemsPerPage = localStorage.getItem('jobsItemsPerPage');
      if (savedItemsPerPage) {
        const parsedValue = parseInt(savedItemsPerPage, 10);
        if (!isNaN(parsedValue) && [10, 20, 50, 100].includes(parsedValue)) {
          setItemsPerPage(parsedValue);
        }
      }
    } catch (error) {
      console.error('Failed to load items per page preference:', error);
    }
  }, []);

  // Skeleton loader component for jobs
  const JobSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3"></div>
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mt-4"></div>
    </div>
  );

  // Render skeletons based on current view mode
  const renderSkeletons = () => {
    const skeletonCount = itemsPerPage > 10 ? 10 : itemsPerPage;
    
    return isGridView ? (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array(skeletonCount).fill(0).map((_, index) => (
          <JobSkeleton key={index} />
        ))}
      </div>
    ) : (
      <div className="space-y-4">
        {Array(skeletonCount).fill(0).map((_, index) => (
          <JobSkeleton key={index} />
        ))}
      </div>
    );
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 text-blue-500 dark:text-blue-400 animate-spin" />
              <p className="text-gray-500 dark:text-gray-300">Authenticating...</p>
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
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{session.user.email}</p>
              )}
            </div>
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap mb-6">
            <button
              onClick={refreshJobs}
              disabled={loadingState === 'syncing' || loadingState === 'loading'}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 
                       text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 
                       bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700
                       shadow-sm transition-all duration-200 hover:shadow
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                       dark:focus:ring-offset-gray-900 dark:focus:ring-blue-400
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingState === 'syncing' ? (
                <Loader2 className="mr-2 h-5 w-5 text-gray-400 dark:text-gray-300 animate-spin" />
              ) : (
                <RefreshCcw className="mr-2 h-5 w-5 text-gray-400 dark:text-gray-300" />
              )}
              {loadingState === 'syncing' ? 'Syncing...' : 'Refresh Jobs'}
            </button>
            
            {/* Clear Cache button with tooltip */}
            <div className="relative group">
              <button
                onClick={clearJobsCache}
                disabled={loadingState === 'syncing' || loadingState === 'loading'}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 
                         text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 
                         bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700
                         shadow-sm transition-all duration-200 hover:shadow
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                         dark:focus:ring-offset-gray-900 dark:focus:ring-blue-400
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="mr-2 h-5 w-5 text-gray-400 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Cache
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-lg z-10">
                Use this if job data appears incorrect or out of date
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-t-4 border-gray-800 border-l-4 border-l-transparent border-r-4 border-r-transparent"></div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <ClassificationFilter
              value={selectedClassification}
              onChange={setSelectedClassification}
              statusFilter={selectedStatus}
              onStatusChange={setSelectedStatus}
              jobs={allJobs}
              filteredJobs={searchFilteredJobs}
            />
          </div>
          
          {/* Top controls bar */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            {/* Items per page selector - Left */}
            <div className="w-full md:w-1/3 flex justify-start">
              <ItemsPerPageSelector 
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
            
            {/* Jobs count - Center */}
            <div className="w-full md:w-1/3 flex justify-center">
              {loadingState === 'loaded' ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Found {filteredTotal} jobs 
                  {filteredTotal > 0 && (
                    <span>
                      (showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredTotal)}-
                      {Math.min(currentPage * itemsPerPage, filteredTotal)})
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {loadingState === 'loading' ? 'Loading jobs...' : 
                   loadingState === 'syncing' ? 'Syncing latest jobs...' : ''}
                </p>
              )}
            </div>
            
            {/* Grid/List toggle and Expand All - Right */}
            <div className="w-full md:w-1/3 flex justify-end space-x-2">
              {/* Expand All toggle */}
              <button
                onClick={toggleExpandAll}
                disabled={loadingState !== 'loaded'}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700
                  ${expandAll
                    ? 'bg-blue-500 text-white border-blue-500 dark:border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  } ${loadingState !== 'loaded' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {expandAll ? 'Collapse All' : 'Expand All'}
              </button>
              
              {/* View toggle */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1">
                <button
                  onClick={() => {
                    setIsGridView(true);
                    setExpandAll(false);
                    setExpandedJobIds([]);
                  }}
                  disabled={loadingState !== 'loaded'}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isGridView
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  } ${loadingState !== 'loaded' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Grid
                </button>
                <button
                  onClick={() => {
                    setIsGridView(false);
                    setExpandAll(false);
                    setExpandedJobIds([]);
                  }}
                  disabled={loadingState !== 'loaded'}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    !isGridView
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  } ${loadingState !== 'loaded' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          {/* Jobs Grid/List with loading states */}
          {loadingState === 'loading' ? (
            renderSkeletons()
          ) : loadingState === 'syncing' && paginatedFilteredJobs.length === 0 ? (
            renderSkeletons()
          ) : paginatedFilteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-300">
                {searchQuery || selectedClassification || selectedStatus ? 'No jobs found matching your search.' : 'No jobs found.'}
              </p>
            </div>
          ) : isGridView ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedFilteredJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  isExpanded={expandedJobIds.includes(job.id)}
                  onToggle={() => toggleJobExpansion(job.id)}
                />
              ))}
              {loadingState === 'syncing' && (
                <div className="col-span-full flex justify-center items-center py-4">
                  <Loader2 className="h-6 w-6 text-blue-500 dark:text-blue-400 animate-spin mr-2" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Syncing more jobs...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedFilteredJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  isExpanded={expandedJobIds.includes(job.id)}
                  onToggle={() => toggleJobExpansion(job.id)}
                />
              ))}
              {loadingState === 'syncing' && (
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-6 w-6 text-blue-500 dark:text-blue-400 animate-spin mr-2" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Syncing more jobs...</span>
                </div>
              )}
            </div>
          )}
          
          {/* Pagination */}
          {filteredTotalPages > 1 && loadingState === 'loaded' && (
            <Pagination 
              currentPage={currentPage} 
              totalPages={filteredTotalPages} 
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}