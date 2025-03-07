'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarEvent, toSidebarEvent } from '@/app/api/calendar/types';
import { Calendar as CalendarIcon, Plus, X, Clock, MapPin, CalendarDays } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useCalendarContext } from './context/CalendarProvider';

// Add a fade-in animation
const AnimationStyles = () => (
  <style jsx global>{`
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out forwards;
    }
  `}</style>
);

// Create Event Modal Component
const CreateEventModal = () => {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [newEvent, setNewEvent] = useState({
    Subject: '',
    Start: '',
    End: '',
    Description: '',
    Location: '',
    IsAllDay: false
  });

  // Use the calendar context
  const { 
    showCreateEventModal, 
    setShowCreateEventModal
  } = useCalendarContext();

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        // Only close if not in the middle of creating an event
        if (!isCreating) {
          setShowCreateEventModal(false);
        }
      }
    };

    // Add event listener when modal is shown
    if (showCreateEventModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCreateEventModal, isCreating, setShowCreateEventModal]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isCreating) {
        setShowCreateEventModal(false);
      }
    };

    // Add event listener when modal is shown
    if (showCreateEventModal) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    // Clean up event listener
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showCreateEventModal, isCreating, setShowCreateEventModal]);

  // Set initial date-time values when opening the modal
  useEffect(() => {
    if (showCreateEventModal) {
      initializeNewEventDates();
    }
  }, [showCreateEventModal]);

  const initializeNewEventDates = () => {
    const now = new Date();
    const oneHourLater = new Date(now);
    oneHourLater.setHours(oneHourLater.getHours() + 1);
    
    // Format for datetime-local input (YYYY-MM-DDThh:mm)
    const formatDateForInput = (date: Date) => {
      return date.toISOString().split('.')[0].slice(0, -3);
    };
    
    setNewEvent({
      ...newEvent,
      Start: formatDateForInput(now),
      End: formatDateForInput(oneHourLater),
      IsAllDay: false
    });
  };

  const handleCreateEvent = async () => {
    try {
      setIsCreating(true);
      
      // Validate form
      if (!newEvent.Subject || !newEvent.Start || !newEvent.End) {
        toast.error('Please fill in all required fields');
        setIsCreating(false);
        return;
      }
      
      // Ensure end time is after start time
      const startDate = new Date(newEvent.Start);
      const endDate = new Date(newEvent.End);
      
      if (endDate < startDate) {
        toast.error('End time must be after start time');
        setIsCreating(false);
        return;
      }
      
      // For all-day events, ensure we have the correct format for API
      let eventToSubmit = { ...newEvent };
      
      if (newEvent.IsAllDay) {
        // For all-day events, set the time to start at 00:00 and end at 23:59
        const startDateStr = newEvent.Start;
        const endDateStr = newEvent.End;
        
        // Set start time to beginning of day
        const formattedStartDate = new Date(startDateStr);
        formattedStartDate.setHours(0, 0, 0, 0);
        
        // Set end time to end of day
        const formattedEndDate = new Date(endDateStr);
        formattedEndDate.setHours(23, 59, 59, 999);
        
        eventToSubmit = {
          ...newEvent,
          Start: formattedStartDate.toISOString(),
          End: formattedEndDate.toISOString()
        };
      }
      
      console.log('Creating new event:', eventToSubmit);
      
      // Create event
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventToSubmit),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Server error:', errorData);
        throw new Error(errorData.error || 'Failed to create event');
      }
      
      const createdEvent = await response.json();
      console.log('Event created successfully:', createdEvent);
      
      // Close modal and reset form
      setShowCreateEventModal(false);
      setNewEvent({
        Subject: '',
        Start: '',
        End: '',
        Description: '',
        Location: '',
        IsAllDay: false
      });
      
      toast.success('Real calendar integration coming soon!');
      
      // Force immediate refresh
      try {
        const refreshResponse = await fetch('/api/calendar');
        if (refreshResponse.ok) {
          const refreshedEvents = await refreshResponse.json();
          console.log(`Fetched ${refreshedEvents.length} events after creation`);
          
          // Dispatch refresh event to update the calendar
          window.dispatchEvent(new CustomEvent('calendar-refresh'));
        }
      } catch (error) {
        console.error('Error refreshing events after creation:', error);
      }
      
      // Refresh the calendar page
      router.refresh();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error(`${error instanceof Error ? error.message : 'Failed to create event'} (Real calendar integration coming soon)`);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle all-day checkbox change
  const handleAllDayChange = (isAllDay: boolean) => {
    const startDate = new Date(newEvent.Start);
    const endDate = new Date(newEvent.End);
    
    if (isAllDay) {
      // Convert to date-only format (YYYY-MM-DD)
      const startDateOnly = startDate.toISOString().slice(0, 10);
      const endDateOnly = endDate.toISOString().slice(0, 10);
      
      setNewEvent({
        ...newEvent,
        IsAllDay: true,
        Start: startDateOnly,
        End: endDateOnly
      });
    } else {
      // Convert back to datetime-local format (YYYY-MM-DDThh:mm)
      startDate.setHours(9, 0, 0); // Default to 9:00 AM
      endDate.setHours(10, 0, 0);  // Default to 10:00 AM
      
      setNewEvent({
        ...newEvent,
        IsAllDay: false,
        Start: startDate.toISOString().slice(0, 16),
        End: endDate.toISOString().slice(0, 16)
      });
    }
  };

  // Handle start time change
  const handleStartChange = (value: string) => {
    const newStart = new Date(value);
    let newEnd = new Date(newEvent.End);
    
    // If new start time is after end time, adjust end time
    if (newStart >= newEnd) {
      // For all-day events, set end date to same as start
      if (newEvent.IsAllDay) {
        newEnd = new Date(newStart);
      } else {
        // For regular events, set end time to 1 hour after start
        newEnd = new Date(newStart);
        newEnd.setHours(newEnd.getHours() + 1);
      }
      
      setNewEvent({
        ...newEvent,
        Start: value,
        End: newEvent.IsAllDay 
          ? newEnd.toISOString().slice(0, 10) 
          : newEnd.toISOString().slice(0, 16)
      });
    } else {
      setNewEvent({
        ...newEvent,
        Start: value
      });
    }
  };

  // Handle end time change
  const handleEndChange = (value: string) => {
    const newEnd = new Date(value);
    const startDate = new Date(newEvent.Start);
    
    // If new end time is before start time, don't update
    if (newEnd < startDate) {
      toast.error('End time cannot be before start time');
      return;
    }
    
    setNewEvent({
      ...newEvent,
      End: value
    });
  };

  if (!showCreateEventModal) return null;

  // Use createPortal to render the modal at the document body level
  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-200"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md overflow-hidden animate-fadeIn"
      >
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 id="modal-title" className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
            <CalendarDays size={20} className="mr-2 text-blue-500" />
            Create New Event
          </h3>
          <button 
            onClick={() => setShowCreateEventModal(false)}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Event Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="event-title">
              Event Title *
            </label>
            <input
              id="event-title"
              type="text"
              className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="Meeting with Client"
              value={newEvent.Subject}
              onChange={(e) => setNewEvent({...newEvent, Subject: e.target.value})}
              required
            />
          </div>
          
          {/* All Day Event */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="all-day"
              className="mr-2 h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
              checked={newEvent.IsAllDay}
              onChange={(e) => handleAllDayChange(e.target.checked)}
            />
            <label htmlFor="all-day" className="text-sm text-gray-700 dark:text-gray-300">
              All Day Event
            </label>
          </div>
          
          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="event-start">
              {newEvent.IsAllDay ? 'Start Date *' : 'Start Time *'}
            </label>
            <input
              id="event-start"
              type={newEvent.IsAllDay ? "date" : "datetime-local"}
              className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              value={newEvent.Start}
              onChange={(e) => handleStartChange(e.target.value)}
              max={newEvent.IsAllDay ? undefined : newEvent.End}
              required
            />
          </div>
          
          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="event-end">
              {newEvent.IsAllDay ? 'End Date *' : 'End Time *'}
            </label>
            <input
              id="event-end"
              type={newEvent.IsAllDay ? "date" : "datetime-local"}
              className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              value={newEvent.End}
              onChange={(e) => handleEndChange(e.target.value)}
              min={newEvent.Start}
              required
            />
          </div>
          
          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="event-location">
              <div className="flex items-center">
                <MapPin size={16} className="mr-1 text-gray-500 dark:text-gray-400" />
                <span>Location</span>
              </div>
            </label>
            <input
              id="event-location"
              type="text"
              className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="Conference Room A"
              value={newEvent.Location}
              onChange={(e) => setNewEvent({...newEvent, Location: e.target.value})}
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="event-description">
              Description
            </label>
            <textarea
              id="event-description"
              className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              rows={3}
              placeholder="Event details..."
              value={newEvent.Description}
              onChange={(e) => setNewEvent({...newEvent, Description: e.target.value})}
            />
          </div>
        </div>
        
        <div className="p-4 border-t dark:border-gray-700 flex justify-end space-x-2 bg-gray-50 dark:bg-gray-800">
          <button
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={() => setShowCreateEventModal(false)}
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors flex items-center shadow-sm"
            onClick={handleCreateEvent}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Clock size={16} className="mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Event'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface SidebarContentProps {
  events: CalendarEvent[];
}

const CalendarSidebarContent = ({ events }: SidebarContentProps) => {
  // Use the calendar context
  const { openCreateEventModal } = useCalendarContext();

  // Convert to sidebar events and get upcoming ones
  const upcomingEvents = events
    .map(toSidebarEvent)
    .filter(event => event.start >= new Date()) // Only future events
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 5);

  const formatEventTime = (event: { start: Date; end: Date }) => {
    const startTime = event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    
    // Format date based on how far in the future it is
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const isToday = event.start.getDate() === today.getDate() && 
                    event.start.getMonth() === today.getMonth() && 
                    event.start.getFullYear() === today.getFullYear();
                    
    const isTomorrow = event.start.getDate() === tomorrow.getDate() && 
                       event.start.getMonth() === tomorrow.getMonth() && 
                       event.start.getFullYear() === tomorrow.getFullYear();
    
    let dateStr = '';
    if (isToday) {
      dateStr = 'Today';
    } else if (isTomorrow) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = event.start.toLocaleDateString([], { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric'
      });
    }
    
    return `${dateStr} at ${startTime}`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AnimationStyles />
      
      {/* Create Event Button */}
      <div className="mb-6 px-1">
        <button
          className="w-full flex items-center justify-center p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transform hover:scale-[1.02] transition-all duration-200 shadow-sm hover:shadow-md"
          onClick={() => {
            console.log('New Event button clicked');
            // Use the openCreateEventModal method from context
            openCreateEventModal();
            // Also dispatch the event as a backup
            const event = new CustomEvent('showCreateEventModal');
            console.log('Dispatching showCreateEventModal event:', event);
            window.dispatchEvent(event);
            console.log('Event dispatched');
          }}
          style={{ pointerEvents: 'auto' }}
        >
          <Plus size={18} className="mr-2 animate-pulse" />
          <span>New Event</span>
        </button>
      </div>
      
      {/* Upcoming Events Section */}
      <div className="mb-6 overflow-y-auto">
        <div className="flex items-center mb-3 px-1">
          <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
          <p className="text-gray-400 text-sm">UPCOMING EVENTS</p>
        </div>
        
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-gray-500 italic px-1">No upcoming events</p>
        ) : (
          <ul className="space-y-3 px-1">
            {upcomingEvents.map(event => (
              <li key={event.id} className="text-sm bg-white rounded-md p-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                <p className="font-medium text-gray-800">{event.title}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {formatEventTime(event)}
                </p>
                {event.description && (
                  <p className="text-gray-600 text-xs mt-1 truncate">{event.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// Add the CreateEventModal component to be rendered alongside the app
const CalendarSidebarWithModal = (props: SidebarContentProps) => {
  return (
    <>
      <CalendarSidebarContent {...props} />
      <CreateEventModal />
    </>
  );
};

export default CalendarSidebarWithModal;