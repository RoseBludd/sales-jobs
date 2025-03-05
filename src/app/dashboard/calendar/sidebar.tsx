'use client';

import React from 'react';
import { CalendarEvent, toSidebarEvent } from '@/app/api/calendar/types';

interface SidebarContentProps {
  events: CalendarEvent[];
}

const CalendarSidebarContent = ({ events }: SidebarContentProps) => {
  // Convert to sidebar events and get upcoming ones
  const upcomingEvents = events
    .map(toSidebarEvent)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 3);

  if (!upcomingEvents.length) return null;

  return (
    <div className="mb-6">
      <p className="text-gray-400 text-sm mb-2">UPCOMING EVENTS</p>
      <ul>
        {upcomingEvents.map(event => (
          <li key={event.id} className="mb-3 text-sm">
            <p className="font-medium">{event.title}</p>
            <p className="text-gray-400">
              {event.start.toLocaleDateString()} {event.start.getHours()}:{event.start.getMinutes().toString().padStart(2, '0')}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CalendarSidebarContent;