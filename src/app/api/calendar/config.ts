import Imap from 'node-imap';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';

// Default email credentials
const DEFAULT_CALENDAR_EMAIL = 'J.black@weroofamerica.com';
export const CALENDAR_PASSWORD = 'RestoreMastersLLC2024';

// Function to get the email user directly from the session
export const getCalendarEmailUser = async () => {
  try {
    // Try to get the user from the session using authOptions
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      // Extract username from email and append @weroofamerica.com
      const username = session.user.email.split('@')[0];
      return `${username}@weroofamerica.com`;
    }
  } catch (error) {
    console.error('Error getting user email from session in calendar config:', error);
  }
  
  // Fall back to default email if session is not available
  return DEFAULT_CALENDAR_EMAIL;
};

// IMAP configuration for calendar
export const CALENDAR_IMAP_CONFIG = {
  user: DEFAULT_CALENDAR_EMAIL,
  password: CALENDAR_PASSWORD,
  host: 'imap.mail.us-east-1.awsapps.com', // AWS WorkMail IMAP server
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
  keepalive: false,
  authTimeout: 30000,
  connTimeout: 30000,
  debug: process.env.NODE_ENV === 'development' ? console.log : undefined,
};

// Get dynamic IMAP configuration for calendar with authenticated user
export const getCalendarImapConfig = async () => {
  // Use our own function to get the authenticated user's email
  const user = await getCalendarEmailUser();
  return {
    user,
    password: CALENDAR_PASSWORD,
    host: 'imap.mail.us-east-1.awsapps.com', // AWS WorkMail IMAP server
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    keepalive: false,
    authTimeout: 30000,
    connTimeout: 30000,
    debug: process.env.NODE_ENV === 'development' ? console.log : undefined,
  };
};

// Potential calendar folder names to try
export const CALENDAR_FOLDERS = [
  'Calendar',
  'Calendars',
  'Kalender',
  'Calendrier',
  'Calendario'
];

// Default calendar folder
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
      const timeA = (a[1] as Imap & { lastUsed?: number }).lastUsed || 0;
      const timeB = (b[1] as Imap & { lastUsed?: number }).lastUsed || 0;
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