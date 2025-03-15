import { NextRequest, NextResponse } from 'next/server';
import { syncUserJobs, startBackgroundSync } from '@/lib/monday';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper function for safe error handling
const safeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else {
    return 'Unknown error';
  }
};

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await req.json();
    const { email, forceFullSync = false, background = true, chunkSize = 250 } = body;
    
    // Use authenticated user's email if none provided
    const userEmail = email || session.user.email;
    
    // Validate email
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Check if user is allowed to sync this email
    // Only allow users to sync their own email unless they're an admin
    const isAdmin = (session.user as any).role === 'admin';
    if (userEmail !== session.user.email && !isAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to sync this user' },
        { status: 403 }
      );
    }
    
    // Verify database connection before proceeding
    try {
      // Simple query to check database connection
      await prisma.$queryRaw`SELECT 1`;
      console.log('Database connection verified');
    } catch (dbError) {
      console.error('Database connection error:', safeErrorMessage(dbError));
      return NextResponse.json(
        { 
          error: 'Database connection error',
          message: 'Could not connect to the database. Please try again later.'
        },
        { status: 500 }
      );
    }
    
    // Start sync process
    if (background) {
      // Use background sync for large datasets
      try {
        console.log(`Starting background sync for user ${userEmail}, forceFullSync: ${forceFullSync}, chunkSize: ${chunkSize}`);
        const result = await startBackgroundSync(userEmail, chunkSize, forceFullSync);
        return NextResponse.json({
          ...result,
          success: true,
          forceFullSync
        });
      } catch (syncError) {
        console.error('Background sync error:', safeErrorMessage(syncError));
        return NextResponse.json(
          { 
            error: 'Failed to start background sync',
            message: safeErrorMessage(syncError)
          },
          { status: 500 }
        );
      }
    } else {
      // Use regular sync for smaller datasets or immediate results
      try {
        console.log(`Starting foreground sync for user ${userEmail}, forceFullSync: ${forceFullSync}`);
        const result = await syncUserJobs(userEmail, forceFullSync);
        
        return NextResponse.json({
          status: result.error ? 'error' : 'completed',
          message: result.error ? result.error : 'Sync completed successfully',
          success: !result.error,
          forceFullSync,
          ...result
        });
      } catch (syncError) {
        console.error('Sync error:', safeErrorMessage(syncError));
        return NextResponse.json(
          { 
            error: 'Failed to sync jobs',
            message: safeErrorMessage(syncError)
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Error in sync API:', safeErrorMessage(error));
    
    return NextResponse.json(
      { 
        error: 'Failed to sync jobs',
        message: safeErrorMessage(error)
      },
      { status: 500 }
    );
  }
}

// Add a GET endpoint to check sync status
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const syncId = searchParams.get('syncId');
    const email = searchParams.get('email') || session.user.email;
    
    // Validate email
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Check if user is allowed to check this email's sync status
    const isAdmin = (session.user as any).role === 'admin';
    if (email !== session.user.email && !isAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to check this user\'s sync status' },
        { status: 403 }
      );
    }
    
    // Verify database connection before proceeding
    try {
      // Simple query to check database connection
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbError) {
      console.error('Database connection error:', safeErrorMessage(dbError));
      return NextResponse.json(
        { 
          error: 'Database connection error',
          message: 'Could not connect to the database. Please try again later.'
        },
        { status: 500 }
      );
    }
    
    // Get sync status from database
    let syncRecord;
    
    try {
      if (syncId) {
        // Get specific sync record by ID
        syncRecord = await prisma.monday_jobs_sync.findUnique({
          where: { id: syncId }
        });
      } else {
        // Get latest sync record for user
        const user = await prisma.monday_users.findUnique({
          where: { email }
        });
        
        if (!user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }
        
        syncRecord = await prisma.monday_jobs_sync.findFirst({
          where: { user_id: user.id },
          orderBy: { last_sync_timestamp: 'desc' }
        });
      }
    } catch (dbError) {
      console.error('Error fetching sync record:', safeErrorMessage(dbError));
      return NextResponse.json(
        { 
          error: 'Database error',
          message: 'Failed to fetch sync status from database'
        },
        { status: 500 }
      );
    }
    
    if (!syncRecord) {
      return NextResponse.json(
        { error: 'Sync record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      status: syncRecord.status || 'unknown',
      progress: syncRecord.progress || 0,
      totalJobs: syncRecord.total_jobs || 0,
      processedJobs: syncRecord.processed_jobs || 0,
      createdJobs: syncRecord.created_jobs || 0,
      updatedJobs: syncRecord.updated_jobs || 0,
      startedAt: syncRecord.started_at,
      completedAt: syncRecord.completed_at,
      lastSyncTimestamp: syncRecord.last_sync_timestamp,
      error: syncRecord.error_message,
      syncId: syncRecord.id.toString()
    });
  } catch (error) {
    console.error('Error checking sync status:', safeErrorMessage(error));
    
    return NextResponse.json(
      { 
        error: 'Failed to check sync status',
        message: safeErrorMessage(error)
      },
      { status: 500 }
    );
  }
} 