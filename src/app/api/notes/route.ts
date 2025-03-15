import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

// Use a singleton pattern for PrismaClient to avoid connection pool issues
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// GET /api/notes - Get all notes for the current user
export async function GET() {
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
    
    const notes = await prisma.job_notes.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      include: {
        job: {
          select: {
            id: true,
            name: true,
            monday_id: true,
            details: true,
          },
        },
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });
    
    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

// POST /api/notes - Create a new note
export async function POST(request: Request) {
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
    
    const { content, job_id } = await request.json();
    
    if (!content || !job_id) {
      return NextResponse.json({ error: 'Content and job_id are required' }, { status: 400 });
    }
    
    // Get the job to get the monday_id
    const job = await prisma.monday_jobs.findUnique({
      where: { id: job_id },
      select: { monday_id: true },
    });
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    // Use a transaction to create the note and update the job's notes_count
    const [newNote] = await prisma.$transaction([
      // Create the note
      prisma.job_notes.create({
        data: {
          content,
          user_id: user.id,
          job_id,
          monday_id: job.monday_id,
        },
        include: {
          job: {
            select: {
              id: true,
              name: true,
              monday_id: true,
              details: true,
            },
          },
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      }),
      
      // Increment the notes_count on the job
      prisma.monday_jobs.update({
        where: { id: job_id },
        data: {
          notes_count: {
            increment: 1
          }
        }
      })
    ]);
    
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
} 