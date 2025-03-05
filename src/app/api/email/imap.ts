import Imap from 'node-imap';
import { EmailMessage, ImapBox } from './types';
import { parseEmailAddress } from './utils';
import { imapPool, IMAP_CONFIG, FOLDER_MAPPINGS, cleanupImapPool } from './config';

// Map UI folder names to IMAP folder names
export const mapFolderToImap = (folder: string): string => {
  // For AWS WorkMail, we'll try their specific folder names first
  if (IMAP_CONFIG.host.includes('awsapps.com')) {
    const awsKey = `AWS_${folder}` as keyof typeof FOLDER_MAPPINGS;
    if (awsKey in FOLDER_MAPPINGS) {
      return FOLDER_MAPPINGS[awsKey][0];
    }
  }
  
  // Then try standard mappings
  const key = folder as keyof typeof FOLDER_MAPPINGS;
  if (key in FOLDER_MAPPINGS) {
    return FOLDER_MAPPINGS[key][0]; // Use the first mapping as default
  }
  
  // If no mapping found, return the original folder name
  return folder;
};

// Define an interface for our enhanced IMAP connection
interface EnhancedImapConnection extends Imap {
  lastUsed?: number;
}

/**
 * Get IMAP configuration
 */
const getImapConfig = (user: string, password: string) => {
  return {
    ...IMAP_CONFIG,
    user,
    password,
  };
};

/**
 * Get an IMAP connection from the pool or create a new one
 */
export const getImapConnection = (user: string, password: string): Imap => {
  try {
    // Clean up old connections before getting a new one
    cleanupImapPool();
    
    console.log(`IMAP pool size before getting connection: ${imapPool.size}`);
    
    // Check if we have a valid connection in the pool
    for (const [key, conn] of imapPool.entries()) {
      try {
        // Check if connection is still valid
        if (conn.state === 'authenticated') {
          console.log('Reusing existing IMAP connection');
          
          // Mark as recently used
          const enhancedConn = conn as EnhancedImapConnection;
          enhancedConn.lastUsed = Date.now();
          imapPool.delete(key);
          imapPool.set(key, enhancedConn);
          
          return conn;
        } else {
          // Close invalid connection and remove from pool
          console.log(`Closing invalid connection in state: ${conn.state}`);
          ensureConnectionClosed(conn);
          imapPool.delete(key);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
        imapPool.delete(key);
      }
    }
    
    // Create a new connection
    console.log('Creating new IMAP connection');
    console.log(`IMAP config: host=${IMAP_CONFIG.host}, port=${IMAP_CONFIG.port}, user=${user}`);
    
    const imap = new Imap(getImapConfig(user, password));
    
    // Add event listeners for debugging
    imap.once('ready', () => {
      console.log('IMAP connection ready');
    });
    
    imap.once('close', () => {
      console.log('IMAP connection closed');
    });
    
    imap.once('end', () => {
      console.log('IMAP connection ended');
    });
    
    imap.on('error', (err) => {
      console.error('IMAP connection error:', err);
    });
    
    // Store in pool with lastUsed timestamp
    const connectionKey = `${user}-${Date.now()}`;
    const enhancedImap = imap as EnhancedImapConnection;
    enhancedImap.lastUsed = Date.now();
    imapPool.set(connectionKey, enhancedImap);
    
    console.log(`IMAP pool size after creating connection: ${imapPool.size}`);
    
    // Connect and return the connection
    console.log('Connecting to IMAP server...');
    imap.connect();
    return imap;
  } catch (error) {
    console.error('Error getting IMAP connection:', error);
    throw error;
  }
};

/**
 * Ensures that an IMAP connection is properly closed
 */
export const ensureConnectionClosed = (connection: Imap | null) => {
  if (!connection) return;
  
  try {
    if (connection.state !== 'disconnected') {
      console.log('Closing IMAP connection...');
      connection.end();
    }
  } catch (error) {
    console.error('Error closing IMAP connection:', error);
  }
};

/**
 * Helper function to convert folder name to folder type
 */
function getFolderType(folder: string): 'inbox' | 'sent' | 'draft' | 'trash' {
  const lowerFolder = folder.toLowerCase();
  if (lowerFolder.includes('sent')) return 'sent';
  if (lowerFolder.includes('draft')) return 'draft';
  if (lowerFolder.includes('trash') || lowerFolder.includes('deleted')) return 'trash';
  return 'inbox';
}

/**
 * Fetch emails from a specific folder with pagination
 */
export const fetchEmails = async (
  user: string,
  password: string,
  folder: string = 'INBOX',
  page: number = 1,
  limit: number = 10
): Promise<{ emails: EmailMessage[]; total: number }> => {
  console.log(`Fetching emails from ${folder}, page ${page}, limit ${limit}`);
  
  // Convert folder name to match IMAP server's format
  const mappedFolder = mapFolderToImap(folder);
  console.log(`Mapped folder name: ${mappedFolder}`);
  
  // Create a direct IMAP connection for this operation
  const imapConfig = {
    user,
    password,
    host: IMAP_CONFIG.host,
    port: IMAP_CONFIG.port,
    tls: IMAP_CONFIG.tls,
    tlsOptions: IMAP_CONFIG.tlsOptions,
    authTimeout: 30000,
    connTimeout: 30000,
    debug: console.log,
  };
  
  return new Promise((resolve, reject) => {
    const imap = new Imap(imapConfig);
    
    imap.once('ready', () => {
      console.log('IMAP connection ready, opening mailbox');
      
      // Open the mailbox
      imap.openBox(mappedFolder, true, (err, box) => {
        if (err) {
          console.error(`Error opening mailbox ${mappedFolder}:`, err);
          imap.end();
          return reject(new Error(`Failed to open mailbox: ${err.message}`));
        }
        
        console.log(`Mailbox opened: ${mappedFolder}, total messages: ${box.messages.total}`);
        
        // Calculate pagination
        const totalMessages = box.messages.total;
        
        if (totalMessages === 0) {
          console.log('No messages in mailbox, returning empty array');
          imap.end();
          return resolve({ emails: [], total: 0 });
        }
        
        // Try a different approach - search for all messages and then fetch by UID
        console.log('Using search and fetch by UID approach');
        
        imap.search(['ALL'], (err, results) => {
          if (err) {
            console.error('Error searching for messages:', err);
            imap.end();
            return reject(new Error(`Failed to search for messages: ${err.message}`));
          }
          
          console.log(`Search returned ${results.length} message UIDs`);
          
          if (results.length === 0) {
            console.log('No messages found in search, returning empty array');
            imap.end();
            return resolve({ emails: [], total: 0 });
          }
          
          // Sort results in descending order (newest first)
          results.sort((a, b) => b - a);
          
          // Apply pagination to the search results
          const paginatedResults = results.slice((page - 1) * limit, page * limit);
          
          console.log(`Paginated search results: ${paginatedResults.join(',')}`);
          
          if (paginatedResults.length === 0) {
            console.log('No messages in this page range, returning empty array');
            imap.end();
            return resolve({ emails: [], total: results.length });
          }
          
          // Fetch messages by UID
          const fetchOptions = {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
            struct: true,
          };
          
          const fetch = imap.fetch(paginatedResults, fetchOptions);
          const emails: EmailMessage[] = [];
          let messageCount = 0;
          
          fetch.on('message', (msg, seqno) => {
            messageCount++;
            console.log(`Processing message ${messageCount} with seqno: ${seqno}`);
            
            // Create a partial email object
            const email: Partial<EmailMessage> = {
              id: parseInt(seqno.toString(), 10),
              folder: getFolderType(folder),
              body: '',
              from: '',
              fromName: '',
              to: '',
              subject: '',
              date: new Date(),
              isRead: false,
              isStarred: false
            };
            
            msg.on('body', (stream, info) => {
              let buffer = '';
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
              
              stream.once('end', () => {
                if (info.which.includes('HEADER')) {
                  const header = Imap.parseHeader(buffer);
                  email.from = header.from?.[0] || '';
                  email.fromName = parseEmailAddress(header.from?.[0] || '').name;
                  email.to = header.to?.[0] || '';
                  email.subject = header.subject?.[0] || '(No Subject)';
                  email.date = new Date(header.date?.[0] || Date.now());
                } else {
                  email.body = buffer;
                }
              });
            });
            
            msg.once('attributes', (attrs) => {
              email.itemId = attrs.uid.toString();
              const flags = attrs.flags || [];
              email.isRead = flags.includes('\\Seen');
              email.isStarred = flags.includes('\\Flagged');
              console.log(`Message ${messageCount} attributes: uid=${attrs.uid}, flags=${flags.join(',')}`);
            });
            
            msg.once('end', () => {
              console.log(`Message ${messageCount} processing complete: id=${email.id}, subject=${email.subject}`);
              emails.push(email as EmailMessage);
            });
          });
          
          fetch.once('error', (err) => {
            console.error('Error fetching messages:', err);
            imap.end();
            reject(new Error(`Failed to fetch messages: ${err.message}`));
          });
          
          fetch.once('end', () => {
            console.log(`Fetch completed. Processed ${emails.length}/${messageCount} messages`);
            
            if (emails.length === 0 && messageCount > 0) {
              console.warn('Warning: Messages were processed but none were added to the emails array');
            }
            
            imap.end();
            resolve({ 
              emails: emails.sort((a, b) => {
                // Sort by date descending (newest first)
                return b.date.getTime() - a.date.getTime();
              }), 
              total: totalMessages 
            });
          });
        });
      });
    });
    
    imap.once('error', (err) => {
      console.error('IMAP connection error:', err);
      try {
        imap.end();
      } catch (e) {
        console.error('Error ending IMAP connection:', e);
      }
      reject(new Error(`IMAP connection error: ${err.message}`));
    });
    
    imap.once('end', () => {
      console.log('IMAP connection ended');
    });
    
    console.log('Connecting to IMAP server...');
    imap.connect();
  });
};

/**
 * Mark email as read
 */
export const markEmailAsRead = async (user: string, password: string, itemId: string): Promise<boolean> => {
  let imap: Imap | null = null;
  
  try {
    console.log(`Marking email as read: ${itemId}`);
    imap = getImapConnection(user, password);
    
    return new Promise((resolve, reject) => {
      imap!.once('ready', () => {
        // First get the folder from the UID
        const uidParts = itemId.split(':');
        const folder = uidParts.length > 1 ? uidParts[0] : 'INBOX';
        const uid = uidParts.length > 1 ? uidParts[1] : itemId;
        
        const mappedFolder = mapFolderToImap(folder);
        console.log(`Opening folder ${mappedFolder} to mark message ${uid} as read`);
        
        imap!.openBox(mappedFolder, false, (err, box) => {
          if (err) {
            console.error(`Error opening folder ${mappedFolder}:`, err);
            ensureConnectionClosed(imap);
            return reject(err);
          }
          
          // Mark the message as read
          imap!.addFlags(uid, '\\Seen', (err) => {
            if (err) {
              console.error(`Error marking message ${uid} as read:`, err);
              ensureConnectionClosed(imap);
              return reject(err);
            }
            
            console.log(`Message ${uid} marked as read`);
            ensureConnectionClosed(imap);
            resolve(true);
          });
        });
      });
      
      imap!.once('error', (err) => {
        console.error('IMAP connection error:', err);
        ensureConnectionClosed(imap);
        reject(err);
      });
      
      if (imap!.state !== 'connected' && imap!.state !== 'authenticated') {
        imap!.connect();
      }
    });
  } catch (error) {
    console.error('Error in markEmailAsRead:', error);
    ensureConnectionClosed(imap);
    throw error;
  }
};

/**
 * Move email to another folder
 */
export const moveEmail = async (
  user: string,
  password: string,
  itemId: string,
  fromFolder: string,
  toFolder: string
): Promise<boolean> => {
  let imap: Imap | null = null;
  
  try {
    console.log(`Moving email ${itemId} from ${fromFolder} to ${toFolder}`);
    imap = getImapConnection(user, password);
    
    return new Promise((resolve, reject) => {
      imap!.once('ready', () => {
        // Parse the itemId to get the UID
        const uid = itemId.includes(':') ? itemId.split(':')[1] : itemId;
        
        // Map folder names to IMAP format
        const mappedFromFolder = mapFolderToImap(fromFolder);
        const mappedToFolder = mapFolderToImap(toFolder);
        
        console.log(`Opening folder ${mappedFromFolder} to move message ${uid} to ${mappedToFolder}`);
        
        imap!.openBox(mappedFromFolder, false, (err, box) => {
          if (err) {
            console.error(`Error opening folder ${mappedFromFolder}:`, err);
            ensureConnectionClosed(imap);
            return reject(err);
          }
          
          // Move the message
          imap!.move(uid, mappedToFolder, (err) => {
            if (err) {
              console.error(`Error moving message ${uid} to ${mappedToFolder}:`, err);
              ensureConnectionClosed(imap);
              return reject(err);
            }
            
            console.log(`Message ${uid} moved to ${mappedToFolder}`);
            ensureConnectionClosed(imap);
            resolve(true);
          });
        });
      });
      
      imap!.once('error', (err) => {
        console.error('IMAP connection error:', err);
        ensureConnectionClosed(imap);
        reject(err);
      });
      
      if (imap!.state !== 'connected' && imap!.state !== 'authenticated') {
        imap!.connect();
      }
    });
  } catch (error) {
    console.error('Error in moveEmail:', error);
    ensureConnectionClosed(imap);
    throw error;
  }
};

/**
 * Delete email (move to trash)
 */
export const deleteEmail = async (
  user: string,
  password: string,
  itemId: string
): Promise<boolean> => {
  let imap: Imap | null = null;
  
  try {
    console.log(`Deleting email ${itemId}`);
    imap = getImapConnection(user, password);
    
    return new Promise((resolve, reject) => {
      imap!.once('ready', () => {
        // Parse the itemId to get the folder and UID
        const uidParts = itemId.split(':');
        const folder = uidParts.length > 1 ? uidParts[0] : 'INBOX';
        const uid = uidParts.length > 1 ? uidParts[1] : itemId;
        
        const mappedFolder = mapFolderToImap(folder);
        console.log(`Opening folder ${mappedFolder} to delete message ${uid}`);
        
        imap!.openBox(mappedFolder, false, (err, box) => {
          if (err) {
            console.error(`Error opening folder ${mappedFolder}:`, err);
            ensureConnectionClosed(imap);
            return reject(err);
          }
          
          // Move to trash or add deleted flag
          const trashFolder = mapFolderToImap('TRASH');
          
          if (mappedFolder.toLowerCase() === trashFolder.toLowerCase()) {
            // If already in trash, add the Deleted flag
            imap!.addFlags(uid, '\\Deleted', (err) => {
              if (err) {
                console.error(`Error adding Deleted flag to message ${uid}:`, err);
                ensureConnectionClosed(imap);
                return reject(err);
              }
              
              // Expunge to permanently delete
              imap!.expunge((err) => {
                if (err) {
                  console.error('Error expunging messages:', err);
                  ensureConnectionClosed(imap);
                  return reject(err);
                }
                
                console.log(`Message ${uid} permanently deleted`);
                ensureConnectionClosed(imap);
                resolve(true);
              });
            });
          } else {
            // Move to trash
            imap!.move(uid, trashFolder, (err) => {
              if (err) {
                console.error(`Error moving message ${uid} to trash:`, err);
                ensureConnectionClosed(imap);
                return reject(err);
              }
              
              console.log(`Message ${uid} moved to trash`);
              ensureConnectionClosed(imap);
              resolve(true);
            });
          }
        });
      });
      
      imap!.once('error', (err) => {
        console.error('IMAP connection error:', err);
        ensureConnectionClosed(imap);
        reject(err);
      });
      
      if (imap!.state !== 'connected' && imap!.state !== 'authenticated') {
        imap!.connect();
      }
    });
  } catch (error) {
    console.error('Error in deleteEmail:', error);
    ensureConnectionClosed(imap);
    throw error;
  }
};

/**
 * Permanently delete email
 */
export const permanentlyDeleteEmail = async (user: string, password: string, itemId: string): Promise<boolean> => {
  let imap: Imap | null = null;
  
  try {
    console.log(`Permanently deleting email ${itemId}`);
    imap = getImapConnection(user, password);
    
    return new Promise((resolve, reject) => {
      imap!.once('ready', () => {
        // Parse the itemId to get the folder and UID
        const uidParts = itemId.split(':');
        const folder = uidParts.length > 1 ? uidParts[0] : 'TRASH';
        const uid = uidParts.length > 1 ? uidParts[1] : itemId;
        
        const mappedFolder = mapFolderToImap(folder);
        console.log(`Opening folder ${mappedFolder} to permanently delete message ${uid}`);
        
        imap!.openBox(mappedFolder, false, (err, box) => {
          if (err) {
            console.error(`Error opening folder ${mappedFolder}:`, err);
            ensureConnectionClosed(imap);
            return reject(err);
          }
          
          // Add the Deleted flag
          imap!.addFlags(uid, '\\Deleted', (err) => {
            if (err) {
              console.error(`Error adding Deleted flag to message ${uid}:`, err);
              ensureConnectionClosed(imap);
              return reject(err);
            }
            
            // Expunge to permanently delete
            imap!.expunge((err) => {
              if (err) {
                console.error('Error expunging messages:', err);
                ensureConnectionClosed(imap);
                return reject(err);
              }
              
              console.log(`Message ${uid} permanently deleted`);
              ensureConnectionClosed(imap);
              resolve(true);
            });
          });
        });
      });
      
      imap!.once('error', (err) => {
        console.error('IMAP connection error:', err);
        ensureConnectionClosed(imap);
        reject(err);
      });
      
      if (imap!.state !== 'connected' && imap!.state !== 'authenticated') {
        imap!.connect();
      }
    });
  } catch (error) {
    console.error('Error in permanentlyDeleteEmail:', error);
    ensureConnectionClosed(imap);
    throw error;
  }
}; 