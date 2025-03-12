import { NextRequest, NextResponse } from 'next/server';
import { 
  initEWSService,
  logEWSError
} from '@/lib/ews';
import { 
  EmailMessage, 
  MessageBody, 
  EmailAddress, 
  BodyType,
  FileAttachment
} from 'ews-javascript-api';

// Test route for sending emails with attachments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'send-with-attachment';
    
    // Use a test email address
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    console.log(`Using test email: ${testEmail}`);
    
    // Initialize EWS service
    console.log('Initializing EWS service...');
    const service = await initEWSService();
    
    if (action === 'send-with-attachment') {
      console.log('Attempting to send email with attachment...');
      
      // Create a new email message
      const message = new EmailMessage(service);
      message.Subject = 'Test Email with Attachment ' + new Date().toISOString();
      message.Body = new MessageBody(
        BodyType.HTML, 
        '<html><body><h1>This is a test email with attachment</h1><p>Testing the attachment functionality.</p></body></html>'
      );
      
      // Add recipients
      console.log(`Adding recipient: ${testEmail}`);
      message.ToRecipients.Add(new EmailAddress(testEmail));
      
      try {
        // Create a simple text attachment
        console.log('Creating attachment...');
        const content = Buffer.from('This is a test attachment file content.').toString('base64');
        
        // Add the attachment to the message
        console.log('Adding attachment to message...');
        message.Attachments.AddFileAttachment('test-attachment.txt', content);
        
        // Send the message
        console.log('Sending email...');
        await message.Send();
        
        console.log('Email sent successfully!');
        
        return NextResponse.json({ 
          success: true, 
          message: 'Email with attachment sent successfully',
          emailId: message.Id?.UniqueId || ''
        });
      } catch (sendError) {
        console.error('Error sending email:', sendError);
        return NextResponse.json({ 
          error: 'Failed to send email with attachment',
          details: (sendError as Error).message,
          stack: (sendError as Error).stack
        }, { status: 500 });
      }
    }
    
    if (action === 'send-with-inline-attachment') {
      console.log('Attempting to send email with inline attachment...');
      
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
      
      console.log('Inline attachments prepared:', JSON.stringify(attachments));
      
      // HTML body with reference to the inline image
      const body = `<html><body>
        <h1>This is a test email with inline attachment</h1>
        <p>Below is an inline image:</p>
        <img src="cid:${contentId}" alt="Test Image" />
        <p>Testing the inline attachment functionality.</p>
      </body></html>`;
      
      try {
        // Send email using the sendEmail function from lib/ews.ts
        const emailId = await sendEmail(
          [testEmail],
          'Test Email with Inline Attachment ' + new Date().toISOString(),
          body,
          undefined,
          undefined,
          attachments
        );
        
        console.log('Email with inline attachment sent successfully with ID:', emailId);
        
        return NextResponse.json({ 
          success: true, 
          message: 'Email with inline attachment sent successfully',
          emailId
        });
      } catch (sendError) {
        console.error('Error in sendEmail function:', sendError);
        return NextResponse.json({ 
          error: 'Failed to send email with inline attachment',
          details: (sendError as Error).message,
          stack: (sendError as Error).stack,
          originalError: (sendError as any).originalError ? {
            message: (sendError as any).originalError.message,
            stack: (sendError as any).originalError.stack
          } : undefined
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Invalid action',
      validActions: ['send-with-attachment', 'send-with-inline-attachment']
    }, { status: 400 });
    
  } catch (error) {
    console.error('Unhandled error in test-ews/attachment route:', error);
    logEWSError(error as Error);
    return NextResponse.json({ 
      error: 'Failed to send email with attachment',
      details: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
} 