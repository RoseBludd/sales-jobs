'use client';

import { useState, useEffect } from 'react';

interface SmoothLoadingOptions {
  /**
   * Minimum loading time in milliseconds to avoid flashes
   */
  minLoadingTime?: number;
  
  /**
   * Delay before showing loading state to avoid flashes for quick loads
   */
  loadingDelay?: number;
  
  /**
   * Initial loading state
   */
  initialLoading?: boolean;
}

/**
 * Custom hook for smooth loading transitions
 * Prevents loading flashes by ensuring minimum loading times
 * and delaying the loading indicator for quick operations
 */
function useSmoothLoading(
  isActuallyLoading: boolean,
  options: SmoothLoadingOptions = {}
) {
  const {
    minLoadingTime = 500,
    loadingDelay = 200,
    initialLoading = false
  } = options;

  const [isLoadingDelayed, setIsLoadingDelayed] = useState(initialLoading);
  const [showLoading, setShowLoading] = useState(initialLoading);
  
  // Handle showing loading state with delay
  useEffect(() => {
    let delayTimer: NodeJS.Timeout | null = null;
    let minLoadingTimer: NodeJS.Timeout | null = null;
  
    if (isActuallyLoading) {
      // Set a delay before showing loading UI
      delayTimer = setTimeout(() => {
        setIsLoadingDelayed(true);
      }, loadingDelay);
    } else {
      // Ensure loading state shows for at least minLoadingTime once visible
      if (isLoadingDelayed) {
        minLoadingTimer = setTimeout(() => {
          setIsLoadingDelayed(false);
        }, minLoadingTime);
      } else {
        setIsLoadingDelayed(false);
      }
    }
  
    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      if (minLoadingTimer) clearTimeout(minLoadingTimer);
    };
  }, [isActuallyLoading, isLoadingDelayed, loadingDelay, minLoadingTime]);
  
  // Handle smooth transitions between loading states
  useEffect(() => {
    let transitionTimer: NodeJS.Timeout | null = null;
    
    if (isLoadingDelayed) {
      setShowLoading(true);
    } else {
      // Add a small delay before hiding loading UI for smooth transitions
      transitionTimer = setTimeout(() => {
        setShowLoading(false);
      }, 100);
    }
    
    return () => {
      if (transitionTimer) clearTimeout(transitionTimer);
    };
  }, [isLoadingDelayed]);

  return { isLoading: showLoading };
}

export default useSmoothLoading; 