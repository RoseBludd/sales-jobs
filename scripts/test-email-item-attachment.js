// Simple test script for sending emails with item attachments
const { ExchangeService, WebCredentials, Uri, EmailMessage, MessageBody, EmailAddress, BodyType, ItemAttachment, WellKnownFolderName, ItemView, ExchangeVersion, ConflictResolutionMode } = require('ews-javascript-api');
const fs = require('fs');
const path = require('path');

async function sendTestEmailWithItemAttachment() {
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
      message.Subject = 'Test Email with Item Attachment';
      message.Body = new MessageBody('This is a test email with an item attachment. Testing the item attachment functionality.');
      
      // Add recipients
      console.log(`Adding recipient: ${testEmail}`);
      message.ToRecipients.Add(new EmailAddress(testEmail));
      
      // Save the message first (creates a draft)
      console.log('Saving message as draft...');
      await message.Save();
      
      // Create an email message as an item attachment
      console.log('Creating item attachment...');
      const itemAttachment = message.Attachments.AddItemAttachment();
      itemAttachment.Name = 'Attached Message Item';
      
      // Set properties on the item attachment
      console.log('Setting properties on item attachment...');
      itemAttachment.Item = new EmailMessage(service);
      itemAttachment.Item.Subject = 'Message Item Subject';
      itemAttachment.Item.Body = new MessageBody('This is the body of the attached message item.');
      itemAttachment.Item.ToRecipients.Add(new EmailAddress(testEmail));
      
      // Update the message with the attachment
      console.log('Updating message with attachment...');
      await message.Update(ConflictResolutionMode.AlwaysOverwrite);
      
      // Send the message
      console.log('Sending email with item attachment...');
      await message.Send();
      
      console.log('Email with item attachment sent successfully!');
      return true;
    } catch (attachmentError) {
      console.error('Error with item attachment:', attachmentError);
      
      if (attachmentError.message && attachmentError.message.includes('XML')) {
        console.error('XML validation error. This could be due to incompatibility with AWS WorkMail.');
        console.error('Try using the AWS SDK for WorkMail instead of EWS API for better compatibility.');
      }
      
      // Try sending without attachment
      console.log('Trying to send without attachment...');
      const simpleMessage = new EmailMessage(service);
      simpleMessage.Subject = 'Test Email (without item attachment)';
      simpleMessage.Body = new MessageBody('This is a test email without item attachment.');
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
sendTestEmailWithItemAttachment()
  .then(result => {
    console.log(`Test ${result ? 'PASSED' : 'FAILED'}`);
    process.exit(result ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 