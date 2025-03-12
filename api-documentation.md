# AWS WorkMail EWS Integration API Documentation

## Overview

This document provides comprehensive documentation for the API routes used in the AWS WorkMail Exchange Web Services (EWS) integration. The API enables email, calendar, and contacts management through a RESTful interface.

## Base URL

All API routes are relative to the base URL of your deployment:

```
https://your-domain.com/api
```

## Authentication

All API routes (except for `/api/auth/*` and test routes) require authentication. The API uses JWT tokens for authentication, which are obtained through the login process.

### Headers

Include the following header in all API requests:

```
Authorization: Bearer <token>
```

## Rate Limiting

API routes are rate-limited to prevent abuse. The default rate limit is 100 requests per minute per user. When a rate limit is exceeded, the API will return a 429 status code with a message indicating when the rate limit will reset.

Rate limit headers are included in all API responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1615482489
```

## Error Handling

All API routes return standard HTTP status codes:

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

Error responses include a JSON object with the following structure:

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": "Additional error details (optional)"
}
```

## Email API Routes

### List Emails

Retrieves a list of emails from a specified folder.

**URL**: `/emails`  
**Method**: `GET`  
**Query Parameters**:
- `folder` (optional): Folder name (inbox, sent, drafts, deleted). Default: inbox
- `pageSize` (optional): Number of emails to return. Default: 50
- `page` (optional): Page number. Default: 1

**Response**:
```json
{
  "emails": [
    {
      "id": "string",
      "subject": "string",
      "from": "string",
      "receivedDate": "string",
      "hasAttachments": boolean,
      "isRead": boolean
    }
  ],
  "total": number,
  "page": number,
  "pageSize": number,
  "fromCache": boolean
}
```

### Get Email Details

Retrieves details of a specific email.

**URL**: `/emails/:id`  
**Method**: `GET`  
**URL Parameters**:
- `id`: Email ID

**Response**:
```json
{
  "id": "string",
  "subject": "string",
  "from": "string",
  "to": ["string"],
  "cc": ["string"],
  "body": "string",
  "receivedDate": "string",
  "hasAttachments": boolean,
  "isRead": boolean,
  "importance": "string"
}
```

### Send Email

Sends a new email.

**URL**: `/emails`  
**Method**: `POST`  
**Request Body**:
```json
{
  "to": ["string"],
  "subject": "string",
  "body": "string",
  "cc": ["string"],
  "bcc": ["string"],
  "attachments": [
    {
      "name": "string",
      "content": "string",
      "contentType": "string"
    }
  ]
}
```

**Response**:
```json
{
  "success": boolean,
  "emailId": "string",
  "message": "string"
}
```

### Move Email

Moves an email to a different folder.

**URL**: `/emails/move`  
**Method**: `PUT`  
**Request Body**:
```json
{
  "emailId": "string",
  "destinationFolderId": "string"
}
```

**Response**:
```json
{
  "success": boolean,
  "message": "string"
}
```

### Delete Email

Deletes an email.

**URL**: `/emails/:id`  
**Method**: `DELETE`  
**URL Parameters**:
- `id`: Email ID

**Query Parameters**:
- `hardDelete` (optional): Whether to permanently delete the email. Default: false

**Response**:
```json
{
  "success": boolean,
  "message": "string"
}
```

### Search Emails

Searches for emails based on a query.

**URL**: `/emails/search`  
**Method**: `POST`  
**Request Body**:
```json
{
  "query": "string",
  "folderIds": ["string"],
  "pageSize": number,
  "page": number
}
```

**Response**:
```json
{
  "emails": [
    {
      "id": "string",
      "subject": "string",
      "from": "string",
      "receivedDate": "string",
      "hasAttachments": boolean,
      "isRead": boolean
    }
  ],
  "total": number,
  "page": number,
  "pageSize": number
}
```

## Calendar API Routes

### List Calendar Events

Retrieves a list of calendar events within a date range.

**URL**: `/events`  
**Method**: `GET`  
**Query Parameters**:
- `startDate`: Start date in ISO format
- `endDate`: End date in ISO format
- `pageSize` (optional): Number of events to return. Default: 50
- `page` (optional): Page number. Default: 1

**Response**:
```json
{
  "events": [
    {
      "id": "string",
      "subject": "string",
      "start": "string",
      "end": "string",
      "location": "string",
      "isAllDayEvent": boolean,
      "organizer": "string",
      "body": "string"
    }
  ],
  "total": number,
  "page": number,
  "pageSize": number,
  "fromCache": boolean
}
```

### Get Calendar Event Details

Retrieves details of a specific calendar event.

**URL**: `/events/:id`  
**Method**: `GET`  
**URL Parameters**:
- `id`: Event ID

**Response**:
```json
{
  "id": "string",
  "subject": "string",
  "start": "string",
  "end": "string",
  "location": "string",
  "body": "string",
  "isAllDayEvent": boolean,
  "organizer": "string",
  "attendees": [
    {
      "email": "string",
      "name": "string",
      "required": boolean
    }
  ]
}
```

### Create Calendar Event

Creates a new calendar event.

**URL**: `/events`  
**Method**: `POST`  
**Request Body**:
```json
{
  "subject": "string",
  "start": "string",
  "end": "string",
  "location": "string",
  "body": "string",
  "isAllDay": boolean,
  "attendees": [
    {
      "email": "string",
      "name": "string",
      "required": boolean
    }
  ],
  "recurrence": {
    "pattern": "Daily|Weekly|Monthly",
    "interval": number,
    "endDate": "string"
  }
}
```

**Response**:
```json
{
  "success": boolean,
  "eventId": "string",
  "message": "string"
}
```

### Update Calendar Event

Updates an existing calendar event.

**URL**: `/events/:id`  
**Method**: `PUT`  
**URL Parameters**:
- `id`: Event ID

**Request Body**:
```json
{
  "subject": "string",
  "start": "string",
  "end": "string",
  "location": "string",
  "body": "string",
  "isAllDay": boolean
}
```

**Response**:
```json
{
  "success": boolean,
  "message": "string"
}
```

### Delete Calendar Event

Deletes a calendar event.

**URL**: `/events/:id`  
**Method**: `DELETE`  
**URL Parameters**:
- `id`: Event ID

**Query Parameters**:
- `cancelMeeting` (optional): Whether to send cancellation notices to attendees. Default: false

**Response**:
```json
{
  "success": boolean,
  "message": "string"
}
```

### Manage Event Attendees

Adds or removes attendees from a calendar event.

**URL**: `/events/:id/invite`  
**Method**: `POST`  
**URL Parameters**:
- `id`: Event ID

**Request Body**:
```json
{
  "attendeesToAdd": [
    {
      "email": "string",
      "name": "string",
      "required": boolean
    }
  ],
  "attendeesToRemove": ["string"]
}
```

**Response**:
```json
{
  "success": boolean,
  "message": "string"
}
```

## Contacts API Routes

### List Contacts

Retrieves a list of contacts.

**URL**: `/contacts`  
**Method**: `GET`  
**Query Parameters**:
- `pageSize` (optional): Number of contacts to return. Default: 50
- `page` (optional): Page number. Default: 1

**Response**:
```json
{
  "contacts": [
    {
      "id": "string",
      "displayName": "string",
      "emailAddress": "string",
      "businessPhone": "string",
      "mobilePhone": "string",
      "jobTitle": "string",
      "company": "string",
      "department": "string",
      "notes": "string"
    }
  ],
  "total": number,
  "page": number,
  "pageSize": number,
  "fromCache": boolean
}
```

### Get Contact Details

Retrieves details of a specific contact.

**URL**: `/contacts/:id`  
**Method**: `GET`  
**URL Parameters**:
- `id`: Contact ID

**Response**:
```json
{
  "id": "string",
  "displayName": "string",
  "emailAddress": "string",
  "businessPhone": "string",
  "mobilePhone": "string",
  "jobTitle": "string",
  "company": "string",
  "department": "string",
  "notes": "string"
}
```

### Create Contact

Creates a new contact.

**URL**: `/contacts`  
**Method**: `POST`  
**Request Body**:
```json
{
  "displayName": "string",
  "emailAddress": "string",
  "businessPhone": "string",
  "mobilePhone": "string",
  "jobTitle": "string",
  "company": "string",
  "department": "string",
  "notes": "string"
}
```

**Response**:
```json
{
  "success": boolean,
  "contactId": "string",
  "message": "string"
}
```

### Update Contact

Updates an existing contact.

**URL**: `/contacts/:id`  
**Method**: `PUT`  
**URL Parameters**:
- `id`: Contact ID

**Request Body**:
```json
{
  "displayName": "string",
  "emailAddress": "string",
  "businessPhone": "string",
  "mobilePhone": "string",
  "jobTitle": "string",
  "company": "string",
  "department": "string",
  "notes": "string"
}
```

**Response**:
```json
{
  "success": boolean,
  "message": "string"
}
```

### Delete Contact

Deletes a contact.

**URL**: `/contacts/:id`  
**Method**: `DELETE`  
**URL Parameters**:
- `id`: Contact ID

**Response**:
```json
{
  "success": boolean,
  "message": "string"
}
```

### Search Contacts

Searches for contacts based on a query.

**URL**: `/contacts/search`  
**Method**: `GET`  
**Query Parameters**:
- `query`: Search query
- `pageSize` (optional): Number of contacts to return. Default: 50
- `page` (optional): Page number. Default: 1

**Response**:
```json
{
  "contacts": [
    {
      "id": "string",
      "displayName": "string",
      "emailAddress": "string",
      "businessPhone": "string",
      "mobilePhone": "string",
      "jobTitle": "string",
      "company": "string",
      "department": "string"
    }
  ],
  "total": number,
  "page": number,
  "pageSize": number
}
```

## Test API Routes

These routes are for testing purposes only and should not be used in production.

### Comprehensive Test Route

Tests all EWS functionality in a single route.

**URL**: `/test-ews/all`  
**Method**: `GET`  
**Query Parameters**:
- `action`: Test action to perform
  - `email-list`: Test email listing
  - `email-get`: Test email details (requires `id` parameter)
  - `email-send`: Test email sending
  - `email-search`: Test email search (requires `query` parameter)
  - `folders-list`: Test folder listing
  - `calendar-list`: Test calendar listing
  - `calendar-create`: Test calendar event creation
  - `calendar-get`: Test calendar event details (requires `id` parameter)
  - `calendar-update`: Test calendar event update (requires `id` parameter)
  - `calendar-delete`: Test calendar event deletion (requires `id` parameter)
  - `contacts-list`: Test contacts listing
  - `contacts-create`: Test contact creation
  - `contacts-get`: Test contact details (requires `id` parameter)
  - `contacts-update`: Test contact update (requires `id` parameter)
  - `contacts-delete`: Test contact deletion (requires `id` parameter)
  - `contacts-search`: Test contact search (requires `query` parameter)
- `id` (optional): ID of the resource to test (for get, update, delete actions)
- `query` (optional): Search query (for search actions)

**Response**:
Varies based on the action parameter.

## Implementation Notes

### Caching

The API uses Redis for caching frequently accessed data:

- Email lists are cached for 5 minutes
- Email details are cached for 10 minutes
- Calendar events are cached for 10 minutes
- Contacts are cached for 30 minutes

### Error Logging

All API errors are logged with a unique correlation ID for troubleshooting purposes.

### WorkMail Limitations

- EWS requests are limited to 30 requests per second
- Attachment size is limited to 30MB
- Mailbox size is limited to 50GB per user

## Examples

### Example: List Emails

**Request**:
```
GET /api/emails?folder=inbox&pageSize=10&page=1
```

**Response**:
```json
{
  "emails": [
    {
      "id": "AABuL089bS0xY2QzM2RlMWE1NTM0YmU5YmM2YTlmOTUwMTNmMmJjOC...",
      "subject": "Meeting Tomorrow",
      "from": "john.doe@example.com",
      "receivedDate": "2024-03-10T15:30:00.000Z",
      "hasAttachments": true,
      "isRead": false
    },
    ...
  ],
  "total": 45,
  "page": 1,
  "pageSize": 10,
  "fromCache": true
}
```

### Example: Send Email

**Request**:
```
POST /api/emails
Content-Type: application/json

{
  "to": ["jane.smith@example.com"],
  "subject": "Project Update",
  "body": "<p>Here's the latest update on our project.</p>",
  "cc": ["team@example.com"],
  "bcc": ["manager@example.com"]
}
```

**Response**:
```json
{
  "success": true,
  "emailId": "AABuL089bS0xY2QzM2RlMWE1NTM0YmU5YmM2YTlmOTUwMTNmMmJjOC...",
  "message": "Email sent successfully"
}
```

### Example: Create Calendar Event

**Request**:
```
POST /api/events
Content-Type: application/json

{
  "subject": "Team Meeting",
  "start": "2024-03-15T14:00:00.000Z",
  "end": "2024-03-15T15:00:00.000Z",
  "location": "Conference Room A",
  "body": "Weekly team meeting to discuss project progress.",
  "isAllDay": false,
  "attendees": [
    {
      "email": "jane.smith@example.com",
      "name": "Jane Smith",
      "required": true
    },
    {
      "email": "john.doe@example.com",
      "name": "John Doe",
      "required": false
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "eventId": "AABuL089bS0xY2QzM2RlMWE1NTM0YmU5YmM2YTlmOTUwMTNmMmJjOC...",
  "message": "Calendar event created successfully"
}
```

### Example: Create Contact

**Request**:
```
POST /api/contacts
Content-Type: application/json

{
  "displayName": "Jane Smith",
  "emailAddress": "jane.smith@example.com",
  "businessPhone": "555-123-4567",
  "mobilePhone": "555-987-6543",
  "jobTitle": "Marketing Manager",
  "company": "Example Corp",
  "department": "Marketing",
  "notes": "Met at the industry conference in March."
}
```

**Response**:
```json
{
  "success": true,
  "contactId": "AABuL089bS0xY2QzM2RlMWE1NTM0YmU5YmM2YTlmOTUwMTNmMmJjOC...",
  "message": "Contact created successfully"
}
``` 