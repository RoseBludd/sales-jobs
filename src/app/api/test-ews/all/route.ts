import { NextRequest, NextResponse } from 'next/server';
import { 
  getEmails, 
  getEmailById, 
  sendEmail, 
  moveEmail, 
  deleteEmail, 
  searchEmails,
  getCalendarEvents, 
  getCalendarEventById, 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent,
  manageEventAttendees,
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  searchContacts,
  getFolders
} from '@/lib/ews';

// Comprehensive test route for all EWS functionality
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'test';
    
    // Email tests
    if (action === 'email-list') {
      const emails = await getEmails();
      return NextResponse.json({ emails });
    }
    
    if (action === 'email-get' && searchParams.get('id')) {
      const emailId = searchParams.get('id') as string;
      const email = await getEmailById(emailId);
      return NextResponse.json({ email });
    }
    
    if (action === 'email-send') {
      const to = [process.env.TEST_EMAIL || 'test@example.com'];
      const subject = 'Test Email ' + new Date().toISOString();
      const body = 'This is a test email sent via API';
      
      const emailId = await sendEmail(to, subject, body);
      return NextResponse.json({ 
        success: true, 
        message: 'Email sent',
        emailId
      });
    }
    
    if (action === 'email-send-with-attachment') {
      const to = [process.env.TEST_EMAIL || 'test@example.com']; // Replace with your test email
      const subject = 'Test Email with Attachment ' + new Date().toISOString();
      const body = '<html><body><h1>This is a test email with attachment</h1><p>Testing the attachment functionality.</p></body></html>';
      
      // Create a simple text attachment
      const attachments = [
        {
          name: 'test-attachment.txt',
          content: Buffer.from('This is a test attachment file content.').toString('base64'),
          contentType: 'text/plain'
        }
      ];
      
      const emailId = await sendEmail(to, subject, body, undefined, undefined, attachments);
      return NextResponse.json({ 
        success: true, 
        message: 'Email with attachment sent',
        emailId
      });
    }
    
    if (action === 'email-send-with-inline-attachment') {
      const to = [process.env.TEST_EMAIL || 'test@example.com']; // Replace with your test email
      const subject = 'Test Email with Inline Attachment ' + new Date().toISOString();
      
      // Create a simple inline image attachment (1x1 transparent PNG)
      const contentId = 'test-image';
      const attachments = [
        {
          name: 'test-image.png',
          content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          contentType: 'image/png',
          isInline: true,
          contentId
        }
      ];
      
      // HTML body with reference to the inline image
      const body = `<html><body>
        <h1>This is a test email with inline attachment</h1>
        <p>Below is an inline image:</p>
        <img src="cid:${contentId}" alt="Test Image" />
        <p>Testing the inline attachment functionality.</p>
      </body></html>`;
      
      const emailId = await sendEmail(to, subject, body, undefined, undefined, attachments);
      return NextResponse.json({ 
        success: true, 
        message: 'Email with inline attachment sent',
        emailId
      });
    }
    
    if (action === 'email-search' && searchParams.get('query')) {
      const query = searchParams.get('query') as string;
      const emails = await searchEmails(query);
      return NextResponse.json({ emails });
    }
    
    if (action === 'folders-list') {
      const folders = await getFolders();
      return NextResponse.json({ folders });
    }
    
    // Calendar tests
    if (action === 'calendar-list') {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      
      const events = await getCalendarEvents(startDate, endDate);
      return NextResponse.json({ events });
    }
    
    if (action === 'calendar-create') {
      const subject = 'Test Event ' + new Date().toISOString();
      const start = new Date();
      start.setHours(start.getHours() + 1);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      
      const eventId = await createCalendarEvent(
        subject,
        start,
        end,
        'Test Location',
        'This is a test event created via API'
      );
      
      return NextResponse.json({ 
        success: true, 
        message: 'Calendar event created',
        eventId
      });
    }
    
    if (action === 'calendar-get' && searchParams.get('id')) {
      const eventId = searchParams.get('id') as string;
      const event = await getCalendarEventById(eventId);
      
      return NextResponse.json({ event });
    }
    
    if (action === 'calendar-update' && searchParams.get('id')) {
      const eventId = searchParams.get('id') as string;
      const success = await updateCalendarEvent(eventId, {
        subject: 'Updated Test Event ' + new Date().toISOString(),
        body: 'This event was updated via API'
      });
      
      return NextResponse.json({ 
        success, 
        message: 'Calendar event updated'
      });
    }
    
    if (action === 'calendar-delete' && searchParams.get('id')) {
      const eventId = searchParams.get('id') as string;
      const success = await deleteCalendarEvent(eventId);
      
      return NextResponse.json({ 
        success, 
        message: 'Calendar event deleted'
      });
    }
    
    // Contacts tests
    if (action === 'contacts-list') {
      const contacts = await getContacts();
      return NextResponse.json({ contacts });
    }
    
    if (action === 'contacts-create') {
      try {
        const displayName = 'Test Contact ' + new Date().toISOString();
        const emailAddress = `test-${Date.now()}@example.com`;
        
        console.log('Creating contact with:', { displayName, emailAddress });
        
        const contactId = await createContact(
          displayName,
          emailAddress,
          '555-123-4567',
          '555-987-6543',
          'Sales Manager',
          'Restore Masters LLC',
          'Sales Department',
          'This is a test contact created via API with detailed information'
        );
        
        return NextResponse.json({ 
          success: true, 
          message: 'Contact created',
          contactId
        });
      } catch (contactError) {
        console.error('Contact creation error details:', contactError);
        return NextResponse.json({ 
          error: 'Failed to create contact',
          details: contactError instanceof Error ? contactError.message : String(contactError),
          stack: contactError instanceof Error ? contactError.stack : undefined
        }, { status: 500 });
      }
    }
    
    if (action === 'contacts-get' && searchParams.get('id')) {
      const contactId = searchParams.get('id') as string;
      const contact = await getContactById(contactId);
      
      return NextResponse.json({ contact });
    }
    
    if (action === 'contacts-update' && searchParams.get('id')) {
      const contactId = searchParams.get('id') as string;
      const success = await updateContact(contactId, {
        displayName: 'Updated Test Contact ' + new Date().toISOString(),
        notes: 'This contact was updated via API'
      });
      
      return NextResponse.json({ 
        success, 
        message: 'Contact updated'
      });
    }
    
    if (action === 'contacts-delete' && searchParams.get('id')) {
      const contactId = searchParams.get('id') as string;
      const success = await deleteContact(contactId);
      
      return NextResponse.json({ 
        success, 
        message: 'Contact deleted'
      });
    }
    
    if (action === 'contacts-search' && searchParams.get('query')) {
      const query = searchParams.get('query') as string;
      const contacts = await searchContacts(query);
      
      return NextResponse.json({ contacts });
    }
    
    // Default test response
    return NextResponse.json({
      message: 'Comprehensive EWS Test API',
      availableActions: [
        'email-list',
        'email-get?id=...',
        'email-send',
        'email-send-with-attachment',
        'email-send-with-inline-attachment',
        'email-search?query=...',
        'folders-list',
        'calendar-list',
        'calendar-create',
        'calendar-get?id=...',
        'calendar-update?id=...',
        'calendar-delete?id=...',
        'contacts-list',
        'contacts-create',
        'contacts-get?id=...',
        'contacts-update?id=...',
        'contacts-delete?id=...',
        'contacts-search?query=...'
      ]
    });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { 
        error: 'Test API error', 
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Add POST handler for email sending with JSON body
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'email-send';
    
    // Parse the request body
    const body = await request.json();
    
    // Email send with attachment
    if (action === 'email-send-with-attachment') {
      const { to, subject, body: emailBody, cc, bcc, attachments } = body;
      
      // Use default test email if not provided
      const recipients = to || [process.env.TEST_EMAIL || 'test@example.com'];
      const emailSubject = subject || 'Test Email with Attachment ' + new Date().toISOString();
      const emailContent = emailBody || '<html><body><h1>This is a test email with attachment</h1><p>Testing the attachment functionality.</p></body></html>';
      
      // If no attachments provided, create a default test attachment
      const emailAttachments = attachments || [
        {
          name: 'test-attachment.txt',
          content: Buffer.from('This is a test attachment file content.').toString('base64'),
          contentType: 'text/plain'
        }
      ];
      
      console.log('Sending email with attachment:', {
        to: recipients,
        subject: emailSubject,
        attachments: emailAttachments.map((a: { name: string }) => a.name)
      });
      
      const emailId = await sendEmail(recipients, emailSubject, emailContent, cc, bcc, emailAttachments);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Email with attachment sent',
        emailId
      });
    }
    
    // Email send with inline attachment
    if (action === 'email-send-with-inline-attachment') {
      const { to, subject, body: emailBody, cc, bcc, contentId } = body;
      
      // Use default test email if not provided
      const recipients = to || [process.env.TEST_EMAIL || 'test@example.com'];
      const emailSubject = subject || 'Test Email with Inline Attachment ' + new Date().toISOString();
      
      // Create a simple inline image attachment (1x1 transparent PNG)
      const cid = contentId || 'test-image';
      const attachments = [
        {
          name: 'test-image.png',
          content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          contentType: 'image/png',
          isInline: true,
          contentId: cid
        }
      ];
      
      // HTML body with reference to the inline image
      const emailContent = emailBody || `<html><body>
        <h1>This is a test email with inline attachment</h1>
        <p>Below is an inline image:</p>
        <img src="cid:${cid}" alt="Test Image" />
        <p>Testing the inline attachment functionality.</p>
      </body></html>`;
      
      console.log('Sending email with inline attachment:', {
        to: recipients,
        subject: emailSubject,
        contentId: cid
      });
      
      const emailId = await sendEmail(recipients, emailSubject, emailContent, cc, bcc, attachments);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Email with inline attachment sent',
        emailId
      });
    }
    
    // Simple email send
    if (action === 'email-send') {
      const { to, subject, body: emailBody, cc, bcc } = body;
      
      // Use default test email if not provided
      const recipients = to || [process.env.TEST_EMAIL || 'test@example.com'];
      const emailSubject = subject || 'Test Email ' + new Date().toISOString();
      const emailContent = emailBody || 'This is a test email sent via API';
      
      console.log('Sending simple email:', {
        to: recipients,
        subject: emailSubject
      });
      
      const emailId = await sendEmail(recipients, emailSubject, emailContent, cc, bcc);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Email sent',
        emailId
      });
    }
    
    return NextResponse.json({
      error: 'Invalid action',
      message: `Action '${action}' not supported for POST requests`
    }, { status: 400 });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { 
        error: 'Test API error', 
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 