import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

// Use a singleton pattern for PrismaClient to avoid connection pool issues
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// GET /api/jobs/notes - Get notes for a specific job
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
    
    // Get the jobId from the query parameters
    const { searchParams } = new URL(request.url);
    const mondayId = searchParams.get('mondayId');
    
    if (!mondayId) {
      return NextResponse.json({ error: 'mondayId parameter is required' }, { status: 400 });
    }
    
    // First, find the job by monday_id
    const job = await prisma.monday_jobs.findFirst({
      where: { 
        monday_id: mondayId,
        user_id: user.id 
      },
      select: { id: true }
    });
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    // Then, check if the job has any notes
    const notesCount = await prisma.job_notes.count({
      where: {
        job_id: job.id,
        user_id: user.id
      }
    });
    
    return NextResponse.json({ 
      hasNotes: notesCount > 0,
      count: notesCount
    });
  } catch (error) {
    console.error('Error checking for job notes:', error);
    return NextResponse.json({ error: 'Failed to check for job notes' }, { status: 500 });
  }
} 