import { useState, useEffect, useCallback } from 'react';
import { Email } from '../types';
import { 
  initializeCache, 
  getEmails, 
  getEmailById, 
  updateEmailInCache, 
  removeEmailFromCache, 
  addEmailToCache,
  checkForNewEmails,
  moveEmailInCache,
} from './emailCache';
import { useSession } from 'next-auth/react';

// Define all folder types
const ALL_FOLDERS = ['inbox', 'sent', 'draft', 'trash', 'spam'] as const;
type FolderType = typeof ALL_FOLDERS[number];

/**
 * Custom hook to manage email cache and fetching from database
 */
export default function useDbEmailCache(currentFolder: string) {
  // States for email data
  const [allEmails, setAllEmails] = useState<Email[]>([]);
  const [allFoldersEmails, setAllFoldersEmails] = useState<Record<FolderType, Email[]>>({
    inbox: [],
    sent: [],
    draft: [],
    trash: [],
    spam: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalEmails, setTotalEmails] = useState<number>(0);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  
  // States for UI/search/filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [paginatedEmails, setPaginatedEmails] = useState<Email[]>([]);
  
  // Get the user session
  const { data: session } = useSession();
  
  // Initialize cache when user session is available
  useEffect(() => {
    if (session?.user?.email) {
      try {
        initializeCache(session.user.email);
      } catch (err) {
        console.error('Failed to initialize email cache:', err);
        setError(err instanceof Error ? err : new Error('Unknown error initializing cache'));
      }
    }
  }, [session?.user?.email]);
  
  // Load emails from all folders on initial load
  const loadAllFolders = useCallback(async () => {
    if (!session?.user?.email || initialLoadComplete) return;
    
    setLoading(true);
    
    try {
      console.log('Loading emails from all folders...');
      const folderPromises = ALL_FOLDERS.map(async (folder) => {
        try {
          const result = await getEmails(folder, false, false);
          return { folder, emails: result.emails, total: result.total };
        } catch (err) {
          console.error(`Error loading emails for ${folder}:`, err);
          return { folder, emails: [], total: 0 };
        }
      });
      
      const results = await Promise.all(folderPromises);
      
      // Update all folders emails
      const newAllFoldersEmails = { ...allFoldersEmails };
      
      results.forEach(({ folder, emails }) => {
        newAllFoldersEmails[folder as FolderType] = emails;
      });
      
      setAllFoldersEmails(newAllFoldersEmails);
      setInitialLoadComplete(true);
      
      // Set current folder emails
      const currentFolderResult = results.find(r => r.folder === currentFolder);
      if (currentFolderResult) {
        setAllEmails(currentFolderResult.emails);
        setTotalEmails(currentFolderResult.total);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error loading all folders:', err);
      setError(err instanceof Error ? err : new Error('Failed to load emails from all folders'));
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email, initialLoadComplete, currentFolder, allFoldersEmails]);
  
  // Load all folders on initial load
  useEffect(() => {
    loadAllFolders();
  }, [loadAllFolders]);
  
  // Fetch emails when the folder changes or when explicitly triggered
  const fetchEmails = useCallback(async (force = false) => {
    if (!session?.user?.email) return;
    
    setLoading(true);
    try {
      const result = await getEmails(currentFolder, force, false);
      setAllEmails(result.emails);
      setTotalEmails(result.total);
      setLastSynced(new Date(result.lastSynced));
      
      // Update the emails for this folder in allFoldersEmails
      setAllFoldersEmails(prev => ({
        ...prev,
        [currentFolder as FolderType]: result.emails
      }));
      
      // If no emails were found, trigger a sync
      if (result.emails.length === 0 && !force) {
        console.log(`No emails found for ${currentFolder}, triggering sync`);
        // Trigger a sync by calling getEmails with force=true
        const syncResult = await getEmails(currentFolder, true, false);
        
        // Update with the sync results
        setAllEmails(syncResult.emails);
        setTotalEmails(syncResult.total);
        setLastSynced(new Date(syncResult.lastSynced));
        
        // Update the emails for this folder in allFoldersEmails
        setAllFoldersEmails(prev => ({
          ...prev,
          [currentFolder as FolderType]: syncResult.emails
        }));
      }
      
      setError(null);
    } catch (err) {
      console.error(`Error fetching emails for ${currentFolder}:`, err);
      setError(err instanceof Error ? err : new Error(`Failed to fetch emails for ${currentFolder}`));
      setAllEmails([]);
      setTotalEmails(0);
    } finally {
      setLoading(false);
    }
  }, [currentFolder, session?.user?.email]);
  
  // Fetch emails when the folder changes
  useEffect(() => {
    if (initialLoadComplete) {
      fetchEmails(false);
    }
  }, [fetchEmails, currentFolder, initialLoadComplete]);
  
  // Filter emails based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredEmails(allEmails);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredEmails(
        allEmails.filter(
          (email) =>
            email.subject.toLowerCase().includes(query) ||
            email.from.toLowerCase().includes(query) ||
            (email.fromName && email.fromName.toLowerCase().includes(query)) ||
            email.to.toLowerCase().includes(query) ||
            (email.body && email.body.toLowerCase().includes(query))
        )
      );
    }
  }, [allEmails, searchQuery]);
  
  // Calculate paginated emails
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    setPaginatedEmails(filteredEmails.slice(startIndex, startIndex + itemsPerPage));
  }, [filteredEmails, currentPage, itemsPerPage]);
  
  // Check for new emails
  const checkNewEmails = useCallback(async () => {
    if (!session?.user?.email) return { hasNewEmails: false, newCount: 0 };
    
    try {
      const result = await checkForNewEmails(currentFolder);
      
      if (result.hasNewEmails) {
        // Re-fetch emails to update the UI
        await fetchEmails(true);
      }
      
      return result;
    } catch (err) {
      console.error(`Error checking for new emails in ${currentFolder}:`, err);
      return { hasNewEmails: false, newCount: 0 };
    }
  }, [currentFolder, fetchEmails, session?.user?.email]);
  
  // Fetch an email by ID
  const fetchEmailById = useCallback(async (id: string, forceRefresh = false) => {
    try {
      return await getEmailById(id, !forceRefresh, forceRefresh);
    } catch (err) {
      console.error(`Error fetching email ${id}:`, err);
      throw err;
    }
  }, []);
  
  // Update an email
  const updateEmail = useCallback((email: Email) => {
    updateEmailInCache(email);
    
    // Update allEmails state to reflect the change
    setAllEmails((prev) => {
      const index = prev.findIndex((e) => String(e.id) === String(email.id));
      if (index !== -1) {
        const newEmails = [...prev];
        newEmails[index] = email;
        return newEmails;
      }
      return prev;
    });
  }, []);
  
  // Remove an email
  const removeEmail = useCallback((emailId: string) => {
    removeEmailFromCache(emailId, currentFolder);
    
    // Update allEmails state to reflect the change
    setAllEmails((prev) => prev.filter((e) => String(e.id) !== String(emailId)));
    setTotalEmails((prev) => Math.max(0, prev - 1));
  }, [currentFolder]);
  
  // Add an email
  const addEmail = useCallback((email: Email) => {
    // Make sure the email has the current folder set
    // Convert the currentFolder string to the Email folder type
    const folderType = currentFolder as 'inbox' | 'sent' | 'draft' | 'trash' | 'spam';
    const emailWithFolder = { ...email, folder: folderType };
    
    addEmailToCache(emailWithFolder);
    
    // Update allEmails state to reflect the change
    setAllEmails((prev) => [emailWithFolder, ...prev]);
    setTotalEmails((prev) => prev + 1);
  }, [currentFolder]);
  
  // Move an email to another folder
  const moveEmail = useCallback(async (emailId: string, toFolder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam') => {
    try {
      await moveEmailInCache(emailId, toFolder);
      
      // If we're moving from the current folder, remove it from the current view
      if (toFolder !== currentFolder) {
        setAllEmails((prev) => prev.filter((e) => String(e.id) !== String(emailId)));
        setTotalEmails((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(`Error moving email ${emailId} to ${toFolder}:`, err);
      throw err;
    }
  }, [currentFolder]);
  
  return {
    // Email data
    allEmails,
    allFoldersEmails,
    filteredEmails,
    paginatedEmails,
    totalEmails,
    loading,
    error,
    lastSynced,
    
    // Search and pagination
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    
    // Actions
    fetchEmails,
    fetchEmailById,
    checkNewEmails,
    updateEmail,
    removeEmail,
    addEmail,
    moveEmail
  };
} 