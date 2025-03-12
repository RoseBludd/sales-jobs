import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { WellKnownFolderName } from 'ews-javascript-api';
import { getEmails, sendEmail } from '@/lib/ews';
import { emailListQuerySchema, sendEmailSchema } from '@/lib/validation';
import { getCachedEmails, cacheEmails, isEmailCacheFresh } from '@/lib/cache';

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

    // Map folder name to EWS WellKnownFolderName
    let folderName: WellKnownFolderName;
    switch (folder?.toLowerCase() || 'inbox') {
      case 'inbox':
        folderName = WellKnownFolderName.Inbox;
        break;
      case 'sent':
        folderName = WellKnownFolderName.SentItems;
        break;
      case 'drafts':
        folderName = WellKnownFolderName.Drafts;
        break;
      case 'deleted':
        folderName = WellKnownFolderName.DeletedItems;
        break;
      case 'junk':
        folderName = WellKnownFolderName.JunkEmail;
        break;
      default:
        folderName = WellKnownFolderName.Inbox;
    }

    // Get the user ID from the session
    const userId = session.user.email;
    
    // If sync is true, check if we need to refresh the cache
    const shouldUseCache = !sync && await isEmailCacheFresh(userId, folder || 'inbox', 60);
    
    // Try to get emails from cache first if not syncing
    if (shouldUseCache) {
      const cachedEmails = await getCachedEmails(userId, folder || 'inbox');
      
      if (cachedEmails) {
        // Apply pagination to cached results
        const paginatedEmails = cachedEmails.slice(offset, offset + pageSize);
        return NextResponse.json({
          emails: paginatedEmails,
          total: cachedEmails.length,
          page,
          pageSize,
          fromCache: true,
          lastSynced: Date.now(),
        });
      }
    }

    // If not in cache or syncing, fetch from EWS
    const emails = await getEmails(folderName, pageSize, offset);
    
    // Cache the results
    await cacheEmails(userId, folder || 'inbox', emails);

    return NextResponse.json({
      emails,
      total: emails.length,
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