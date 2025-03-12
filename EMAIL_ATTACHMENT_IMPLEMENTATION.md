# Email Attachment Implementation for AWS WorkMail EWS Integration

This document describes the implementation of email attachment functionality for the AWS WorkMail EWS integration using the Exchange Web Services (EWS) JavaScript API.

## Implementation Overview

We've implemented support for three types of email attachments:

1. **File Attachments**: Regular attachments like documents, images, etc.
2. **Inline Attachments**: Attachments that are displayed inline within the email body (e.g., embedded images)
3. **Item Attachments**: Attachments that are other email messages

## API Changes

### Updated `sendEmail` Function

The `sendEmail` function in `src/lib/ews.ts` has been updated to support attachments:

```typescript
export const sendEmail = async (
  to: string[],
  subject: string,
  body: string,
  cc?: string[],
  bcc?: string[],
  attachments?: Array<{
    name: string,
    content: string, // Base64 encoded content
    contentType?: string,
    isInline?: boolean,
    contentId?: string
  }>
): Promise<string> => {
  // Implementation...
}
```

### Updated Validation Schema

The validation schema in `src/lib/validation.ts` has been updated to include attachments:

```typescript
export const sendEmailSchema = z.object({
  to: z.array(z.string().email()).min(1),
  subject: z.string().min(1),
  body: z.string(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  attachments: z.array(
    z.object({
      name: z.string(),
      content: z.string(), // Base64 encoded content
      contentType: z.string(),
      isInline: z.boolean().optional(),
      contentId: z.string().optional()
    })
  ).optional(),
});
```

## Implementation Details

### File Attachments

File attachments are implemented using the `AddFileAttachment` method of the EWS JavaScript API:

```typescript
const fileAttachment = message.Attachments.AddFileAttachment(attachment.name, attachment.content);
```

The content of the file is encoded as Base64.

### Inline Attachments

Inline attachments are similar to file attachments but with additional properties:

```typescript
const fileAttachment = message.Attachments.AddFileAttachment(attachment.name, attachment.content);
fileAttachment.IsInline = true;
fileAttachment.ContentId = attachment.contentId || attachment.name;
```

The `ContentId` property is referenced in the HTML body using the `cid:` protocol:

```html
<img src="cid:test-image" alt="Test Image" />
```

### Item Attachments

Item attachments are implemented using the `AddItemAttachment` method of the EWS JavaScript API:

```typescript
const attachedMessage = new EmailMessage(service);
attachedMessage.Subject = 'This is an attached email';
attachedMessage.Body = new MessageBody(BodyType.Text, 'This is the body of the attached email message.');

const itemAttachment = message.Attachments.AddItemAttachment();
itemAttachment.Name = 'Attached Message';
itemAttachment.Item = attachedMessage;
```

## Testing

We've created several ways to test the email attachment functionality:

1. **Test API Routes**: 
   - `/api/test-ews/all?action=email-send-with-attachment`
   - `/api/test-ews/all?action=email-send-with-inline-attachment`
   - `/api/test-ews/attachment?action=send-with-attachment`
   - `/api/test-ews/attachment?action=send-with-inline-attachment`
   - `/api/test-ews/attachment?action=send-with-item-attachment`

2. **Test Script**: 
   - `scripts/test-email-attachment.ts`

3. **Direct API Call**: 
   - `POST /api/emails` with attachments in the request body

## Limitations and Considerations

- **File Size**: AWS WorkMail has a limit of 30MB for attachments.
- **Content Types**: Make sure to specify the correct content type for attachments.
- **Base64 Encoding**: All attachment content must be Base64 encoded.
- **Inline Attachments**: For inline attachments, the `contentId` must match the `cid:` reference in the HTML body.

## References

- [EWS JavaScript API Documentation](https://github.com/gautamsi/ews-javascript-api)
- [AWS WorkMail Developer Guide](https://docs.aws.amazon.com/workmail/latest/developerguide/what-is.html)
- [Microsoft EWS Reference](https://learn.microsoft.com/en-us/exchange/client-developer/web-service-reference/ews-reference-for-exchange) 