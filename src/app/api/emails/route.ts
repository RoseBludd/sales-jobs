import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sendEmail } from '@/lib/ews';
import { emailListQuerySchema, sendEmailSchema } from '@/lib/validation';
import * as emailDbService from '@/lib/email-db-service';
import { WorkMailFolderName } from '@/lib/ews';

// GET /api/emails - List emails
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const parsed = emailListQuerySchema.safeParse({
      folder: searchParams.get('folder') || 'inbox',
      pageSize: searchParams.get('pageSize') || 50,
      page: searchParams.get('page') || 1,
      sync: searchParams.get('sync') === 'true',
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.format() }, { status: 400 });
    }

    const { folder, pageSize, page, sync } = parsed.data;
    const offset = (page - 1) * pageSize;

    // Map folder name to WorkMailFolderName using a more flexible approach
    let workMailFolder: WorkMailFolderName;
    const folderUpper = (folder || 'inbox').toUpperCase();
    
    // Direct mapping for standard folder names
    if (folderUpper === 'INBOX') {
      workMailFolder = WorkMailFolderName.Inbox;
    } else if (folderUpper === 'SENT_ITEMS' || folderUpper === 'SENT') {
      workMailFolder = WorkMailFolderName.SentItems;
    } else if (folderUpper === 'DRAFTS') {
      workMailFolder = WorkMailFolderName.Drafts;
    } else if (folderUpper === 'DELETED_ITEMS' || folderUpper === 'DELETED') {
      workMailFolder = WorkMailFolderName.DeletedItems;
    } else if (folderUpper === 'JUNK_EMAIL' || folderUpper === 'JUNK') {
      workMailFolder = WorkMailFolderName.JunkEmail;
    } else {
      // Default to inbox for unknown folder names
      workMailFolder = WorkMailFolderName.Inbox;
    }
    
    console.log(`Mapped folder name "${folder}" to WorkMailFolderName: ${workMailFolder}`);

    // Get the user ID from the session
    const userId = await emailDbService.getCurrentUserId();
    
    // If sync is true, fetch emails from EWS and store in database
    if (sync) {
      try {
        console.log(`Syncing emails from folder: ${workMailFolder}`);
        // Check if we should run in background
        const background = searchParams.get('background') === 'true';
        
        if (background) {
          // Start background sync and return immediately
          setTimeout(async () => {
            try {
              await emailDbService.syncEmailsFromEws(workMailFolder, pageSize * 2, 0);
              console.log(`Background sync completed for ${workMailFolder}`);
            } catch (syncError) {
              console.error('Error in background sync:', syncError);
            }
          }, 100);
        } else {
          // Sync in foreground
          await emailDbService.syncEmailsFromEws(workMailFolder, pageSize * 2, 0);
        }
      } catch (syncError) {
        console.error('Error syncing emails:', syncError);
        // Continue even if sync fails, we'll return whatever is in the database
      }
    }

    // Get total email count
    const totalCount = await emailDbService.getEmailCountFromDb(userId, workMailFolder);
    
    // Get emails from database
    const emails = await emailDbService.getEmailsFromDb(
      userId,
      workMailFolder,
      pageSize,
      offset
    );

    console.log(`Retrieved ${emails.length} emails from database for folder ${workMailFolder}`);
    
    return NextResponse.json({
      emails,
      total: totalCount,
      page,
      pageSize,
      fromCache: false,
      lastSynced: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
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

// POST /api/emails - Send email
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const parsed = sendEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.format() }, { status: 400 });
    }

    const { to, subject, body: emailBody, cc, bcc, attachments } = parsed.data;

    // Map email domains if needed
    const mappedTo = to.map(email => mapEmailDomain(email));
    const mappedCc = cc?.map(email => mapEmailDomain(email));
    const mappedBcc = bcc?.map(email => mapEmailDomain(email));

    // Send email using EWS
    const emailId = await sendEmail(mappedTo, subject, emailBody, mappedCc, mappedBcc, attachments);

    return NextResponse.json({
      success: true,
      emailId,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
} 