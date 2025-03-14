'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Loader2, 
  Search, 
  RefreshCw, 
  Trash, 
  Send,
  Inbox,
  Bell
} from 'lucide-react';
import { Email } from '../types';
import { useEmailContext } from '../context/EmailProvider';

// Import components
import EmailListItem from './EmailListItem';
import EmailDetail from './EmailDetail';
import ComposeEmail from './ComposeEmail';
import SearchBar from './SearchBar';
import NewEmailsNotification from './NewEmailsNotification';
import SyncButton from './SyncButton';

interface EmailPageProps {
  folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam';
}

export default function EmailPage({ folder }: EmailPageProps) {
  const router = useRouter();
  
  // Use the shared context
  const { 
    paginatedEmails,
    allEmails,
    showCompose, 
    setShowCompose, 
    isLoading,
    setIsLoading,
    selectedEmail,
    setSelectedEmail,
    error,
    setError,
    totalEmails,
    currentPage,
    totalPages,
    itemsPerPage,
    setItemsPerPage,
    changePage,
    searchQuery,
    searchEmails,
    refreshEmails,
    fetchEmailById,
    updateEmail,
    removeEmail,
    addEmail,
    moveEmail,
    setCurrentFolder,
    hasNewEmails,
    newEmailsCount,
    syncingEmails,
    checkForNewEmails
  } = useEmailContext();
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialLoad = useRef(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [localShowCompose, setLocalShowCompose] = useState(false); // Local state for compose modal
  const [showNewEmailsNotification, setShowNewEmailsNotification] = useState(false);

  // Check for mobile view on mount and window resize
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobileView();
    
    // Add event listener
    window.addEventListener('resize', checkMobileView);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  // Set the current folder in the context when the component mounts or folder prop changes
  useEffect(() => {
    setCurrentFolder(folder);
  }, [folder, setCurrentFolder]);

  // Show notification when new emails are detected
  useEffect(() => {
    if (hasNewEmails) {
      setShowNewEmailsNotification(true);
      
      // Hide notification after 5 seconds
      const timer = setTimeout(() => {
        setShowNewEmailsNotification(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [hasNewEmails]);

  // Update loading state based on context
  useEffect(() => {
    setLoading(isLoading);
    
    // Mark initial load as complete once loading is done
    if (!isLoading && initialLoad.current) {
      initialLoad.current = false;
    }
  }, [isLoading]);

  // Handle search debounce
  const handleSearch = useCallback((query: string) => {
    searchEmails(query);
  }, [searchEmails]);

  // Handle email selection
  const handleSelectEmail = useCallback(async (emailId: string, isRead: boolean) => {
    try {
      setIsLoading(true);
      
      // If the email isn't already marked as read, mark it as read
      if (!isRead) {
        const email = await fetchEmailById(emailId);
        if (!email.isRead) {
          updateEmail({ ...email, isRead: true });
        }
      }
      
      setSelectedEmail(emailId);
    } catch (error) {
      console.error('Error selecting email:', error);
      setError('Failed to load email details');
    } finally {
      setIsLoading(false);
    }
  }, [fetchEmailById, setError, setIsLoading, setSelectedEmail, updateEmail]);

  // Handle email deletion
  const handleDeleteEmail = useCallback((emailId: string) => {
    // If the deleted email is currently selected, clear selection
    if (selectedEmail === emailId) {
      setSelectedEmail(null);
    }
    
    // Move to trash instead of permanent delete
    moveEmail(emailId, 'trash');
  }, [moveEmail, selectedEmail, setSelectedEmail]);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    changePage(page);
    // If an email is selected, clear selection when changing pages
    if (selectedEmail) {
      setSelectedEmail(null);
    }
  }, [changePage, selectedEmail, setSelectedEmail]);

  // Handle refresh button click
  const handleRefresh = useCallback(() => {
    // Clear selected email
    setSelectedEmail(null);
    
    // Refresh emails
    refreshEmails(true);
  }, [refreshEmails, setSelectedEmail]);

  // Handle changing items per page
  const handleItemsPerPageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setItemsPerPage(newSize);
  }, [setItemsPerPage]);

  // Handle email compose submission
  const handleComposeSubmit = useCallback(async (emailData: any) => {
    setIsSubmitting(true);
    
    try {
      // TODO: Add your email sending logic here
      const newEmail = {
        id: Date.now(), // Temporary ID
        folder: 'sent',
        from: 'me@example.com', // Replace with user email
        fromName: 'Me',
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        date: new Date().toISOString(),
        isRead: true,
        isStarred: false,
        attachments: []
      };
      
      // Add to sent folder
      addEmail({ ...newEmail } as Email);
      
      // Close compose modal
      setShowCompose(false);
      setLocalShowCompose(false);
      
      // Show success toast
      // toast.success('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
      setError('Failed to send email');
      
      // Show error toast
      // toast.error('Failed to send email');
    } finally {
      setIsSubmitting(false);
    }
  }, [addEmail, setError, setShowCompose]);

  // Render loading state
  if (loading && initialLoad.current) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading emails...</p>
        </div>
      </div>
    );
  }

  // Render the main component
  return (
    <div className="h-full flex flex-col">
      {/* Email header with search and controls */}
      <div className="border-b border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-xl font-semibold capitalize">
            {folder}
          </h1>
          
          <div className="flex-1 max-w-md">
            <SearchBar 
              value={searchQuery} 
              onChange={handleSearch} 
              placeholder="Search emails..." 
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <SyncButton 
              onClick={handleRefresh} 
              isSyncing={syncingEmails}
            />
            
            <button
              onClick={() => {
                setShowCompose(true);
                setLocalShowCompose(true);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-all duration-200"
            >
              Compose
            </button>
          </div>
        </div>
        
        {/* Pagination and filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <label htmlFor="itemsPerPage" className="mr-2 text-sm text-gray-600 dark:text-gray-400">
                Show:
              </label>
              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {totalEmails > 0
                ? `Showing ${Math.min((currentPage - 1) * itemsPerPage + 1, totalEmails)}-${Math.min(
                    currentPage * itemsPerPage,
                    totalEmails
                  )} of ${totalEmails}`
                : 'No emails found'}
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-1 rounded ${
                  currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <span className="mx-2 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-1 rounded ${
                  currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* New emails notification */}
      {showNewEmailsNotification && (
        <NewEmailsNotification 
          count={newEmailsCount} 
          onDismiss={() => setShowNewEmailsNotification(false)}
          onView={() => {
            handlePageChange(1);
            refreshEmails();
            setShowNewEmailsNotification(false);
          }}
        />
      )}
      
      {/* Email content area */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Email list */}
        <div className={`border-r border-gray-200 dark:border-gray-800 overflow-y-auto ${
          selectedEmail && isMobileView ? 'hidden' : selectedEmail ? 'md:w-1/3 w-full' : 'w-full'
        }`}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-200 p-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}
          
          {paginatedEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              {folder === 'inbox' && <Inbox className="h-16 w-16 mb-4 opacity-20" />}
              {folder === 'sent' && <Send className="h-16 w-16 mb-4 opacity-20" />}
              {folder === 'trash' && <Trash className="h-16 w-16 mb-4 opacity-20" />}
              {folder === 'spam' && <AlertCircle className="h-16 w-16 mb-4 opacity-20" />}
              {searchQuery ? (
                <>
                  <p>No emails match your search</p>
                  <button 
                    onClick={() => searchEmails('')}
                    className="mt-2 text-blue-500 hover:text-blue-700 text-sm"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <p>No emails in this folder</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedEmails.map((email) => (
                <EmailListItem
                  key={email.id}
                  email={email}
                  isSelected={selectedEmail === String(email.id)}
                  onSelect={() => handleSelectEmail(String(email.id), email.isRead)}
                  onDelete={() => handleDeleteEmail(String(email.id))}
                  onStarToggle={(starred) => {
                    updateEmail({ ...email, isStarred: starred });
                  }}
                />
              ))}
              
              {syncingEmails && (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing emails...
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Email detail view */}
        {selectedEmail && (
          <div className={`flex-1 overflow-y-auto ${isMobileView ? 'w-full' : 'md:flex-1'}`}>
            <EmailDetail
              emailId={selectedEmail}
              onBack={() => setSelectedEmail(null)}
              onDelete={() => handleDeleteEmail(selectedEmail)}
              isMobileView={isMobileView}
            />
          </div>
        )}
      </div>
      
      {/* Compose email modal */}
      {(showCompose || localShowCompose) && (
        <ComposeEmail
          onClose={() => {
            setShowCompose(false);
            setLocalShowCompose(false);
          }}
          onSubmit={handleComposeSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
} 