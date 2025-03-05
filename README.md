This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## AWS WorkMail Integration

This project includes integration with AWS WorkMail for email functionality. To set up the AWS WorkMail integration:

1. Create a `.env.local` file in the root directory with the following variables:

```bash
# AWS WorkMail Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
WORKMAIL_ORGANIZATION_ID=your_organization_id
WORKMAIL_USER_PASSWORD=your_workmail_password
```

2. Replace the placeholder values with your actual AWS WorkMail credentials:
   - `AWS_REGION`: The AWS region where your WorkMail organization is hosted
   - `AWS_ACCESS_KEY_ID`: Your AWS access key ID with permissions for WorkMail
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key
   - `WORKMAIL_ORGANIZATION_ID`: Your WorkMail organization ID
   - `WORKMAIL_USER_PASSWORD`: The password for the WorkMail user

3. Ensure the user's email domain in the application matches your WorkMail domain. You can modify the `EMAIL_DOMAIN` constant in `src/app/api/email/route.ts` if needed.

4. Install the required dependencies:

```bash
npm install axios xml2js @types/xml2js
```

The email functionality uses the Exchange Web Services (EWS) API to interact with AWS WorkMail. If you encounter authentication issues, the application will fall back to using mock data for demonstration purposes.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
