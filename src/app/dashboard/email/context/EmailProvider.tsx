'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Email } from '../types';
import { useEmailCache } from '../services/useEmailCache';
import { getCurrentUserId } from '../services/auth';

interface EmailUpdateEvent extends CustomEvent {
  detail: {
    emails: Email[];
  };
}

// Create the email context
export const EmailContext = createContext<{
  emails: Email[];
  showCompose: boolean;
  setShowCompose: (show: boolean) => void;
  openComposeModal: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  selectedEmail: Email | null;
  setSelectedEmail: (email: Email | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
  totalPages: number;
  setTotalPages: (pages: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  fetchEmailById: (folder: string, emailId: number) => Promise<Email | null>;
  invalidateCache: (folder: string) => void;
  nextCursor: string | null;
  setNextCursor: (cursor: string | null) => void;
  hasMore: boolean;
  setHasMore: (hasMore: boolean) => void;
}>({
  emails: [],
  showCompose: false,
  setShowCompose: () => {},
  openComposeModal: () => {},
  isLoading: false,
  setIsLoading: () => {},
  selectedEmail: null,
  setSelectedEmail: () => {},
  error: null,
  setError: () => {},
  totalPages: 1,
  setTotalPages: () => {},
  currentPage: 1,
  setCurrentPage: () => {},
  searchQuery: '',
  setSearchQuery: () => {},
  fetchEmailById: async () => null,
  invalidateCache: () => {},
  nextCursor: null,
  setNextCursor: () => {},
  hasMore: false,
  setHasMore: () => {},
});

// Custom hook to use the email context
export const useEmailContext = () => useContext(EmailContext);

interface EmailProviderProps {
  children: ReactNode;
}

export const EmailProvider = ({ children }: EmailProviderProps) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [userId, setUserId] = useState<string>('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const emailCache = useEmailCache(userId);

  // Get the current user ID
  useEffect(() => {
    const getUserId = async () => {
      const id = await getCurrentUserId();
      setUserId(id);
    };
    
    getUserId();
  }, []);

  // Function to toggle compose visibility
  const handleSetShowCompose = (show: boolean) => {
    console.log('Setting showCompose to:', show);
    setShowCompose(show);
  };

  // Function to open compose modal
  const openComposeModal = useCallback(() => {
    console.log('openComposeModal called in context');
    setShowCompose(true);
  }, []);

  // Function to handle rate limiting
  const handleRateLimitedResponse = useCallback(async (response: Response): Promise<boolean> => {
    if (response.status !== 429) {
      return false;
    }
    
    // Get retry-after header if available
    const retryAfter = response.headers.get('Retry-After');
    const resetTime = response.headers.get('X-RateLimit-Reset');
    
    let waitTime = 5000; // Default 5 seconds
    
    if (retryAfter) {
      // Retry-After is in seconds
      waitTime = parseInt(retryAfter, 10) * 1000;
    } else if (resetTime) {
      // X-RateLimit-Reset is in Unix timestamp (seconds)
      const resetTimeMs = parseInt(resetTime, 10) * 1000;
      waitTime = Math.max(1000, resetTimeMs - Date.now());
    }
    
    // Cap wait time at 30 seconds
    waitTime = Math.min(waitTime, 30000);
    
    console.log(`Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)} seconds before retrying.`);
    
    // Wait for the specified time
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    return true;
  }, []);

  // Function to fetch a specific email by ID
  const fetchEmailById = useCallback(async (folder: string, emailId: number): Promise<Email | null> => {
    // First, try to get the email from cache
    if (userId) {
      const cachedEmail = emailCache.getEmailById(folder, emailId);
      if (cachedEmail) {
        console.log('Email found in cache:', cachedEmail.id, cachedEmail.subject);
        return cachedEmail;
      }
    }

    // If not in cache, fetch from API with retry logic
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/email/${emailId}?folder=${folder}`);
        
        // Handle rate limiting
        if (await handleRateLimitedResponse(response)) {
          continue; // Retry after waiting
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch email: ${response.statusText}`);
        }
        
        const email = await response.json();
        
        // Update the cache with this email
        if (userId) {
          emailCache.updateEmail(folder, email);
        }
        
        return email;
      } catch (err) {
        console.error('Error fetching email by ID:', err);
        
        if (retries >= maxRetries - 1) {
          setError(err instanceof Error ? err.message : 'Failed to fetch email');
          return null;
        }
        
        retries++;
        const delay = 1000 * Math.pow(2, retries);
        console.log(`Retrying in ${delay}ms (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } finally {
        setIsLoading(false);
      }
    }
    
    return null;
  }, [emailCache, setError, setIsLoading, userId, handleRateLimitedResponse]);

  // Function to invalidate cache for a folder
  const invalidateCache = useCallback((folder: string) => {
    if (userId) {
      emailCache.clearCache(folder);
    }
  }, [emailCache, userId]);

  // Subscribe to emails updates
  useEffect(() => {
    const handleEmailUpdate = (event: EmailUpdateEvent) => {
      setEmails(event.detail.emails);
      setIsLoading(false);
    };
    
    window.addEventListener('emailsUpdated', handleEmailUpdate as EventListener);
    
    // Add listener for showComposeModal event
    const handleShowComposeModal = () => {
      console.log('showComposeModal event received');
      setShowCompose(true);
    };
    
    window.addEventListener('showComposeModal', handleShowComposeModal);
    
    return () => {
      window.removeEventListener('emailsUpdated', handleEmailUpdate as EventListener);
      window.removeEventListener('showComposeModal', handleShowComposeModal);
    };
  }, []);

  return (
    <EmailContext.Provider
      value={{
        emails,
        showCompose,
        setShowCompose: handleSetShowCompose,
        openComposeModal,
        isLoading,
        setIsLoading,
        selectedEmail,
        setSelectedEmail,
        error,
        setError,
        totalPages,
        setTotalPages,
        currentPage,
        setCurrentPage,
        searchQuery,
        setSearchQuery,
        fetchEmailById,
        invalidateCache,
        nextCursor,
        setNextCursor,
        hasMore,
        setHasMore,
      }}
    >
      {children}
    </EmailContext.Provider>
  );
};