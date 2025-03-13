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
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };