'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to handle page transitions between different email folders
 * 
 * @param delay - The delay in milliseconds before resetting the transition state
 * @returns An object with the transition state and a function to trigger the transition
 */
function usePageTransition(delay = 300) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Function to trigger the transition
  const triggerTransition = useCallback(() => {
    setIsTransitioning(true);
    
    // Reset the transition state after the specified delay
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, delay);
    
    // Clean up the timer
    return () => clearTimeout(timer);
  }, [delay]);
  
  // Return the transition state and trigger function
  return {
    isTransitioning,
    triggerTransition
  };
}

export default usePageTransition; 