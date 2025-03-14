import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as emailDbService from '@/lib/email-db-service';
import { WorkMailFolderName } from '@/lib/ews';

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
          setTimeout(async () => {
            try {
              await emailDbService.syncEmailsFromEws(workMailFolder, pageSize * 2, 0, forceFull);
              console.log(`Background sync completed for ${workMailFolder}`);
            } catch (syncError) {
              console.error('Error in background sync:', syncError);
            }
          }, 100);
        } else {
          // Sync in foreground
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
    
    // TODO: Implement sending email via EWS
    // This would involve:
    // 1. Creating a new email in EWS
    // 2. Saving the email to the database
    // 3. Returning the created email
    
    return NextResponse.json(
      { message: 'Email sending not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error creating email:', error);
    return NextResponse.json(
      { error: 'Failed to create email' },
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