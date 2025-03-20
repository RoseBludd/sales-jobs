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
  Bell,
  Star,
  Filter,
  MoreHorizontal,
  ArrowLeft,
  Archive,
  MailPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Email } from '../types';
import { useEmailContext } from '../context/EmailProvider';
import { toast } from 'react-hot-toast';

// Import our new components and utilities
import { EmailListSkeleton, EmailDetailSkeleton } from './EmailSkeleton';
import { showFeatureNotification } from './FeatureNotification';
import { 
  pageTransitionVariants, 
  listItemVariants, 
  slideInRightVariants,
  modalVariants,
  fadeInVariants
} from '../utils/animations';
import useSmoothLoading from '../hooks/useSmoothLoading';
import usePageTransition from '../hooks/usePageTransition';
import { useTheme } from '../context/ThemeContext';

// Import existing components
import EmailListItem from './EmailListItem';
import EmailDetail from './EmailDetail';
import ComposeEmail from './ComposeEmail';
import SearchBar from './SearchBar';
import NewEmailsNotification from './NewEmailsNotification';
import SyncButton from './SyncButton';

interface EmailPageProps {
  folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam';
  onError?: () => void;
}

export default function EmailPage({ folder, onError }: EmailPageProps) {
  const router = useRouter();
  
  // Get theme context
  const { theme, isDark } = useTheme();
  
  // Use the shared context
  const { 
    paginatedEmails,
    allEmails,
    showCompose, 
    setShowCompose, 
    isLoading, 
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
  
  // Use our custom hooks for better UX
  const { isTransitioning, triggerTransition } = usePageTransition();
  const { isLoading: showLoading } = useSmoothLoading(isLoading, {
    minLoadingTime: 700,
    loadingDelay: 300,
    initialLoading: true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialLoad = useRef(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [localShowCompose, setLocalShowCompose] = useState(false);
  const [showNewEmailsNotification, setShowNewEmailsNotification] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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
    triggerTransition();
  }, [folder, setCurrentFolder, triggerTransition]);

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

  // Update initial load after first load completes
  useEffect(() => {
    if (!isLoading && initialLoad.current) {
      initialLoad.current = false;
    }
  }, [isLoading]);

  // Handle errors from the context
  useEffect(() => {
    if (error && onError) {
      onError();
    }
  }, [error, onError]);

  // Handle search debounce
  const handleSearch = useCallback((query: string) => {
    searchEmails(query);
  }, [searchEmails]);

  // Handle email selection - fixed to avoid the TypeError
  const handleSelectEmail = useCallback(async (emailId: string, isRead: boolean) => {
    try {
      console.log(`Selecting email with ID: ${emailId}`);
      
      // If the email isn't already marked as read, mark it as read
      if (!isRead) {
        try {
          const email = await fetchEmailById(emailId);
          if (email && !email.isRead) {
            updateEmail({ ...email, isRead: true });
          }
        } catch (readError) {
          console.error('Error marking email as read:', readError);
          // Continue with selection even if marking as read fails
        }
      }
      
      // Fetch the full email to set as selected
      try {
        console.log(`Fetching full email details for ID: ${emailId}`);
        const fullEmail = await fetchEmailById(emailId);
        
        if (fullEmail) {
          console.log(`Successfully fetched email with ID: ${emailId}`);
          setSelectedEmail(fullEmail);
        } else {
          console.error(`Email not found with ID: ${emailId}`);
          toast.error('Email not found');
          if (setError) {
            setError('Email not found');
          }
        }
      } catch (fetchError) {
        console.error(`Error fetching email details for ID ${emailId}:`, fetchError);
        if (setError) {
          setError('Failed to load email details');
        }
        
        toast.error('Could not load email details');
      }
    } catch (error) {
      console.error('Error selecting email:', error);
      if (setError) {
        setError('Failed to load email details');
      }
      
      toast.error('Could not load email details');
    }
  }, [fetchEmailById, setError, setSelectedEmail, updateEmail]);

  // Handle email deletion
  const handleDeleteEmail = useCallback((emailId: string) => {
    // If the deleted email is currently selected, clear selection
    if (selectedEmail && selectedEmail.id.toString() === emailId) {
      setSelectedEmail(null);
    }
    
    // Move to trash or delete permanently if already in trash
    if (folder === 'trash') {
      // Permanently delete
      removeEmail(emailId);
      toast.success('Email permanently deleted');
    } else {
      // Move to trash
      moveEmail(emailId, 'trash');
      toast.success('Email moved to trash');
    }
  }, [folder, moveEmail, removeEmail, selectedEmail, setSelectedEmail]);

  // Handle not implemented feature
  const handleNotImplemented = useCallback((featureName: string) => {
    showFeatureNotification({
      featureName,
      type: 'coming-soon',
      description: `The ${featureName} feature is coming soon!`
    });
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    // Trigger page transition animation
    triggerTransition();
    
    // Change page in context
    changePage(page);
    
    // If an email is selected, clear selection when changing pages
    if (selectedEmail) {
      setSelectedEmail(null);
    }
  }, [changePage, selectedEmail, setSelectedEmail, triggerTransition]);

  // Handle refresh button click
  const handleRefresh = useCallback(() => {
    // Clear selected email
    setSelectedEmail(null);
    
    // Refresh emails
    refreshEmails(true);
    toast.success('Refreshing emails...');
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
      // Get the current user's session
      const session = await fetch('/api/auth/session');
      const sessionData = await session.json();
      const userEmail = sessionData?.user?.email || 'user@example.com';
      
      // Prepare email data for API
      const apiEmailData = {
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        from: userEmail,
        fromName: sessionData?.user?.name || 'User'
      };
      
      // Send email using the API
      const response = await fetch('/api/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiEmailData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }
      
      // Close compose modal
      setShowCompose(false);
      setLocalShowCompose(false);
      
      // Show success toast
      toast.success('Email sent successfully');
      
      // Refresh the sent folder to show the new email
      if (folder === 'sent') {
        refreshEmails(true);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setError(error instanceof Error ? error.message : 'Failed to send email');
      
      // Show error toast
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setIsSubmitting(false);
    }
  }, [setError, setShowCompose, folder, refreshEmails]);

  // Toggle filters visibility
  const toggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
  }, []);

  // Render loading state with our skeleton component
  if (showLoading && initialLoad.current) {
    return <EmailListSkeleton />;
  }

  // Render the main component
  return (
    <motion.div 
      className="h-full flex flex-col"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageTransitionVariants}
      style={{ 
        borderRadius: theme.borderRadius,
        transition: `all ${theme.animation.duration} ${theme.animation.easing}`
      }}
    >
      {/* Email header with search and controls */}
      <div 
        className="border-b border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-800 rounded-t-lg shadow-sm"
        style={{ 
          borderRadius: `${theme.borderRadius} ${theme.borderRadius} 0 0` 
        }}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <motion.h1 
            className="text-xl font-semibold capitalize flex items-center text-gray-800 dark:text-gray-100"
            variants={fadeInVariants}
          >
            {folder === 'inbox' && <Inbox className="mr-2 h-5 w-5" style={{ color: theme.colors.primary }} />}
            {folder === 'sent' && <Send className="mr-2 h-5 w-5" style={{ color: theme.colors.success }} />}
            {folder === 'draft' && <MailPlus className="mr-2 h-5 w-5" style={{ color: theme.colors.warning }} />}
            {folder === 'trash' && <Trash className="mr-2 h-5 w-5" style={{ color: theme.colors.error }} />}
            {folder === 'spam' && <AlertCircle className="mr-2 h-5 w-5" style={{ color: theme.colors.error }} />}
            {folder}
          </motion.h1>
          
          <div className="flex-1 max-w-md">
            <SearchBar 
              value={searchQuery} 
              onChange={handleSearch} 
              placeholder="Search emails..." 
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={toggleFilters}
              title="Show filters"
            >
              <Filter className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </motion.button>
            
            <SyncButton 
              onClick={handleRefresh} 
              isSyncing={syncingEmails}
            />
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowCompose(true);
                setLocalShowCompose(true);
              }}
              className="py-2 px-4 rounded-lg flex items-center shadow-sm text-white transition-all duration-200"
              style={{ background: theme.colors.primary }}
            >
              <MailPlus className="h-4 w-4 mr-2" />
              Compose
            </motion.button>
          </div>
        </div>
        
        {/* Filters section (animated) */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => handleNotImplemented('Filter by date')}
                  className="px-3 py-1 text-sm bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 flex items-center"
                >
                  <span>Date</span>
                  <ChevronRight className="ml-1 h-3 w-3" />
                </button>
                
                <button 
                  onClick={() => handleNotImplemented('Filter by attachments')}
                  className="px-3 py-1 text-sm bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 flex items-center"
                >
                  <span>Has Attachment</span>
                </button>
                
                <button 
                  onClick={() => handleNotImplemented('Filter by read status')}
                  className="px-3 py-1 text-sm bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 flex items-center"
                >
                  <span>Unread</span>
                </button>
                
                <button 
                  onClick={() => handleNotImplemented('Filter by starred')}
                  className="px-3 py-1 text-sm bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 flex items-center"
                >
                  <Star className="h-3 w-3 mr-1" style={{ color: theme.colors.warning }} />
                  <span>Starred</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Pagination and filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <label htmlFor="itemsPerPage" className="mr-2 text-sm text-gray-600 dark:text-gray-400">
                Show:
              </label>
              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                style={{ borderRadius: theme.borderRadius }}
              >
                <option className="text-gray-900 dark:text-white" value={10}>10</option>
                <option className="text-gray-900 dark:text-white" value={20}>20</option>
                <option className="text-gray-900 dark:text-white" value={50}>50</option>
                <option className="text-gray-900 dark:text-white" value={100}>100</option>
              </select>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {totalEmails > 0
                ? `Showing ${Math.min((currentPage - 1) * itemsPerPage + 1, totalEmails)}-${Math.min(
                    currentPage * itemsPerPage,
                    totalEmails
                  )} of ${totalEmails}`
                : 'No emails'}
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center bg-white dark:bg-gray-700 rounded-md shadow-sm border border-gray-200 dark:border-gray-600"
                 style={{ borderRadius: theme.borderRadius }}
            >
              <motion.button
                whileHover={{ backgroundColor: isDark ? '#374151' : '#f3f4f6' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-1.5 border-r border-gray-200 dark:border-gray-600 ${
                  currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                style={{ borderTopLeftRadius: theme.borderRadius, borderBottomLeftRadius: theme.borderRadius }}
              >
                <ChevronLeft className="h-4 w-4" />
              </motion.button>
              
              <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 font-medium">
                {currentPage} / {totalPages}
              </span>
              
              <motion.button
                whileHover={{ backgroundColor: isDark ? '#374151' : '#f3f4f6' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-1.5 border-l border-gray-200 dark:border-gray-600 ${
                  currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                style={{ borderTopRightRadius: theme.borderRadius, borderBottomRightRadius: theme.borderRadius }}
              >
                <ChevronRight className="h-4 w-4" />
              </motion.button>
            </div>
          )}
        </div>
      </div>
      
      {/* New emails notification */}
      <AnimatePresence>
        {showNewEmailsNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="z-10 relative"
          >
            <NewEmailsNotification 
              count={newEmailsCount} 
              onDismiss={() => setShowNewEmailsNotification(false)}
              onView={() => {
                handlePageChange(1);
                refreshEmails();
                setShowNewEmailsNotification(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Email content area */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-gray-50 dark:bg-gray-900 rounded-b-lg">
        {/* Email list */}
        <div className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto transition-all duration-300 ${
          selectedEmail && isMobileView ? 'hidden' : selectedEmail ? 'md:w-1/3 w-full' : 'w-full'
        }`}>
          {error && (
            <div className="p-4 flex items-center"
                 style={{ 
                   backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(254, 226, 226, 1)',
                   color: theme.colors.error
                 }}
            >
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}
          
          {/* Show skeleton loader when loading more emails but not on initial load */}
          {showLoading && !initialLoad.current && (
            <EmailListSkeleton />
          )}
          
          {/* Show empty state when no emails */}
          {!showLoading && paginatedEmails.length === 0 ? (
            <motion.div 
              className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400 p-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {folder === 'inbox' && <Inbox className="h-16 w-16 mb-4 opacity-20" />}
              {folder === 'sent' && <Send className="h-16 w-16 mb-4 opacity-20" />}
              {folder === 'draft' && <MailPlus className="h-16 w-16 mb-4 opacity-20" />}
              {folder === 'trash' && <Trash className="h-16 w-16 mb-4 opacity-20" />}
              {folder === 'spam' && <AlertCircle className="h-16 w-16 mb-4 opacity-20" />}
              {searchQuery ? (
                <>
                  <p className="text-center">No emails match your search</p>
                  <button 
                    onClick={() => searchEmails('')}
                    className="mt-3 px-4 py-2 text-white text-sm rounded-md transition-colors"
                    style={{ 
                      backgroundColor: theme.colors.primary,
                      borderRadius: theme.borderRadius
                    }}
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <p className="text-center">No emails in this folder</p>
              )}
            </motion.div>
          ) : (
            /* Show email list when not loading and we have emails */
            !showLoading && (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <AnimatePresence initial={false}>
                  {paginatedEmails.map((email, index) => (
                    <motion.div
                      key={email.id}
                      custom={index}
                      variants={listItemVariants}
                      initial={isTransitioning ? "hidden" : false}
                      animate="visible"
                      exit={{ opacity: 0, x: -20 }}
                      layout
                    >
                      <EmailListItem
                        email={email}
                        isSelected={selectedEmail !== null && selectedEmail.id.toString() === email.id.toString()}
                        onSelect={() => handleSelectEmail(String(email.id), email.isRead)}
                        onDelete={() => handleDeleteEmail(String(email.id))}
                        onStarToggle={(starred) => {
                          updateEmail({ ...email, isStarred: starred });
                        }}
                        currentFolder={folder}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {syncingEmails && (
                  <motion.div 
                    className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center bg-gray-50/50 dark:bg-gray-800/50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing emails...
                  </motion.div>
                )}
              </div>
            )
          )}
        </div>
        
        {/* Email detail view */}
        <AnimatePresence mode="wait">
          {selectedEmail && (
            <motion.div 
              key={selectedEmail.id}
              className={`bg-white dark:bg-gray-800 overflow-y-auto ${isMobileView ? 'w-full' : 'md:flex-1'}`}
              variants={slideInRightVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {showLoading ? (
                <EmailDetailSkeleton />
              ) : (
                <EmailDetail
                  emailId={String(selectedEmail.id)}
                  onBack={() => setSelectedEmail(null)}
                  onDelete={() => handleDeleteEmail(String(selectedEmail.id))}
                  isMobileView={isMobileView}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Compose email modal */}
      <AnimatePresence>
        {(showCompose || localShowCompose) && (
          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-3xl"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <ComposeEmail
                onClose={() => {
                  setShowCompose(false);
                  setLocalShowCompose(false);
                }}
                onSubmit={handleComposeSubmit}
                isSubmitting={isSubmitting}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 