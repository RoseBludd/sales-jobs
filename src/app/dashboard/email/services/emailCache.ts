import { Email } from '../types';

interface EmailCache {
  [userId: string]: {
    [folder: string]: {
      emails: Email[];
      totalPages: number;
      lastFetched: number;
      pageCache: {
        [page: number]: {
          emails: Email[];
          timestamp: number;
        }
      }
    }
  }
}

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// In-memory cache
const emailCache: EmailCache = {};

/**
 * Get emails from cache for a specific user, folder and page
 * @param userId The user ID
 * @param folder The folder name
 * @param page The page number
 * @param ignoreExpiration Whether to ignore cache expiration
 */
export const getCachedEmails = (
  userId: string,
  folder: string,
  page: number,
  ignoreExpiration: boolean = false
): { emails: Email[]; totalPages: number } | null => {
  // Check if cache exists for this user and folder
  if (
    !emailCache[userId] ||
    !emailCache[userId][folder] ||
    !emailCache[userId][folder].pageCache[page]
  ) {
    return null;
  }

  const folderCache = emailCache[userId][folder];
  const pageData = folderCache.pageCache[page];
  
  // Check if cache is expired (unless we're ignoring expiration)
  if (!ignoreExpiration && Date.now() - pageData.timestamp > CACHE_EXPIRATION) {
    return null;
  }

  return {
    emails: pageData.emails,
    totalPages: folderCache.totalPages
  };
};

/**
 * Get a specific email from cache by ID
 */
export const getCachedEmailById = (
  userId: string,
  folder: string,
  emailId: number
): Email | null => {
  // Check if cache exists for this user and folder
  if (!emailCache[userId] || !emailCache[userId][folder]) {
    return null;
  }

  // Look through all pages in the cache for this folder
  const folderCache = emailCache[userId][folder];
  
  for (const pageNum in folderCache.pageCache) {
    const pageData = folderCache.pageCache[parseInt(pageNum)];
    const email = pageData.emails.find(email => email.id === emailId);
    
    if (email) {
      return email;
    }
  }

  return null;
};

/**
 * Store emails in cache for a specific user, folder and page
 */
export const cacheEmails = (
  userId: string,
  folder: string,
  page: number,
  emails: Email[],
  totalPages: number
): void => {
  // Initialize cache structure if it doesn't exist
  if (!emailCache[userId]) {
    emailCache[userId] = {};
  }
  
  if (!emailCache[userId][folder]) {
    emailCache[userId][folder] = {
      emails: [],
      totalPages,
      lastFetched: Date.now(),
      pageCache: {}
    };
  }

  // Update folder cache
  const folderCache = emailCache[userId][folder];
  folderCache.totalPages = totalPages;
  folderCache.lastFetched = Date.now();
  
  // Update page cache
  folderCache.pageCache[page] = {
    emails,
    timestamp: Date.now()
  };
  
  // Update the overall emails array for this folder
  // This combines all emails from all pages
  const allEmails = new Map<number, Email>();
  
  // Add all emails from all pages to the map
  Object.values(folderCache.pageCache).forEach(pageData => {
    pageData.emails.forEach(email => {
      allEmails.set(email.id, email);
    });
  });
  
  // Convert map back to array
  folderCache.emails = Array.from(allEmails.values());
};

/**
 * Update a specific email in the cache
 */
export const updateCachedEmail = (
  userId: string,
  folder: string,
  updatedEmail: Email
): void => {
  if (!emailCache[userId] || !emailCache[userId][folder]) {
    return;
  }

  const folderCache = emailCache[userId][folder];
  
  // Update email in all pages
  Object.keys(folderCache.pageCache).forEach(pageKey => {
    const page = parseInt(pageKey);
    const pageData = folderCache.pageCache[page];
    
    const emailIndex = pageData.emails.findIndex(email => email.id === updatedEmail.id);
    if (emailIndex !== -1) {
      pageData.emails[emailIndex] = updatedEmail;
    }
  });
  
  // Update in the combined emails array
  const emailIndex = folderCache.emails.findIndex(email => email.id === updatedEmail.id);
  if (emailIndex !== -1) {
    folderCache.emails[emailIndex] = updatedEmail;
  }
};

/**
 * Remove an email from the cache
 */
export const removeCachedEmail = (
  userId: string,
  folder: string,
  emailId: number
): void => {
  if (!emailCache[userId] || !emailCache[userId][folder]) {
    return;
  }

  const folderCache = emailCache[userId][folder];
  
  // Remove from all pages
  Object.keys(folderCache.pageCache).forEach(pageKey => {
    const page = parseInt(pageKey);
    const pageData = folderCache.pageCache[page];
    
    pageData.emails = pageData.emails.filter(email => email.id !== emailId);
  });
  
  // Remove from the combined emails array
  folderCache.emails = folderCache.emails.filter(email => email.id !== emailId);
};

/**
 * Clear the cache for a specific user
 */
export const clearUserCache = (userId: string): void => {
  delete emailCache[userId];
};

/**
 * Clear the cache for a specific folder
 */
export const clearFolderCache = (userId: string, folder: string): void => {
  if (emailCache[userId]) {
    delete emailCache[userId][folder];
  }
}; 