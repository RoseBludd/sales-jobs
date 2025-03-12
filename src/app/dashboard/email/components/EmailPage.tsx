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
    emails,
    showCompose, 
    setShowCompose, 
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
    refreshEmails,
    fetchEmailById,
    updateEmail,
    removeEmail,
    addEmail,
    moveEmail,
    searchEmails,
    setCurrentFolder,
    hasNewEmails,
    newEmailsCount,
    syncingEmails,
    checkForNewEmails
  } = useEmailContext();
  
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialLoad = useRef(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [perPage] = useState(10); // Number of emails per page
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
  }, [hasNewEmails, newEmailsCount]);

  // Memoized fetchEmails function to prevent unnecessary re-renders
  const fetchEmails = useCallback(async (page: number = 1, forceRefresh: boolean = false) => {
    if (page < 1) return;
    
    try {
      setLoading(true);
      setIsLoading(true);
      
      // Set the current page in the context
      setCurrentPage(page);
      
      // The actual email fetching is now handled by the context
      await refreshEmails(forceRefresh);
      
      // Calculate total pages based on total emails and per page
      setTotalPages(Math.ceil(totalEmails / perPage));
      
      // Hide new emails notification after refresh
      setShowNewEmailsNotification(false);
      
    } catch (err) {
      console.error('Error fetching emails:', err);
    } finally {
      setLoading(false);
      setIsLoading(false);
      initialLoad.current = false;
    }
  }, [refreshEmails, setCurrentPage, setIsLoading, totalEmails, perPage]);

  // Fetch emails when component mounts
  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
      fetchEmails(1, true);
    }
  }, [fetchEmails]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    
    fetchEmails(newPage);
  };

  // Handle email selection
  const handleEmailSelect = async (email: Email) => {
    try {
      setLoading(true);
      
      // If the email is already selected, deselect it
      if (selectedEmail && selectedEmail.id === email.id) {
        setSelectedEmail(null);
        return;
      }
      
      console.log(`Selecting email with ID: ${email.id}`);
      
      // Get the full email details
      try {
        const fullEmail = await fetchEmailById(String(email.id));
        
        console.log('Fetched full email details:', {
          id: fullEmail.id,
          subject: fullEmail.subject,
          bodyLength: fullEmail.body ? fullEmail.body.length : 0,
          bodyPreview: fullEmail.body ? fullEmail.body.substring(0, 50) + '...' : 'No body'
        });
        
        // Mark as read if not already
        if (!fullEmail.isRead) {
          const updatedEmail = { ...fullEmail, isRead: true };
          updateEmail(updatedEmail);
        }
        
        // Set as selected email
        setSelectedEmail(fullEmail);
      } catch (fetchError) {
        console.error('Error fetching email details:', fetchError);
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch email details');
        
        // Still select the email with limited details
        setSelectedEmail({
          ...email,
          body: 'Error loading email content. Please try again.'
        });
      }
    } catch (err) {
      console.error('Error selecting email:', err);
      setError(err instanceof Error ? err.message : 'Failed to select email');
    } finally {
      setLoading(false);
    }
  };

  // Handle manual sync
  const handleSync = async () => {
    try {
      await checkForNewEmails();
    } catch (err) {
      console.error('Error syncing emails:', err);
    }
  };

  // Handle email deletion
  const handleDeleteEmail = async (email: Email) => {
    try {
      setIsSubmitting(true);
      
      // If this is already in the trash, permanently delete it
      if (folder === 'trash') {
        // Call the API to permanently delete the email
        const response = await fetch(`/api/emails/${email.id}?hardDelete=true`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete email');
        }
        
        // Remove from context
        removeEmail(String(email.id));
        
        // If this was the selected email, deselect it
        if (selectedEmail && selectedEmail.id === email.id) {
          setSelectedEmail(null);
        }
      } else {
        // Move to trash
        await moveEmail(String(email.id), 'trash');
        
        // If this was the selected email, deselect it
        if (selectedEmail && selectedEmail.id === email.id) {
          setSelectedEmail(null);
        }
      }
    } catch (err) {
      console.error('Error deleting email:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete email');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle moving email to a different folder
  const handleMoveEmail = async (email: Email, toFolder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam') => {
    try {
      setIsSubmitting(true);
      
      // Move the email using the context
      await moveEmail(String(email.id), toFolder);
      
      // If this was the selected email, deselect it
      if (selectedEmail && selectedEmail.id === email.id) {
        setSelectedEmail(null);
      }
    } catch (err) {
      console.error('Error moving email:', err);
      setError(err instanceof Error ? err.message : 'Failed to move email');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle sending a new email
  const handleSendEmail = async (to: string, subject: string, body: string): Promise<boolean> => {
    try {
      setIsSubmitting(true);
      
      // Call the API to send the email
      const response = await fetch('/api/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: to.split(/[,;]/).map(email => email.trim()).filter(Boolean),
          subject,
          body
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Create a new email object for the sent email
        const sentEmail: Email = {
          id: result.emailId || Math.random(),
          folder: 'sent',
          from: 'me@example.com', // This will be replaced by the actual sender
          fromName: 'Me',
          to,
          subject,
          body,
          date: new Date().toISOString(),
          isRead: true,
          isStarred: false
        };
        
        // Add to context
        addEmail(sentEmail);
        
        // Close compose modal
        setShowCompose(false);
        
        return true;
      } else {
        throw new Error(result.message || 'Failed to send email');
      }
    } catch (err) {
      console.error('Error sending email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send email');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (query.trim()) {
      searchEmails(query);
    } else {
      // If search query is empty, refresh emails
      fetchEmails(1, true);
    }
  };

  // Handle retry
  const handleRetry = () => {
    fetchEmails(currentPage, true);
  };

  // Handle compose click
  const handleComposeClick = () => {
    setShowCompose(true);
  };

  // Render pagination
  const renderPagination = () => {
    return (
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`px-3 py-1 rounded ${
            currentPage <= 1
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`px-3 py-1 rounded ${
            currentPage >= totalPages
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  };

  // Render the email list
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-semibold capitalize">
          {folder === 'inbox' ? (
            <div className="flex items-center">
              <Inbox className="h-5 w-5 mr-2" />
              Inbox
            </div>
          ) : (
            folder
          )}
        </h1>
        
        <div className="flex items-center space-x-2">
          {/* Sync button */}
          <SyncButton onSync={handleSync} isSyncing={syncingEmails} />
          
          {/* Search bar */}
          <SearchBar onSearch={handleSearch} />
          
          {/* Compose button */}
          <button
            onClick={handleComposeClick}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Compose
          </button>
        </div>
      </div>
      
      {/* New emails notification */}
      <NewEmailsNotification 
        count={newEmailsCount}
        onRefresh={() => fetchEmails(1, true)}
        visible={showNewEmailsNotification}
      />
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
          <button
            onClick={handleRetry}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm"
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}
      
      {/* Email content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Email list */}
        <div className={`${selectedEmail && !isMobileView ? 'w-1/3' : 'w-full'} overflow-y-auto border-r`}>
          {emails.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-gray-500">No emails found</p>
            </div>
          ) : (
            <div>
              {emails.map((email) => (
                <EmailListItem
                  key={email.id}
                  email={email}
                  isSelected={selectedEmail?.id === email.id}
                  onSelect={() => handleEmailSelect(email)}
                  onDelete={() => handleDeleteEmail(email)}
                  onMove={(toFolder) => handleMoveEmail(email, toFolder)}
                />
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {emails.length > 0 && renderPagination()}
        </div>
        
        {/* Email detail */}
        {selectedEmail && (
          <div className={`${isMobileView ? 'w-full absolute inset-0 bg-white z-10' : 'w-2/3'} overflow-y-auto`}>
            <EmailDetail
              email={selectedEmail}
              onClose={() => setSelectedEmail(null)}
              onDelete={() => selectedEmail && handleDeleteEmail(selectedEmail)}
              onMove={(toFolder) => selectedEmail && handleMoveEmail(selectedEmail, toFolder)}
            />
          </div>
        )}
      </div>
      
      {/* Compose modal */}
      {showCompose && (
        <ComposeEmail
          onClose={() => setShowCompose(false)}
          onSend={handleSendEmail}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
} 