import { PrismaClient } from '@prisma/client'

// Define the event types for better TypeScript support
interface QueryEvent {
  timestamp: Date
  query: string
  params: string
  duration: number
  target: string
}

// This is your Prisma client declaration
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Check if we're running on the server side
const isServer = typeof window === 'undefined'

// Only initialize Prisma on the server side
let prismaClient: PrismaClient | undefined

if (isServer) {
  try {
    // Create a singleton connection in development mode
    // In production, allow a full connection pool
    prismaClient = globalForPrisma.prisma ?? new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })

    // Save the singleton instance in development mode
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prismaClient;
      
      // Add query logging for development
      if (process.env.NODE_ENV === 'development') {
        // Use type assertion to work around TypeScript limitations with Prisma events
        ;(prismaClient as any).$on('query', (e: QueryEvent) => {
          console.log('Query: ' + e.query);
          console.log('Duration: ' + e.duration + 'ms');
        });
        
        // Add process exit handler instead of Prisma's beforeExit
        if (typeof process !== 'undefined') {
          process.on('beforeExit', () => {
            console.log('Process is about to exit, cleaning up Prisma connections');
          });
        }
      }
    }
  } catch (e) {
    // Safely log the error without passing potentially null objects
    console.error('Failed to initialize Prisma client:', e instanceof Error ? e.message : String(e));
  }
}

// Create a dummy client for client-side that throws helpful errors
class ClientSidePrismaError extends Error {
  constructor() {
    super('Prisma cannot be used on the client side. This error is normal in the browser and does not affect server-side functionality.');
    this.name = 'PrismaClientError';
  }
}

const dummyPrismaClient = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    if (prop === 'then' || prop === 'catch') {
      return undefined;
    }
    
    if (typeof prop === 'string' && !['constructor', 'toString', 'valueOf'].includes(prop)) {
      return () => {
        // Don't throw in production to avoid console errors
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`Attempted to use Prisma's "${String(prop)}" on the client side.`);
        }
        return Promise.reject(new ClientSidePrismaError());
      };
    }
    
    return undefined;
  }
});

// Create a fallback client for when Prisma initialization fails
const fallbackPrismaClient = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    if (prop === 'then' || prop === 'catch') {
      return undefined;
    }
    
    if (typeof prop === 'string' && !['constructor', 'toString', 'valueOf'].includes(prop)) {
      return (...args: any[]) => {
        console.error(`Prisma client failed to initialize. Operation "${String(prop)}" cannot be performed.`);
        return Promise.reject(new Error(`Prisma client failed to initialize. Operation "${String(prop)}" cannot be performed.`));
      };
    }
    
    return undefined;
  }
});

// Export the prisma client, with appropriate fallbacks
export const prisma = isServer 
  ? (prismaClient ?? fallbackPrismaClient) 
  : dummyPrismaClient;

// Function to explicitly disconnect (useful for tests and scripts)
export async function disconnectPrisma() {
  if (isServer && globalForPrisma.prisma) {
    try {
      await globalForPrisma.prisma.$disconnect();
    } catch (error) {
      console.error('Error disconnecting Prisma client:', error instanceof Error ? error.message : String(error));
    }
  }
} 