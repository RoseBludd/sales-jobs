// Test script to verify email authentication headers
require('dotenv').config();
const {
  ExchangeService,
  WebCredentials,
  Uri,
  EmailMessage,
  MessageBody,
  EmailAddress,
  ExtendedPropertyDefinition,
  DefaultExtendedPropertySet,
  MapiPropertyType,
  BodyType
} = require('ews-javascript-api');

// Initialize EWS service
async function initEWSService() {
  console.log('Initializing EWS service...');
  
  const service = new ExchangeService();
  
  // Get credentials from environment variables
  const username = process.env.EWS_USERNAME;
  const password = process.env.EWS_PASSWORD;
  const ewsUrl = process.env.EWS_URL;
  
  if (!username || !password || !ewsUrl) {
    throw new Error('Missing required environment variables: EWS_USERNAME, EWS_PASSWORD, EWS_URL');
  }
  
  // Set credentials and URL
  service.Credentials = new WebCredentials(username, password);
  service.Url = new Uri(ewsUrl);
  
  console.log('EWS service initialized successfully');
  return service;
}

// Add authentication headers to improve email deliverability
function addAuthenticationHeaders(message) {
  console.log('Adding authentication headers to improve deliverability...');
  
  // Set message priority
  message.SetExtendedProperty(
    new ExtendedPropertyDefinition(
      DefaultExtendedPropertySet.InternetHeaders,
      "X-Priority",
      MapiPropertyType.String
    ),
    "3"
  );
  
  message.SetExtendedProperty(
    new ExtendedPropertyDefinition(
      DefaultExtendedPropertySet.InternetHeaders,
      "X-MSMail-Priority",
      MapiPropertyType.String
    ),
    "Normal"
  );
  
  // Set Return-Path header to match the sender (if available)
  if (message.From?.Address) {
    message.SetExtendedProperty(
      new ExtendedPropertyDefinition(
        DefaultExtendedPropertySet.InternetHeaders,
        "Return-Path",
        MapiPropertyType.String
      ),
      message.From.Address
    );
  }
  
  // Set Organization header
  message.SetExtendedProperty(
    new ExtendedPropertyDefinition(
      DefaultExtendedPropertySet.InternetHeaders,
      "Organization",
      MapiPropertyType.String
    ),
    "We Roof America"
  );
  
  console.log('Authentication headers added successfully.');
}

// Send test email with authentication headers
async function sendTestEmailWithAuth() {
  try {
    // Initialize EWS service
    const service = await initEWSService();
    
    // Create email message
    console.log('Creating email message...');
    const message = new EmailMessage(service);
    message.Subject = 'Test Email with Authentication Headers';
    message.Body = new MessageBody(BodyType.HTML, `
      <h1>Test Email with Authentication Headers</h1>
      <p>This is a test email sent with authentication headers to improve deliverability.</p>
      <p>Time: ${new Date().toISOString()}</p>
      <p>The following headers have been added:</p>
      <ul>
        <li>X-Priority: 3</li>
        <li>X-MSMail-Priority: Normal</li>
        <li>Return-Path: (matching sender)</li>
        <li>Organization: We Roof America</li>
      </ul>
    `);
    
    // Add recipient
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    console.log(`Adding recipient: ${testEmail}`);
    message.ToRecipients.Add(new EmailAddress(testEmail));
    
    // Add authentication headers
    addAuthenticationHeaders(message);
    
    // Send the email
    console.log('Sending email...');
    await message.Send();
    console.log('Email sent successfully!');
    
    return 'Email with authentication headers sent successfully';
  } catch (error) {
    console.error('Error sending email with authentication headers:', error);
    throw error;
  }
}

// Run the test
sendTestEmailWithAuth()
  .then(result => {
    console.log(result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 