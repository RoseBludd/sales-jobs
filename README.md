# Email Dashboard Application

A modern, responsive email dashboard built with Next.js, focusing on clean UI/UX and smooth transitions.

## Features

- **Clean, Modern Interface**: Aesthetically pleasing design with responsive layouts
- **Dark/Light Theme Support**: Seamless theme switching with system preference detection
- **Smooth Animations**: Fluid transitions and loading states
- **Responsive Design**: Mobile-first approach with optimized layouts for all screen sizes
- **Toast Notifications**: Elegant feedback system for user actions
- **Skeleton Loading**: Improves perceived performance during data fetching

## Tech Stack

- **Next.js**: React framework with server components and routing
- **Tailwind CSS**: Utility-first CSS framework for styling
- **React-Hot-Toast**: Lightweight toast notification library
- **Lucide Icons**: Beautiful, consistent icon set

## Project Structure

```
src/
├── app/
│   ├── dashboard/
│   │   ├── email/
│   │   │   ├── components/
│   │   │   │   ├── EmailPage.tsx       # Main email page component
│   │   │   │   ├── EmailSkeleton.tsx   # Loading skeletons
│   │   │   │   ├── FeatureNotification.tsx # Notifications for WIP features
│   │   │   │   └── ...
│   │   │   ├── context/
│   │   │   │   └── EmailProvider.tsx   # Context for email state management
│   │   │   ├── utils/
│   │   │   │   └── animations.ts       # Animation configurations
│   │   │   └── page.tsx                # Entry point for email route
│   │   └── ...
│   ├── layout.tsx                      # Root layout with theme support
│   └── ...
└── components/
    ├── Sidebar.tsx                     # App sidebar with navigation
    └── ...
```

## UI Design Principles

1. **Consistency**: Unified design language across all components
2. **Feedback**: Clear visual feedback for all user interactions
3. **Performance**: Optimized loading states and transitions
4. **Accessibility**: Support for keyboard navigation and screen readers
5. **Theming**: Seamless dark/light mode transitions

## Animation Strategy

Animations are designed to be subtle and purposeful, enhancing the user experience without being distracting. Key animation principles:

- **Loading States**: Skeleton loaders match the shape of the content they replace
- **Transitions**: Smooth page and component transitions
- **Feedback**: Subtle animations for user actions
- **Performance**: CSS transitions and transforms for optimal performance

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Configuration

The application supports multiple environments:
- Development: Optimized for local development
- Testing: For automated tests
- Production: Optimized for performance and security

## Best Practices

- **Clean Code**: Modular, reusable components
- **Performance**: Optimized loading and rendering
- **Responsive Design**: Mobile-first approach
- **Accessibility**: ARIA attributes and keyboard navigation
- **Error Handling**: Graceful error states and recovery

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
