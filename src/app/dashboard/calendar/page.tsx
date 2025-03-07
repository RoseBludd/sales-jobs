'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Loader2, X, Clock, MapPin, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { useCalendarContext } from './context/CalendarProvider';

interface CalendarEvent {
  Id: string;
  Subject: string;
  Start: string;
  End: string;
  Description?: string;
  Location?: string;
  Organizer?: string;
  Attendees?: string[];
  IsAllDay?: boolean;
}

interface EventDetailModalProps {
  event: CalendarEvent;
  onClose: () => void;
}

const EventDetailModal = ({ event, onClose }: EventDetailModalProps) => {
  const startDate = new Date(event.Start);
  const endDate = new Date(event.End);

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
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {event.IsAllDay ? 'All day' : formatDateTime(startDate)}
              </p>
              {!event.IsAllDay && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  to {formatDateTime(endDate)}
                </p>
              )}
            </div>
          </div>
          
          {event.Location && (
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5" />
              <p className="text-sm text-gray-900 dark:text-white">{event.Location}</p>
            </div>
          )}
          
          {event.Description && (
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {event.Description}
              </p>
            </div>
          )}
          
          {event.Attendees && event.Attendees.length > 0 && (
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <div className="flex items-start space-x-3">
                <Users className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Attendees
                  </p>
                  <div className="space-y-1">
                    {event.Attendees.map((attendee, index) => (
                      <p key={index} className="text-sm text-gray-600 dark:text-gray-300">
                        {attendee}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const fetchCalendarEvents = () => {
  const controller = new AbortController();
  const id = Date.now();
  
  const fetchPromise = new Promise<CalendarEvent[]>(resolve => {
    console.log(`Calendar: Starting fetch #${id}`);
    
    fetch('/api/calendar', {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-store'
      }
    })
      .then(response => {
        if (!response.ok) {
          return response.json()
            .catch(() => ({}))
            .then(errorData => {
              console.error(`Calendar: Server error in fetch #${id}:`, errorData);
              throw new Error(errorData.error || 'Failed to fetch calendar events');
            });
        }
        return response.json();
      })
      .then(data => {
        console.log(`Calendar: Fetch #${id} completed with ${data.length} events`);
        resolve(data);
      })
      .catch(error => {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`Calendar: Fetch #${id} was aborted`);
          resolve([]);
        } else {
          console.error(`Calendar: Error in fetch #${id}:`, error);
          resolve([]);
        }
      });
  });

  return {
    promise: fetchPromise,
    cancel: () => {
      console.log(`Calendar: Cancelling fetch #${id}`);
      controller.abort();
    }
  };
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
}

const CalendarHeader = ({ 
  currentDate,
  onPrevMonth,
  onNextMonth,
  activeView,
  onViewChange
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
        </div>
      </div>
      <ViewToggle activeView={activeView} onViewChange={onViewChange} />
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
      const eventStart = new Date(event.Start);
      const eventEnd = new Date(event.End);
      
      return (
        (eventStart.getDate() === day && eventStart.getMonth() === month && eventStart.getFullYear() === year) ||
        (eventEnd.getDate() === day && eventEnd.getMonth() === month && eventEnd.getFullYear() === year) ||
        (event.IsAllDay && 
          date >= new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()) && 
          date <= new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate()))
      );
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
  const day = currentDate.getDay();
  startOfWeek.setDate(currentDate.getDate() - day);
  
  // Create array of days for the week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });
  
  // Get events for the week
  const weekEvents = events.filter(event => {
    const eventStart = new Date(event.Start);
    const eventEnd = new Date(event.End);
    
    // Check if the event falls within this week
    return (
      (eventStart >= startOfWeek && eventStart < new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)) ||
      (eventEnd >= startOfWeek && eventEnd < new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)) ||
      (eventStart < startOfWeek && eventEnd >= new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000))
    );
  });
  
  // Group events by day and time
  const eventsByDay = weekDays.map(date => {
    const dayEvents = weekEvents.filter(event => {
      const eventStart = new Date(event.Start);
      const eventEnd = new Date(event.End);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      return (
        (eventStart >= dayStart && eventStart < dayEnd) ||
        (eventEnd >= dayStart && eventEnd < dayEnd) ||
        (eventStart < dayStart && eventEnd >= dayEnd)
      );
    });
    
    return {
      date,
      events: dayEvents
    };
  });
  
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };
  
  // Create time slots for the week view
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);
  
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
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              
              {weekDays.map((date, index) => {
                const eventsAtHour = eventsByDay[index].events.filter(event => {
                  if (event.IsAllDay) return false;
                  const eventStart = new Date(event.Start);
                  return eventStart.getHours() === hour;
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
            const allDayEvents = eventsByDay[index].events.filter(event => event.IsAllDay);
            
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
  
  // Get events for the day
  const dayEvents = events.filter(event => {
    const eventStart = new Date(event.Start);
    const eventEnd = new Date(event.End);
    const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const dayEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
    
    return (
      (eventStart >= dayStart && eventStart < dayEnd) ||
      (eventEnd >= dayStart && eventEnd < dayEnd) ||
      (eventStart < dayStart && eventEnd >= dayEnd)
    );
  });
  
  // Sort events by start time
  const sortedEvents = [...dayEvents].sort((a, b) => {
    if (a.IsAllDay && !b.IsAllDay) return -1;
    if (!a.IsAllDay && b.IsAllDay) return 1;
    return new Date(a.Start).getTime() - new Date(b.Start).getTime();
  });
  
  // Create time slots for the day view
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  // Check if current date is today
  const isToday = () => {
    const today = new Date();
    return (
      currentDate.getDate() === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };
  
  // Group events by hour
  const eventsByHour = timeSlots.map(hour => {
    const hourEvents = sortedEvents.filter(event => {
      if (event.IsAllDay) return false;
      const eventStart = new Date(event.Start);
      return eventStart.getHours() === hour;
    });
    
    return {
      hour,
      events: hourEvents
    };
  });
  
  // Get all-day events
  const allDayEvents = sortedEvents.filter(event => event.IsAllDay);
  
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
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
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
  // Session and state
  const { data: session, status } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('month');
  const { selectedEvent, setSelectedEvent } = useCalendarContext();
  const hasLoadedRef = useRef(false);

  // Load calendar events
  useEffect(() => {
    if (!session?.user?.email || hasLoadedRef.current) return;

    let mounted = true;
    hasLoadedRef.current = true;
    setIsLoading(true);

    const request = fetchCalendarEvents();

    request.promise
      .then(data => {
        if (mounted) setEvents(data);
      })
      .catch(() => {
        if (mounted) toast.error('Failed to load calendar events');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
      request.cancel();
    };
  }, [session?.user?.email]);

  // Show loading state
  if (status === 'loading' || isLoading) {
    return <LoadingSpinner />;
  }

  // Navigation handlers
  const handleDateChange = (direction: 'prev' | 'next') => {
    const factor = direction === 'prev' ? -1 : 1;
    setCurrentDate(prev => {
      const next = new Date(prev);
      switch (activeView) {
        case 'month':
          next.setMonth(prev.getMonth() + factor);
          break;
        case 'week':
          next.setDate(prev.getDate() + (7 * factor));
          break;
        case 'day':
          next.setDate(prev.getDate() + factor);
          break;
      }
      return next;
    });
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
        />
      )}
    </div>
  );
}