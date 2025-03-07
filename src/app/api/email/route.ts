import { NextRequest, NextResponse } from 'next/server';
import { EmailAction } from './types';
import { rateLimit } from './utils';
import { EMAIL_PASSWORD, imapPool, getEmailUser } from './config';
import { 
  fetchEmails, 
  markEmailAsRead, 
  deleteEmail, 
  moveEmail,
  checkSentEmail
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
    
    // Add rate limit headers
    const remaining = rateLimit.getRemainingRequests(ip);
    const resetTime = rateLimit.getResetTime(ip);
    
    // Check rate limit
    if (!rateLimit.checkLimit(ip)) {
      const response = NextResponse.json(
        { error: 'Too many requests' }, 
        { status: 429 }
      );
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', rateLimit.max.toString());
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
      response.headers.set('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString());
      
      return response;
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder')?.toUpperCase() || 'INBOX';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    console.log(`API Request: GET /api/email?folder=${folder}&page=${page}&limit=${limit}`);
    console.log(`Fetching emails from folder: ${folder}, page: ${page}, limit: ${limit}`);
    logConnectionPoolSize();

    try {
      // Get the authenticated user's email with weroofamerica.com domain
      const emailUser = await getEmailUser();
      
      const result = await fetchEmails(emailUser, EMAIL_PASSWORD, folder, page, limit);
      logConnectionPoolSize();
      
      console.log(`Fetch result: ${result.emails.length} emails, total: ${result.total}`);
      
      if (result.emails.length === 0 && result.total > 0) {
        console.warn(`Warning: No emails returned but total count is ${result.total}`);
        
        // If we're using AWS WorkMail, try with a different folder mapping
        if (folder === 'INBOX') {
          console.log('Trying with explicit INBOX folder...');
          const fallbackResult = await fetchEmails(emailUser, EMAIL_PASSWORD, 'AWS_INBOX', page, limit);
          
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
      
      // Create response with rate limit headers
      const response = NextResponse.json({
        emails: result.emails,
        totalPages: Math.ceil(result.total / limit),
        total: result.total
      });
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', rateLimit.max.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
      
      return response;
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
    console.log(`Email API POST request: action=${action}, to=${to}, subject=${subject?.substring(0, 30)}...`);

    // Handle sending emails
    if (action === 'send' || (!action && to && subject && body)) {
      console.log(`Attempting to send email to: ${to}`);
      try {
        const result = await sendEmail(to!, subject!, body!);
        
        if (result.success) {
          console.log(`Email sent successfully with messageId: ${result.messageId}`);
          
          // Add a longer delay to allow the email to be saved to the Sent folder
          // AWS WorkMail can take several seconds to process and save the email
          console.log('Waiting for AWS WorkMail to process the email...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Get the authenticated user's email
          const emailUser = await getEmailUser();
          
          // Check if the email was saved to the sent folder
          if (result.messageId) {
            try {
              // First check the sent folder
              const emailFound = await checkSentEmail(emailUser, EMAIL_PASSWORD, result.messageId);
              console.log(`Email found in sent folder: ${emailFound}`);
              
              // If the email wasn't found, we'll try again with a longer delay
              if (!emailFound) {
                console.log('Email not found in sent folder, waiting longer...');
                await new Promise(resolve => setTimeout(resolve, 10000));
                
                const retryFound = await checkSentEmail(emailUser, EMAIL_PASSWORD, result.messageId);
                console.log(`Email found in sent folder after retry: ${retryFound}`);
              }
              
              // If the email was sent to self, also check the inbox
              if (to === emailUser) {
                console.log('Email was sent to self, checking inbox for delivery...');
                // Wait a bit longer for delivery to inbox
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                try {
                  // Fetch recent emails from inbox to check if our email arrived
                  const inboxResult = await fetchEmails(emailUser, EMAIL_PASSWORD, 'INBOX', 1, 5);
                  console.log(`Found ${inboxResult.emails.length} recent emails in inbox`);
                  
                  // Log the subjects to help with debugging
                  inboxResult.emails.forEach((email, index) => {
                    console.log(`Recent email ${index + 1}: ${email.subject}`);
                  });
                } catch (inboxError) {
                  console.error('Error checking inbox:', inboxError);
                }
              }
            } catch (error) {
              console.error('Error checking sent folder:', error);
            }
          }
          
          return NextResponse.json({
            success: true,
            messageId: result.messageId,
          });
        } else {
          console.error(`Failed to send email: ${result.error}`);
          return NextResponse.json({ 
            error: 'Failed to send email', 
            message: result.error 
          }, { status: 500 });
        }
      } catch (error) {
        console.error('Error in send email handler:', error);
        return NextResponse.json({ 
          error: 'Failed to send email', 
          message: String(error) 
        }, { status: 500 });
      }
    }

    // Get the authenticated user's email with weroofamerica.com domain
    const emailUser = await getEmailUser();

    // Handle email actions
    if (action === 'markAsRead' && itemId) {
      try {
        await markEmailAsRead(emailUser, EMAIL_PASSWORD, itemId);
        logConnectionPoolSize();
        return NextResponse.json({ success: true });
      } catch (error) {
        logConnectionPoolSize();
        return NextResponse.json({ error: String(error) }, { status: 500 });
      }
    }

    if (action === 'delete' && itemId) {
      try {
        await deleteEmail(emailUser, EMAIL_PASSWORD, itemId);
        logConnectionPoolSize();
        return NextResponse.json({ success: true });
      } catch (error) {
        logConnectionPoolSize();
        return NextResponse.json({ error: String(error) }, { status: 500 });
      }
    }

    if (action === 'move' && itemId && fromFolder && toFolder) {
      try {
        await moveEmail(emailUser, EMAIL_PASSWORD, itemId, fromFolder, toFolder);
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
