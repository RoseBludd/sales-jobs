import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = process.env.REDIS_URL && process.env.REDIS_TOKEN
  ? new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN,
    })
  : null;

// Cache keys
const CACHE_KEYS = {
  EMAILS: (userId: string, folder: string = 'inbox') => `emails:${userId}:${folder}`,
  EMAIL: (emailId: string) => `email:${emailId}`,
  EMAIL_TIMESTAMP: (userId: string, folder: string = 'inbox') => `emails:timestamp:${userId}:${folder}`,
  CALENDAR_EVENTS: (userId: string, startDate: string, endDate: string) => 
    `events:${userId}:${startDate}:${endDate}`,
  CONTACTS: (userId: string) => `contacts:${userId}`,
};

// Default cache expiration times (in seconds)
const CACHE_EXPIRATION = {
  EMAILS: 300, // 5 minutes
  EMAIL: 600, // 10 minutes
  CALENDAR_EVENTS: 600, // 10 minutes
  CONTACTS: 1800, // 30 minutes
};

// Cache email list
export const cacheEmails = async (
  userId: string, 
  folder: string, 
  emails: any[], 
  expiration: number = CACHE_EXPIRATION.EMAILS
): Promise<void> => {
  if (!redis) return;
  
  try {
    const key = CACHE_KEYS.EMAILS(userId, folder);
    await redis.set(key, JSON.stringify(emails), { ex: expiration });
    
    // Also store the timestamp of when this cache was created
    const timestampKey = CACHE_KEYS.EMAIL_TIMESTAMP(userId, folder);
    await redis.set(timestampKey, Date.now(), { ex: expiration });
  } catch (error) {
    console.error('Redis caching error:', error);
  }
};

// Get cached email list
export const getCachedEmails = async (
  userId: string, 
  folder: string
): Promise<any[] | null> => {
  if (!redis) return null;
  
  try {
    const key = CACHE_KEYS.EMAILS(userId, folder);
    const cached = await redis.get(key);
    
    if (cached) {
      return JSON.parse(cached as string);
    }
    
    return null;
  } catch (error) {
    console.error('Redis retrieval error:', error);
    return null;
  }
};

// Check if the email cache is fresh (less than specified seconds old)
export const isEmailCacheFresh = async (
  userId: string,
  folder: string,
  maxAgeSeconds: number = 60 // Default to 1 minute
): Promise<boolean> => {
  if (!redis) return false;
  
  try {
    const timestampKey = CACHE_KEYS.EMAIL_TIMESTAMP(userId, folder);
    const timestamp = await redis.get(timestampKey);
    
    if (!timestamp) return false;
    
    const cachedTime = Number(timestamp);
    const now = Date.now();
    const ageInSeconds = (now - cachedTime) / 1000;
    
    return ageInSeconds < maxAgeSeconds;
  } catch (error) {
    console.error('Redis timestamp check error:', error);
    return false;
  }
};

// Cache email details
export const cacheEmail = async (
  emailId: string, 
  emailData: any, 
  expiration: number = CACHE_EXPIRATION.EMAIL
): Promise<void> => {
  if (!redis) return;
  
  try {
    const key = CACHE_KEYS.EMAIL(emailId);
    await redis.set(key, JSON.stringify(emailData), { ex: expiration });
  } catch (error) {
    console.error('Redis caching error:', error);
  }
};

// Get cached email details
export const getCachedEmail = async (emailId: string): Promise<any | null> => {
  if (!redis) return null;
  
  try {
    const key = CACHE_KEYS.EMAIL(emailId);
    const cached = await redis.get(key);
    
    if (cached) {
      return JSON.parse(cached as string);
    }
    
    return null;
  } catch (error) {
    console.error('Redis retrieval error:', error);
    return null;
  }
};

// Cache calendar events
export const cacheCalendarEvents = async (
  userId: string, 
  startDate: string, 
  endDate: string, 
  events: any[], 
  expiration: number = CACHE_EXPIRATION.CALENDAR_EVENTS
): Promise<void> => {
  if (!redis) return;
  
  try {
    const key = CACHE_KEYS.CALENDAR_EVENTS(userId, startDate, endDate);
    await redis.set(key, JSON.stringify(events), { ex: expiration });
  } catch (error) {
    console.error('Redis caching error:', error);
  }
};

// Get cached calendar events
export const getCachedCalendarEvents = async (
  userId: string, 
  startDate: string, 
  endDate: string
): Promise<any[] | null> => {
  if (!redis) return null;
  
  try {
    const key = CACHE_KEYS.CALENDAR_EVENTS(userId, startDate, endDate);
    const cached = await redis.get(key);
    
    if (cached) {
      return JSON.parse(cached as string);
    }
    
    return null;
  } catch (error) {
    console.error('Redis retrieval error:', error);
    return null;
  }
};

// Cache contacts
export const cacheContacts = async (
  userId: string, 
  contacts: any[], 
  expiration: number = CACHE_EXPIRATION.CONTACTS
): Promise<void> => {
  if (!redis) return;
  
  try {
    const key = CACHE_KEYS.CONTACTS(userId);
    await redis.set(key, JSON.stringify(contacts), { ex: expiration });
  } catch (error) {
    console.error('Redis caching error:', error);
  }
};

// Get cached contacts
export const getCachedContacts = async (userId: string): Promise<any[] | null> => {
  if (!redis) return null;
  
  try {
    const key = CACHE_KEYS.CONTACTS(userId);
    const cached = await redis.get(key);
    
    if (cached) {
      return JSON.parse(cached as string);
    }
    
    return null;
  } catch (error) {
    console.error('Redis retrieval error:', error);
    return null;
  }
};

// Invalidate cache for a specific key
export const invalidateCache = async (key: string): Promise<void> => {
  if (!redis) return;
  
  try {
    await redis.del(key);
  } catch (error) {
    console.error('Redis deletion error:', error);
  }
};

// Invalidate all email caches for a user
export const invalidateEmailCaches = async (userId: string): Promise<void> => {
  if (!redis) return;
  
  try {
    // Get all email cache keys for this user
    const pattern = `emails:${userId}:*`;
    const keys = await redis.keys(pattern);
    
    // Get all timestamp keys for this user
    const timestampPattern = `emails:timestamp:${userId}:*`;
    const timestampKeys = await redis.keys(timestampPattern);
    
    // Combine all keys to delete
    const allKeys = [...keys, ...timestampKeys];
    
    if (allKeys.length > 0) {
      await redis.del(...allKeys);
    }
  } catch (error) {
    console.error('Redis deletion error:', error);
  }
};

// Invalidate all calendar event caches for a user
export const invalidateCalendarCaches = async (userId: string): Promise<void> => {
  if (!redis) return;
  
  try {
    const pattern = `events:${userId}:*`;
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Redis deletion error:', error);
  }
}; 