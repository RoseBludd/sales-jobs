'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { CalendarEvent } from '@/app/api/calendar/types';

// Create the calendar context
export const CalendarContext = createContext<{
  events: CalendarEvent[];
  showCreateEventModal: boolean;
  setShowCreateEventModal: (show: boolean) => void;
  openCreateEventModal: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  selectedEvent: CalendarEvent | null;
  setSelectedEvent: (event: CalendarEvent | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
}>({
  events: [],
  showCreateEventModal: false,
  setShowCreateEventModal: () => {},
  openCreateEventModal: () => {},
  isLoading: false,
  setIsLoading: () => {},
  selectedEvent: null,
  setSelectedEvent: () => {},
  error: null,
  setError: () => {},
});

// Custom hook to use the calendar context
export const useCalendarContext = () => useContext(CalendarContext);

interface CalendarProviderProps {
  children: ReactNode;
}

export const CalendarProvider = ({ children }: CalendarProviderProps) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to toggle create event modal visibility
  const handleSetShowCreateEventModal = (show: boolean) => {
    console.log('Setting showCreateEventModal to:', show);
    setShowCreateEventModal(show);
  };

  // Function to open create event modal
  const openCreateEventModal = useCallback(() => {
    console.log('openCreateEventModal called in context');
    setShowCreateEventModal(true);
  }, []);

  // Subscribe to calendar events updates
  useEffect(() => {
    // Add listener for showCreateEventModal event
    const handleShowCreateEventModal = () => {
      console.log('showCreateEventModal event received');
      setShowCreateEventModal(true);
    };
    
    window.addEventListener('showCreateEventModal', handleShowCreateEventModal);
    
    // Add listener for calendar refresh events
    const handleCalendarRefresh = () => {
      console.log('calendar-refresh event received');
      // You could add logic here to refresh the calendar data if needed
    };
    
    window.addEventListener('calendar-refresh', handleCalendarRefresh);
    
    return () => {
      window.removeEventListener('showCreateEventModal', handleShowCreateEventModal);
      window.removeEventListener('calendar-refresh', handleCalendarRefresh);
    };
  }, []);

  return (
    <CalendarContext.Provider
      value={{
        events,
        showCreateEventModal,
        setShowCreateEventModal: handleSetShowCreateEventModal,
        openCreateEventModal,
        isLoading,
        setIsLoading,
        selectedEvent,
        setSelectedEvent,
        error,
        setError,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}; 