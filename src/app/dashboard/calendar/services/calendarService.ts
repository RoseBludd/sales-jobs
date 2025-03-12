import { toast } from 'react-hot-toast';
import { Contact } from './contactsService';

export interface CalendarEvent {
  Id: string;
  Subject: string;
  Start: string;
  End: string;
  Description?: string;
  Location?: string;
  Organizer?: string;
  Attendees?: Contact[];
  IsAllDay?: boolean;
}

export interface CreateEventParams {
  subject: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  isAllDay: boolean;
  attendees?: Contact[];
}

export interface UpdateEventParams {
  id: string;
  subject?: string;
  start?: string;
  end?: string;
  location?: string;
  description?: string;
  isAllDay?: boolean;
}

/**
 * Fetch calendar events for a date range
 * @param startDate Start date of the range
 * @param endDate End date of the range
 * @returns Array of calendar events
 */
export const fetchCalendarEvents = async (
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> => {
  try {
    console.log(`Fetching calendar events from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const response = await fetch(
      `/api/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error response from events API:', errorData);
      throw new Error(errorData.error || 'Failed to fetch calendar events');
    }
    
    const data = await response.json();
    console.log(`Successfully fetched ${data.events?.length || 0} calendar events`);
    
    // Validate and normalize events
    const validEvents = (data.events || []).map((event: any) => {
      try {
        // Ensure all required fields are present
        const normalizedEvent: CalendarEvent = {
          Id: event.Id || event.id || `event-${Math.random().toString(36).substring(2, 11)}`,
          Subject: event.Subject || event.subject || 'No Subject',
          Start: event.Start || event.start || new Date().toISOString(),
          End: event.End || event.end || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          Description: event.Description || event.description || '',
          Location: event.Location || event.location || '',
          IsAllDay: event.IsAllDay || event.isAllDay || false,
          Attendees: event.Attendees || event.attendees || []
        };
        
        // Validate dates
        try {
          new Date(normalizedEvent.Start);
          new Date(normalizedEvent.End);
        } catch (e) {
          console.warn(`Invalid date in event ${normalizedEvent.Subject}, using current date`);
          normalizedEvent.Start = new Date().toISOString();
          normalizedEvent.End = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        }
        
        return normalizedEvent;
      } catch (error) {
        console.error('Error normalizing event:', error, event);
        // Return a default event if normalization fails
        return {
          Id: `event-${Math.random().toString(36).substring(2, 11)}`,
          Subject: event.Subject || event.subject || 'Error Processing Event',
          Start: new Date().toISOString(),
          End: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          Description: 'Error processing event data',
          IsAllDay: false
        };
      }
    });
    
    console.log(`Normalized ${validEvents.length} events`);
    return validEvents;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    toast.error('Failed to load calendar events');
    return [];
  }
};

/**
 * Get a calendar event by ID
 * @param id Event ID
 * @returns Event details or null if not found
 */
export const getCalendarEventById = async (id: string): Promise<CalendarEvent | null> => {
  try {
    const response = await fetch(`/api/events/${id}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch event details');
    }
    
    const data = await response.json();
    return data.event;
  } catch (error) {
    console.error('Error fetching event details:', error);
    toast.error('Failed to load event details');
    return null;
  }
};

/**
 * Create a new calendar event
 * @param eventData Event data
 * @returns ID of the created event
 */
export const createCalendarEvent = async (eventData: CreateEventParams): Promise<string> => {
  try {
    // Convert attendees to the format expected by the API
    const apiAttendees = eventData.attendees?.map(contact => ({
      email: contact.emailAddress,
      name: contact.displayName,
      required: true
    }));

    const response = await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...eventData,
        attendees: apiAttendees
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create event');
    }
    
    const data = await response.json();
    return data.eventId;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

/**
 * Update an existing calendar event
 * @param eventData Event data with ID
 * @returns True if update was successful
 */
export const updateCalendarEvent = async (eventData: UpdateEventParams): Promise<boolean> => {
  try {
    const { id, ...updates } = eventData;
    
    const response = await fetch(`/api/events/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update event');
    }
    
    return true;
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

/**
 * Delete a calendar event
 * @param id Event ID
 * @returns True if deletion was successful
 */
export const deleteCalendarEvent = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/events/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete event');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

/**
 * Manage attendees for an event
 * @param eventId Event ID
 * @param attendeesToAdd Attendees to add to the event
 * @param attendeesToRemove Email addresses of attendees to remove
 * @returns True if operation was successful
 */
export const manageEventAttendees = async (
  eventId: string,
  attendeesToAdd?: Contact[],
  attendeesToRemove?: string[]
): Promise<boolean> => {
  try {
    // Convert contacts to the format expected by the API
    const apiAttendeesToAdd = attendeesToAdd?.map(contact => ({
      email: contact.emailAddress,
      name: contact.displayName,
      required: true
    }));

    const response = await fetch(`/api/events/${eventId}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attendeesToAdd: apiAttendeesToAdd,
        attendeesToRemove
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to manage attendees');
    }
    
    return true;
  } catch (error) {
    console.error('Error managing attendees:', error);
    throw error;
  }
}; 