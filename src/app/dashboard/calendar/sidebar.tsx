'use client';

import React from 'react';

interface Event {
  id: number;
  title: string;
  start: Date;
  end: Date;
  description: string;
}

interface SidebarContentProps {
  events: Event[];
}

const CalendarSidebarContent = ({ events }: SidebarContentProps) => {
  const upcomingEvents = events.slice(0, 3);

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