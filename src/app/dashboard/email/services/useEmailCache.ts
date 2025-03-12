/**
 * Custom hook for using the email cache
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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

interface UseEmailCacheProps {
  folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam';
  page?: number;
  pageSize?: number;
  initialLoad?: boolean;
  syncInterval?: number; // Interval in ms to check for new emails
}

interface UseEmailCacheResult {
  emails: Email[];
  loading: boolean;
  error: string | null;
  totalEmails: number;
  fromCache: boolean;
  refreshEmails: (forceRefresh?: boolean) => Promise<void>;
  getEmail: (id: string, sync?: boolean) => Promise<Email>;
  updateEmail: (email: Email) => void;
  removeEmail: (emailId: string) => void;
  addEmail: (email: Email) => void;
  moveEmail: (emailId: string, toFolder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam') => void;
  clearAllCache: () => void;
  searchEmails: (query: string) => Promise<void>;
  hasNewEmails: boolean;
  newEmailsCount: number;
  syncingEmails: boolean;
}

export function useEmailCache({
  folder,
  page = 1,
  pageSize = 50,
  initialLoad = true,
  syncInterval = 60000 // Default to checking every minute
}: UseEmailCacheProps): UseEmailCacheResult {
  const { data: session } = useSession();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState<boolean>(initialLoad);
  const [error, setError] = useState<string | null>(null);
  const [totalEmails, setTotalEmails] = useState<number>(0);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  const [hasNewEmails, setHasNewEmails] = useState<boolean>(false);
  const [newEmailsCount, setNewEmailsCount] = useState<number>(0);
  const [syncingEmails, setSyncingEmails] = useState<boolean>(false);
  
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

  // Fetch emails from cache or API
  const fetchEmails = useCallback(async (forceRefresh: boolean = false) => {
    if (!session?.user?.email || !cacheInitialized.current) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      const result = await getEmails(folder, page, pageSize, forceRefresh, searchQuery);
      
      setEmails(result.emails);
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
  }, [folder, page, pageSize, searchQuery, session?.user?.email]);

  // Check for new emails periodically
  const checkNewEmails = useCallback(async () => {
    if (!session?.user?.email || !cacheInitialized.current || searchQuery) {
      return;
    }
    
    try {
      setSyncingEmails(true);
      const result = await checkForNewEmails(folder);
      
      if (result.hasNewEmails) {
        setHasNewEmails(true);
        setNewEmailsCount(result.newCount);
        
        // If we're on the first page, update the email list
        if (page === 1) {
          const refreshedEmails = await getEmails(folder, page, pageSize, false, searchQuery, true);
          setEmails(refreshedEmails.emails);
          setTotalEmails(refreshedEmails.total);
        }
      }
    } catch (err) {
      console.error('Error checking for new emails:', err);
    } finally {
      setSyncingEmails(false);
    }
  }, [folder, page, pageSize, searchQuery, session?.user?.email]);

  // Set up interval to check for new emails
  useEffect(() => {
    if (!syncInterval || !session?.user?.email || searchQuery) {
      return;
    }
    
    const intervalId = setInterval(checkNewEmails, syncInterval);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [checkNewEmails, searchQuery, session?.user?.email, syncInterval]);

  // Fetch emails on mount and when dependencies change
  useEffect(() => {
    if (initialLoad && session?.user?.email && cacheInitialized.current) {
      fetchEmails();
    }
  }, [fetchEmails, initialLoad, session?.user?.email]);

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
    
    // Update local state if the email is in the current folder
    if (email.folder === folder) {
      setEmails(prevEmails => {
        const index = prevEmails.findIndex(e => String(e.id) === String(email.id));
        if (index !== -1) {
          const newEmails = [...prevEmails];
          newEmails[index] = email;
          return newEmails;
        }
        return prevEmails;
      });
    }
  }, [folder, session?.user?.email]);

  // Remove an email from the cache
  const removeEmail = useCallback((emailId: string): void => {
    if (!session?.user?.email || !cacheInitialized.current) {
      return;
    }
    
    removeEmailFromCache(emailId, folder);
    
    // Update local state
    setEmails(prevEmails => prevEmails.filter(e => String(e.id) !== emailId));
    setTotalEmails(prev => Math.max(0, prev - 1));
  }, [folder, session?.user?.email]);

  // Add an email to the cache
  const addEmail = useCallback((email: Email): void => {
    if (!session?.user?.email || !cacheInitialized.current) {
      return;
    }
    
    addEmailToCache(email, folder);
    
    // Update local state if the email belongs to the current folder
    if (email.folder === folder) {
      setEmails(prevEmails => [email, ...prevEmails]);
      setTotalEmails(prev => prev + 1);
    }
  }, [folder, session?.user?.email]);

  // Move an email to a different folder
  const moveEmail = useCallback((emailId: string, toFolder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam'): void => {
    if (!session?.user?.email || !cacheInitialized.current) {
      return;
    }
    
    moveEmailInCache(emailId, folder, toFolder);
    
    // Update local state
    setEmails(prevEmails => prevEmails.filter(e => String(e.id) !== emailId));
    setTotalEmails(prev => Math.max(0, prev - 1));
  }, [folder, session?.user?.email]);

  // Clear all cache
  const clearAllCache = useCallback((): void => {
    if (!session?.user?.email || !cacheInitialized.current) {
      return;
    }
    
    clearCache();
  }, [session?.user?.email]);

  // Search emails
  const searchEmails = useCallback(async (query: string): Promise<void> => {
    if (!session?.user?.email || !cacheInitialized.current) {
      return;
    }
    
    // Don't search if query is empty or the same as the current search
    if (!query.trim() || query === searchQuery) {
      return;
    }
    
    setSearchQuery(query || undefined);
    
    try {
      setLoading(true);
      setError(null);

      // Add a retry mechanism with a limit
      let retries = 0;
      const maxRetries = 2;
      let success = false;
      
      while (!success && retries < maxRetries) {
        try {
          const result = await getEmails(folder, 1, pageSize, true, query || undefined);
          
          setEmails(result.emails);
          setTotalEmails(result.total);
          setFromCache(result.fromCache);
          success = true;
        } catch (err) {
          retries++;
          if (retries >= maxRetries) {
            throw err;
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search emails');
      console.error('Error searching emails:', err);
      
      // Set empty results on error
      setEmails([]);
      setTotalEmails(0);
    } finally {
      setLoading(false);
    }
  }, [folder, pageSize, searchQuery, session?.user?.email]);

  return {
    emails,
    loading,
    error,
    totalEmails,
    fromCache,
    refreshEmails: fetchEmails,
    getEmail,
    updateEmail,
    removeEmail,
    addEmail,
    moveEmail,
    clearAllCache,
    searchEmails,
    hasNewEmails,
    newEmailsCount,
    syncingEmails
  };
} 