# Email System Integration with AWS WorkMail and Lambda

This document provides instructions on how to set up and configure the email system for the application using AWS WorkMail and Lambda.

## Overview

The email system consists of the following components:

1. **AWS WorkMail**: A secure, managed business email and calendar service.
2. **AWS Lambda**: A serverless compute service that runs code in response to events.
3. **Next.js API Routes**: Backend API endpoints that interact with AWS services.
4. **React Components**: Frontend components for displaying and interacting with emails.

## Prerequisites

- AWS Account with access to WorkMail and Lambda services
- Node.js and npm installed
- Basic knowledge of AWS services

## Setup Instructions

### 1. AWS WorkMail Setup

Follow the instructions in the [lambda/README.md](lambda/README.md) file to set up AWS WorkMail and create an organization.

### 2. AWS Lambda Setup

Follow the instructions in the [lambda/README.md](lambda/README.md) file to create and configure the Lambda function for processing emails.

### 3. Environment Variables

Add the following environment variables to your Next.js application:

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
WORKMAIL_ORGANIZATION_ID=your_organization_id
EMAIL_PROCESSOR_LAMBDA=workMailLambda
```

You can add these to a `.env.local` file in the root of your project.

### 4. API Routes

The application uses the following API routes for email functionality:

- `GET /api/email?folder=inbox`: Retrieve emails from a specific folder
- `POST /api/email`: Update email properties (mark as read, star, delete)
- `PUT /api/email`: Send a new email

These routes are implemented in `src/app/api/email/route.ts`.

### 5. Frontend Components

The email interface is implemented in `src/app/dashboard/email/page.tsx` and includes the following components:

- Email list view
- Email detail view
- Compose email form
- Folder navigation

## Testing the Integration

1. Start the Next.js development server:
   ```
   npm run dev
   ```

2. Navigate to the email page at `/dashboard/email`

3. Test the following functionality:
   - View emails in different folders
   - Read an email
   - Compose and send a new email
   - Mark emails as read/unread
   - Delete emails

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Verify that your AWS credentials are correct
   - Check that the IAM user has the necessary permissions

2. **Email Not Showing**:
   - Check the Lambda function logs in CloudWatch
   - Verify that the WorkMail organization ID is correct

3. **Cannot Send Emails**:
   - Ensure that the sender email is a valid WorkMail user
   - Check the Lambda function logs for any errors

### Debugging

- Enable debug logging in the Lambda function by adding `console.log` statements
- Check the browser console for any frontend errors
- Inspect network requests in the browser developer tools

## Resources

- [AWS WorkMail Documentation](https://docs.aws.amazon.com/workmail/latest/adminguide/welcome.html)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
- [Next.js API Routes Documentation](https://nextjs.org/docs/api-routes/introduction)

## Future Improvements

- Implement email attachments handling
- Add email filtering and search functionality
- Implement email templates for common responses
- Add calendar integration with WorkMail calendar 