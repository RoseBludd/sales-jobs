import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

// Use a singleton pattern for PrismaClient to avoid connection pool issues
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * GET handler for fetching job count history
 * 
 * Query parameters:
 * - date: The date to get job count for (optional, default: 30 days ago)
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
    const dateParam = searchParams.get('date');
    
    // Parse the date or use default (30 days ago)
    let targetDate: Date;
    if (dateParam) {
      targetDate = new Date(dateParam);
      if (isNaN(targetDate.getTime())) {
        // Invalid date provided, use default
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 30);
        targetDate = defaultDate;
      }
    } else {
      // No date provided, use default (30 days ago)
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() - 30);
      targetDate = defaultDate;
    }
    
    // Get the user from the database
    const user = await prisma.monday_users.findUnique({
      where: { email: userEmail },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Count jobs that existed at the target date
    // This counts jobs created before or on the target date
    const jobCount = await prisma.monday_jobs.count({
      where: {
        user_id: user.id,
        created_at: {
          lte: targetDate
        }
      }
    });
    
    return NextResponse.json({
      date: targetDate.toISOString(),
      count: jobCount
    });
  } catch (error) {
    console.error('Error fetching job history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job history', details: (error as Error).message },
      { status: 500 }
    );
  }
} 