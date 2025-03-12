import { initEWSService } from '../src/lib/ews';
import { EmailMessage, MessageBody, EmailAddress, BodyType } from 'ews-javascript-api';
import * as fs from 'fs';
import * as path from 'path';

async function testSendEmailWithAttachment() {
  try {
    console.log('Initializing EWS service...');
    const service = await initEWSService();
    
    console.log('Creating email message...');
    const message = new EmailMessage(service);
    message.Subject = 'Test Email with Attachment ' + new Date().toISOString();
    message.Body = new MessageBody(
      BodyType.HTML, 
      '<html><body><h1>This is a test email with attachment</h1><p>Testing the attachment functionality.</p></body></html>'
    );
    
    // Add recipients - replace with your test email
    const testEmail = process.env.TEST_EMAIL || 'your-test-email@example.com'; // Replace with your test email
    console.log(`Adding recipient: ${testEmail}`);
    message.ToRecipients.Add(new EmailAddress(testEmail));
    
    // Create a test file if it doesn't exist
    const testFilePath = path.join(__dirname, 'test-attachment.txt');
    if (!fs.existsSync(testFilePath)) {
      console.log('Creating test attachment file...');
      fs.writeFileSync(testFilePath, 'This is a test attachment file content.');
    }
    
    // Read the file and convert to base64
    console.log('Reading attachment file...');
    const fileContent = fs.readFileSync(testFilePath);
    const base64Content = fileContent.toString('base64');
    
    // Add the attachment to the message
    console.log('Adding file attachment...');
    const fileAttachment = message.Attachments.AddFileAttachment('test-attachment.txt', base64Content);
    
    // Send the message and save a copy in the Sent Items folder
    console.log('Sending email...');
    await message.SendAndSaveCopy();
    
    console.log('Email sent successfully!');
    console.log(`Email ID: ${message.Id?.UniqueId || 'Unknown'}`);
    
    return true;
  } catch (error) {
    console.error('Error sending email with attachment:', error);
    return false;
  }
}

async function testSendEmailWithInlineAttachment() {
  try {
    console.log('Initializing EWS service...');
    const service = await initEWSService();
    
    console.log('Creating email message...');
    const message = new EmailMessage(service);
    message.Subject = 'Test Email with Inline Attachment ' + new Date().toISOString();
    
    // Add recipients - replace with your test email
    const testEmail = process.env.TEST_EMAIL || 'your-test-email@example.com'; // Replace with your test email
    console.log(`Adding recipient: ${testEmail}`);
    message.ToRecipients.Add(new EmailAddress(testEmail));
    
    // Create a test image or use an existing one
    // For this example, we'll use a simple 1x1 transparent PNG
    const inlineImageContent = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    
    // Add the attachment to the message
    console.log('Adding inline attachment...');
    const attachment = message.Attachments.AddFileAttachment('test-image.png', inlineImageContent);
    attachment.IsInline = true;
    attachment.ContentId = 'test-image';
    attachment.ContentType = 'image/png';
    
    // Set HTML body with reference to the inline attachment
    message.Body = new MessageBody(
      BodyType.HTML, 
      '<html><body><h1>This is a test email with inline attachment</h1>' +
      '<p>Below is an inline image:</p>' +
      '<img src="cid:test-image" alt="Test Image" />' +
      '<p>Testing the inline attachment functionality.</p></body></html>'
    );
    
    // Send the message and save a copy in the Sent Items folder
    console.log('Sending email...');
    await message.SendAndSaveCopy();
    
    console.log('Email with inline attachment sent successfully!');
    console.log(`Email ID: ${message.Id?.UniqueId || 'Unknown'}`);
    
    return true;
  } catch (error) {
    console.error('Error sending email with inline attachment:', error);
    return false;
  }
}

// Run the tests
async function runTests() {
  console.log('=== Testing Email with File Attachment ===');
  const fileAttachmentResult = await testSendEmailWithAttachment();
  console.log(`File attachment test ${fileAttachmentResult ? 'PASSED' : 'FAILED'}`);
  
  console.log('\n=== Testing Email with Inline Attachment ===');
  const inlineAttachmentResult = await testSendEmailWithInlineAttachment();
  console.log(`Inline attachment test ${inlineAttachmentResult ? 'PASSED' : 'FAILED'}`);
}

runTests().catch(console.error); 