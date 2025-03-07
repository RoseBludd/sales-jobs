'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Inbox
} from 'lucide-react';
import { Email } from '../types';
import { useEmailContext } from '../context/EmailProvider';

// Import components
import EmailListItem from './EmailListItem';
import EmailDetail from './EmailDetail';
import ComposeEmail from './ComposeEmail';
import SearchBar from './SearchBar';

interface EmailPageProps {
  folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam';
}

export default function EmailPage({ folder }: EmailPageProps) {
  const router = useRouter();
  const currentFolder = folder;
  
  // Use the shared context
  const { 
    emails,
    showCompose, 
    setShowCompose, 
    setIsLoading,
    nextCursor,
    setNextCursor,
    hasMore,
    setHasMore
  } = useEmailContext();
  
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [perPage] = useState(10); // Number of emails per page
  const [localShowCompose, setLocalShowCompose] = useState(false); // Local state for compose modal

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

  // Memoized fetchEmails function to prevent unnecessary re-renders
  const fetchEmails = useCallback(async (page: number = 1, resetCursor: boolean = false) => {
    if (page < 1) return;
    
    try {
      setLoading(true);
      setIsLoading(true);
      setError('');
      
      // Convert folder name to match API expectations
      const apiFolder = currentFolder.toUpperCase();
      
      // Reset cursor when changing pages backward or when explicitly requested
      const cursor = (resetCursor || page === 1) ? null : nextCursor;
      
      console.log(`Fetching emails: folder=${apiFolder}, page=${page}, perPage=${perPage}, query=${searchQuery || 'none'}, cursor=${cursor || 'none'}`);
      
      // Make API call to fetch emails using the updated API endpoint with cursor-based pagination
      const url = `/api/email?folder=${apiFolder}&page=${page}&limit=${perPage}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`;
      console.log(`API URL: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText || 'Unknown error' };
        }
        
        // Check if errorData is empty object and provide a default message
        if (errorData && Object.keys(errorData).length === 0) {
          errorData = { error: `Server returned ${response.status} ${response.statusText}` };
        }
        
        throw new Error(errorData.error || 'Failed to fetch emails');
      }
      
      const data = await response.json();
      console.log(`Received ${data.emails?.length || 0} emails (page ${data.page} of ${data.pages || data.totalPages})`);
      
      // Store the next cursor for pagination
      setNextCursor(data.next_cursor || null);
      setHasMore(data.has_more || false);
      
      // Transform API response to match our Email interface
      const transformedEmails: Email[] = data.emails || [];
      
      // Dispatch event to update context
      const event = new CustomEvent('emailsUpdated', {
        detail: { emails: transformedEmails }
      });
      window.dispatchEvent(event);
      
      setFilteredEmails(transformedEmails);
      
      // Update pagination information from response
      setCurrentPage(data.page || page);
      setTotalPages(data.pages || data.totalPages || 1);
      setTotalEmails(data.total || 0);
      
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError(err instanceof Error ? err.message : 'Failed to load emails. Please try again later.');
      
      // Dispatch event to update context even on error
      const event = new CustomEvent('emailsUpdated', {
        detail: { emails: [] }
      });
      window.dispatchEvent(event);
    } finally {
      setLoading(false);
      setIsLoading(false);
      setInitialLoad(false);
    }
  }, [currentFolder, perPage, searchQuery, setIsLoading, nextCursor, setNextCursor, setHasMore]);

  // Fetch emails when currentFolder changes
  useEffect(() => {
    console.log(`Folder changed to: ${currentFolder}`);
    // Reset page to 1 and fetch emails when folder changes
    setCurrentPage(1);
    setNextCursor(null);
    fetchEmails(1, true);
  }, [currentFolder, fetchEmails, setNextCursor]);

  // Apply search filter
  useEffect(() => {
    if (searchQuery.trim() === '') {
      // Just refresh the current page when search is cleared
      fetchEmails(currentPage, true);
    } else {
      // Always go to page 1 for new searches
      setCurrentPage(1);
      setNextCursor(null);
      fetchEmails(1, true);
    }
  }, [searchQuery, fetchEmails, currentPage, setNextCursor]);
  
  // Listen for showComposeModal event
  useEffect(() => {
    const handleShowComposeModal = () => {
      console.log('showComposeModal event received in EmailPage');
      setShowCompose(true);
      setLocalShowCompose(true);
    };
    
    window.addEventListener('showComposeModal', handleShowComposeModal);
    
    return () => {
      window.removeEventListener('showComposeModal', handleShowComposeModal);
    };
  }, [setShowCompose]);
  
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    
    // For cursor-based pagination, we can only go forward with the cursor
    // Going backward requires resetting to page 1 and navigating forward
    if (newPage < currentPage) {
      setCurrentPage(1);
      fetchEmails(1, true);
      return;
    }
    
    console.log(`Changing to page ${newPage}`);
    setCurrentPage(newPage);
    fetchEmails(newPage);
    
    // Scroll to top of email list
    const emailListElement = document.getElementById('email-list');
    if (emailListElement) {
      emailListElement.scrollTop = 0;
    }
  };
  
  const handleEmailSelect = async (email: Email) => {
    try {
      setSelectedEmail(email);
      
      // If email is not read, mark it as read
      if (!email.isRead && email.itemId) {
        const response = await fetch('/api/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'markAsRead',
            itemId: email.itemId,
            folder: currentFolder.toUpperCase()
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { error: errorText || 'Unknown error' };
          }
          
          // Check if errorData is empty object and provide a default message
          if (errorData && Object.keys(errorData).length === 0) {
            errorData = { error: `Server returned ${response.status} ${response.statusText}` };
          }
          
          console.error('Error marking email as read:', errorData);
          // Don't throw here, just log the error and continue
          // This prevents the "Not Found" error from breaking the UI
        } else {
          // Update filtered emails
          setFilteredEmails(prevEmails => 
            prevEmails.map(e => e.id === email.id ? { ...e, isRead: true } : e)
          );
          
          // Update the selected email
          setSelectedEmail({ ...email, isRead: true });
          
          // Dispatch event to update emails in context
          const updatedEmails = emails.map(e => 
            e.id === email.id ? { ...e, isRead: true } : e
          );
          
          const event = new CustomEvent('emailsUpdated', {
            detail: { emails: updatedEmails }
          });
          window.dispatchEvent(event);
        }
      }
    } catch (err) {
      console.error('Error handling email selection:', err);
      // Don't set error state here to prevent UI disruption
    }
  };
  
  const handleDeleteEmail = async (email: Email) => {
    try {
      if (!email.itemId) {
        throw new Error('Email ID is missing');
      }
      
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          itemId: email.itemId,
          folder: currentFolder.toUpperCase()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete email');
      }
      
      // Update UI to remove the deleted email
      setFilteredEmails(prevEmails => prevEmails.filter(e => e.id !== email.id));
      
      // If the deleted email was selected, clear selection
      if (selectedEmail && selectedEmail.id === email.id) {
        setSelectedEmail(null);
      }
      
      // Refetch emails to update pagination if needed
      fetchEmails(currentPage);
      
    } catch (err) {
      console.error('Error deleting email:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete email');
    }
  };
  
  const handleMoveEmail = async (email: Email, toFolder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam') => {
    try {
      if (!email.itemId) {
        throw new Error('Email ID is missing');
      }
      
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'move',
          itemId: email.itemId,
          fromFolder: currentFolder.toUpperCase(),
          toFolder: toFolder.toUpperCase()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move email');
      }
      
      // Update UI to remove the moved email if still in the same folder
      setFilteredEmails(prevEmails => prevEmails.filter(e => e.id !== email.id));
      
      // If the moved email was selected, clear selection
      if (selectedEmail && selectedEmail.id === email.id) {
        setSelectedEmail(null);
      }
      
      // Refetch emails to update pagination
      fetchEmails(currentPage);
      
    } catch (err) {
      console.error('Error moving email:', err);
      alert(err instanceof Error ? err.message : 'Failed to move email');
    }
  };
  
  const handleSendEmail = async (to: string, subject: string, body: string): Promise<boolean> => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send',
          subject,
          body,
          to: to.split(',').map(email => email.trim()),
          body_type: 'HTML'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }
      
      // Close compose window and refresh emails
      setShowCompose(false);
      
      // If we're in the sent folder, refresh to show the new email
      if (currentFolder === 'sent') {
        fetchEmails(1, true);
      }
      
      return true;
    } catch (err) {
      console.error('Error sending email:', err);
      alert(err instanceof Error ? err.message : 'Failed to send email');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };
  
  const handleRetry = () => {
    fetchEmails(currentPage, true);
  };
  
  const handleComposeClick = () => {
    console.log('handleComposeClick called');
    setLocalShowCompose(true);
  };

  // Render pagination controls
  const renderPagination = () => {
    if (totalEmails === 0) return null;
    
    // For cursor-based pagination, we can only go forward or back to the beginning
    return (
      <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {loading ? (
              <span className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </span>
            ) : (
              `Showing ${filteredEmails.length} of ${totalEmails} emails`
            )}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1 || loading}
            className={`p-2 rounded-md ${
              currentPage === 1 || loading
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
            aria-label="First page"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="sr-only">First page</span>
          </button>
          
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Page {currentPage} {totalPages > 0 ? `of ${totalPages}` : ''}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!hasMore || loading}
            className={`p-2 rounded-md ${
              !hasMore || loading
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
            <span className="sr-only">Next page</span>
          </button>
        </div>
      </div>
    );
  };

  if (initialLoad) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading your emails...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Current folder and search */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold capitalize text-gray-900 dark:text-gray-200">{currentFolder}</h1>
          <p className="ml-2 text-sm text-gray-500">
            {loading ? 'Loading...' : `${totalEmails} emails`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <SearchBar onSearch={handleSearch} />
        </div>
      </div>
      
      {/* Email content area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Main content with email list and detail view */}
        <div className="flex-1 overflow-hidden flex">
          {/* Email list */}
          <div className={`${selectedEmail ? 'hidden md:block md:w-1/3 lg:w-2/5' : 'w-full'} h-full overflow-y-auto border-r border-gray-200`} id="email-list">
            {error && (
              <div className="p-4 bg-red-100 text-red-800 flex items-center">
                <AlertCircle size={18} className="mr-2" />
                <p>{error}</p>
                <button 
                  className="ml-auto text-sm text-blue-600 hover:underline"
                  onClick={handleRetry}
                >
                  Retry
                </button>
              </div>
            )}
            
            {loading && (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={24} className="animate-spin text-blue-500" />
              </div>
            )}
            
            {!loading && filteredEmails.length === 0 && !error ? (
              <div className="p-8 text-center text-gray-500">
                <p>No emails found in this folder.</p>
              </div>
            ) : (
              <ul>
                {filteredEmails.map(email => (
                  <EmailListItem 
                    key={email.id} 
                    email={email} 
                    isSelected={selectedEmail?.id === email.id}
                    onClick={() => handleEmailSelect(email)}
                    onDelete={() => handleDeleteEmail(email)}
                    onMove={(toFolder) => handleMoveEmail(email, toFolder)}
                  />
                ))}
              </ul>
            )}
          </div>
          
          {/* Email detail view */}
          {selectedEmail ? (
            <div className="w-full md:w-2/3 lg:w-3/5 h-full overflow-y-auto">
              <EmailDetail 
                email={selectedEmail}
                onBack={() => setSelectedEmail(null)}
                onDelete={() => handleDeleteEmail(selectedEmail)}
                onMove={(toFolder) => handleMoveEmail(selectedEmail, toFolder)}
                isMobileView={isMobileView}
                currentFolder={currentFolder}
              />
            </div>
          ) : (
            <div className="hidden md:flex md:flex-col md:justify-center md:items-center h-full w-full md:w-2/3 lg:w-3/5">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Inbox className="h-16 w-16 mb-4 opacity-50 mx-auto" />
                <p className="text-lg">Select an email to view</p>
                <p className="text-sm mt-2">No email selected</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Pagination - moved outside the scrollable area */}
        <div className="p-4 border-t border-gray-200 bg-white dark:bg-gray-800 sticky bottom-0 z-10 shadow-md">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500 order-2 sm:order-1">
              Showing {filteredEmails.length > 0 ? `${((currentPage - 1) * 10) + 1}-${Math.min(currentPage * 10, totalEmails)}` : '0'} of {totalEmails} {totalEmails === 1 ? 'email' : 'emails'}
            </div>
            
            <div className="flex items-center space-x-1 order-1 sm:order-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1 || loading || totalPages <= 1}
                className={`p-2 rounded-md flex items-center justify-center ${
                  currentPage === 1 || loading || totalPages <= 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
                aria-label="First page"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="11 17 6 12 11 7"></polyline>
                  <polyline points="18 17 13 12 18 7"></polyline>
                </svg>
              </button>
              
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading || totalPages <= 1}
                className={`p-2 rounded-md flex items-center justify-center ${
                  currentPage === 1 || loading || totalPages <= 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              
              {/* Page numbers */}
              <div className="hidden sm:flex items-center">
                {totalPages > 0 && Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  // Calculate which page numbers to show
                  let pageNum;
                  if (totalPages <= 5) {
                    // If 5 or fewer pages, show all
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    // If near the start, show first 5 pages
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    // If near the end, show last 5 pages
                    pageNum = totalPages - 4 + i;
                  } else {
                    // Otherwise show current page and 2 on each side
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={loading || totalPages <= 1}
                      className={`w-8 h-8 flex items-center justify-center rounded-md mx-1 ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-blue-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              {/* Mobile page indicator */}
              <div className="sm:hidden px-2 text-sm">
                {currentPage} / {Math.max(1, totalPages)}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading || totalPages <= 1}
                className={`p-2 rounded-md flex items-center justify-center ${
                  currentPage === totalPages || loading || totalPages <= 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
              
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages || loading || totalPages <= 1}
                className={`p-2 rounded-md flex items-center justify-center ${
                  currentPage === totalPages || loading || totalPages <= 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
                aria-label="Last page"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="13 17 18 12 13 7"></polyline>
                  <polyline points="6 17 11 12 6 7"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Compose email modal */}
      {/* Debug log for showCompose state */}
      {(() => { console.log('showCompose state in EmailPage:', showCompose, 'localShowCompose:', localShowCompose); return null; })()}
      {(showCompose || localShowCompose) && (
        <ComposeEmail 
          onClose={() => {
            console.log('Closing compose modal');
            setShowCompose(false);
            setLocalShowCompose(false);
          }}
          onSend={handleSendEmail}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
} 