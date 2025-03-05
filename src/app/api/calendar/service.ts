import Imap from 'node-imap';
import ical from 'ical';
import { CalendarEvent } from './types';
import { 
  CALENDAR_IMAP_CONFIG, 
  CALENDAR_FOLDER, 
  calendarImapPool, 
  cleanupCalendarPool 
} from './config';

interface EnhancedImapConnection extends Imap {
  lastUsed?: number;
}

interface CalendarAttendee {
  val: string;
}

export class CalendarService {
  /**
   * Get an IMAP connection from the pool or create a new one
   */
  private getImapConnection(): Imap {
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
      
      // Create new connection
      console.log('Creating new Calendar IMAP connection');
      const imap = new Imap(CALENDAR_IMAP_CONFIG);
      
      // Add event listeners
      imap.once('ready', () => console.log('Calendar IMAP connection ready'));
      imap.once('close', () => console.log('Calendar IMAP connection closed'));
      imap.once('end', () => console.log('Calendar IMAP connection ended'));
      imap.on('error', (err) => console.error('Calendar IMAP error:', err));
      
      // Store in pool
      const connectionKey = `calendar-${Date.now()}`;
      const enhancedImap = imap as EnhancedImapConnection;
      enhancedImap.lastUsed = Date.now();
      calendarImapPool.set(connectionKey, enhancedImap);
      
      console.log('Connecting to Calendar IMAP server...');
      imap.connect();
      return imap;
    } catch (error) {
      console.error('Error getting Calendar IMAP connection:', error);
      throw error;
    }
  }

  /**
   * Close IMAP connection
   */
  private closeConnection(connection: Imap | null): void {
    if (!connection) return;
    try {
      if (connection.state !== 'disconnected') {
        console.log('Closing Calendar IMAP connection...');
        connection.end();
      }
    } catch (error) {
      console.error('Error closing Calendar IMAP connection:', error);
    }
  }

  /**
   * Parse calendar event from IMAP message
   */
  private parseCalendarEvent(buffer: string): CalendarEvent | null {
    try {
      const data = ical.parseICS(buffer);
      
      // Find the first VEVENT component
      const events = Object.values(data).filter(item => 
        typeof item === 'object' && 
        item !== null && 
        'type' in item && 
        item.type === 'VEVENT'
      );
      
      if (events.length === 0) return null;
      
      const event = events[0];

      // Parse attendees into array of email addresses
      const parseAttendees = (attendee: unknown): string[] | undefined => {
        if (!attendee) return undefined;
        
        if (Array.isArray(attendee)) {
          return attendee.map(a => typeof a === 'string' ? a : (a as CalendarAttendee).val);
        }
        
        return [typeof attendee === 'string' ? attendee : (attendee as CalendarAttendee).val];
      };

      // Check if it's an all-day event
      const startDate = event.start as Date | undefined;
      const isAllDay = startDate ? 
        startDate.getHours() === 0 && 
        startDate.getMinutes() === 0 && 
        startDate.getSeconds() === 0 : 
        false;

      const organizer = event.organizer as string | CalendarAttendee | undefined;

      return {
        Id: (event.uid as string) || `cal-${Date.now()}`,
        Subject: (event.summary as string) || 'Untitled Event',
        Start: startDate?.toISOString() || new Date().toISOString(),
        End: (event.end as Date)?.toISOString() || new Date().toISOString(),
        Description: (event.description as string) || '',
        Location: (event.location as string) || '',
        Organizer: typeof organizer === 'string' ? organizer : organizer?.val,
        Attendees: parseAttendees(event.attendee),
        IsAllDay: isAllDay
      };
    } catch (error) {
      console.error('Error parsing calendar event:', error);
      return null;
    }
  }

  /**
   * Fetch calendar events
   */
  async getEvents(): Promise<CalendarEvent[]> {
    let connection: Imap | null = null;
    
    try {
      connection = this.getImapConnection();
      
      return new Promise((resolve, reject) => {
        connection!.once('ready', () => {
          connection!.openBox(CALENDAR_FOLDER, true, (err) => {
            if (err) {
              console.error('Error opening calendar folder:', err);
              this.closeConnection(connection);
              return reject(err);
            }

            // Search for calendar items in the last 30 days
            const since = new Date();
            since.setDate(since.getDate() - 30);
            
            connection!.search(['SINCE', since], (err, results) => {
              if (err) {
                console.error('Error searching calendar items:', err);
                this.closeConnection(connection);
                return reject(err);
              }

              if (!results.length) {
                this.closeConnection(connection);
                return resolve([]);
              }

              const events: CalendarEvent[] = [];
              const fetch = connection!.fetch(results, { bodies: ['TEXT'] });

              fetch.on('message', (msg) => {
                msg.on('body', (stream) => {
                  let buffer = '';
                  stream.on('data', (chunk) => {
                    buffer += chunk.toString('utf8');
                  });

                  stream.once('end', () => {
                    const event = this.parseCalendarEvent(buffer);
                    if (event) {
                      events.push(event);
                    }
                  });
                });
              });

              fetch.once('error', (err) => {
                console.error('Error fetching calendar items:', err);
                this.closeConnection(connection);
                reject(err);
              });

              fetch.once('end', () => {
                this.closeConnection(connection);
                resolve(
                  events.sort((a, b) => 
                    new Date(a.Start).getTime() - new Date(b.Start).getTime()
                  )
                );
              });
            });
          });
        });

        connection!.once('error', (err) => {
          console.error('IMAP connection error:', err);
          this.closeConnection(connection);
          reject(err);
        });

        if (connection!.state !== 'connected' && connection!.state !== 'authenticated') {
          connection!.connect();
        }
      });
    } catch (error) {
      console.error('Error in getEvents:', error);
      this.closeConnection(connection);
      throw error;
    }
  }
}