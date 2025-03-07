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

## Email Parsing

This API uses the `mailparser` library's `simpleParser` function for parsing email content. The `simpleParser` function provides a simple and efficient way to parse email messages, handling MIME parsing, character encoding, and attachment extraction.

### Key Features

- **HTML Content**: Automatically extracts HTML content from emails
- **Text Content**: Extracts plaintext content and converts it to HTML when needed
- **Attachments**: Properly extracts and processes email attachments
- **Embedded Images**: Replaces embedded images with base64 encoded data URIs
- **Address Parsing**: Properly parses email addresses and names

### Implementation

The email parsing is implemented in two main components:

1. **API Layer** (`src/app/api/email/parser.ts`): Handles parsing of raw emails into structured `EmailMessage` objects
2. **Server API Routes**:
   - `/api/email/parse`: Parses raw email content and returns HTML/text content
   - `/api/email/attachments`: Extracts attachments from raw email content
3. **Client Layer** (`src/app/dashboard/email/services/emailService.ts`): Provides functions for parsing email bodies and extracting attachments via API calls

### Server-Side Parsing

To avoid Node.js module compatibility issues with client-side code, all email parsing is done on the server side. The client makes API calls to the server to parse email content and extract attachments.

#### API Routes

1. **POST /api/email/parse**
   - Request body: `{ "rawEmail": "..." }`
   - Response: `{ "html": "...", "text": "...", "textAsHtml": "...", "subject": "..." }`

2. **POST /api/email/attachments**
   - Request body: `{ "rawEmail": "..." }`
   - Response: `[{ "id": "...", "name": "...", "size": 123, "type": "..." }, ...]`

### Usage

To parse an email on the server:

```typescript
import { parseEmail } from './parser';

// Parse a raw email
const email = await parseEmail(
  rawEmailContent,
  'inbox',
  1,
  'uid123',
  false,
  false
);
```

To extract and display email content in the UI:

```typescript
import { parseEmailBody, extractAttachments } from '../services/emailService';

// Parse the email body (makes API call to server)
const htmlContent = await parseEmailBody(rawEmail);

// Extract attachments (makes API call to server)
const attachments = await extractAttachments(rawEmail);
```

### Error Handling

The parser includes fallback mechanisms for handling parsing errors:

- If server API calls fail, it falls back to a simple client-side regex-based parser
- If attachment extraction fails, it falls back to a simple client-side attachment extractor

## Example Usage

### Fetch emails from Inbox
```