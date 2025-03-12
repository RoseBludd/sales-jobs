// Simple test script for sending emails with inline attachments
const { ExchangeService, WebCredentials, Uri, EmailMessage, MessageBody, EmailAddress, BodyType, FileAttachment, ExchangeVersion, ConflictResolutionMode } = require('ews-javascript-api');
const fs = require('fs');
const path = require('path');

async function sendTestEmailWithInlineAttachment() {
  // Define testEmail at the function scope so it's available in the catch block
  const testEmail = process.env.TEST_EMAIL || 'test@example.com';
  
  try {
    console.log('Initializing EWS service...');
    // Specify Exchange version explicitly
    const service = new ExchangeService(ExchangeVersion.Exchange2010_SP2);
    
    // Enable tracing to see the SOAP requests and responses
    service.TraceEnabled = true;
    service.TraceFlags = 'All';
    
    // Use the credentials from environment variables or default values
    const email = process.env.WORKMAIL_EMAIL || 'j.black@weroofamerica.com';
    const password = process.env.WORKMAIL_PASSWORD || 'RestoreMastersLLC2024';
    const ewsEndpoint = process.env.EWS_ENDPOINT || 'https://ews.mail.us-east-1.awsapps.com/EWS/Exchange.asmx';
    
    console.log(`Connecting to WorkMail with email: ${email}`);
    service.Credentials = new WebCredentials(email, password);
    service.Url = new Uri(ewsEndpoint);
    
    try {
      // Create a new email message
      console.log('Creating email message...');
      const message = new EmailMessage(service);
      message.Subject = 'Test Email with Inline Attachment';
      
      // Add recipients
      console.log(`Adding recipient: ${testEmail}`);
      message.ToRecipients.Add(new EmailAddress(testEmail));
      
      // Set a temporary body
      message.Body = new MessageBody('This is a temporary body that will be replaced after adding the inline attachment.');
      
      // Save the message first (creates a draft)
      console.log('Saving message as draft...');
      await message.Save();
      
      // Create a simple 1x1 transparent PNG for inline attachment
      // This is a base64 encoded 1x1 transparent PNG
      const inlineImageContent = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const contentId = "test-image";
      
      // Add the inline attachment to the message
      console.log('Adding inline attachment...');
      const attachment = message.Attachments.AddFileAttachment(`${contentId}.png`, Buffer.from(inlineImageContent, 'base64'));
      
      // Set properties for inline attachment
      console.log('Setting inline attachment properties...');
      attachment.IsInline = true;
      attachment.ContentId = contentId;
      attachment.ContentType = 'image/png';
      
      // Update the message with the attachment
      console.log('Updating message with attachment...');
      await message.Update(ConflictResolutionMode.AlwaysOverwrite);
      
      // Create the HTML body with the content identifier of the attachment
      const html = `<html>
                      <head>
                      </head>
                      <body>
                      <p>This is an email with an inline image attachment:</p>
                      <img width=100 height=100 id="1" src="cid:${contentId}">
                      <p>Testing the inline attachment functionality.</p>
                      </body>
                    </html>`;
      
      // Set HTML body with reference to the inline attachment
      console.log('Setting email body with inline image reference...');
      message.Body = new MessageBody(BodyType.HTML, html);
      
      // Update the message with the new body
      console.log('Updating message with HTML body...');
      await message.Update(ConflictResolutionMode.AlwaysOverwrite);
      
      // Send the message
      console.log('Sending email with inline attachment...');
      await message.Send();
      
      console.log('Email with inline attachment sent successfully!');
      return true;
    } catch (attachmentError) {
      console.error('Error with inline attachment:', attachmentError);
      
      if (attachmentError.message && attachmentError.message.includes('XML')) {
        console.error('XML validation error. This could be due to incompatibility with AWS WorkMail.');
        console.error('Try using the AWS SDK for WorkMail instead of EWS API for better compatibility.');
      }
      
      // Try sending without attachment
      console.log('Trying to send without attachment...');
      const simpleMessage = new EmailMessage(service);
      simpleMessage.Subject = 'Test Email (without inline attachment)';
      simpleMessage.Body = new MessageBody(BodyType.HTML, '<html><body><h1>This is a test email</h1><p>Testing without inline attachment.</p></body></html>');
      simpleMessage.ToRecipients.Add(new EmailAddress(testEmail));
      
      await simpleMessage.Send();
      console.log('Simple email sent successfully!');
      return false;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    
    if (error.message && error.message.includes('XML')) {
      console.error('XML validation error. This could be due to incompatibility with AWS WorkMail.');
      console.error('Try using the AWS SDK for WorkMail instead of EWS API for better compatibility.');
    }
    
    return false;
  }
}

// Run the test
sendTestEmailWithInlineAttachment()
  .then(result => {
    console.log(`Test ${result ? 'PASSED' : 'FAILED'}`);
    process.exit(result ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 