import { useCallback } from 'react';
import { Email } from '../types';
import { 
  getCachedEmails, 
  getCachedEmailById, 
  cacheEmails, 
  updateCachedEmail, 
  removeCachedEmail, 
  clearFolderCache 
} from './emailCache';

/**
 * Hook for using the email cache
 * @param userId The ID of the authenticated user
 */
export const useEmailCache = (userId: string) => {
  /**
   * Get emails from cache for a specific folder and page
   * @param ignoreExpiration Whether to ignore cache expiration (useful during rate limiting)
   */
  const getEmails = useCallback(
    (folder: string, page: number, ignoreExpiration: boolean = false) => {
      return getCachedEmails(userId, folder, page, ignoreExpiration);
    },
    [userId]
  );

  /**
   * Get a specific email from cache by ID
   */
  const getEmailById = useCallback(
    (folder: string, emailId: number) => {
      return getCachedEmailById(userId, folder, emailId);
    },
    [userId]
  );

  /**
   * Store emails in cache for a specific folder and page
   */
  const storeEmails = useCallback(
    (folder: string, page: number, emails: Email[], totalPages: number) => {
      cacheEmails(userId, folder, page, emails, totalPages);
    },
    [userId]
  );

  /**
   * Update a specific email in the cache
   */
  const updateEmail = useCallback(
    (folder: string, updatedEmail: Email) => {
      updateCachedEmail(userId, folder, updatedEmail);
    },
    [userId]
  );

  /**
   * Remove an email from the cache
   */
  const removeEmail = useCallback(
    (folder: string, emailId: number) => {
      removeCachedEmail(userId, folder, emailId);
    },
    [userId]
  );

  /**
   * Clear the cache for a specific folder
   */
  const clearCache = useCallback(
    (folder: string) => {
      clearFolderCache(userId, folder);
    },
    [userId]
  );

  return {
    getEmails,
    getEmailById,
    storeEmails,
    updateEmail,
    removeEmail,
    clearCache,
  };
}; 