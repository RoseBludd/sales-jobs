import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getJobsFromDatabase, getLastSyncInfo } from '@/lib/monday';
import { PrismaClient } from '@prisma/client';

// Use a singleton pattern for PrismaClient to avoid connection pool issues
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * GET handler for fetching jobs from the database
 * 
 * Query parameters:
 * - page: The page number to fetch (optional, default: 1)
 * - pageSize: The number of jobs per page (optional, default: 20)
 * - orderBy: The field to order by (optional, default: 'updated_at')
 * - orderDirection: The direction to order by (optional, default: 'desc')
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
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const orderBy = (searchParams.get('orderBy') || 'updated_at') as 'created_at' | 'updated_at' | 'name';
    const orderDirection = (searchParams.get('orderDirection') || 'desc') as 'asc' | 'desc';
    
    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;
    
    // Get the user from the database
    const user = await prisma.monday_users.findUnique({
      where: { email: userEmail },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get total count for pagination
    const totalCount = await prisma.monday_jobs.count({
      where: { user_id: user.id }
    });
    
    // Get jobs from database with pagination
    const jobs = await prisma.monday_jobs.findMany({
      where: { user_id: user.id },
      orderBy: { [orderBy]: orderDirection },
      skip: offset,
      take: pageSize,
      select: {
        id: true,
        monday_id: true,
        name: true,
        details: true,
        notes_count: true,
      }
    });
    
    // Format jobs to match the Monday.com API response
    const formattedJobs = jobs.map(job => ({
      id: job.monday_id,
      name: job.name,
      email: userEmail,
      details: job.details as Record<string, string>,
      notes_count: job.notes_count || 0
    }));
    
    // Get sync info
    const syncInfo = await getLastSyncInfo(userEmail);
    
    return NextResponse.json({
      jobs: formattedJobs,
      total: totalCount,
      page,
      pageSize,
      hasMore: offset + jobs.length < totalCount,
      lastSynced: syncInfo.lastSyncTimestamp
    });
  } catch (error) {
    console.error('Error fetching jobs from database:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs from database', details: (error as Error).message },
      { status: 500 }
    );
  }
} 