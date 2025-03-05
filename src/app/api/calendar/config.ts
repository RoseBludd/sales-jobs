import Imap from 'node-imap';
import { EMAIL_USER, EMAIL_PASSWORD } from '../email/config';

// IMAP configuration for calendar
export const CALENDAR_IMAP_CONFIG = {
  user: EMAIL_USER,
  password: EMAIL_PASSWORD,
  host: 'imap.mail.us-east-1.awsapps.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
  keepalive: false,
  authTimeout: 30000,
  connTimeout: 30000,
  debug: console.log,
};

// Calendar folder mapping
export const CALENDAR_FOLDER = 'Calendar';

// IMAP connection pool for calendar operations
export const calendarImapPool = new Map<string, Imap>();
export const MAX_CALENDAR_CONNECTIONS = 5;

// Function to clean up old calendar connections
export const cleanupCalendarPool = () => {
  if (calendarImapPool.size > MAX_CALENDAR_CONNECTIONS) {
    console.log(`Cleaning up Calendar IMAP pool (size: ${calendarImapPool.size})`);
    
    const connections = Array.from(calendarImapPool.entries());
    
    connections.sort((a, b) => {
      const timeA = (a[1] as any)._lastUsed || 0;
      const timeB = (b[1] as any)._lastUsed || 0;
      return timeA - timeB;
    });
    
    const toRemove = connections.slice(0, connections.length - MAX_CALENDAR_CONNECTIONS);
    
    for (const [key, conn] of toRemove) {
      try {
        if (conn.state !== 'disconnected') {
          conn.end();
        }
      } catch (error) {
        console.error('Error ending Calendar IMAP connection:', error);
      }
      calendarImapPool.delete(key);
    }
    
    console.log(`Calendar IMAP pool cleaned up (new size: ${calendarImapPool.size})`);
  }
};

// Clean up connections on process exit
process.on('SIGTERM', () => {
  console.log('Process terminating, cleaning up Calendar IMAP connections');
  for (const [key, conn] of calendarImapPool.entries()) {
    try {
      if (conn.state !== 'disconnected') {
        conn.end();
      }
    } catch (error) {
      console.error('Error closing Calendar IMAP connection during shutdown:', error);
    }
    calendarImapPool.delete(key);
  }
});