/**
 * Custom hook for using the email cache
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Email } from '../types';
import { 
  getEmails, 
  getEmailById, 
  updateEmailInCache, 
  removeEmailFromCache, 
  addEmailToCache,
  moveEmailInCache,
  clearCache,
  initializeCache,
  checkForNewEmails
} from './emailCache';

// Default values
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SYNC_INTERVAL = 60000; // 1 minute

interface UseEmailCacheProps {
  folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam';
  initialLoad?: boolean;
  syncInterval?: number; // Interval in ms to check for new emails
}

interface UseEmailCacheResult {
  allEmails: Email[];
  paginatedEmails: Email[];
  loading: boolean;
  error: string | null;
  totalEmails: number;
  fromCache: boolean;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  searchQuery: string;
  refreshEmails: (forceRefresh?: boolean) => Promise<void>;
  getEmail: (id: string, sync?: boolean) => Promise<Email>;
  updateEmail: (email: Email) => void;
  removeEmail: (emailId: string) => void;
  addEmail: (email: Email) => void;
  moveEmail: (emailId: string, toFolder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam') => void;
  clearAllCache: () => void;
  searchEmails: (query: string) => void;
  changePage: (page: number) => void;
  setItemsPerPage: (size: number) => void;
  hasNewEmails: boolean;
  newEmailsCount: number;
  syncingEmails: boolean;
}

export function useEmailCache({
  folder,
  initialLoad = true,
  syncInterval = DEFAULT_SYNC_INTERVAL
}: UseEmailCacheProps): UseEmailCacheResult {
  const { data: session } = useSession();
  const [allEmails, setAllEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState<boolean>(initialLoad);
  const [error, setError] = useState<string | null>(null);
  const [totalEmails, setTotalEmails] = useState<number>(0);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hasNewEmails, setHasNewEmails] = useState<boolean>(false);
  const [newEmailsCount, setNewEmailsCount] = useState<number>(0);
  const [syncingEmails, setSyncingEmails] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  
  // Use a ref to track if the cache has been initialized
  const cacheInitialized = useRef<boolean>(false);
  
  // Initialize cache when session is available
  useEffect(() => {
    if (session?.user?.email && !cacheInitialized.current) {
      try {
        initializeCache(session.user.email);
        cacheInitialized.current = true;
        console.log('Email cache initialized for user:', session.user.email);
      } catch (err) {
        console.error('Failed to initialize email cache:', err);
        setError('Failed to initialize email cache');
      }
    }
  }, [session]);

  // Filter emails by search query (client-side)
  const filteredEmails = useMemo(() => {
    if (!searchQuery) return allEmails;
    
    const lowerQuery = searchQuery.toLowerCase();
    return allEmails.filter(email => {
      return (
        email.subject.toLowerCase().includes(lowerQuery) ||
        email.from.toLowerCase().includes(lowerQuery) ||
        email.fromName.toLowerCase().includes(lowerQuery) ||
        email.to.toLowerCase().includes(lowerQuery) ||
        email.body.toLowerCase().includes(lowerQuery)
      );
    });
  }, [allEmails, searchQuery]);

  // Calculate total pages based on filtered emails and items per page
  const totalPages = useMemo(() => {
    return Math.ceil(filteredEmails.length / itemsPerPage) || 1;
  }, [filteredEmails.length, itemsPerPage]);

  // Get paginated emails based on current page and items per page
  const paginatedEmails = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredEmails.slice(startIndex, endIndex);
  }, [filteredEmails, currentPage, itemsPerPage]);

  // Fetch emails from cache or API
  const fetchEmails = useCallback(async (forceRefresh: boolean = false) => {
    if (!session?.user?.email || !cacheInitialized.current) {
      return;
    }
    
    try {
      console.log(`Fetching emails for folder: ${folder}, force refresh: ${forceRefresh}`);
      setLoading(true);
      setError(null);

      const result = await getEmails(folder, forceRefresh);
      
      setAllEmails(result.emails);
      setTotalEmails(result.total);
      setFromCache(result.fromCache);
      
      // Reset new emails flag after fetching
      setHasNewEmails(false);
      setNewEmailsCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails');
      console.error('Error fetching emails:', err);
    } finally {
      setLoading(false);
    }
  }, [folder, session?.user?.email]);

  // Check for new emails periodically
  const checkNewEmails = useCallback(async () => {
    if (!session?.user?.email || !cacheInitialized.current) {
      return;
    }
    
    try {
      setSyncingEmails(true);
      const result = await checkForNewEmails(folder);
      
      if (result.hasNewEmails) {
        setHasNewEmails(true);
        setNewEmailsCount(result.newCount);
        
        // Refresh emails to include new ones
        const refreshedEmails = await getEmails(folder, false, true);
        setAllEmails(refreshedEmails.emails);
        setTotalEmails(refreshedEmails.total);
        
        // If the user is not viewing the first page, they will see a notification
        // but the emails won't change until they navigate to the first page
      }
    } catch (err) {
      console.error('Error checking for new emails:', err);
    } finally {
      setSyncingEmails(false);
    }
  }, [folder, session?.user?.email]);

  // Set up interval to check for new emails
  useEffect(() => {
    if (!syncInterval || !session?.user?.email) {
      return;
    }
    
    const intervalId = setInterval(checkNewEmails, syncInterval);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [checkNewEmails, session?.user?.email, syncInterval]);

  // Fetch emails on mount and when dependencies change
  useEffect(() => {
    if (initialLoad && session?.user?.email && cacheInitialized.current) {
      console.log(`Initial load for folder: ${folder}`);
      fetchEmails();
    }
  }, [fetchEmails, initialLoad, session?.user?.email, folder]);

  // Get a single email by ID
  const getEmail = useCallback(async (id: string, sync: boolean = false): Promise<Email> => {
    if (!session?.user?.email || !cacheInitialized.current) {
      throw new Error('Email cache not initialized');
    }
    
    try {
      return await getEmailById(id, false, sync);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch email');
      console.error('Error fetching email:', err);
      throw err;
    }
  }, [session?.user?.email]);

  // Update an email in the cache
  const updateEmail = useCallback((email: Email): void => {
    if (!session?.user?.email || !cacheInitialized.current) {
      return;
    }
    
    updateEmailInCache(email);
    
    // Update local state
    setAllEmails(prevEmails => {
      const index = prevEmails.findIndex(e => String(e.id) === String(email.id));
      if (index !== -1) {
        const newEmails = [...prevEmails];
        newEmails[index] = email;
        return newEmails;
      }
      return prevEmails;
    });
  }, [session?.user?.email]);

  // Remove an email from the cache
  const removeEmail = useCallback((emailId: string): void => {
    if (!session?.user?.email || !cacheInitialized.current) {
      return;
    }
    
    removeEmailFromCache(emailId, folder);
    
    // Update local state
    setAllEmails(prevEmails => prevEmails.filter(e => String(e.id) !== emailId));
    setTotalEmails(prev => Math.max(0, prev - 1));
  }, [folder, session?.user?.email]);

  // Add an email to the cache
  const addEmail = useCallback((email: Email): void => {
    if (!session?.user?.email || !cacheInitialized.current) {
      return;
    }
    
    addEmailToCache(email);
    
    // Update local state if the email belongs to the current folder
    if (email.folder === folder) {
      setAllEmails(prevEmails => [email, ...prevEmails]);
      setTotalEmails(prev => prev + 1);
    }
  }, [folder, session?.user?.email]);

  // Move an email to a different folder
  const moveEmail = useCallback((emailId: string, toFolder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam'): void => {
    if (!session?.user?.email || !cacheInitialized.current) {
      return;
    }
    
    moveEmailInCache(emailId, toFolder);
    
    // Update local state
    setAllEmails(prevEmails => prevEmails.filter(e => String(e.id) !== emailId));
    setTotalEmails(prev => Math.max(0, prev - 1));
  }, [folder, session?.user?.email]);

  // Clear all cache
  const clearAllCache = useCallback((): void => {
    if (!session?.user?.email || !cacheInitialized.current) {
      return;
    }
    
    clearCache();
    
    // Force a refresh of emails
    fetchEmails(true);
  }, [session?.user?.email, fetchEmails]);

  // Search emails (client-side)
  const searchEmails = useCallback((query: string): void => {
    setSearchQuery(query);
    // Reset to first page when searching
    setCurrentPage(1);
  }, []);

  // Change page
  const changePage = useCallback((page: number): void => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    
    // Scroll to top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [totalPages]);

  // Set items per page
  const setItemsPerPageAndSave = useCallback((size: number): void => {
    setItemsPerPage(size);
    // Reset to first page when changing items per page
    setCurrentPage(1);
    
    // Save preference to localStorage
    try {
      localStorage.setItem('emailsItemsPerPage', size.toString());
    } catch (error) {
      console.error('Failed to save items per page preference:', error);
    }
  }, []);

  // Load saved items per page preference on mount
  useEffect(() => {
    try {
      const savedItemsPerPage = localStorage.getItem('emailsItemsPerPage');
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

  return {
    allEmails,
    paginatedEmails,
    loading,
    error,
    totalEmails,
    fromCache,
    currentPage,
    totalPages,
    itemsPerPage,
    searchQuery,
    refreshEmails: fetchEmails,
    getEmail,
    updateEmail,
    removeEmail,
    addEmail,
    moveEmail,
    clearAllCache,
    searchEmails,
    changePage,
    setItemsPerPage: setItemsPerPageAndSave,
    hasNewEmails,
    newEmailsCount,
    syncingEmails
  };
} 