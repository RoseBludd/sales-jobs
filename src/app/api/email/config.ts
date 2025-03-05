import Imap from 'node-imap';
import nodemailer from 'nodemailer';

// Email credentials
export const EMAIL_USER = 'J.black@weroofamerica.com';
export const EMAIL_PASSWORD = 'RestoreMastersLLC2024';

// Common IMAP folder mappings for different providers
export const FOLDER_MAPPINGS = {
  // Standard
  'INBOX': ['INBOX'],
  'SENT': ['Sent', 'Sent Items', 'Sent Mail', '[Gmail]/Sent Mail', '[Google Mail]/Sent Mail'],
  'DRAFT': ['Drafts', 'Draft', '[Gmail]/Drafts', '[Google Mail]/Drafts'],
  'TRASH': ['Trash', '[Gmail]/Trash', '[Google Mail]/Trash', 'Deleted Items'],
  // AWS WorkMail specific
  'AWS_INBOX': ['INBOX'],
  'AWS_SENT': ['Sent Items'],
  'AWS_DRAFT': ['Drafts'],
  'AWS_TRASH': ['Deleted Items'],
};

// IMAP configuration
export const IMAP_CONFIG = {
  user: EMAIL_USER,
  password: EMAIL_PASSWORD,
  host: 'imap.mail.us-east-1.awsapps.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
  keepalive: false, // Don't keep connections alive
  authTimeout: 30000, // Increase auth timeout to 30 seconds
  connTimeout: 30000, // Increase connection timeout to 30 seconds
  debug: console.log, // Enable debug logging
};

// SMTP configuration
export const SMTP_CONFIG = {
  host: 'smtp.mail.us-east-1.awsapps.com',
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: Infinity,
};

// IMAP connection pool - limit to 5 connections max
export const imapPool = new Map<string, Imap>();
export const MAX_IMAP_CONNECTIONS = 5;

// Function to clean up old connections
export const cleanupImapPool = () => {
  if (imapPool.size > MAX_IMAP_CONNECTIONS) {
    console.log(`Cleaning up IMAP pool (size: ${imapPool.size})`);
    
    // Convert to array for easier manipulation
    const connections = Array.from(imapPool.entries());
    
    // Sort by oldest first (we'll remove these)
    connections.sort((a, b) => {
      const timeA = (a[1] as any)._lastUsed || 0;
      const timeB = (b[1] as any)._lastUsed || 0;
      return timeA - timeB;
    });
    
    // Remove oldest connections until we're under the limit
    const toRemove = connections.slice(0, connections.length - MAX_IMAP_CONNECTIONS);
    
    for (const [key, conn] of toRemove) {
      try {
        if (conn.state !== 'disconnected') {
          conn.end();
        }
      } catch (error) {
        console.error('Error ending IMAP connection:', error);
      }
      imapPool.delete(key);
    }
    
    console.log(`IMAP pool cleaned up (new size: ${imapPool.size})`);
  }
};

// SMTP transporter
export const smtpTransporter = nodemailer.createTransport(SMTP_CONFIG);

// Set up periodic cleanup of IMAP connections
const CLEANUP_INTERVAL_MS = 60000; // 1 minute

// Start periodic cleanup
setInterval(() => {
  console.log('Running periodic IMAP connection cleanup');
  cleanupImapPool();
}, CLEANUP_INTERVAL_MS);

// Clean up connections on process exit
process.on('SIGTERM', () => {
  console.log('Process terminating, cleaning up IMAP connections');
  for (const [key, conn] of imapPool.entries()) {
    try {
      if (conn.state !== 'disconnected') {
        conn.end();
      }
    } catch (error) {
      console.error('Error closing IMAP connection during shutdown:', error);
    }
    imapPool.delete(key);
  }
  smtpTransporter.close();
}); 