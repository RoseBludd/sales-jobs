import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { moveEmail } from '@/lib/ews';
import { moveEmailSchema } from '@/lib/validation';
import { invalidateCache, invalidateEmailCaches } from '@/lib/cache';

// PUT /api/emails/move - Move email between folders
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const parsed = moveEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.format() }, { status: 400 });
    }

    const { emailId, destinationFolderId } = parsed.data;

    // Move email using EWS
    await moveEmail(emailId, destinationFolderId);
    
    // Invalidate caches
    await invalidateCache(`email:${emailId}`);
    
    // Also invalidate email list caches for the user
    if (session.user.email) {
      await invalidateEmailCaches(session.user.email);
    }

    return NextResponse.json({
      success: true,
      message: 'Email moved successfully',
    });
  } catch (error) {
    console.error('Error moving email:', error);
    return NextResponse.json({ error: 'Failed to move email' }, { status: 500 });
  }
} 