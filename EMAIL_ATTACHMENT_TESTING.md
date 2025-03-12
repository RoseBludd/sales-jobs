# Testing Email Attachments with AWS WorkMail EWS Integration

This document provides instructions on how to test the email attachment functionality implemented for the AWS WorkMail EWS integration.

## Overview

We've implemented three types of email attachments:

1. **File Attachments**: Regular attachments like documents, images, etc.
2. **Inline Attachments**: Attachments that are displayed inline within the email body (e.g., embedded images)
3. **Item Attachments**: Attachments that are other email messages

## Testing Methods

There are three ways to test the email attachment functionality:

### 1. Using the Test API Routes

We've created dedicated API routes for testing email attachments:

#### Comprehensive Test Route

```
GET /api/test-ews/all?action=email-send-with-attachment
GET /api/test-ews/all?action=email-send-with-inline-attachment
```

#### Dedicated Attachment Test Route

```
GET /api/test-ews/attachment?action=send-with-attachment
GET /api/test-ews/attachment?action=send-with-inline-attachment
GET /api/test-ews/attachment?action=send-with-item-attachment
```

> **Note**: Before testing, make sure to update the recipient email addresses in the test routes to valid email addresses.

### 2. Using the Node.js Test Script

We've created a Node.js script to test email attachments:

```bash
# Run the test script
npx ts-node scripts/test-email-attachment.ts
```

> **Note**: Before running the script, make sure to update the `testEmail` variable in the script to a valid email address.

### 3. Using the API Directly

You can also test by making a POST request to the email API endpoint:

```
POST /api/emails
```

With the following JSON body:

```json
{
  "to": ["recipient@example.com"],
  "subject": "Test Email with Attachment",
  "body": "<html><body><h1>Test Email</h1><p>This is a test email with attachment.</p></body></html>",
  "attachments": [
    {
      "name": "test.txt",
      "content": "VGhpcyBpcyBhIHRlc3QgYXR0YWNobWVudC4=", // Base64 encoded content
      "contentType": "text/plain"
    }
  ]
}
```

For inline attachments, add the `isInline` and `contentId` properties:

```json
{
  "to": ["recipient@example.com"],
  "subject": "Test Email with Inline Attachment",
  "body": "<html><body><h1>Test Email</h1><p>This is a test email with an inline image:</p><img src='cid:test-image' /></body></html>",
  "attachments": [
    {
      "name": "test-image.png",
      "content": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", // Base64 encoded content
      "contentType": "image/png",
      "isInline": true,
      "contentId": "test-image"
    }
  ]
}
```

## Implementation Details

### File Attachments

File attachments are implemented using the `AddFileAttachment` method of the EWS JavaScript API. The content of the file is encoded as Base64.

### Inline Attachments

Inline attachments are similar to file attachments but with the `IsInline` property set to `true` and a `ContentId` property that is referenced in the HTML body using the `cid:` protocol.

### Item Attachments

Item attachments are implemented using the `AddItemAttachment` method of the EWS JavaScript API. This allows attaching another email message to the current email.

## Troubleshooting

If you encounter issues with email attachments, check the following:

1. **Base64 Encoding**: Make sure the attachment content is properly Base64 encoded.
2. **Content-ID References**: For inline attachments, ensure the `cid:` reference in the HTML body matches the `contentId` of the attachment.
3. **File Size**: AWS WorkMail has a limit of 30MB for attachments. Make sure your attachments are within this limit.
4. **Authentication**: Ensure you're properly authenticated before making API requests.

## References

- [EWS JavaScript API Documentation](https://github.com/gautamsi/ews-javascript-api)
- [AWS WorkMail Developer Guide](https://docs.aws.amazon.com/workmail/latest/developerguide/what-is.html)
- [Microsoft EWS Reference](https://learn.microsoft.com/en-us/exchange/client-developer/web-service-reference/ews-reference-for-exchange) 