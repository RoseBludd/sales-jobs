/**
 * Email Context Provider
 * This component provides a central state management for emails 
 * and related functionality to all email components.
 */

"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Email } from '../types';
import useDbEmailCache from '../services/useDbEmailCache';
import { useSession } from 'next-auth/react';

// Define the context interface
interface EmailContextType {
  // Email data
  allEmails: Email[];
  filteredEmails: Email[];
  paginatedEmails: Email[];
  totalEmails: number;
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  
  // Selected email and compose state
  selectedEmail: Email | null;
  showCompose: boolean;
  setShowCompose: (show: boolean) => void;
  composeEmailData: Partial<Email> | null;
  lastSynced: Date | null;
  
  // Folder and UI state
  currentFolder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam';
  setCurrentFolder: (folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam') => void;
  
  // Search and pagination
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
  totalPages: number;
  changePage: (page: number) => void;
  
  // Email notifications
  hasNewEmails: boolean;
  newEmailsCount: number;
  syncingEmails: boolean;
  
  // Actions
  refreshEmails: (forceRefresh?: boolean) => Promise<void>;
  checkForNewEmails: () => Promise<{hasNewEmails: boolean; newCount: number}>;
  fetchEmailById: (id: string, forceRefresh?: boolean) => Promise<Email>;
  setSelectedEmail: (email: Email | null) => void;
  handleSetShowCompose: (show: boolean, emailData?: Partial<Email>) => void;
  updateEmail: (email: Email) => void;
  removeEmail: (emailId: string) => void;
  addEmail: (email: Email) => void;
  moveEmail: (emailId: string, toFolder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam') => Promise<void>;
  searchEmails: (query: string) => void;
}

// Create context with default values
const EmailContext = createContext<EmailContextType>({
  // Default values would go here, but we're using a non-null assertion in the provider
  allEmails: [],
  filteredEmails: [],
  paginatedEmails: [],
  totalEmails: 0,
  isLoading: true,
  error: null,
  setError: () => {},
  selectedEmail: null,
  showCompose: false,
  setShowCompose: () => {},
  composeEmailData: null,
  lastSynced: null,
  currentFolder: 'inbox',
  setCurrentFolder: () => {},
  searchQuery: '',
  setSearchQuery: () => {},
  currentPage: 1,
  setCurrentPage: () => {},
  itemsPerPage: 10,
  setItemsPerPage: () => {},
  totalPages: 0,
  changePage: () => {},
  hasNewEmails: false,
  newEmailsCount: 0,
  syncingEmails: false,
  refreshEmails: async () => {},
  checkForNewEmails: async () => ({ hasNewEmails: false, newCount: 0 }),
  fetchEmailById: async () => ({} as Email),
  setSelectedEmail: () => {},
  handleSetShowCompose: () => {},
  updateEmail: () => {},
  removeEmail: () => {},
  addEmail: () => {},
  moveEmail: async () => {},
  searchEmails: () => {}
});

// Define Provider component
export const EmailProvider = ({ children }: { children: React.ReactNode }) => {
  // Track selected email and compose state
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showCompose, setShowCompose] = useState<boolean>(false);
  const [composeEmailData, setComposeEmailData] = useState<Partial<Email> | null>(null);
  const [currentFolder, setCurrentFolder] = useState<'inbox' | 'sent' | 'draft' | 'trash' | 'spam'>('inbox');
  // Add missing error state
  const [localError, setLocalError] = useState<string | null>(null);
  
  // Use our email cache hook
  const {
    allEmails,
    filteredEmails,
    paginatedEmails,
    totalEmails,
    loading: isLoading,
    error,
    lastSynced,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    fetchEmails: refreshEmails,
    fetchEmailById,
    checkNewEmails: checkForNewEmails,
    updateEmail,
    removeEmail,
    addEmail,
    moveEmail
  } = useDbEmailCache(currentFolder);
  
  // Calculate total pages
  const totalPages = Math.ceil(totalEmails / itemsPerPage) || 1;
  
  // Function to change page with validation
  const changePage = useCallback((page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  }, [totalPages, setCurrentPage]);
  
  // Search emails function
  const searchEmails = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  }, [setSearchQuery, setCurrentPage]);
  
  // Map error from hook to local error state
  useEffect(() => {
    if (error) {
      setLocalError(error instanceof Error ? error.message : String(error));
    }
  }, [error]);
  
  // Set error function
  const setError = useCallback((errorMessage: string | null) => {
    setLocalError(errorMessage);
  }, []);

  // Handle setting compose state
  const handleSetShowCompose = useCallback((show: boolean, emailData?: Partial<Email>) => {
    setShowCompose(show);
    setComposeEmailData(emailData || null);
  }, []);
  
  // Open compose modal with pre-filled data
  const openComposeModal = useCallback((emailData?: Partial<Email>) => {
    handleSetShowCompose(true, emailData);
  }, [handleSetShowCompose]);
  
  // Check for new emails periodically
  useEffect(() => {
    // Check for new emails every 2 minutes
    const interval = setInterval(() => {
      checkForNewEmails().then(({ hasNewEmails, newCount }) => {
        if (hasNewEmails) {
          console.log(`Found ${newCount} new emails`);
        }
      });
    }, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [checkForNewEmails, currentFolder]);
  
  // Log any errors
  useEffect(() => {
    if (localError) {
      console.error('Email error:', localError);
    }
  }, [localError]);
  
  // Simulate new email notifications for now
  const [hasNewEmails, setHasNewEmails] = useState(false);
  const [newEmailsCount, setNewEmailsCount] = useState(0);
  const [syncingEmails, setSyncingEmails] = useState(false);
  
  // The context value
  const contextValue: EmailContextType = {
    allEmails,
    filteredEmails,
    paginatedEmails,
    totalEmails,
    isLoading,
    error: localError,
    setError,
    selectedEmail,
    showCompose,
    setShowCompose,
    composeEmailData,
    lastSynced,
    currentFolder,
    setCurrentFolder,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    changePage,
    hasNewEmails,
    newEmailsCount,
    syncingEmails,
    refreshEmails,
    checkForNewEmails,
    fetchEmailById,
    setSelectedEmail,
    handleSetShowCompose,
    updateEmail,
    removeEmail,
    addEmail,
    moveEmail,
    searchEmails
  };
  
  return (
    <EmailContext.Provider value={contextValue}>
      {children}
    </EmailContext.Provider>
  );
};

// Hook for using the email context
export const useEmailContext = () => useContext(EmailContext);