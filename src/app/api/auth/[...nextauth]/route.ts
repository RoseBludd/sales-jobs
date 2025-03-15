import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * NextAuth.js API route
 * 
 * This route handles all authentication-related requests.
 * The configuration is imported from src/lib/auth.ts for better maintainability.
 * 
 * @see https://next-auth.js.org/configuration/options
 */

// Create the handler with proper error handling
const createHandler = () => {
  try {
    return NextAuth(authOptions);
  } catch (error) {
    console.error('Error creating NextAuth handler:', error instanceof Error ? error.message : String(error));
    
    // Return a function that always returns an error response
    return async () => {
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error', 
          message: 'Authentication service is currently unavailable' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    };
  }
};

// Create the handler
const handler = createHandler();

// Export the handler functions
export { handler as GET, handler as POST };