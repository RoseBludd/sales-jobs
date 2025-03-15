import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { syncUserJobs, getLastSyncInfo } from '@/lib/monday';

/**
 * GET handler for getting sync status
 */
export async function GET(request: NextRequest) {
  try {
    // Get the session to verify the user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userEmail = session.user.email;
    
    // Get the last sync info
    const syncInfo = await getLastSyncInfo(userEmail);
    
    return NextResponse.json({
      lastSynced: syncInfo.lastSyncTimestamp,
      totalJobs: syncInfo.totalJobs
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for syncing jobs from Monday.com to the database
 */
export async function POST(request: NextRequest) {
  try {
    // Get the session to verify the user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userEmail = session.user.email;
    
    // Parse the request body
    const body = await request.json();
    const { background = false } = body;
    
    // For background processing, start the sync in the background and return immediately
    if (background) {
      setTimeout(async () => {
        try {
          console.log(`Starting background sync for user: ${userEmail}`);
          const result = await syncUserJobs(userEmail);
          console.log('Background sync completed:', result);
        } catch (error) {
          console.error('Background sync error:', error);
        }
      }, 100);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Sync started in background',
        background: true
      });
    }
    
    // Sync jobs in the foreground
    const result = await syncUserJobs(userEmail);
    
    return NextResponse.json({
      success: true,
      created: result.created,
      updated: result.updated,
      total: result.total,
      error: result.error
    });
  } catch (error) {
    console.error('Error syncing jobs:', error);
    return NextResponse.json(
      { error: 'Failed to sync jobs', details: (error as Error).message },
      { status: 500 }
    );
  }
} 