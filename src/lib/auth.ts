import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';

// Ensure we're on the server side
const isServer = typeof window === 'undefined';

// Add logging function with safe error handling
const safeLog = (message: string, data: any) => {
  try {
    console.log(message, typeof data === 'object' && data !== null ? data : String(data));
  } catch (error) {
    console.log(message, 'Error logging data');
  }
};

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
  try {
    console.log(`🔒 [NextAuth ${stage}]:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`🔒 [NextAuth ${stage}]:`, 'Error logging data');
  }
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
          console.error('Email and password are required');
          throw new Error('Email and password are required');
        }

        try {
          console.log(`🔑 Attempting login for: ${credentials.email}`);
          
          // Check if we're on the server side
          if (!isServer) {
            console.error('Authorization can only be performed on the server side');
            return null;
          }
          
          // Check credentials against Monday.com
          try {
            const { checkCredentials } = await import('@/lib/monday');
            console.log('Successfully imported checkCredentials function');
            
            const isValid = await checkCredentials(credentials.email, credentials.password);
            console.log(`Credentials check result for ${credentials.email}: ${isValid}`);

            if (!isValid) {
              console.log(`❌ Invalid credentials for: ${credentials.email}`);
              return null;
            }
          } catch (credentialsError) {
            console.error('Error during credentials check:', credentialsError);
            throw new Error('Failed to verify credentials');
          }

          // Get user details from database
          try {
            console.log(`Fetching user from database: ${credentials.email}`);
            const dbUser = await prisma.monday_users.findUnique({
              where: { email: credentials.email }
            });

            if (!dbUser) {
              console.error(`⚠️ User authenticated but not found in database: ${credentials.email}`);
              
              // Try to create the user in the database as a fallback
              try {
                console.log(`Attempting to create user in database: ${credentials.email}`);
                // Get user details from Monday.com
                const { getUserByEmail } = await import('@/lib/monday');
                const mondayUser = await getUserByEmail(credentials.email);
                
                if (mondayUser) {
                  const newUser = await prisma.monday_users.create({
                    data: {
                      monday_id: mondayUser.id,
                      email: credentials.email,
                      password: credentials.password,
                      first_name: mondayUser.firstName || '',
                      last_name: mondayUser.lastName || ''
                    }
                  });
                  
                  console.log(`✅ Created user in database: ${credentials.email}`);
                  
                  return {
                    id: newUser.id,
                    email: newUser.email,
                    name: `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim() || newUser.email.split('@')[0],
                    mondayId: newUser.monday_id,
                    firstName: newUser.first_name || '',
                    lastName: newUser.last_name || ''
                  };
                }
              } catch (createError) {
                console.error(`Failed to create user in database: ${credentials.email}`, createError);
              }
              
              return null;
            }

            console.log(`✅ User authenticated successfully: ${credentials.email}`);
            safeLog(`👤 User details from DB:`, {
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
          } catch (dbError) {
            console.error(`🔴 Database error during authentication:`, dbError instanceof Error ? dbError.message : String(dbError));
            if (dbError instanceof Error && dbError.stack) {
              console.error('Stack trace:', dbError.stack);
            }
            return null;
          }
        } catch (error) {
          console.error('🔴 Authorization error:', error instanceof Error ? error.message : String(error));
          if (error instanceof Error && error.stack) {
            console.error('Stack trace:', error.stack);
          }
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
  debug: process.env.NODE_ENV === 'development', // Enable debug mode only in development
}; 