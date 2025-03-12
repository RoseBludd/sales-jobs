// Simple test script for sending emails with attachments
const { ExchangeService, WebCredentials, Uri, EmailMessage, MessageBody, EmailAddress, BodyType, FileAttachment, ExchangeVersion, ConflictResolutionMode } = require('ews-javascript-api');
const fs = require('fs');
const path = require('path');

async function sendTestEmailWithAttachment() {
  try {
    console.log('Initializing EWS service...');
    // Use Exchange2010_SP2 version
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
      message.Subject = 'Test Email with Attachment';
      
      // Use plain text body instead of HTML
      message.Body = new MessageBody('This is a test email with attachment. Testing the attachment functionality.');
      
      // Add recipients
      const testEmail = process.env.TEST_EMAIL || 'test@example.com';
      console.log(`Adding recipient: ${testEmail}`);
      message.ToRecipients.Add(new EmailAddress(testEmail));
      
      // Save the message first (creates a draft)
      console.log('Saving message as draft...');
      await message.Save();
      
      // Create a test file if it doesn't exist
      const testFilePath = path.join(__dirname, 'test-attachment.txt');
      if (!fs.existsSync(testFilePath)) {
        console.log('Creating test attachment file...');
        fs.writeFileSync(testFilePath, 'This is a test attachment file content.');
      }
      
      // Read the file content
      console.log('Reading attachment file...');
      const fileContent = fs.readFileSync(testFilePath);
      
      // Add the attachment to the saved message
      console.log('Adding attachment to saved message...');
      message.Attachments.AddFileAttachment('test-attachment.txt', fileContent);
      
      // Update the message with the attachment
      console.log('Updating message with attachment...');
      await message.Update(ConflictResolutionMode.AlwaysOverwrite);
      
      // Send the message
      console.log('Sending email with attachment...');
      await message.Send();
      
      console.log('Email with attachment sent successfully!');
      return true;
    } catch (attachmentError) {
      console.error('Error with attachment:', attachmentError);
      
      if (attachmentError.message && attachmentError.message.includes('XML')) {
        console.error('XML validation error. This could be due to incompatibility with AWS WorkMail.');
        console.error('Try using the AWS SDK for WorkMail instead of EWS API for better compatibility.');
      }
      
      // Try sending without attachment
      console.log('Trying to send without attachment...');
      const simpleMessage = new EmailMessage(service);
      simpleMessage.Subject = 'Test Email (without attachment)';
      simpleMessage.Body = new MessageBody('This is a test email without attachment.');
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
sendTestEmailWithAttachment()
  .then(result => {
    console.log(`Test ${result ? 'PASSED' : 'FAILED'}`);
    process.exit(result ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 