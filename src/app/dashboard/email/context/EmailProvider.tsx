'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';
import { Email } from '../types';
import { useEmailCache } from '../services/useEmailCache';

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
  totalEmails: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  fetchEmailById: (id: string, sync?: boolean) => Promise<Email>;
  refreshEmails: (forceRefresh?: boolean) => Promise<void>;
  updateEmail: (email: Email) => void;
  removeEmail: (emailId: string) => void;
  addEmail: (email: Email) => void;
  moveEmail: (emailId: string, toFolder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam') => void;
  searchEmails: (query: string) => Promise<void>;
  currentFolder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam';
  setCurrentFolder: (folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam') => void;
  hasNewEmails: boolean;
  newEmailsCount: number;
  syncingEmails: boolean;
  checkForNewEmails: () => Promise<void>;
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
  totalEmails: 0,
  currentPage: 1,
  setCurrentPage: () => {},
  searchQuery: '',
  setSearchQuery: () => {},
  fetchEmailById: async () => ({ id: 0, folder: 'inbox', from: '', fromName: '', to: '', subject: '', body: '', date: '', isRead: false, isStarred: false }),
  refreshEmails: async () => {},
  updateEmail: () => {},
  removeEmail: () => {},
  addEmail: () => {},
  moveEmail: () => {},
  searchEmails: async () => {},
  currentFolder: 'inbox',
  setCurrentFolder: () => {},
  hasNewEmails: false,
  newEmailsCount: 0,
  syncingEmails: false,
  checkForNewEmails: async () => {},
});

// Custom hook to use the email context
export const useEmailContext = () => useContext(EmailContext);

interface EmailProviderProps {
  children: ReactNode;
}

export const EmailProvider = ({ children }: EmailProviderProps) => {
  const [showCompose, setShowCompose] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState<'inbox' | 'sent' | 'draft' | 'trash' | 'spam'>('inbox');
  
  // Use the email cache hook
  const {
    emails,
    loading: isLoading,
    error,
    totalEmails,
    refreshEmails,
    getEmail: fetchEmailById,
    updateEmail,
    removeEmail,
    addEmail,
    moveEmail,
    searchEmails,
    hasNewEmails,
    newEmailsCount,
    syncingEmails
  } = useEmailCache({
    folder: currentFolder,
    page: currentPage,
    pageSize: 50,
    initialLoad: true,
    syncInterval: 60000 // Check for new emails every minute
  });

  // Function to set loading state (for compatibility with existing code)
  const setIsLoading = useCallback((loading: boolean) => {
    // This is a no-op since loading is now managed by the useEmailCache hook
    console.log('setIsLoading is deprecated, loading is now managed by useEmailCache');
  }, []);

  // Function to set error state (for compatibility with existing code)
  const setError = useCallback((newError: string | null) => {
    // This is a no-op since error is now managed by the useEmailCache hook
    console.log('setError is deprecated, error is now managed by useEmailCache');
  }, []);

  // Function to toggle compose visibility
  const handleSetShowCompose = (show: boolean) => {
    console.log('Setting showCompose to:', show);
    setShowCompose(show);
  };

  // Function to open compose modal
  const openComposeModal = () => {
    setShowCompose(true);
  };

  // Function to manually check for new emails
  const checkForNewEmails = useCallback(async () => {
    try {
      await refreshEmails(true); // Force refresh to check for new emails
    } catch (err) {
      console.error('Error checking for new emails:', err);
    }
  }, [refreshEmails]);

  // Effect to refresh emails when folder or page changes
  useEffect(() => {
    // Only refresh when folder or page changes, not on every render
    if (initialLoad.current) {
      initialLoad.current = false;
      refreshEmails(false).catch(err => {
        console.error('Error refreshing emails:', err);
      });
    }
  }, [currentFolder, currentPage, refreshEmails]);

  // Add a separate effect to handle folder changes
  useEffect(() => {
    // Reset initialLoad when folder changes
    initialLoad.current = true;
  }, [currentFolder]);

  // Add a ref to track initial load
  const initialLoad = useRef(true);

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
        totalEmails,
        currentPage,
        setCurrentPage,
        searchQuery,
        setSearchQuery,
        fetchEmailById,
        refreshEmails,
        updateEmail,
        removeEmail,
        addEmail,
        moveEmail,
        searchEmails,
        currentFolder,
        setCurrentFolder,
        hasNewEmails,
        newEmailsCount,
        syncingEmails,
        checkForNewEmails
      }}
    >
      {children}
    </EmailContext.Provider>
  );
};