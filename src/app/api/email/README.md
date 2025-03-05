# Email API

This directory contains a modular implementation of an email API for handling IMAP and SMTP operations.

## File Structure

- `types.ts` - Type definitions for email functionality
- `config.ts` - Configuration settings and connection pools
- `utils.ts` - Utility functions like rate limiting and email parsing
- `imap.ts` - IMAP-related functions for fetching, moving, and deleting emails
- `smtp.ts` - SMTP-related functions for sending emails
- `route.ts` - Main API route handlers for GET and POST requests

## API Endpoints

### GET /api/email

Fetches emails from a specified folder.

Query parameters:
- `folder` (optional): The folder to fetch emails from (default: 'INBOX')

Example:
```
GET /api/email?folder=Sent
```

### POST /api/email

Handles various email actions.

Request body:
```json
{
  "action": "send|markAsRead|delete|move",
  "itemId": "123", // Required for markAsRead, delete, move
  "to": "recipient@example.com", // Required for send
  "subject": "Email subject", // Required for send
  "body": "Email body", // Required for send
  "fromFolder": "INBOX", // Required for move
  "toFolder": "Trash" // Required for move
}
```

## Email Folders

The API supports the following standard IMAP folders:
- INBOX - Incoming emails
- Sent - Sent emails
- Draft - Draft emails
- Trash - Deleted emails

## Email Actions

- `send` - Send a new email
- `markAsRead` - Mark an email as read
- `delete` - Move an email to the Trash folder
- `move` - Move an email from one folder to another

## Example Usage

### Fetch emails from Inbox
```typescript
const response = await fetch('/api/email');
const data = await response.json();
console.log(data.emails);
```

### Fetch emails from Sent folder
```typescript
const response = await fetch('/api/email?folder=Sent');
const data = await response.json();
console.log(data.emails);
```

### Send an email
```typescript
const response = await fetch('/api/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'send',
    to: 'recipient@example.com',
    subject: 'Hello',
    body: 'This is a test email'
  })
});
const data = await response.json();
console.log(data);
```

### Mark an email as read
```typescript
const response = await fetch('/api/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'markAsRead',
    itemId: '123'
  })
});
const data = await response.json();
console.log(data);
```

### Delete an email
```typescript
const response = await fetch('/api/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'delete',
    itemId: '123'
  })
});
const data = await response.json();
console.log(data);
```

### Move an email
```typescript
const response = await fetch('/api/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'move',
    itemId: '123',
    fromFolder: 'INBOX',
    toFolder: 'Sent'
  })
});
const data = await response.json();
console.log(data);
``` 