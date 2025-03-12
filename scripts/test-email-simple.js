// Simple test script for sending emails
const { ExchangeService, WebCredentials, Uri, EmailMessage, MessageBody, EmailAddress, BodyType, ExchangeVersion } = require('ews-javascript-api');

async function sendTestEmail() {
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
    
    // Create a new email message
    console.log('Creating email message...');
    const message = new EmailMessage(service);
    message.Subject = 'Test Email';
    
    // Use plain text body instead of HTML
    message.Body = new MessageBody('This is a test email. Testing the email functionality.');
    
    // Add recipients
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    console.log(`Adding recipient: ${testEmail}`);
    message.ToRecipients.Add(new EmailAddress(testEmail));
    
    // Send the message
    console.log('Sending email...');
    await message.Send();
    
    console.log('Email sent successfully!');
    return true;
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
sendTestEmail()
  .then(result => {
    console.log(`Test ${result ? 'PASSED' : 'FAILED'}`);
    process.exit(result ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 