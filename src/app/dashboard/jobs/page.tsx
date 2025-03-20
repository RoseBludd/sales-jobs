'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { RefreshCcw, Loader2 } from 'lucide-react';
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
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const syncLockRef = useRef(false);

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

  // Function to fetch jobs from the database
  const fetchJobsFromDatabase = useCallback(async () => {
    if (!userEmail) return;
    
    try {
      setIsLoading(true);
      console.log('📊 Fetching jobs from database...');
      
      const response = await fetch(`/api/jobs/database?pageSize=10000`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch jobs from database');
      }
      
      const data = await response.json();
      
      console.log(`📋 Fetched ${data.jobs.length} jobs from database`);
      
      setAllJobs(data.jobs);
      setHasLoadedJobs(true);
      setLastSynced(data.lastSynced);
      
      // Calculate total pages
      const pages = Math.ceil(data.jobs.length / itemsPerPageParam);
      setTotalPages(pages || 1);
      
      // Save to cache for faster loading next time
      saveJobsToCache(data.jobs, data.hasMore ? String(data.page * data.pageSize) : null, data.hasMore);
      
    } catch (error) {
      console.error('Error fetching jobs from database:', error);
      toast.error('Failed to fetch jobs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [userEmail, itemsPerPageParam, saveJobsToCache]);

  // Function to trigger a sync with Monday.com
  const syncWithMonday = useCallback(async (forceFullSync: boolean = false) => {
    if (!userEmail) return;
    
    try {
      // We don't check syncLockRef here since it should be managed by the calling function
      console.log(`🔄 Starting ${forceFullSync ? 'full' : 'incremental'} sync with Monday.com...`);
      setSyncInProgress(true);
      
      const response = await fetch('/api/monday/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          background: true,
          forceFullSync,
          chunkSize: forceFullSync ? 200 : 50, // Use smaller chunks for incremental sync
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync jobs');
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`${forceFullSync ? 'Full' : 'Incremental'} sync started in background`);
        
        // Wait a bit before fetching jobs to allow sync to make progress
        setTimeout(() => {
          fetchJobsFromDatabase();
        }, 2000);
      }
    } catch (error) {
      console.error('Error syncing with Monday.com:', error);
      toast.error('Failed to sync with Monday.com. Please try again.');
      // Make sure to release the lock on error
      syncLockRef.current = false;
      setIsSyncing(false);
      setSyncInProgress(false);
    }
  }, [userEmail, fetchJobsFromDatabase]);

  // Define syncLatestJobs first before it's used in fetchInitialJobs
  const syncLatestJobs = useCallback(async () => {
    if (isSyncing || !userEmail) {
      console.log('🔄 Sync already in progress or no user email, skipping');
      return;
    }
    
    // Set syncing state but don't set the lock yet
    setIsSyncing(true);
    
    try {
      // First, check if we need to sync by fetching just the most recent job from Monday
      console.log('🔍 Checking if sync is needed by comparing most recent job...');
      
      // Fetch the most recent job from Monday.com
      const checkResponse = await fetch('/api/monday/check-latest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
        }),
      });
      
      if (!checkResponse.ok) {
        const errorData = await checkResponse.json();
        throw new Error(errorData.error || 'Failed to check latest job');
      }
      
      const checkData = await checkResponse.json();
      
      // If the data is up to date, skip the full sync
      if (checkData.isUpToDate) {
        console.log('✅ Database is already up to date with Monday.com, skipping sync');
        toast.success('Your job data is already up to date');
        setIsSyncing(false);
        return;
      }
      
      // If we get here, we need to do a full incremental sync
      console.log('🔄 Database needs updating, proceeding with incremental sync...');
      console.log('Reason:', checkData.message);
      
      // Now check if another sync is already in progress before setting the lock
      if (syncLockRef.current) {
        console.log('🔒 Another sync is already in progress, skipping this sync');
        setIsSyncing(false);
        return;
      }
      
      // Set the lock and proceed with sync
      syncLockRef.current = true;
      await syncWithMonday(false); // Incremental sync
    } catch (error) {
      console.error('Error checking if sync is needed:', error);
      setIsSyncing(false);
      syncLockRef.current = false; // Make sure to release the lock on error
      toast.error('Failed to check for updates');
    }
  }, [userEmail, syncWithMonday, isSyncing]);

  const refreshJobs = useCallback(() => {
    if (!userEmail) return;
    
    // Don't start a refresh if a sync is already in progress
    if (syncLockRef.current || isSyncing) {
      console.log('🔒 Sync already in progress, skipping refresh request');
      toast.success('Sync already in progress, please wait...');
      return;
    }
    
    // Start loading
    console.log('🔄 Manual refresh requested');
    setIsLoading(true);
    toast.success('Checking for updates...');
    
    // First sync to check for new jobs
    syncLatestJobs()
      .then(() => {
        // After sync completes or if no sync was needed
        if (!syncInProgress) {
          console.log('✅ No sync needed or sync completed quickly');
          setIsLoading(false);
        } else {
          console.log('🔄 Sync started, polling will handle completion');
          // The polling mechanism will handle fetching data and updating loading state
          // when the sync completes
        }
      })
      .catch(error => {
        console.error('❌ Error during manual refresh:', error);
        toast.error('Failed to refresh jobs. Please try again.');
        setIsLoading(false);
        syncLockRef.current = false;
        setSyncInProgress(false);
        setIsSyncing(false);
      });
  }, [userEmail, syncLatestJobs, syncInProgress, isSyncing]);

  // Now define fetchInitialJobs which uses syncLatestJobs and refreshJobs
  const fetchInitialJobs = useCallback(async (forceRefresh = false) => {
    if (!userEmail) return;
    
    // Don't start if a sync is already in progress
    if (syncLockRef.current || isSyncing) {
      console.log('🔒 Sync already in progress, skipping initial fetch');
      return;
    }

    try {
      console.log(`🚀 Initial jobs load started${forceRefresh ? ' (force refresh)' : ''}`);
      setIsLoading(true);
      
      // Check if we have jobs in the database first
      const response = await fetch('/api/jobs/sync');
      
      if (!response.ok) {
        throw new Error('Failed to fetch sync status');
      }
      
      const syncStatus = await response.json();
      
      // If we have jobs in the database, fetch them
      if (syncStatus.totalJobs > 0) {
        console.log(`📊 Found ${syncStatus.totalJobs} jobs in database, fetching...`);
        await fetchJobsFromDatabase();
        
        // Always check for updates after initial load
        console.log('🔄 Initial load completed, checking for updates...');
        setTimeout(() => {
          refreshJobs();
        }, 1000);
      } else {
        // No jobs in database, perform full sync
        console.log('📊 No jobs found in database, performing full sync...');
        toast.success('First time loading jobs. Starting full sync with Monday.com...');
        
        // Set the sync lock before starting a full sync
        syncLockRef.current = true;
        await syncWithMonday(true); // Force full sync
        
        // Wait a bit and then fetch jobs
        setTimeout(async () => {
          await fetchJobsFromDatabase();
        }, 3000);
      }
      
    } catch (error) {
      console.error('❌ Error fetching jobs:', error);
      toast.error('Failed to fetch jobs. Please try again.');
      // Make sure to release the lock on error
      syncLockRef.current = false;
      setIsSyncing(false);
      setSyncInProgress(false);
    } finally {
      console.log('🏁 Initial jobs load completed');
      setIsLoading(false);
    }
  }, [userEmail, fetchJobsFromDatabase, syncLatestJobs, syncWithMonday, isSyncing, refreshJobs]);

  const changePage = useCallback((page: number, searchActive = false) => {
    if (page < 1 || page > totalPages) return;
    
    console.log(`📋 Changing to page ${page} of ${totalPages}`);
    setCurrentPage(page);
    
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
          if (previousJobCount > 0 && allJobs.length < previousJobCount * 0.9 && !syncLockRef.current) {
            console.warn(`⚠️ Job count decreased significantly: ${previousJobCount} → ${allJobs.length}`);
            console.log('🔄 Forcing full refresh to recover data');
            fetchInitialJobs(true);
          } else if (!syncLockRef.current) {
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
  }, [allJobs.length, itemsPerPageParam]);

  // Update the clearJobsCache function to perform a full sync
  const clearJobsCache = useCallback(() => {
    if (!userEmail || syncLockRef.current) return;
    
    console.log('🔄 Starting full sync with Monday.com...');
    toast.success('Starting full sync with Monday.com...');
    
    // Set the sync lock
    syncLockRef.current = true;
    setIsLoading(true);
    
    try {
      // Perform a full sync
      syncWithMonday(true)
        .catch(error => {
          console.error('Error during full sync:', error);
          toast.error('Failed to sync with Monday.com. Please try again.');
          // Make sure to release the lock on error
          syncLockRef.current = false;
          setIsSyncing(false);
          setSyncInProgress(false);
          setIsLoading(false);
        });
    } catch (error) {
      console.error('❌ Error starting full sync:', error);
      toast.error('Failed to start sync. Please try again.');
      // Make sure to release the lock on error
      syncLockRef.current = false;
      setIsSyncing(false);
      setSyncInProgress(false);
      setIsLoading(false);
    }
  }, [userEmail, syncWithMonday]);

  // Add a polling effect to check sync status periodically
  useEffect(() => {
    if (!userEmail || !hasLoadedJobs) return;
    
    let intervalId: NodeJS.Timeout;
    
    // Check if a sync is in progress
    const checkSyncStatus = async () => {
      try {
        const response = await fetch('/api/monday/sync');
        if (!response.ok) {
          console.error('Error checking sync status:', await response.text());
          return false;
        }
        
        const data = await response.json();
        
        // If sync is in progress, update state
        if (data.status === 'in_progress') {
          console.log('🔄 Sync in progress, will fetch updated data soon');
          setSyncInProgress(true);
          return true;
        }
        
        // If sync was in progress but now it's completed
        if (syncInProgress || syncLockRef.current) {
          console.log('✅ Sync completed, releasing lock and fetching updated data');
          setSyncInProgress(false);
          syncLockRef.current = false;
          setIsSyncing(false);
          
          // Fetch updated data
          await fetchJobsFromDatabase();
          toast.success('Sync completed successfully');
        }
        
        return false;
      } catch (error) {
        console.error('Error checking sync status:', error);
        // On error, release the lock to prevent deadlocks
        syncLockRef.current = false;
        setIsSyncing(false);
        setSyncInProgress(false);
        return false;
      }
    };
    
    // Initial check
    checkSyncStatus().then(isInProgress => {
      if (isInProgress) {
        // If sync is in progress, set up polling
        intervalId = setInterval(checkSyncStatus, 5000); // Check every 5 seconds
      }
    });
    
    // Clean up interval
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [userEmail, hasLoadedJobs, fetchJobsFromDatabase, syncInProgress]);

  return { 
    allJobs,
    isLoading, 
    isSyncing,
    refreshJobs,
    currentPage,
    totalPages,
    changePage,
    clearJobsCache,
    lastSynced
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
    lastSynced
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
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {session.user.email}
                  {lastSynced && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      Last synced: {new Date(lastSynced).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </p>
              )}
            </div>
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap mb-6">
            <div className="relative group">
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
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-lg z-10">
                Syncs with Monday.com and updates the database
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-t-4 border-gray-800 border-l-4 border-l-transparent border-r-4 border-r-transparent"></div>
              </div>
            </div>
            
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Full Sync
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-lg z-10">
                Performs a complete sync with Monday.com
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
                  isGridView={true}
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
                  isGridView={false}
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