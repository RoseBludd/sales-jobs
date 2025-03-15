import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

// Use a singleton pattern for PrismaClient to avoid connection pool issues
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// GET /api/jobs/find - Find a job by monday_id
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await prisma.monday_users.findUnique({
      where: { email: session.user.email as string },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get the monday_id from the query parameters
    const { searchParams } = new URL(request.url);
    const mondayId = searchParams.get('monday_id');
    
    if (!mondayId) {
      return NextResponse.json({ error: 'monday_id parameter is required' }, { status: 400 });
    }
    
    // Find the job by monday_id
    const job = await prisma.monday_jobs.findFirst({
      where: { 
        monday_id: mondayId,
        user_id: user.id 
      },
      select: {
        id: true,
        name: true,
        monday_id: true,
        details: true,
        notes_count: true,
      },
    });
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    return NextResponse.json(job);
  } catch (error) {
    console.error('Error finding job:', error);
    return NextResponse.json({ error: 'Failed to find job' }, { status: 500 });
  }
} 