// Utility functions for jobs

// Import the cache constants
import { CACHE_KEY_PREFIX } from './constants';

// Utility function to clear all job caches
export function clearAllJobCaches() {
  // Find all keys that start with our prefix
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  
  // Remove all matching keys
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log(`🗑️ Cleared ${keysToRemove.length} job cache(s)`);
  
  return keysToRemove.length;
} 