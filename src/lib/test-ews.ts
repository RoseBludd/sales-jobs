const { WellKnownFolderName } = require('ews-javascript-api');
const { 
  initEWSService, 
  getEmails, 
  getEmailById, 
  sendEmail, 
  moveEmail, 
  deleteEmail, 
  searchEmails,
  getFolders
} = require('./ews');

// Set environment variables for testing
process.env.WORKMAIL_EMAIL = process.env.WORKMAIL_EMAIL || 'test@weroofamerica.com';
process.env.WORKMAIL_PASSWORD = process.env.WORKMAIL_PASSWORD || 'RestoreMastersLLC2024';
process.env.EWS_ENDPOINT = process.env.EWS_ENDPOINT || 'https://outlook.awsapps.com/EWS/Exchange.asmx';

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
    const emails = await getEmails(WellKnownFolderName.Inbox, 10, 0);
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

// Test getting email by ID
async function testGetEmailById(emailId) {
  try {
    console.log(`Testing getEmailById with ID: ${emailId}...`);
    const email = await getEmailById(emailId);
    console.log('Email details:');
    console.log(`Subject: ${email.subject}`);
    console.log(`From: ${email.from}`);
    console.log(`To: ${email.to.join(', ')}`);
    console.log(`Body: ${email.body.substring(0, 100)}...`);
    return email;
  } catch (error) {
    console.error('getEmailById failed:', error);
    return null;
  }
}

// Test sending email
async function testSendEmail() {
  try {
    console.log('Testing sendEmail...');
    const to = [process.env.WORKMAIL_EMAIL || 'test@weroofamerica.com'];
    const subject = 'Test Email from EWS API';
    const body = 'This is a test email sent from the EWS JavaScript API.';
    
    const emailId = await sendEmail(to, subject, body);
    console.log(`Email sent successfully! ID: ${emailId}`);
    return emailId;
  } catch (error) {
    console.error('sendEmail failed:', error);
    return null;
  }
}

// Test searching emails
async function testSearchEmails(query) {
  try {
    console.log(`Testing searchEmails with query: "${query}"...`);
    const emails = await searchEmails(query, undefined, 10, 0);
    console.log(`Found ${emails.length} emails matching the query:`);
    emails.forEach((email, index) => {
      console.log(`${index + 1}. ${email.subject} (${email.from})`);
    });
    return emails;
  } catch (error) {
    console.error('searchEmails failed:', error);
    return [];
  }
}

// Test getting folders
async function testGetFolders() {
  try {
    console.log('Testing getFolders...');
    const folders = await getFolders();
    console.log(`Retrieved ${folders.length} folders:`);
    folders.forEach((folder, index) => {
      console.log(`${index + 1}. ${folder.displayName} (${folder.id})`);
    });
    return folders;
  } catch (error) {
    console.error('getFolders failed:', error);
    return [];
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
  
  // Test getting folders
  const folders = await testGetFolders();
  
  // Test getting emails
  const emails = await testGetEmails();
  
  // Test getting email by ID
  if (emails.length > 0) {
    const emailId = emails[0].id;
    await testGetEmailById(emailId);
  }
  
  // Test sending email
  const sentEmailId = await testSendEmail();
  
  // Test searching emails
  await testSearchEmails('test');
  
  console.log('=== EWS API Tests Completed ===');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test execution failed:', error);
  });
}

module.exports = { runTests }; 