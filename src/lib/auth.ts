import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';

// Extend the built-in session types
declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name?: string;
    mondayId: string;
    firstName?: string;
    lastName?: string;
  }
  
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      mondayId: string;
      firstName?: string;
      lastName?: string;
    }
  }
}

// Extend the JWT type
declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    mondayId: string;
    firstName?: string;
    lastName?: string;
  }
}

// Add logging function
const logSession = (stage: string, data: any) => {
  console.log(`🔒 [NextAuth ${stage}]:`, JSON.stringify(data, null, 2));
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'Enter your email' },
        password: { label: 'Password', type: 'password', placeholder: 'Enter your password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          console.log(`🔑 Attempting login for: ${credentials.email}`);
          
          // Check credentials against Monday.com
          const { checkCredentials } = await import('@/lib/monday');
          const isValid = await checkCredentials(credentials.email, credentials.password);

          if (!isValid) {
            console.log(`❌ Invalid credentials for: ${credentials.email}`);
            return null;
          }

          // Get user details from database
          const dbUser = await prisma.monday_users.findUnique({
            where: { email: credentials.email }
          });

          if (!dbUser) {
            console.error(`⚠️ User authenticated but not found in database: ${credentials.email}`);
            return null;
          }

          console.log(`✅ User authenticated successfully: ${credentials.email}`);
          console.log(`👤 User details from DB:`, {
            id: dbUser.id,
            email: dbUser.email,
            firstName: dbUser.first_name,
            lastName: dbUser.last_name,
            mondayId: dbUser.monday_id
          });

          return {
            id: dbUser.id,
            email: dbUser.email,
            name: `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim() || dbUser.email.split('@')[0],
            mondayId: dbUser.monday_id,
            firstName: dbUser.first_name || '',
            lastName: dbUser.last_name || ''
          };
        } catch (error) {
          console.error('🔴 Authorization error:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // logSession('JWT - User Data', user);
        token.email = user.email;
        token.id = user.id;
        token.mondayId = user.mondayId;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        // logSession('JWT - Updated Token', token);
      }
      return token;
    },
    async session({ session, token }) {
      // logSession('Session - Before Update', { session, token });
      
      if (session.user) {
        session.user.email = token.email;
        session.user.id = token.id;
        session.user.mondayId = token.mondayId;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
      }
      
      // logSession('Session - After Update', session);
      return session;
    },
  },
  debug: true, // Enable debug mode
}; 