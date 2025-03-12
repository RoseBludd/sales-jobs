# Email Testing Scripts

This directory contains scripts for testing email functionality with AWS WorkMail using the EWS JavaScript API.

## Available Scripts

1. **test-email-simple.js** - Tests sending a simple email without attachments
2. **test-email-attachment.js** - Tests sending an email with a file attachment
3. **test-email-inline.js** - Tests sending an email with an inline image attachment
4. **test-email-item-attachment.js** - Tests sending an email with another email as an attachment

## Prerequisites

- Node.js installed
- EWS JavaScript API installed (`npm install ews-javascript-api`)
- AWS WorkMail account configured

## Environment Variables

You can configure the scripts using the following environment variables:

- `WORKMAIL_EMAIL` - Your WorkMail email address (default: 'j.black@weroofamerica.com')
- `WORKMAIL_PASSWORD` - Your WorkMail password (default: 'RestoreMastersLLC2024')
- `EWS_ENDPOINT` - The EWS endpoint URL (default: 'https://ews.mail.us-east-1.awsapps.com/EWS/Exchange.asmx')
- `TEST_EMAIL` - The recipient email address for test emails (default: 'test@example.com')

## Running the Scripts

### Simple Email Test

```bash
node scripts/test-email-simple.js
```

### File Attachment Test

```bash
node scripts/test-email-attachment.js
```

### Inline Attachment Test

```bash
node scripts/test-email-inline.js
```

### Item Attachment Test

```bash
node scripts/test-email-item-attachment.js
```

## Test Results

Based on our testing, we've found the following compatibility with AWS WorkMail:

1. **Simple Emails**: Work successfully with AWS WorkMail using Exchange2010_SP2 version.
2. **File Attachments**: Work successfully when using the save-first approach (create message, save as draft, add attachment, update, then send).
3. **Inline Attachments**: Currently problematic with AWS WorkMail, resulting in SOAP errors.
4. **Item Attachments**: Currently problematic with AWS WorkMail, resulting in errors when trying to add item attachments.

## Recommended Approach for Attachments

For file attachments, use the following approach:

1. Create the email message
2. Add recipients and set basic properties
3. Save the message as a draft
4. Add the attachment to the saved message
5. Update the message with the attachment
6. Send the message

Example:
```javascript
// Create and save the message first
const message = new EmailMessage(service);
message.Subject = "Test with Attachment";
message.Body = new MessageBody("This is a test email with attachment.");
message.ToRecipients.Add(new EmailAddress("recipient@example.com"));
await message.Save();

// Add attachment to the saved message
message.Attachments.AddFileAttachment("attachment.txt", fileContent);
await message.Update(ConflictResolutionMode.AlwaysOverwrite);

// Send the message
await message.Send();
```

## Troubleshooting

If you encounter the "Request XML Invalid" error:

1. Check that your credentials are correct
2. Verify that the EWS endpoint is accessible
3. Try sending a simple email without attachments first
4. Make sure you're using Exchange2010_SP2 version
5. For attachments, use the save-first approach described above
6. Consider using the AWS SDK for WorkMail instead of EWS API for better compatibility

## Common Errors

### Request XML Invalid

This error typically occurs when there's an issue with the SOAP request format or when the EWS service cannot process the request. Possible causes:

- Incorrect attachment format
- Attachment size too large
- Invalid content type
- Authentication issues
- Incompatibility between EWS JavaScript API and AWS WorkMail

### Set action is invalid for property

This error occurs when trying to add attachments directly to a new message. To resolve this:

1. Create and save the message first
2. Then add the attachment to the saved message
3. Update the message with the attachment
4. Send the message

## Additional Resources

- [EWS JavaScript API Documentation](https://github.com/gautamsi/ews-javascript-api)
- [AWS WorkMail Documentation](https://docs.aws.amazon.com/workmail/latest/userguide/what-is.html)
- [Exchange Web Services (EWS) Reference](https://docs.microsoft.com/en-us/exchange/client-developer/web-service-reference/ews-reference-for-exchange)
- [Microsoft Documentation on Adding Attachments](https://learn.microsoft.com/en-us/exchange/client-developer/exchange-web-services/how-to-add-attachments-by-using-ews-in-exchange) 