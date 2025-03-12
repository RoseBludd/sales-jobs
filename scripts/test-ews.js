// Load environment variables from .env file
require('dotenv').config();

const { WellKnownFolderName } = require('ews-javascript-api');

// Set environment variables for testing if not already set
if (!process.env.WORKMAIL_EMAIL) {
  console.warn('WORKMAIL_EMAIL not set in environment, using default value');
}
if (!process.env.WORKMAIL_PASSWORD) {
  console.warn('WORKMAIL_PASSWORD not set in environment, using default value');
}
if (!process.env.EWS_ENDPOINT) {
  console.warn('EWS_ENDPOINT not set in environment, using default value');
}

// Import EWS service
const {
  ExchangeService,
  WebCredentials,
  Uri,
  ItemView,
  PropertySet,
  BasePropertySet,
  EmailMessage,
  MessageBody,
  EmailAddress,
  BodyType,
  ExchangeVersion
} = require('ews-javascript-api');

// Initialize EWS service with credentials
async function initEWSService() {
  try {
    const service = new ExchangeService(ExchangeVersion.Exchange2010_SP2);
    
    // Map the login domain to WorkMail domain if needed
    const email = process.env.WORKMAIL_EMAIL || '';
    const password = process.env.WORKMAIL_PASSWORD || '';
    
    if (!email || !password) {
      throw new Error('WorkMail credentials not configured');
    }
    
    console.log(`Using email: ${email}`);
    
    service.Credentials = new WebCredentials(email, password);
    
    // Set the EWS endpoint URL
    const ewsEndpoint = process.env.EWS_ENDPOINT || 'https://ews.mail.us-east-1.awsapps.com/EWS/Exchange.asmx';
    console.log(`Using EWS endpoint: ${ewsEndpoint}`);
    
    service.Url = new Uri(ewsEndpoint);
    
    return service;
  } catch (error) {
    console.error('Failed to initialize EWS service:', error);
    throw error;
  }
}

// Test connection
async function testConnection() {
  try {
    console.log('Testing EWS connection...');
    const service = await initEWSService();
    console.log('Connection successful!');
    return true;
  } catch (error) {
    console.error('Connection failed:', error);
    return false;
  }
}

// Test getting emails
async function testGetEmails() {
  try {
    console.log('Testing getEmails...');
    const service = await initEWSService();
    
    const view = new ItemView(10, 0);
    view.PropertySet = new PropertySet(BasePropertySet.FirstClassProperties);
    
    const results = await service.FindItems(WellKnownFolderName.Inbox, view);
    
    const emails = results.Items.map(email => ({
      id: email.Id.UniqueId,
      subject: email.Subject,
      from: email instanceof EmailMessage ? email.From?.Address : undefined,
      receivedDate: email.DateTimeReceived ? email.DateTimeReceived.ToISOString() : undefined,
      hasAttachments: email.HasAttachments,
      isRead: email instanceof EmailMessage ? email.IsRead : undefined
    }));
    
    console.log(`Retrieved ${emails.length} emails:`);
    emails.forEach((email, index) => {
      console.log(`${index + 1}. ${email.subject} (${email.from})`);
    });
    
    return emails;
  } catch (error) {
    console.error('getEmails failed:', error);
    return [];
  }
}

// Test sending email
async function testSendEmail() {
  try {
    console.log('Testing sendEmail...');
    const service = await initEWSService();
    
    const to = [process.env.WORKMAIL_EMAIL || 'test@weroofamerica.com'];
    const subject = 'Test Email from EWS API';
    const body = 'This is a test email sent from the EWS JavaScript API.';
    
    const message = new EmailMessage(service);
    message.Subject = subject;
    message.Body = new MessageBody(body);
    
    // Add recipients
    to.forEach(recipient => {
      message.ToRecipients.Add(new EmailAddress(recipient));
    });
    
    await message.Send();
    
    console.log(`Email sent successfully!`);
    return true;
  } catch (error) {
    console.error('sendEmail failed:', error);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('=== Starting EWS API Tests ===');
  
  // Test connection
  const connectionSuccess = await testConnection();
  if (!connectionSuccess) {
    console.error('Connection test failed. Aborting remaining tests.');
    return;
  }
  
  // Test getting emails
  const emails = await testGetEmails();
  
  // Test sending email
  await testSendEmail();
  
  console.log('=== EWS API Tests Completed ===');
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
}); 