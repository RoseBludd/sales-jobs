import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as emailDbService from '@/lib/email-db-service';
import { WorkMailFolderName } from '@/lib/ews';

// Declare global types for sync tracking
declare global {
  var syncInProgress: Record<string, boolean>;
  var fixInProgress: Record<string, boolean>;
}

/**
 * GET handler for fetching emails
 * 
 * Query parameters:
 * - folder: The email folder to fetch emails from (INBOX, SENT_ITEMS, etc.)
 * - page: The page number to fetch (optional, default: 1)
 * - pageSize: The number of emails per page (optional, default: 20)
 * - sync: Whether to sync emails before fetching (optional, default: false)
 */
export async function GET(request: NextRequest) {
  try {
    // Get the session to verify the user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'INBOX';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const shouldSync = searchParams.get('sync') === 'true';
    
    // Get user ID for email operations
    const userId = await emailDbService.getCurrentUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Convert folder string to WorkMailFolderName
    let workMailFolder: WorkMailFolderName;
    switch (folder.toUpperCase()) {
      case 'INBOX':
        workMailFolder = WorkMailFolderName.Inbox;
        break;
      case 'SENT_ITEMS':
      case 'SENT':
        workMailFolder = WorkMailFolderName.SentItems;
        break;
      case 'DRAFTS':
        workMailFolder = WorkMailFolderName.Drafts;
        break;
      case 'DELETED_ITEMS':
      case 'TRASH':
        workMailFolder = WorkMailFolderName.DeletedItems;
        break;
      case 'JUNK_EMAIL':
      case 'SPAM':
        workMailFolder = WorkMailFolderName.JunkEmail;
        break;
      default:
        workMailFolder = WorkMailFolderName.Inbox;
    }
    
    // Get the folder ID
    const folderId = await emailDbService.getFolderByWorkMailName(workMailFolder, userId);
    
    if (!folderId) {
      return NextResponse.json(
        { error: `Folder "${folder}" not found` },
        { status: 404 }
      );
    }
    
    // Sync emails if requested
    if (shouldSync) {
      try {
        // Use the syncEmailsFromEws function
        const background = searchParams.get('background') === 'true';
        const forceFull = searchParams.get('forceFull') === 'true';
        
        if (background) {
          // Start background sync and return immediately
          // Use a more efficient approach for background syncing
          const syncKey = `sync-${workMailFolder}-${userId}`;
          
          // Check if a sync is already in progress for this folder
          const syncInProgress = global.syncInProgress?.[syncKey];
          
          if (!syncInProgress) {
            // Mark sync as in progress
            if (!global.syncInProgress) {
              global.syncInProgress = {};
            }
            global.syncInProgress[syncKey] = true;
            
            setTimeout(async () => {
              try {
                // Use a smaller page size for background sync to avoid timeouts
                const syncPageSize = 25;
                let syncOffset = 0;
                let totalSynced = 0;
                let batchCount = 0;
                
                // Sync in smaller batches
                while (batchCount < 10) { // Limit to 10 batches to prevent infinite loops
                  const count = await emailDbService.syncEmailsFromEws(
                    workMailFolder, 
                    syncPageSize, 
                    syncOffset, 
                    forceFull
                  );
                  
                  totalSynced += count;
                  
                  // If we got less than a full page, we're done
                  if (count < syncPageSize) {
                    break;
                  }
                  
                  // Move to the next batch
                  syncOffset += syncPageSize;
                  batchCount++;
                  
                  // Small delay between batches to reduce server load
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                console.log(`Background sync completed for ${workMailFolder}, synced ${totalSynced} emails`);
              } catch (syncError) {
                console.error('Error in background sync:', syncError);
              } finally {
                // Mark sync as complete
                if (global.syncInProgress) {
                  delete global.syncInProgress[syncKey];
                }
              }
            }, 100);
            
            console.log(`Started background sync for ${workMailFolder}`);
          } else {
            console.log(`Background sync already in progress for ${workMailFolder}`);
          }
        } else {
          // Sync in foreground with a reasonable limit
          await emailDbService.syncEmailsFromEws(workMailFolder, pageSize * 2, 0, forceFull);
        }
      } catch (error) {
        console.error(`Error syncing emails for folder ${folder}:`, error);
        // We'll continue with fetching the existing emails even if sync fails
      }
    }
    
    // Calculate pagination
    const offset = (page - 1) * pageSize;
    
    // Get folder ID for the folder
    const folderIdForFetch = await emailDbService.getFolderByWorkMailName(workMailFolder, userId);
    
    // Fetch emails from the database
    const emails = await emailDbService.getEmailsFromDb(
      userId, 
      workMailFolder, 
      pageSize,
      offset
    );
    
    // Get total count
    const totalCount = await emailDbService.getEmailCountFromDb(userId, workMailFolder);
    
    // Get the last synced time
    // We need to use a private function, so we'll just use the current time as a fallback
    let lastSynced = null;
    try {
      // Try to get the last sync time from the database
      const result = await prisma.$queryRaw`
        SELECT MAX(last_synced_at) as last_sync
        FROM email_folders
        WHERE id = ${folderIdForFetch}::UUID
      `;
      
      if (Array.isArray(result) && result.length > 0 && result[0].last_sync) {
        lastSynced = new Date(result[0].last_sync).toISOString();
      }
    } catch (error) {
      console.error('Error getting last sync time:', error);
    }
    
    return NextResponse.json({
      emails,
      total: totalCount,
      page,
      pageSize,
      lastSynced
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for composing and sending a new email
 */
export async function POST(request: NextRequest) {
  try {
    // Get the session to verify the user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.to || !body.subject) {
      return NextResponse.json(
        { error: 'To and subject fields are required' },
        { status: 400 }
      );
    }
    
    // Map email domains if needed
    const mappedTo = Array.isArray(body.to) 
      ? body.to.map((email: string) => mapEmailDomain(email))
      : [mapEmailDomain(body.to)];
      
    const mappedCc = body.cc 
      ? (Array.isArray(body.cc) 
          ? body.cc.map((email: string) => mapEmailDomain(email))
          : [mapEmailDomain(body.cc)])
      : undefined;
      
    const mappedBcc = body.bcc
      ? (Array.isArray(body.bcc)
          ? body.bcc.map((email: string) => mapEmailDomain(email))
          : [mapEmailDomain(body.bcc)])
      : undefined;
    
    try {
      // Get user ID for email operations
      const userId = await emailDbService.getCurrentUserId();
      
      if (!userId) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      // Get folder ID for sent items
      const folderId = await emailDbService.getFolderByWorkMailName(
        WorkMailFolderName.SentItems, 
        userId
      );
      
      // Create email object
      const emailToSend = {
        id: `sent-${Date.now()}`, // Generate a unique ID
        subject: body.subject,
        from: session.user.email,
        fromName: session.user.name || session.user.email.split('@')[0],
        to: mappedTo,
        cc: mappedCc,
        body: body.body,
        receivedDate: new Date().toISOString(),
        hasAttachments: false,
        isRead: true,
        importance: 'Normal',
        internetMessageId: `<${Date.now()}.${Math.random().toString(36).substring(2)}@${session.user.email.split('@')[1]}>`,
        size: body.body ? body.body.length : 0
      };
      
      // Save to database
      const emailId = await emailDbService.saveEmail(emailToSend, userId, folderId);
      
      // TODO: Implement actual email sending via EWS or other email service
      // For now, we'll just save it to the database
      
      return NextResponse.json({
        success: true,
        message: 'Email saved to sent items',
        id: emailId
      });
    } catch (error) {
      console.error('Error sending email:', error);
      return NextResponse.json(
        { error: 'Failed to send email', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating email:', error);
    return NextResponse.json(
      { error: 'Failed to create email' },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler for fixing emails with missing sender information
 */
export async function PATCH(request: NextRequest) {
  try {
    // Get the session to verify the user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const batchSize = body.batchSize || 50;
    const background = body.background === true;
    
    // Get user ID for email operations
    const userId = await emailDbService.getCurrentUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    if (background) {
      // Start background fixing process
      const fixKey = `fix-emails-${userId}`;
      
      // Check if a fix is already in progress
      const fixInProgress = global.fixInProgress?.[fixKey];
      
      if (!fixInProgress) {
        // Mark fix as in progress
        if (!global.fixInProgress) {
          global.fixInProgress = {};
        }
        global.fixInProgress[fixKey] = true;
        
        setTimeout(async () => {
          try {
            let totalFixed = 0;
            let batchCount = 0;
            let fixedInBatch = 0;
            
            // Process in batches until no more emails need fixing or we reach a reasonable limit
            do {
              fixedInBatch = await emailDbService.fixEmailsWithMissingSender(userId, batchSize);
              totalFixed += fixedInBatch;
              batchCount++;
              
              // Add a small delay between batches
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Stop after 10 batches or when no more emails are fixed
            } while (fixedInBatch > 0 && batchCount < 10);
            
            console.log(`Background fix completed, fixed ${totalFixed} emails in ${batchCount} batches`);
          } catch (error) {
            console.error('Error in background fix:', error);
          } finally {
            // Mark fix as complete
            if (global.fixInProgress) {
              delete global.fixInProgress[fixKey];
            }
          }
        }, 100);
        
        return NextResponse.json({
          success: true,
          message: 'Started background process to fix emails with missing sender information',
          background: true
        });
      } else {
        return NextResponse.json({
          success: true,
          message: 'Background fix already in progress',
          background: true
        });
      }
    } else {
      // Fix emails with missing sender information in foreground
      const fixedCount = await emailDbService.fixEmailsWithMissingSender(userId, batchSize);
      
      return NextResponse.json({
        success: true,
        message: `Fixed sender information for ${fixedCount} emails`,
        fixedCount,
        background: false
      });
    }
  } catch (error) {
    console.error('Error fixing emails:', error);
    return NextResponse.json(
      { error: 'Failed to fix emails' },
      { status: 500 }
    );
  }
}

// Helper function to map email domain
function mapEmailDomain(email: string): string {
  if (email && email.includes('@restoremastersllc.com')) {
    const username = email.split('@')[0];
    return `${username}@weroofamerica.com`;
  }
  return email;
} 