/**
 * Email Cache Service
 * This module provides functions for fetching, updating, and caching emails.
 * It uses the database API endpoints to fetch emails and maintains a memory cache.
 */

import { Email, EmailAttachment } from '../types';

// In-memory cache for emails
interface EmailCache {
  [folder: string]: {
    emails: Email[];
    total: number;
    lastFetched: number;
  };
}

interface EmailDetailCache {
  [id: string]: Email;
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 60 * 60 * 1000;

// Global cache instances
let emailCache: EmailCache = {};
let emailDetailCache: EmailDetailCache = {};
let currentUserEmail: string | null = null;

/**
 * Initialize the email cache for a user
 */
export function initializeCache(userEmail: string): void {
  currentUserEmail = userEmail;
  emailCache = {};
  emailDetailCache = {};
}

/**
 * Check if cache is valid (not expired)
 */
function isCacheValid(lastFetched: number): boolean {
  return Date.now() - lastFetched < CACHE_DURATION;
}

/**
 * Convert database email format to app Email format
 */
function mapDatabaseEmailToEmail(dbEmail: any): Email {
  return {
    id: dbEmail.id,
    folder: dbEmail.folder || 'inbox',
    from: dbEmail.from || '',
    fromName: dbEmail.fromName || '',
    to: Array.isArray(dbEmail.to) ? dbEmail.to.join(', ') : dbEmail.to || '',
    subject: dbEmail.subject || '(No Subject)',
    body: dbEmail.body || '',
    date: dbEmail.receivedDate || new Date().toISOString(),
    isRead: dbEmail.isRead || false,
    isStarred: dbEmail.isStarred || false,
    attachments: dbEmail.hasAttachments ? [] : undefined,
    itemId: dbEmail.id
  };
}

/**
 * Fetch emails from API
 */
async function fetchEmailsFromApi(folder: string, pageSize = 1000, page = 1, forceSync = false): Promise<{
  emails: Email[];
  total: number;
  lastSynced: number;
}> {
  try {
    // Map folder names to match API
    const folderMap: Record<string, string> = {
      'inbox': 'INBOX',
      'sent': 'SENT_ITEMS',
      'draft': 'DRAFTS',
      'trash': 'DELETED_ITEMS',
      'spam': 'JUNK_EMAIL'
    };
    
    const apiFolder = folderMap[folder] || 'INBOX';
    
    // Construct the API URL with query parameters
    const url = `/api/emails?folder=${apiFolder}&pageSize=${pageSize}&page=${page}${forceSync ? '&sync=true' : ''}`;
    
    console.log(`Fetching emails from API: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch emails');
    }
    
    const data = await response.json();
    
    // Map API response to Email objects
    const emails = Array.isArray(data.emails) 
      ? data.emails.map(mapDatabaseEmailToEmail)
      : [];
    
    return {
      emails,
      total: data.total || emails.length,
      lastSynced: data.lastSynced || Date.now()
    };
  } catch (error) {
    console.error('Error fetching emails from API:', error);
    throw error;
  }
}

/**
 * Fetch email details from API
 */
async function fetchEmailDetailFromApi(emailId: string): Promise<Email> {
  try {
    const url = `/api/emails/${emailId}`;
    console.log(`Fetching email detail from API: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch email details');
    }
    
    const data = await response.json();
    return mapDatabaseEmailToEmail(data.email);
  } catch (error) {
    console.error('Error fetching email details from API:', error);
    throw error;
  }
}

/**
 * Get emails from cache or API
 */
export async function getEmails(
  folder: string,
  forceRefresh: boolean = false,
  checkNewOnly: boolean = false
): Promise<{
  emails: Email[];
  total: number;
  fromCache: boolean;
  lastSynced: number;
}> {
  // Check if we have a valid cache for this folder
  const folderCache = emailCache[folder];
  const isCached = folderCache && isCacheValid(folderCache.lastFetched) && !forceRefresh;
  
  if (isCached && !checkNewOnly) {
    console.log(`Using cached emails for folder ${folder}`);
    
    // If the cache is empty, force a refresh to check if there are actually no emails
    // or if we just haven't synced yet
    if (folderCache.emails.length === 0 && !forceRefresh) {
      console.log(`Cache for ${folder} is empty, forcing refresh`);
      return getEmails(folder, true, checkNewOnly);
    }
    
    return {
      emails: folderCache.emails,
      total: folderCache.total,
      fromCache: true,
      lastSynced: folderCache.lastFetched
    };
  }
  
  // Fetch emails from API
  try {
    const result = await fetchEmailsFromApi(folder, 1000, 1, forceRefresh);
    
    // Update cache
    emailCache[folder] = {
      emails: result.emails,
      total: result.total,
      lastFetched: Date.now()
    };
    
    return {
      emails: result.emails,
      total: result.total,
      fromCache: false,
      lastSynced: result.lastSynced
    };
  } catch (error) {
    // If there was an error fetching from API and we have a cache, return the cache
    if (folderCache) {
      return {
        emails: folderCache.emails,
        total: folderCache.total,
        fromCache: true,
        lastSynced: folderCache.lastFetched
      };
    }
    
    throw error;
  }
}

/**
 * Get email by ID
 */
export async function getEmailById(
  id: string,
  useCache: boolean = true,
  forceSync: boolean = false
): Promise<Email> {
  // Check cache first if useCache is true
  if (useCache && emailDetailCache[id] && !forceSync) {
    console.log(`Using cached email detail for ID ${id}`);
    return emailDetailCache[id];
  }
  
  // Fetch email details from API
  try {
    const email = await fetchEmailDetailFromApi(id);
    
    // Update cache
    emailDetailCache[id] = email;
    
    // Also update the email in the folder cache if it exists
    Object.keys(emailCache).forEach(folder => {
      const index = emailCache[folder].emails.findIndex(e => String(e.id) === String(id));
      if (index !== -1) {
        emailCache[folder].emails[index] = email;
      }
    });
    
    return email;
  } catch (error) {
    console.error(`Error fetching email ${id}:`, error);
    throw error;
  }
}

/**
 * Update email in cache
 */
export function updateEmailInCache(email: Email): void {
  // Update email detail cache
  emailDetailCache[String(email.id)] = email;
  
  // Update folder caches
  Object.keys(emailCache).forEach(folder => {
    const index = emailCache[folder].emails.findIndex(e => String(e.id) === String(email.id));
    if (index !== -1) {
      emailCache[folder].emails[index] = email;
    }
  });
}

/**
 * Remove email from cache
 */
export function removeEmailFromCache(emailId: string, fromFolder?: string): void {
  // Remove from email detail cache
  delete emailDetailCache[emailId];
  
  // Remove from folder caches
  if (fromFolder && emailCache[fromFolder]) {
    emailCache[fromFolder].emails = emailCache[fromFolder].emails.filter(
      e => String(e.id) !== String(emailId)
    );
    emailCache[fromFolder].total = Math.max(0, emailCache[fromFolder].total - 1);
  } else {
    // If no folder specified, remove from all folders
    Object.keys(emailCache).forEach(folder => {
      const hadEmail = emailCache[folder].emails.some(e => String(e.id) === String(emailId));
      
      emailCache[folder].emails = emailCache[folder].emails.filter(
        e => String(e.id) !== String(emailId)
      );
      
      if (hadEmail) {
        emailCache[folder].total = Math.max(0, emailCache[folder].total - 1);
      }
    });
  }
}

/**
 * Add email to cache
 */
export function addEmailToCache(email: Email): void {
  // Add to email detail cache
  emailDetailCache[String(email.id)] = email;
  
  // Add to folder cache
  const folder = email.folder;
  
  if (!emailCache[folder]) {
    emailCache[folder] = {
      emails: [],
      total: 0,
      lastFetched: Date.now()
    };
  }
  
  // Check if email already exists in cache
  const index = emailCache[folder].emails.findIndex(e => String(e.id) === String(email.id));
  
  if (index !== -1) {
    // Update existing email
    emailCache[folder].emails[index] = email;
  } else {
    // Add new email to the beginning of the array (newest first)
    emailCache[folder].emails.unshift(email);
    emailCache[folder].total += 1;
  }
}

/**
 * Move email to another folder
 */
export async function moveEmailInCache(
  emailId: string,
  toFolder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam'
): Promise<void> {
  try {
    // Find the email in the cache
    let emailToMove: Email | null = null;
    let fromFolder: string | null = null;
    
    // Check all folder caches
    for (const folder of Object.keys(emailCache)) {
      const email = emailCache[folder].emails.find(e => String(e.id) === String(emailId));
      if (email) {
        emailToMove = { ...email };
        fromFolder = folder;
        break;
      }
    }
    
    // If email not found in any folder cache, try detail cache
    if (!emailToMove && emailDetailCache[emailId]) {
      emailToMove = { ...emailDetailCache[emailId] };
    }
    
    // If still not found, fetch from API
    if (!emailToMove) {
      emailToMove = await getEmailById(emailId, false);
    }
    
    if (!emailToMove) {
      throw new Error(`Email with ID ${emailId} not found`);
    }
    
    // Update the folder
    emailToMove.folder = toFolder;
    
    // Remove from the old folder cache
    if (fromFolder) {
      removeEmailFromCache(emailId, fromFolder);
    }
    
    // Add to the new folder cache
    addEmailToCache(emailToMove);
    
    // TODO: Make an API call to actually move the email on the server
    // This would be done with something like:
    // await fetch(`/api/emails/${emailId}/move`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ folder: toFolder })
    // });
  } catch (error) {
    console.error(`Error moving email ${emailId} to ${toFolder}:`, error);
    throw error;
  }
}

/**
 * Clear email cache
 */
export function clearCache(): void {
  emailCache = {};
  emailDetailCache = {};
}

/**
 * Check for new emails
 */
export async function checkForNewEmails(
  folder: string
): Promise<{ hasNewEmails: boolean; newCount: number }> {
  try {
    // If we don't have a cache for this folder, there are no "new" emails
    if (!emailCache[folder]) {
      return { hasNewEmails: false, newCount: 0 };
    }
    
    // Fetch the latest emails from the API
    const result = await fetchEmailsFromApi(folder, 10, 1, true);
    
    // Compare with cached emails
    const cachedIds = new Set(emailCache[folder].emails.map(e => String(e.id)));
    const newEmails = result.emails.filter(e => !cachedIds.has(String(e.id)));
    
    if (newEmails.length > 0) {
      console.log(`Found ${newEmails.length} new emails in ${folder}`);
      
      // Update cache with new emails
      emailCache[folder] = {
        emails: [...newEmails, ...emailCache[folder].emails],
        total: emailCache[folder].total + newEmails.length,
        lastFetched: Date.now()
      };
      
      return { hasNewEmails: true, newCount: newEmails.length };
    }
    
    return { hasNewEmails: false, newCount: 0 };
  } catch (error) {
    console.error(`Error checking for new emails in ${folder}:`, error);
    return { hasNewEmails: false, newCount: 0 };
  }
} 