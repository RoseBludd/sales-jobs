'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Email } from '../types';

interface EmailUpdateEvent extends CustomEvent {
  detail: {
    emails: Email[];
  };
}

// Create the email context
export const EmailContext = createContext<{
  emails: Email[];
  showCompose: boolean;
  setShowCompose: (show: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}>({
  emails: [],
  showCompose: false,
  setShowCompose: () => {},
  isLoading: false,
  setIsLoading: () => {},
});

// Custom hook to use the email context
export const useEmailContext = () => useContext(EmailContext);

interface EmailProviderProps {
  children: ReactNode;
}

export const EmailProvider = ({ children }: EmailProviderProps) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to emails updates
  useEffect(() => {
    const handleEmailUpdate = (event: EmailUpdateEvent) => {
      setEmails(event.detail.emails);
      setIsLoading(false);
    };
    
    window.addEventListener('emailsUpdated', handleEmailUpdate as EventListener);
    
    return () => {
      window.removeEventListener('emailsUpdated', handleEmailUpdate as EventListener);
    };
  }, []);

  return (
    <EmailContext.Provider
      value={{
        emails,
        showCompose,
        setShowCompose,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </EmailContext.Provider>
  );
};