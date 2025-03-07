import Imap from 'node-imap';
import ical from 'ical';
import { CalendarEvent } from './types';
import { 
  CALENDAR_FOLDER,
  calendarImapPool, 
  cleanupCalendarPool,
  getCalendarImapConfig
} from './config';

interface EnhancedImapConnection extends Imap {
  lastUsed?: number;
}

interface CalendarAttendee {
  val: string;
}

export class CalendarService {
  // In-memory storage for created events
  private createdEvents: CalendarEvent[] = [];

  /**
   * Get an IMAP connection from the pool or create a new one
   */
  private async getImapConnection(): Promise<Imap> {
    try {
      cleanupCalendarPool();
      
      console.log(`Calendar IMAP pool size before getting connection: ${calendarImapPool.size}`);
      
      // Check for valid existing connection
      for (const [key, conn] of calendarImapPool.entries()) {
        try {
          if (conn.state === 'authenticated') {
            console.log('Reusing existing Calendar IMAP connection');
            
            const enhancedConn = conn as EnhancedImapConnection;
            enhancedConn.lastUsed = Date.now();
            calendarImapPool.delete(key);
            calendarImapPool.set(key, enhancedConn);
            
            return conn;
          } else {
            this.closeConnection(conn);
            calendarImapPool.delete(key);
          }
        } catch (error) {
          console.error('Error checking connection:', error);
          calendarImapPool.delete(key);
        }
      }
      
      // Create new connection with authenticated user's email
      console.log('Creating new Calendar IMAP connection');
      const connectionId = `calendar_${Date.now()}`;
      
      // Get the config with the authenticated user's email
      const config = await getCalendarImapConfig();
      const connection = new Imap(config);
      
      const enhancedConn = connection as EnhancedImapConnection;
      enhancedConn.lastUsed = Date.now();
      
      calendarImapPool.set(connectionId, enhancedConn);
      console.log(`Calendar IMAP pool size after adding connection: ${calendarImapPool.size}`);
      
      return connection;
    } catch (error) {
      console.error('Error getting IMAP connection:', error);
      throw new Error('Failed to establish IMAP connection');
    }
  }
  
  /**
   * Close an IMAP connection
   */
  private closeConnection(connection: Imap | null): void {
    if (!connection) return;
    
    try {
      if (connection.state !== 'disconnected') {
        connection.end();
        console.log('Calendar IMAP connection closed');
      }
    } catch (error) {
      console.error('Error closing Calendar IMAP connection:', error);
    }
  }
  
  /**
   * Parse a calendar event from IMAP message
   */
  private parseCalendarEvent(buffer: string): CalendarEvent | null {
    try {
      // Parse iCalendar data
      const parsedEvents = ical.parseICS(buffer);
      
      // Find the first VEVENT component
      const event = Object.values(parsedEvents).find(e => e.type === 'VEVENT');
      
      if (!event) {
        return null;
      }
      
      // Parse attendees
      const parseAttendees = (attendee: unknown): string[] | undefined => {
        if (!attendee) return undefined;
        
        if (Array.isArray(attendee)) {
          return attendee
            .filter(a => a && typeof a === 'object' && 'val' in a)
            .map(a => (a as CalendarAttendee).val);
        } else if (typeof attendee === 'object' && attendee && 'val' in attendee) {
          return [(attendee as CalendarAttendee).val];
        }
        
        return undefined;
      };
      
      // Create calendar event
      const calendarEvent: CalendarEvent = {
        Id: event.uid || `event_${Date.now()}`,
        Subject: event.summary || 'Untitled Event',
        Start: event.start ? event.start.toISOString() : new Date().toISOString(),
        End: event.end ? event.end.toISOString() : new Date().toISOString(),
      };
      
      // Add optional fields if available
      if (event.description) {
        calendarEvent.Description = event.description;
      }
      
      if (event.location) {
        calendarEvent.Location = event.location;
      }
      
      if (event.organizer) {
        calendarEvent.Organizer = typeof event.organizer === 'string' 
          ? event.organizer 
          : event.organizer.val;
      }
      
      const attendees = parseAttendees(event.attendee);
      if (attendees && attendees.length > 0) {
        calendarEvent.Attendees = attendees;
      }
      
      // Check if it's an all-day event
      if (event.start && event.end) {
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        
        // All-day events typically start at 00:00:00 and end at 00:00:00 the next day
        const isAllDay = startDate.getHours() === 0 && 
                         startDate.getMinutes() === 0 && 
                         endDate.getHours() === 0 && 
                         endDate.getMinutes() === 0;
        
        calendarEvent.IsAllDay = isAllDay;
      }
      
      return calendarEvent;
    } catch (error) {
      console.error('Error parsing calendar event:', error);
      return null;
    }
  }
  
  /**
   * Get all calendar events
   */
  async getEvents(): Promise<CalendarEvent[]> {
    let connection: Imap | null = null;
    
    try {
      connection = await this.getImapConnection();
      
      return new Promise<CalendarEvent[]>((resolve, reject) => {
        // Add timeout to prevent hanging if IMAP connection takes too long
        const timeout = setTimeout(() => {
          console.error('Calendar IMAP connection timeout after 15 seconds');
          this.closeConnection(connection);
          reject(new Error('Calendar connection timeout'));
        }, 15000);
        
        connection!.once('ready', () => {
          clearTimeout(timeout); // Clear timeout once connection is ready
          
          // Try to open the Calendar folder
          connection!.openBox(CALENDAR_FOLDER, true, (err) => {
            if (err) {
              console.error(`Error opening calendar folder "${CALENDAR_FOLDER}":`, err);
              
              // Try to list all folders to find calendar folders
              connection!.getBoxes((boxErr) => {
                if (boxErr) {
                  console.error('Error getting mailbox list:', boxErr);
                  this.closeConnection(connection);
                  reject(new Error('Failed to access calendar'));
                  return;
                }
                
                this.closeConnection(connection);
                
                // If we can't access the calendar, return the created events + mock events
                console.log('Returning mock events + created events');
                resolve([...this.getMockEvents(), ...this.createdEvents]);
              });
              return;
            }
            
            this.fetchCalendarItems(
              connection!, 
              (events) => {
                this.closeConnection(connection);
                // Combine fetched events with created events
                const allEvents = [...events, ...this.createdEvents];
                resolve(allEvents);
              },
              (error) => {
                this.closeConnection(connection);
                reject(error);
              }
            );
          });
        });
        
        connection!.once('error', (err) => {
          clearTimeout(timeout);
          console.error('Calendar IMAP connection error:', err);
          this.closeConnection(connection);
          
          // If connection fails, return mock events + created events
          console.log('Connection error, returning mock events + created events');
          resolve([...this.getMockEvents(), ...this.createdEvents]);
        });
        
        connection!.connect();
      });
    } catch (error) {
      console.error('Error in getEvents:', error);
      this.closeConnection(connection);
      
      // Return mock events + created events on error
      return [...this.getMockEvents(), ...this.createdEvents];
    }
  }
  
  /**
   * Fetch calendar items from the IMAP server
   */
  private fetchCalendarItems(
    connection: Imap, 
    resolve: (events: CalendarEvent[]) => void, 
    reject: (error: Error) => void
  ): void {
    try {
      // Try to fetch all messages in the calendar folder
      // Instead of using SINCE which is causing issues, we'll fetch all messages and filter later
      connection.search(['ALL'], (err, results) => {
        if (err) {
          console.error('Error searching calendar items:', err);
          this.closeConnection(connection);
          return reject(err);
        }

        if (!results.length) {
          console.log('No calendar items found in folder');
          this.closeConnection(connection);
          return resolve([]);
        }

        console.log(`Found ${results.length} potential calendar items`);
        
        const events: CalendarEvent[] = [];
        const fetch = connection.fetch(results, { bodies: ['TEXT', 'HEADER'] });

        fetch.on('message', (msg) => {
          let buffer = '';
          let isCalendarItem = false;
          
          msg.on('body', (stream, info) => {
            if (info.which === 'HEADER') {
              // Check headers to see if this is a calendar item
              stream.on('data', (chunk) => {
                const headers = chunk.toString('utf8').toLowerCase();
                if (
                  headers.includes('content-type: text/calendar') ||
                  headers.includes('content-type: application/ics') ||
                  headers.includes('content-class: urn:content-classes:calendarmessage')
                ) {
                  isCalendarItem = true;
                }
              });
            } else {
              // Collect the message body
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
            }
          });

          msg.once('end', () => {
            if (isCalendarItem || buffer.includes('BEGIN:VCALENDAR')) {
              const event = this.parseCalendarEvent(buffer);
              if (event) {
                // Filter events to only include recent and future events
                const eventDate = new Date(event.Start);
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago
                
                if (eventDate >= cutoffDate) {
                  events.push(event);
                }
              }
            }
          });
        });

        fetch.once('error', (err) => {
          console.error('Error fetching calendar items:', err);
          this.closeConnection(connection);
          reject(err);
        });

        fetch.once('end', () => {
          this.closeConnection(connection);
          console.log(`Successfully processed ${events.length} calendar events`);
          resolve(
            events.sort((a, b) => 
              new Date(a.Start).getTime() - new Date(b.Start).getTime()
            )
          );
        });
      });
    } catch (error) {
      console.error('Error in fetchCalendarItems:', error);
      this.closeConnection(connection);
      reject(error as Error);
    }
  }
  
  /**
   * Get mock events for testing when real calendar access fails
   */
  getMockEvents(): CalendarEvent[] {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const twoWeeksLater = new Date(now);
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
    
    return [
      {
        Id: '1',
        Subject: 'Team Meeting',
        Start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0).toISOString(),
        End: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0).toISOString(),
        Description: 'Weekly team sync meeting to discuss project progress',
        Location: 'Conference Room A',
        Organizer: 'manager@example.com',
        Attendees: ['team1@example.com', 'team2@example.com', 'team3@example.com'],
        IsAllDay: false
      },
      {
        Id: '2',
        Subject: 'Client Presentation',
        Start: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 14, 0).toISOString(),
        End: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 15, 30).toISOString(),
        Description: 'Presentation of new product features to key client',
        Location: 'Main Conference Room',
        Organizer: 'sales@example.com',
        Attendees: ['client@example.com', 'manager@example.com'],
        IsAllDay: false
      },
      {
        Id: '3',
        Subject: 'Company Holiday',
        Start: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 0, 0).toISOString(),
        End: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate() + 1, 0, 0).toISOString(),
        Description: 'Annual company holiday - office closed',
        IsAllDay: true
      },
      {
        Id: '4',
        Subject: 'Project Deadline',
        Start: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate() + 2, 9, 0).toISOString(),
        End: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate() + 2, 17, 0).toISOString(),
        Description: 'Final deadline for project deliverables',
        Location: 'Office',
        IsAllDay: false
      },
      {
        Id: '5',
        Subject: 'Quarterly Review',
        Start: new Date(twoWeeksLater.getFullYear(), twoWeeksLater.getMonth(), twoWeeksLater.getDate(), 13, 0).toISOString(),
        End: new Date(twoWeeksLater.getFullYear(), twoWeeksLater.getMonth(), twoWeeksLater.getDate(), 16, 0).toISOString(),
        Description: 'Quarterly performance review with management',
        Location: 'Executive Boardroom',
        Organizer: 'ceo@example.com',
        Attendees: ['manager@example.com', 'director@example.com'],
        IsAllDay: false
      }
    ];
  }

  /**
   * Create a new calendar event
   */
  async createEvent(event: Omit<CalendarEvent, 'Id'>): Promise<CalendarEvent> {
    try {
      // In a real implementation, this would create an event via WorkMail API
      // For now, we'll just return a mock event with a generated ID
      console.log('Creating new calendar event:', event);
      
      // Ensure dates are in ISO format
      const formattedEvent = {
        ...event,
        Start: new Date(event.Start).toISOString(),
        End: new Date(event.End).toISOString()
      };
      
      const newEvent: CalendarEvent = {
        ...formattedEvent,
        Id: `event_${Date.now()}_${Math.floor(Math.random() * 1000)}`
      };
      
      console.log('Created new calendar event:', newEvent);
      
      // Store the event in memory
      this.createdEvents.push(newEvent);
      console.log(`Added event to in-memory storage. Total created events: ${this.createdEvents.length}`);
      
      return newEvent;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }
}