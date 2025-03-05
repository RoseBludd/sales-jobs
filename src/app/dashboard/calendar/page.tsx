'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface CalendarEvent {
  Id: string;
  Subject: string;
  Start: string;
  End: string;
  Description?: string;
  Location?: string;
}

const fetchCalendarEvents = async () => {
  try {
    const response = await fetch('/api/calendar');
    if (!response.ok) {
      throw new Error('Failed to fetch calendar events');
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
};

type ViewType = 'month' | 'week' | 'day';

const useDateHelpers = () => {
  const daysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  };

  const getMonthName = (month: number): string => {
    return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2024, month));
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return { daysInMonth, firstDayOfMonth, getMonthName, formatTime };
};


interface ViewToggleProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const ViewToggle = ({ activeView, onViewChange }: ViewToggleProps) => {
  const views: ViewType[] = ['month', 'week', 'day'];
  
  return (
    <div className="flex space-x-2">
      {views.map(view => (
        <button
          key={view}
          onClick={() => onViewChange(view)}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors
            ${activeView === view 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
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
  const { getMonthName } = useDateHelpers();
  
  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold dark:text-white">
        {getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}
      </h2>
      <div className="flex items-center space-x-4">
        <ViewToggle activeView={activeView} onViewChange={onViewChange} />
        <div className="flex space-x-2">
          <button
            onClick={onPrevMonth}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={onNextMonth}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
}

const MonthView = ({ currentDate, events }: MonthViewProps) => {
  const { daysInMonth, firstDayOfMonth, formatTime } = useDateHelpers();
  const days = daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const getEventsForDay = (day: number): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.Start);
      return eventDate.getDate() === day &&
             eventDate.getMonth() === currentDate.getMonth() &&
             eventDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const today = new Date();
  const isToday = (day: number): boolean => {
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="grid grid-cols-7">
        {daysOfWeek.map(day => (
          <div key={day} className="py-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 h-[calc(100vh-20rem)]">
        {[...Array(firstDay)].map((_, i) => (
          <div key={`empty-${i}`} className="border-b border-r dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900" />
        ))}
        {[...Array(days)].map((_, index) => {
          const day = index + 1;
          const dayEvents = getEventsForDay(day);
          
          return (
            <div 
              key={`day-${day}`}
              className="border-b border-r dark:border-gray-700 p-2 min-h-[100px] relative"
            >
              <div className="flex justify-between items-center mb-2">
                <span className={`
                  ${isToday(day) 
                    ? 'bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center' 
                    : 'text-gray-700 dark:text-gray-300'}
                `}>
                  {day}
                </span>
              </div>
              <div className="space-y-1 overflow-y-auto max-h-24">
                {dayEvents.map(event => (
                  <div
                    key={event.Id}
                    className="p-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded truncate cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    title={`${event.Subject}\n${event.Description || ''}`}
                  >
                    {formatTime(new Date(event.Start))} - {event.Subject}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const WeekView = () => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow text-center">
    <p className="text-gray-500 dark:text-gray-400">Week View - Coming Soon</p>
    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
      This view will show detailed hourly slots for each day of the week
    </p>
  </div>
);

const DayView = () => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow text-center">
    <p className="text-gray-500 dark:text-gray-400">Day View - Coming Soon</p>
    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
      This view will show detailed half-hour slots for the selected day
    </p>
  </div>
);

export default function CalendarPage() {
  const { status } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeView, setActiveView] = useState<ViewType>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      try {
        const data = await fetchCalendarEvents();
        if (isMounted) {
          setEvents(data);
          setError(null);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to load calendar events:', error);
          setError('Failed to load calendar events. Please try again later.');
        }
      }
    };

    if (status === 'authenticated') {
      loadEvents();
    }

    return () => {
      isMounted = false;
    };
  }, [status, currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  if (status === 'loading') {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Loading calendar...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Please sign in to view your calendar</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full">
      <CalendarHeader
        currentDate={currentDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        activeView={activeView}
        onViewChange={setActiveView}
      />
      <div className="mt-4">
        {activeView === 'month' && <MonthView currentDate={currentDate} events={events} />}
        {activeView === 'week' && <WeekView />}
        {activeView === 'day' && <DayView />}
      </div>
    </div>
  );
}