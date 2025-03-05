import { NextRequest, NextResponse } from 'next/server';
import { EmailAction } from './types';
import { rateLimit } from './utils';
import { EMAIL_USER, EMAIL_PASSWORD, imapPool } from './config';
import { 
  fetchEmails, 
  markEmailAsRead, 
  deleteEmail, 
  moveEmail,
  permanentlyDeleteEmail
} from './imap';
import { sendEmail } from './smtp';

// Log the current connection pool size
const logConnectionPoolSize = () => {
  console.log(`Current IMAP connection pool size: ${imapPool.size}`);
};

/**
 * GET handler for retrieving emails
 */
export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!rateLimit.checkLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder')?.toUpperCase() || 'INBOX';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    console.log(`API Request: GET /api/email?folder=${folder}&page=${page}&limit=${limit}`);
    console.log(`Fetching emails from folder: ${folder}, page: ${page}, limit: ${limit}`);
    logConnectionPoolSize();

    try {
      const result = await fetchEmails(EMAIL_USER, EMAIL_PASSWORD, folder, page, limit);
      logConnectionPoolSize();
      
      console.log(`Fetch result: ${result.emails.length} emails, total: ${result.total}`);
      
      if (result.emails.length === 0 && result.total > 0) {
        console.warn(`Warning: No emails returned but total count is ${result.total}`);
        
        // If we're using AWS WorkMail, try with a different folder mapping
        if (folder === 'INBOX') {
          console.log('Trying with explicit INBOX folder...');
          const fallbackResult = await fetchEmails(EMAIL_USER, EMAIL_PASSWORD, 'AWS_INBOX', page, limit);
          
          if (fallbackResult.emails.length > 0) {
            console.log(`Fallback successful: ${fallbackResult.emails.length} emails found`);
            return NextResponse.json({ 
              emails: fallbackResult.emails,
              total: fallbackResult.total,
              page,
              limit,
              totalPages: Math.ceil(fallbackResult.total / limit)
            });
          }
        }
      }
      
      return NextResponse.json({ 
        emails: result.emails,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      });
    } catch (error) {
      console.error('Error fetching emails:', error);
      logConnectionPoolSize();
      
      return NextResponse.json({ 
        error: 'Failed to fetch emails', 
        message: String(error),
        folder: folder
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve emails', message: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST handler for sending emails and email actions
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!rateLimit.checkLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const data = await request.json() as EmailAction;
    const { action, itemId, to, subject, body, fromFolder, toFolder } = data;
    
    logConnectionPoolSize();

    // Handle sending emails
    if (action === 'send' || (!action && to && subject && body)) {
      const result = await sendEmail(to!, subject!, body!);
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          messageId: result.messageId,
        });
      } else {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
    }

    // Handle email actions
    if (action === 'markAsRead' && itemId) {
      try {
        await markEmailAsRead(EMAIL_USER, EMAIL_PASSWORD, itemId);
        logConnectionPoolSize();
        return NextResponse.json({ success: true });
      } catch (error) {
        logConnectionPoolSize();
        return NextResponse.json({ error: String(error) }, { status: 500 });
      }
    }

    if (action === 'delete' && itemId) {
      try {
        await deleteEmail(EMAIL_USER, EMAIL_PASSWORD, itemId);
        logConnectionPoolSize();
        return NextResponse.json({ success: true });
      } catch (error) {
        logConnectionPoolSize();
        return NextResponse.json({ error: String(error) }, { status: 500 });
      }
    }

    if (action === 'move' && itemId && fromFolder && toFolder) {
      try {
        await moveEmail(EMAIL_USER, EMAIL_PASSWORD, itemId, fromFolder, toFolder);
        logConnectionPoolSize();
        return NextResponse.json({ success: true });
      } catch (error) {
        logConnectionPoolSize();
        return NextResponse.json({ error: String(error) }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST handler:', error);
    return NextResponse.json(
      { error: 'Failed to process request', message: String(error) },
      { status: 500 }
    );
  }
}
