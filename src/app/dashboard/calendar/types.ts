import { CalendarEvent as ServiceCalendarEvent } from './services/calendarService';

// Define the CalendarEvent interface that matches the one in the calendar page
export interface CalendarEvent extends ServiceCalendarEvent {}

// Define the SidebarEvent interface for the sidebar component
export interface SidebarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
}

// Function to convert a CalendarEvent to a SidebarEvent
export const toSidebarEvent = (event: CalendarEvent): SidebarEvent => {
  return {
    id: event.Id,
    title: event.Subject,
    start: new Date(event.Start),
    end: new Date(event.End),
    description: event.Description,
    location: event.Location
  };
}; 