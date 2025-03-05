// Calendar event type matching frontend requirements
export interface CalendarEvent {
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

// Event type for sidebar
export interface SidebarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  description: string;
}

// Transform calendar event to sidebar event
export const toSidebarEvent = (event: CalendarEvent): SidebarEvent => ({
  id: parseInt(event.Id, 10) || Date.now(),
  title: event.Subject,
  start: new Date(event.Start),
  end: new Date(event.End),
  description: event.Description || ''
});