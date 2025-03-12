/**
 * Email cache service for caching emails in memory and localStorage
 * This helps reduce API calls and improves performance
 */

import { Email } from '../types';
import { fetchEmails, fetchEmailById } from './emailService';

// In-memory cache for emails
interface EmailCache {
  [folder: string]: {
    emails: Email[];
    timestamp: number;
    total: number;
    page: number;
    pageSize: number;
  };
}

// Cache for individual emails
interface EmailDetailCache {
  [id: string]: {
    email: Email;
    timestamp: number;
  };
}

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Global cache objects
let emailCache: EmailCache = {};
let emailDetailCache: EmailDetailCache = {};
let currentUser: string | null = null;

/**
 * Initialize the cache for a specific user
 */
export function initializeCache(userEmail: string): void {
  if (currentUser === userEmail) {
    return; // Already initialized for this user
  }
  
  currentUser = userEmail;
  
  // Clear in-memory cache
  emailCache = {};
  emailDetailCache = {};
  
  // Try to load from localStorage
  try {
    const storedEmailCache = localStorage.getItem(`emailCache_${userEmail}`);
    const storedDetailCache = localStorage.getItem(`emailDetailCache_${userEmail}`);
    
    if (storedEmailCache) {
      emailCache = JSON.parse(storedEmailCache);
    }
    
    if (storedDetailCache) {
      emailDetailCache = JSON.parse(storedDetailCache);
    }
    
    console.log(`Loaded cache for user ${userEmail}`);
  } catch (error) {
    console.error('Error loading cache from localStorage:', error);
    // If there's an error, just use empty caches
    emailCache = {};
    emailDetailCache = {};
  }
}

/**
 * Save the current cache to localStorage
 */
function saveCache(): void {
  if (!currentUser) return;
  
  try {
    localStorage.setItem(`emailCache_${currentUser}`, JSON.stringify(emailCache));
    localStorage.setItem(`emailDetailCache_${currentUser}`, JSON.stringify(emailDetailCache));
  } catch (error) {
    console.error('Error saving cache to localStorage:', error);
  }
}

/**
 * Get emails from cache or fetch from API
 */
export async function getEmails(
  folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam',
  page: number = 1,
  pageSize: number = 50,
  forceRefresh: boolean = false,
  searchQuery?: string,
  sync: boolean = false
): Promise<{
  emails: Email[];
  total: number;
  page: number;
  pageSize: number;
  fromCache: boolean;
}> {
  if (!currentUser) {
    throw new Error('Cache not initialized. Call initializeCache first.');
  }
  
  const cacheKey = searchQuery ? `${folder}-search-${searchQuery}` : folder;
  const now = Date.now();
  
  // Check if we have a valid cache entry
  if (
    !forceRefresh &&
    !sync &&
    emailCache[cacheKey] &&
    now - emailCache[cacheKey].timestamp < CACHE_EXPIRATION &&
    emailCache[cacheKey].page === page &&
    emailCache[cacheKey].pageSize === pageSize
  ) {
    return {
      emails: emailCache[cacheKey].emails,
      total: emailCache[cacheKey].total,
      page: emailCache[cacheKey].page,
      pageSize: emailCache[cacheKey].pageSize,
      fromCache: true
    };
  }
  
  // Fetch emails from API
  const result = await fetchEmails(folder, page, pageSize, searchQuery, sync);
  
  // Update cache
  emailCache[cacheKey] = {
    emails: result.emails,
    timestamp: now,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize
  };
  
  // Save to localStorage
  saveCache();
  
  return {
    ...result,
    fromCache: false
  };
}

/**
 * Check for new emails and update cache if needed
 */
export async function checkForNewEmails(
  folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam'
): Promise<{
  hasNewEmails: boolean;
  newCount: number;
}> {
  if (!currentUser) {
    throw new Error('Cache not initialized. Call initializeCache first.');
  }
  
  // Fetch just the first page with a small page size to check for new emails
  const result = await fetchEmails(folder, 1, 10, undefined);
  
  // If we don't have a cache for this folder yet, just update it
  if (!emailCache[folder]) {
    emailCache[folder] = {
      emails: result.emails,
      timestamp: Date.now(),
      total: result.total,
      page: 1,
      pageSize: 10
    };
    saveCache();
    return { hasNewEmails: true, newCount: result.total };
  }
  
  // Check if there are new emails by comparing IDs
  const cachedIds = new Set(emailCache[folder].emails.map(email => email.id));
  const newEmails = result.emails.filter(email => !cachedIds.has(email.id));
  
  if (newEmails.length > 0) {
    // Add new emails to the beginning of the cache
    emailCache[folder].emails = [...newEmails, ...emailCache[folder].emails];
    emailCache[folder].timestamp = Date.now();
    emailCache[folder].total = emailCache[folder].total + newEmails.length;
    
    // Save to localStorage
    saveCache();
    
    return { hasNewEmails: true, newCount: newEmails.length };
  }
  
  return { hasNewEmails: false, newCount: 0 };
}

/**
 * Get a single email by ID from cache or fetch from API
 */
export async function getEmailById(
  id: string,
  forceRefresh: boolean = false,
  sync: boolean = false
): Promise<Email> {
  if (!currentUser) {
    throw new Error('Cache not initialized. Call initializeCache first.');
  }
  
  const now = Date.now();
  
  // Check if we have a valid cache entry
  if (
    !forceRefresh &&
    !sync &&
    emailDetailCache[id] &&
    now - emailDetailCache[id].timestamp < CACHE_EXPIRATION
  ) {
    return emailDetailCache[id].email;
  }
  
  // Fetch email from API
  const email = await fetchEmailById(id, sync);
  
  // Update cache
  emailDetailCache[id] = {
    email,
    timestamp: now
  };
  
  // Save to localStorage
  saveCache();
  
  return email;
}

/**
 * Update email in cache
 */
export function updateEmailInCache(email: Email): void {
  if (!currentUser) {
    console.warn('Cache not initialized. Call initializeCache first.');
    return;
  }
  
  // Update in folder cache
  Object.keys(emailCache).forEach(cacheKey => {
    const index = emailCache[cacheKey].emails.findIndex(e => String(e.id) === String(email.id));
    if (index !== -1) {
      emailCache[cacheKey].emails[index] = { ...email };
    }
  });
  
  // Update in detail cache
  if (emailDetailCache[String(email.id)]) {
    emailDetailCache[String(email.id)] = {
      email: { ...email },
      timestamp: Date.now()
    };
  }
  
  // Save to localStorage
  saveCache();
}

/**
 * Remove email from cache
 */
export function removeEmailFromCache(emailId: string, folder?: string): void {
  if (!currentUser) {
    console.warn('Cache not initialized. Call initializeCache first.');
    return;
  }
  
  // Remove from folder cache
  if (folder) {
    if (emailCache[folder]) {
      emailCache[folder].emails = emailCache[folder].emails.filter(e => String(e.id) !== emailId);
      emailCache[folder].total = Math.max(0, emailCache[folder].total - 1);
    }
  } else {
    // If folder is not specified, remove from all folder caches
    Object.keys(emailCache).forEach(cacheKey => {
      emailCache[cacheKey].emails = emailCache[cacheKey].emails.filter(e => String(e.id) !== emailId);
      emailCache[cacheKey].total = Math.max(0, emailCache[cacheKey].total - 1);
    });
  }
  
  // Remove from detail cache
  delete emailDetailCache[emailId];
  
  // Save to localStorage
  saveCache();
}

/**
 * Add email to cache
 */
export function addEmailToCache(email: Email, folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam'): void {
  if (!currentUser) {
    console.warn('Cache not initialized. Call initializeCache first.');
    return;
  }
  
  if (emailCache[folder]) {
    // Add to the beginning of the array (newest first)
    emailCache[folder].emails.unshift(email);
    emailCache[folder].total += 1;
  }
  
  // Add to detail cache
  emailDetailCache[String(email.id)] = {
    email,
    timestamp: Date.now()
  };
  
  // Save to localStorage
  saveCache();
}

/**
 * Clear all caches
 */
export function clearCache(): void {
  if (!currentUser) {
    console.warn('Cache not initialized. Call initializeCache first.');
    return;
  }
  
  Object.keys(emailCache).forEach(key => {
    delete emailCache[key];
  });
  
  Object.keys(emailDetailCache).forEach(key => {
    delete emailDetailCache[key];
  });
  
  // Clear localStorage
  localStorage.removeItem(`emailCache_${currentUser}`);
  localStorage.removeItem(`emailDetailCache_${currentUser}`);
}

/**
 * Move email in cache
 */
export function moveEmailInCache(
  emailId: string,
  fromFolder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam',
  toFolder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam'
): void {
  if (!currentUser) {
    console.warn('Cache not initialized. Call initializeCache first.');
    return;
  }
  
  // Find the email in the source folder
  if (emailCache[fromFolder]) {
    const emailIndex = emailCache[fromFolder].emails.findIndex(e => String(e.id) === emailId);
    
    if (emailIndex !== -1) {
      const email = { ...emailCache[fromFolder].emails[emailIndex], folder: toFolder };
      
      // Remove from source folder
      emailCache[fromFolder].emails.splice(emailIndex, 1);
      emailCache[fromFolder].total = Math.max(0, emailCache[fromFolder].total - 1);
      
      // Add to destination folder
      if (emailCache[toFolder]) {
        emailCache[toFolder].emails.unshift(email);
        emailCache[toFolder].total += 1;
      }
      
      // Update in detail cache
      if (emailDetailCache[emailId]) {
        emailDetailCache[emailId] = {
          email: { ...emailDetailCache[emailId].email, folder: toFolder },
          timestamp: Date.now()
        };
      }
      
      // Save to localStorage
      saveCache();
    }
  }
} 