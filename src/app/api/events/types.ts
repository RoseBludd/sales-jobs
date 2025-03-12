// Calendar event types
export interface CalendarEvent {
  id: string;
  subject: string;
  start: Date | string;
  end: Date | string;
  location?: string;
  body?: string;
  isAllDayEvent?: boolean;
  organizer?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    required?: boolean;
  }>;
}

// Helper function to convert API event to sidebar event format
export function toSidebarEvent(event: CalendarEvent): CalendarEvent {
  return {
    ...event,
    start: new Date(event.start),
    end: new Date(event.end)
  };
} 