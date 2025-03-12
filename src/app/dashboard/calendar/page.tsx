'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2, X, Clock, MapPin, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { useCalendarContext } from './context/CalendarProvider';
import EventForm, { EventFormData } from './components/EventForm';
import { 
  fetchCalendarEvents, 
  getCalendarEventById, 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent,
  CalendarEvent
} from './services/calendarService';
import { Contact } from './services/contactsService';
import AttendeesList from './components/AttendeesList';
import { useRouter } from 'next/navigation';

interface EventDetailModalProps {
  event: CalendarEvent;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
}

const EventDetailModal = ({ event, onClose, onEdit, onDelete }: EventDetailModalProps) => {
  const startDate = new Date(event.Start);
  const endDate = new Date(event.End);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      setIsDeleting(true);
      try {
        await deleteCalendarEvent(event.Id);
        toast.success('Event deleted successfully');
        onDelete(event.Id);
        onClose();
      } catch (error) {
        console.error('Failed to delete event:', error);
        toast.error('Failed to delete event');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {event.Subject}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
            <div>
              <p className="text-gray-900 dark:text-white">
                {event.IsAllDay ? (
                  <>
                    All day · {startDate.toLocaleDateString()}
                    {startDate.toDateString() !== endDate.toDateString() && 
                      ` - ${endDate.toLocaleDateString()}`}
                  </>
                ) : (
                  <>
                    {formatDateTime(startDate)}
                    <br />
                    to {formatDateTime(endDate)}
                  </>
                )}
              </p>
            </div>
          </div>
          
          {event.Location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
              <p className="text-gray-900 dark:text-white">{event.Location}</p>
            </div>
          )}
          
          {event.Attendees && event.Attendees.length > 0 && (
            <AttendeesList attendees={event.Attendees} compact={true} />
          )}
          
          {event.Description && (
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{event.Description}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-6 border-t dark:border-gray-700">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
          <button
            onClick={() => onEdit(event)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

type ViewType = 'month' | 'week' | 'day';

const dateHelpers = {
  daysInMonth: (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  },
  firstDayOfMonth: (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  },
  getMonthName: (month: number): string => {
    return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2024, month));
  },
  formatTime: (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  },
  formatDate: (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }
};

interface ViewToggleProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const ViewToggle = ({ activeView, onViewChange }: ViewToggleProps) => {
  return (
    <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-md p-1">
      {(['month', 'week', 'day'] as ViewType[]).map((view) => (
        <button
          key={view}
          className={`px-3 py-1 rounded-md text-sm ${
            activeView === view
              ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-white'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => onViewChange(view)}
        >
          {view.charAt(0).toUpperCase() + view.slice(1)}
        </button>
      ))}
    </div>
  );
};

interface CalendarHeaderProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  onCreateEvent: () => void;
  onRefresh: () => void;
}

const CalendarHeader = ({ 
  currentDate,
  onPrevMonth,
  onNextMonth,
  activeView,
  onViewChange,
  onCreateEvent,
  onRefresh
}: CalendarHeaderProps) => {
  const getHeaderText = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (activeView === 'month') {
      return `${dateHelpers.getMonthName(month)} ${year}`;
    } else if (activeView === 'week') {
      const weekStart = new Date(currentDate);
      const day = currentDate.getDay();
      weekStart.setDate(currentDate.getDate() - day);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };
      
      return `${formatDate(weekStart)} - ${formatDate(weekEnd)}, ${currentDate.getFullYear()}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mr-4">{getHeaderText()}</h2>
        <div className="flex space-x-1">
          <button 
            onClick={onPrevMonth}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button 
            onClick={onNextMonth}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={onRefresh}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 ml-2"
            aria-label="Refresh"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      <ViewToggle activeView={activeView} onViewChange={onViewChange} />
      <button
        onClick={onCreateEvent}
        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
      >
        <span className="hidden sm:inline">Create Event</span>
        <span className="sm:hidden">+</span>
      </button>
    </div>
  );
};

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
}

// Create a separate component for each day cell to avoid conditional hook calls
const DayCell = ({ 
  day, 
  month, 
  year, 
  events, 
  isToday,
  onSelectEvent 
}: { 
  day: number | null; 
  month: number; 
  year: number; 
  events: CalendarEvent[]; 
  isToday: (day: number) => boolean;
  onSelectEvent: (event: CalendarEvent) => void;
}) => {
  if (day === null) {
    return (
      <div
        className="border-r border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
      />
    );
  }
  
  const getEventsForDay = (day: number): CalendarEvent[] => {
    const date = new Date(year, month, day);
    
    return events.filter(event => {
      try {
        // Safely parse dates with error handling
        let eventStart: Date;
        let eventEnd: Date;
        
        try {
          eventStart = new Date(event.Start);
          // Check if date is valid
          if (isNaN(eventStart.getTime())) {
            console.warn(`Invalid start date for event: ${event.Subject}`);
            return false;
          }
        } catch (e) {
          console.warn(`Error parsing start date for event: ${event.Subject}`, e);
          return false;
        }
        
        try {
          eventEnd = new Date(event.End);
          // Check if date is valid
          if (isNaN(eventEnd.getTime())) {
            console.warn(`Invalid end date for event: ${event.Subject}`);
            eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // Default to start + 1 hour
          }
        } catch (e) {
          console.warn(`Error parsing end date for event: ${event.Subject}`, e);
          eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // Default to start + 1 hour
        }
        
        // Check if the event is on this day
        const eventStartDay = new Date(
          eventStart.getFullYear(), 
          eventStart.getMonth(), 
          eventStart.getDate()
        );
        
        const eventEndDay = new Date(
          eventEnd.getFullYear(), 
          eventEnd.getMonth(), 
          eventEnd.getDate()
        );
        
        const currentDay = new Date(year, month, day);
        
        // Check if the event is on this day (start, end, or spans over it)
        return (
          // Event starts on this day
          (eventStart.getDate() === day && eventStart.getMonth() === month && eventStart.getFullYear() === year) ||
          // Event ends on this day
          (eventEnd.getDate() === day && eventEnd.getMonth() === month && eventEnd.getFullYear() === year) ||
          // All-day event that spans over this day
          (event.IsAllDay && currentDay >= eventStartDay && currentDay <= eventEndDay) ||
          // Multi-day event that spans over this day
          (!event.IsAllDay && currentDay >= eventStartDay && currentDay <= eventEndDay)
        );
      } catch (error) {
        console.error(`Error processing event for day ${day}:`, error);
        return false;
      }
    });
  };
  
  const dayEvents = getEventsForDay(day);
  const isCurrentDay = isToday(day);
  
  return (
    <div
      className={`relative p-2 border-r border-b dark:border-gray-700 transition-colors
        ${isCurrentDay ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
    >
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm
        ${isCurrentDay
          ? 'bg-blue-500 text-white font-semibold'
          : 'text-gray-700 dark:text-gray-300'}`}
      >
        {day}
      </span>
      <div className="mt-1 space-y-1 max-h-[calc(100%-2rem)] overflow-y-auto">
        {dayEvents.map((event) => (
          <button
            key={event.Id}
            onClick={() => onSelectEvent(event)}
            className={`w-full text-left px-2 py-1 rounded text-xs font-medium truncate
              ${event.IsAllDay
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'}
              hover:opacity-90 transition-opacity`}
          >
            {event.Subject}
          </button>
        ))}
      </div>
    </div>
  );
};

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  setSelectedEvent: (event: CalendarEvent | null) => void;
}

const MonthView = ({ currentDate, events, setSelectedEvent }: MonthViewProps) => {
  
  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };
  
  const days = dateHelpers.daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = dateHelpers.firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const emptyCells = Array.from({ length: firstDay }, () => null);
  const allCells = [...emptyCells, ...Array.from({ length: days }, (_, i) => i + 1)];
  const weeks = [];
  
  for (let i = 0; i < allCells.length; i += 7) {
    weeks.push(allCells.slice(i, i + 7));
  }
  
  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="grid grid-cols-7 border-b dark:border-gray-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 h-[calc(100vh-16rem)]">
          {weeks.map((week, weekIndex) => (
            <React.Fragment key={weekIndex}>
              {week.map((day, dayIndex) => (
                <DayCell 
                  key={`cell-${weekIndex}-${dayIndex}`} 
                  day={day} 
                  month={currentDate.getMonth()}
                  year={currentDate.getFullYear()}
                  events={events}
                  isToday={isToday}
                  onSelectEvent={setSelectedEvent}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
      
    </>
  );
};

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
}

// Create a separate component for each event in the week view
const WeekEventItem = ({ 
  event, 
  onSelectEvent 
}: { 
  event: CalendarEvent; 
  onSelectEvent: (event: CalendarEvent) => void;
}) => {
  return (
    <button
      key={event.Id}
      onClick={() => onSelectEvent(event)}
      className={`w-full text-left px-2 py-1 mb-1 rounded text-xs font-medium truncate
        ${event.IsAllDay
          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
          : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'}
        hover:opacity-90 transition-opacity`}
    >
      {event.Subject}
    </button>
  );
};

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  setSelectedEvent: (event: CalendarEvent | null) => void;
}

const WeekView = ({ currentDate, events, setSelectedEvent }: WeekViewProps) => {
  // Get the start of the week (Sunday)
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  
  // Create an array of dates for the week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });
  
  // Create time slots for the day (7 AM to 7 PM)
  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    return `${i + 7}:00`;
  });
  
  // Group events by day
  const eventsByDay = weekDays.map(date => {
    // Filter events for this day
    const dayEvents = events.filter(event => {
      try {
        // Safely parse dates with error handling
        let eventStart: Date;
        let eventEnd: Date;
        
        try {
          eventStart = new Date(event.Start);
          // Check if date is valid
          if (isNaN(eventStart.getTime())) {
            return false;
          }
        } catch (e) {
          return false;
        }
        
        try {
          eventEnd = new Date(event.End);
          // Check if date is valid
          if (isNaN(eventEnd.getTime())) {
            eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // Default to start + 1 hour
          }
        } catch (e) {
          eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // Default to start + 1 hour
        }
        
        // Check if the event is on this day
        const eventStartDay = new Date(
          eventStart.getFullYear(), 
          eventStart.getMonth(), 
          eventStart.getDate()
        );
        
        const eventEndDay = new Date(
          eventEnd.getFullYear(), 
          eventEnd.getMonth(), 
          eventEnd.getDate()
        );
        
        const currentDay = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        );
        
        // Check if the event is on this day (start, end, or spans over it)
        return (
          // Same day event
          (eventStart.getFullYear() === date.getFullYear() && 
           eventStart.getMonth() === date.getMonth() && 
           eventStart.getDate() === date.getDate()) ||
          // Event ends on this day
          (eventEnd.getFullYear() === date.getFullYear() && 
           eventEnd.getMonth() === date.getMonth() && 
           eventEnd.getDate() === date.getDate()) ||
          // Multi-day event that spans over this day
          (currentDay >= eventStartDay && currentDay <= eventEndDay)
        );
      } catch (error) {
        return false;
      }
    });
    
    // Separate all-day events
    const allDayEvents = dayEvents.filter(event => event.IsAllDay);
    
    // Regular events
    const regularEvents = dayEvents.filter(event => !event.IsAllDay);
    
    return {
      date,
      allDayEvents,
      regularEvents
    };
  });
  
  // Function to check if a date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };
  
  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="grid grid-cols-8 border-b dark:border-gray-700">
          <div className="py-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-r dark:border-gray-700">
            Time
          </div>
          {weekDays.map((date) => (
            <div 
              key={date.toISOString()} 
              className={`py-2 text-center text-sm font-medium 
                ${isToday(date) 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400'}`}
            >
              {dateHelpers.formatDate(date)}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-8 h-[calc(100vh-16rem)] overflow-y-auto">
          {timeSlots.map((hour) => (
            <React.Fragment key={hour}>
              <div className="border-r border-b dark:border-gray-700 p-1 text-xs text-gray-500 dark:text-gray-400">
                {hour === '7:00' ? '12 AM' : hour < '12:00' ? hour : hour === '12:00' ? '12 PM' : `${parseInt(hour.split(':')[0]) - 12} PM`}
              </div>
              
              {weekDays.map((date, index) => {
                const eventsAtHour = eventsByDay[index].regularEvents.filter(event => {
                  if (event.IsAllDay) return false;
                  const eventStart = new Date(event.Start);
                  return eventStart.getHours() === parseInt(hour.split(':')[0]);
                });
                
                return (
                  <div 
                    key={`${date.toISOString()}-${hour}`} 
                    className={`border-r border-b dark:border-gray-700 p-1 relative
                      ${isToday(date) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                  >
                    {eventsAtHour.map(event => (
                      <WeekEventItem 
                        key={event.Id} 
                        event={event} 
                        onSelectEvent={setSelectedEvent} 
                      />
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        
        <div className="grid grid-cols-8 border-t dark:border-gray-700">
          <div className="py-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-r dark:border-gray-700">
            All Day
          </div>
          
          {weekDays.map((date, index) => {
            const allDayEvents = eventsByDay[index].allDayEvents;
            
            return (
              <div 
                key={`allday-${date.toISOString()}`} 
                className={`p-1 ${isToday(date) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
              >
                {allDayEvents.map(event => (
                  <WeekEventItem 
                    key={event.Id} 
                    event={event} 
                    onSelectEvent={setSelectedEvent} 
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      
    </>
  );
};

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
}

// Create a separate component for each event in the day view
const DayEventItem = ({ 
  event, 
  onSelectEvent 
}: { 
  event: CalendarEvent; 
  onSelectEvent: (event: CalendarEvent) => void;
}) => {
  return (
    <button
      onClick={() => onSelectEvent(event)}
      className={`w-full text-left p-2 mb-2 rounded text-sm font-medium
        ${event.IsAllDay
          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
          : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'}
        hover:opacity-90 transition-opacity`}
    >
      <div className="font-medium">{event.Subject}</div>
      {!event.IsAllDay && (
        <div className="text-xs mt-1 flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          {dateHelpers.formatTime(new Date(event.Start))} - {dateHelpers.formatTime(new Date(event.End))}
        </div>
      )}
      {event.Location && (
        <div className="text-xs mt-1 flex items-center">
          <MapPin className="w-3 h-3 mr-1" />
          {event.Location}
        </div>
      )}
      {event.Attendees && event.Attendees.length > 0 && (
        <div className="text-xs mt-1 flex items-center">
          <Users className="w-3 h-3 mr-1" />
          {event.Attendees.length} attendee{event.Attendees.length !== 1 ? 's' : ''}
        </div>
      )}
    </button>
  );
};

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  setSelectedEvent: (event: CalendarEvent | null) => void;
}

const DayView = ({ currentDate, events, setSelectedEvent }: DayViewProps) => {
  // Create time slots for the day (7 AM to 7 PM)
  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    return `${i + 7}:00`;
  });
  
  // Filter events for this day
  const dayEvents = events.filter(event => {
    try {
      // Safely parse dates with error handling
      let eventStart: Date;
      let eventEnd: Date;
      
      try {
        eventStart = new Date(event.Start);
        // Check if date is valid
        if (isNaN(eventStart.getTime())) {
          return false;
        }
      } catch (e) {
        return false;
      }
      
      try {
        eventEnd = new Date(event.End);
        // Check if date is valid
        if (isNaN(eventEnd.getTime())) {
          eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // Default to start + 1 hour
        }
      } catch (e) {
        eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // Default to start + 1 hour
      }
      
      // Check if the event is on this day
      return (
        // Same day event
        (eventStart.getFullYear() === currentDate.getFullYear() && 
         eventStart.getMonth() === currentDate.getMonth() && 
         eventStart.getDate() === currentDate.getDate()) ||
        // Event ends on this day
        (eventEnd.getFullYear() === currentDate.getFullYear() && 
         eventEnd.getMonth() === currentDate.getMonth() && 
         eventEnd.getDate() === currentDate.getDate()) ||
        // Multi-day event that spans over this day
        (new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()) >= 
         new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()) && 
         new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()) <= 
         new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate()))
      );
    } catch (error) {
      return false;
    }
  });
  
  // Separate all-day events
  const allDayEvents = dayEvents.filter(event => event.IsAllDay);
  
  // Group regular events by hour
  const eventsByHour = timeSlots.map(hour => {
    const hourNum = parseInt(hour.split(':')[0]);
    
    // Filter events that occur during this hour
    const eventsAtHour = dayEvents.filter(event => {
      if (event.IsAllDay) return false;
      
      try {
        const eventStart = new Date(event.Start);
        const eventStartHour = eventStart.getHours();
        
        return eventStartHour === hourNum;
      } catch (e) {
        return false;
      }
    });
    
    return {
      hour,
      events: eventsAtHour
    };
  });
  
  // Function to check if the current date is today
  const isToday = () => {
    const today = new Date();
    return (
      currentDate.getDate() === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };
  
  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className={`text-xl font-semibold ${isToday() ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
            {currentDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}
            {isToday() && <span className="ml-2 text-sm bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">Today</span>}
          </h2>
        </div>
        
        {allDayEvents.length > 0 && (
          <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">ALL DAY</h3>
            <div className="space-y-2">
              {allDayEvents.map(event => (
                <DayEventItem 
                  key={event.Id} 
                  event={event} 
                  onSelectEvent={setSelectedEvent} 
                />
              ))}
            </div>
          </div>
        )}
        
        <div className="overflow-y-auto h-[calc(100vh-20rem)]">
          {eventsByHour.map(({ hour, events }) => (
            <div key={hour} className="border-b dark:border-gray-700 flex">
              <div className="w-20 p-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400 border-r dark:border-gray-700">
                {hour === '7:00' ? '12 AM' : hour < '12:00' ? hour : hour === '12:00' ? '12 PM' : `${parseInt(hour.split(':')[0]) - 12} PM`}
              </div>
              <div className="flex-1 p-2">
                {events.map(event => (
                  <DayEventItem 
                    key={event.Id} 
                    event={event} 
                    onSelectEvent={setSelectedEvent} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </>
  );
};

interface ViewWrapperProps {
  currentDate: Date;
  events: CalendarEvent[];
  setSelectedEvent: (event: CalendarEvent | null) => void;
}

const MonthViewWrapper = ({ currentDate, events, setSelectedEvent }: ViewWrapperProps) => (
  <MonthView currentDate={currentDate} events={events} setSelectedEvent={setSelectedEvent} />
);

const WeekViewWrapper = ({ currentDate, events, setSelectedEvent }: ViewWrapperProps) => (
  <WeekView currentDate={currentDate} events={events} setSelectedEvent={setSelectedEvent} />
);

const DayViewWrapper = ({ currentDate, events, setSelectedEvent }: ViewWrapperProps) => (
  <DayView currentDate={currentDate} events={events} setSelectedEvent={setSelectedEvent} />
);

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );
}

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [activeView, setActiveView] = useState<ViewType>('month');
  
  // Use the calendar context
  const { 
    isLoading, 
    setIsLoading, 
    selectedEvent, 
    setSelectedEvent, 
    error, 
    setError,
    refreshNeeded,
    setRefreshNeeded
  } = useCalendarContext();
  
  const hasLoadedRef = useRef(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Load calendar events
  const loadCalendarEvents = useCallback(() => {
    setIsLoading(true);
    setError(null);
    
    // Calculate the first day of the month
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    // Calculate the last day of the month
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Extend the range to include a wider range (3 months before and after)
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);
    
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 4, 0);
    
    console.log('Fetching calendar events from', startDate.toISOString(), 'to', endDate.toISOString());
    console.log('Current date is', currentDate.toISOString());
    
    // Fetch events for the extended range
    fetchCalendarEvents(startDate, endDate)
      .then(events => {
        console.log(`Loaded ${events.length} calendar events`);
        
        // Validate events
        const validEvents = events.filter(event => {
          try {
            // Check if event has required fields
            if (!event.Id || !event.Subject) {
              console.warn('Event missing required fields:', event);
              return false;
            }
            
            // Validate dates
            try {
              new Date(event.Start);
              new Date(event.End);
            } catch (e) {
              console.warn(`Invalid date in event ${event.Subject}`, e);
              return false;
            }
            
            return true;
          } catch (error) {
            console.error('Error validating event:', error);
            return false;
          }
        });
        
        console.log(`Filtered to ${validEvents.length} valid events`);
        
        if (validEvents.length === 0) {
          console.log('No valid events found in the date range. This might be due to:');
          console.log('1. No events exist in the specified date range');
          console.log('2. The API call is not returning events correctly');
          console.log('3. There might be a caching issue');
          
          // Try with an even wider date range as a test
          const veryWideStartDate = new Date(currentDate.getFullYear() - 1, 0, 1); // Start of last year
          const veryWideEndDate = new Date(currentDate.getFullYear() + 1, 11, 31); // End of next year
          
          console.log('Trying with a very wide date range as a test:');
          console.log('From:', veryWideStartDate.toISOString());
          console.log('To:', veryWideEndDate.toISOString());
          
          fetchCalendarEvents(veryWideStartDate, veryWideEndDate)
            .then(wideRangeEvents => {
              console.log(`Wide range query returned ${wideRangeEvents.length} events`);
              
              // Validate wide range events
              const validWideRangeEvents = wideRangeEvents.filter(event => {
                try {
                  // Check if event has required fields
                  if (!event.Id || !event.Subject) {
                    return false;
                  }
                  
                  // Validate dates
                  try {
                    new Date(event.Start);
                    new Date(event.End);
                  } catch (e) {
                    return false;
                  }
                  
                  return true;
                } catch (error) {
                  return false;
                }
              });
              
              console.log(`Filtered to ${validWideRangeEvents.length} valid wide range events`);
              
              if (validWideRangeEvents.length > 0) {
                console.log('Events found with wider range! Updating state with these events.');
                setEvents(validWideRangeEvents);
              } else {
                // Try direct API call as a last resort
                console.log('No events found with wider range. Trying direct API call...');
                fetchEventsDirectly();
              }
            })
            .catch(wideRangeError => {
              console.error('Error fetching with wide range:', wideRangeError);
              // Try direct API call as a last resort
              fetchEventsDirectly();
            })
            .finally(() => {
              setIsLoading(false);
            });
        } else {
          console.log('First event:', validEvents[0]);
          setEvents(validEvents);
          setIsLoading(false);
        }
      })
      .catch(error => {
        console.error('Failed to fetch calendar events:', error);
        setError('Failed to load calendar events. Please try again later.');
        setIsLoading(false);
        
        // Try direct API call as a fallback
        fetchEventsDirectly();
      });
  }, [currentDate]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      loadCalendarEvents();
      hasLoadedRef.current = true;
    }
  }, []);

  // Add an event listener for calendar-refresh events
  useEffect(() => {
    const handleCalendarRefresh = () => {
      console.log('calendar-refresh event received in page component');
      loadCalendarEvents();
    };
    
    window.addEventListener('calendar-refresh', handleCalendarRefresh);
    
    // Add listener for calendar-refresh-with-data events
    const handleCalendarRefreshWithData = (event: CustomEvent) => {
      console.log('calendar-refresh-with-data event received with data');
      if (event.detail && event.detail.events) {
        console.log(`Received ${event.detail.events.length} events from direct API call`);
        setEvents(event.detail.events);
        setIsLoading(false);
      }
    };
    
    window.addEventListener('calendar-refresh-with-data', handleCalendarRefreshWithData as EventListener);
    
    return () => {
      window.removeEventListener('calendar-refresh', handleCalendarRefresh);
      window.removeEventListener('calendar-refresh-with-data', handleCalendarRefreshWithData as EventListener);
    };
  }, [loadCalendarEvents]);

  // Add a useEffect to check the refreshNeeded flag
  useEffect(() => {
    if (refreshNeeded) {
      console.log('Refresh needed flag detected, reloading calendar events');
      loadCalendarEvents();
      setRefreshNeeded(false);
    }
  }, [refreshNeeded, setRefreshNeeded, loadCalendarEvents]);

  // Add a more robust refresh mechanism
  useEffect(() => {
    // Function to refresh events
    const refreshEvents = () => {
      console.log('Refreshing calendar events');
      loadCalendarEvents();
    };

    // Set up interval to check for new events every 30 seconds
    const intervalId = setInterval(refreshEvents, 30000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [loadCalendarEvents]);

  // Add a function to make a direct API call to fetch events
  const fetchEventsDirectly = async () => {
    try {
      console.log('Making direct API call to fetch events');
      
      // Calculate a very wide date range
      const startDate = new Date(new Date().getFullYear() - 1, 0, 1); // Start of last year
      const endDate = new Date(new Date().getFullYear() + 1, 11, 31); // End of next year
      
      const response = await fetch(
        `/api/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&bypass_cache=true`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch events directly');
      }
      
      const data = await response.json();
      console.log(`Direct API call returned ${data.events?.length || 0} events`);
      
      if (data.events && data.events.length > 0) {
        // Validate and normalize events
        const validEvents = data.events.filter((event: any) => {
          try {
            // Check if event has required fields
            if (!event.Id && !event.id) {
              console.warn('Event missing ID:', event);
              return false;
            }
            
            // Validate dates
            try {
              new Date(event.Start || event.start);
              new Date(event.End || event.end);
            } catch (e) {
              console.warn(`Invalid date in event ${event.Subject || event.subject}`, e);
              return false;
            }
            
            return true;
          } catch (error) {
            console.error('Error validating event:', error);
            return false;
          }
        }).map((event: any) => {
          // Normalize event structure
          return {
            Id: event.Id || event.id,
            Subject: event.Subject || event.subject || 'No Subject',
            Start: event.Start || event.start,
            End: event.End || event.end,
            Description: event.Description || event.description || '',
            Location: event.Location || event.location || '',
            IsAllDay: event.IsAllDay || event.isAllDay || false,
            Attendees: event.Attendees || event.attendees || []
          };
        });
        
        console.log(`Normalized ${validEvents.length} events from direct API call`);
        
        if (validEvents.length > 0) {
          console.log('Valid events found with direct API call! Updating state.');
          setEvents(validEvents);
          setIsLoading(false);
          
          // Dispatch event to notify other components
          const refreshEvent = new CustomEvent('calendar-refresh-with-data', {
            detail: { events: validEvents }
          });
          window.dispatchEvent(refreshEvent);
          
          return validEvents;
        } else {
          console.log('No valid events found with direct API call.');
          setIsLoading(false);
          return [];
        }
      } else {
        console.log('No events found with direct API call.');
        setIsLoading(false);
        return [];
      }
    } catch (error) {
      console.error('Error making direct API call:', error);
      setIsLoading(false);
      return [];
    }
  };

  // Call the direct API function when the component mounts
  useEffect(() => {
    fetchEventsDirectly();
  }, []);

  // Show loading state
  if (status === 'loading' || isLoading) {
    return <LoadingSpinner />;
  }

  // Navigation handlers
  const handleDateChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    if (activeView === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (activeView === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (activeView === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    
    setCurrentDate(newDate);
    loadCalendarEvents();
  };

  // Add a manual refresh handler
  const handleManualRefresh = async () => {
    toast.success('Refreshing calendar events...');
    setIsLoading(true);
    
    try {
      // First try a direct API call
      const events = await fetchEventsDirectly();
      
      if (events.length === 0) {
        // If no events found, try the regular load
        loadCalendarEvents();
      }
      
      // Force a router refresh
      router.refresh();
    } catch (error) {
      console.error('Error during manual refresh:', error);
      toast.error('Failed to refresh events');
      setIsLoading(false);
    }
  };

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setShowEventForm(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setShowEventForm(true);
    setSelectedEvent(null);
  };

  const handleCloseEventForm = () => {
    setShowEventForm(false);
    setEditingEvent(null);
  };

  const handleSubmitEvent = async (formData: EventFormData) => {
    try {
      if (editingEvent) {
        // Update existing event
        await updateCalendarEvent({
          id: editingEvent.Id,
          subject: formData.subject,
          start: new Date(formData.start).toISOString(),
          end: new Date(formData.end).toISOString(),
          location: formData.location,
          description: formData.description,
          isAllDay: formData.isAllDay
        });
        
        toast.success('Event updated successfully');
      } else {
        // Create new event
        const eventId = await createCalendarEvent({
          subject: formData.subject,
          start: new Date(formData.start).toISOString(),
          end: new Date(formData.end).toISOString(),
          location: formData.location,
          description: formData.description,
          isAllDay: formData.isAllDay,
          attendees: formData.attendees
        });
        
        console.log('Event created with ID:', eventId);
        toast.success('Event created successfully');
      }
      
      // Set the refresh flag
      setRefreshNeeded(true);
      
      // Refresh calendar events immediately
      loadCalendarEvents();
      
      // Also trigger a refresh after a short delay to ensure backend sync
      setTimeout(() => {
        console.log('Delayed refresh after event creation/update');
        loadCalendarEvents();
      }, 1000);
    } catch (error) {
      console.error('Failed to save event:', error);
      toast.error(editingEvent ? 'Failed to update event' : 'Failed to create event');
      throw error;
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    // Refresh calendar events after deletion
    loadCalendarEvents();
  };

  // Render calendar
  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <CalendarHeader
          currentDate={currentDate}
          onPrevMonth={() => handleDateChange('prev')}
          onNextMonth={() => handleDateChange('next')}
          activeView={activeView}
          onViewChange={setActiveView}
          onCreateEvent={handleCreateEvent}
          onRefresh={handleManualRefresh}
        />
      </div>

      {activeView === 'week' ? (
        <WeekViewWrapper currentDate={currentDate} events={events} setSelectedEvent={setSelectedEvent} />
      ) : activeView === 'day' ? (
        <DayViewWrapper currentDate={currentDate} events={events} setSelectedEvent={setSelectedEvent} />
      ) : (
        <MonthViewWrapper currentDate={currentDate} events={events} setSelectedEvent={setSelectedEvent} />
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
        />
      )}

      {showEventForm && (
        <EventForm
          isOpen={showEventForm}
          onClose={handleCloseEventForm}
          onSubmit={handleSubmitEvent}
          initialData={editingEvent ? {
            id: editingEvent.Id,
            subject: editingEvent.Subject,
            start: editingEvent.Start,
            end: editingEvent.End,
            location: editingEvent.Location,
            description: editingEvent.Description,
            isAllDay: editingEvent.IsAllDay || false,
            attendees: editingEvent.Attendees || []
          } : undefined}
          isEditing={!!editingEvent}
        />
      )}
    </div>
  );
}