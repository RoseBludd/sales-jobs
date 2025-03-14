import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getEmailById, deleteEmail, WorkMailFolderName } from '@/lib/ews';
import { getCachedEmail, cacheEmail, invalidateCache } from '@/lib/cache';
import { emailIdSchema, deleteEmailSchema } from '@/lib/validation';
import * as emailDbService from '@/lib/email-db-service';

// GET /api/emails/[id] - Get email details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate email ID
    const parsed = emailIdSchema.safeParse({ id: params.id });
    if (!parsed.success) {
      console.error('Invalid email ID:', params.id);
      return NextResponse.json({ error: 'Invalid email ID' }, { status: 400 });
    }

    const { id } = parsed.data;
    console.log('Fetching email with ID:', id);

    // Get the user ID from the session
    const userId = await emailDbService.getCurrentUserId();

    // Try to get email from database
    try {
      const email = await emailDbService.getEmailByIdFromDb(id, userId);
      
      if (!email) {
        console.error('Email not found for ID:', id);
        return NextResponse.json({ error: 'Email not found' }, { status: 404 });
      }
      
      // Mark email as read if it's not already
      if (!email.isRead) {
        await emailDbService.markEmailAsRead(id, userId);
        email.isRead = true;
      }
      
      return NextResponse.json({ email, fromDb: true });
    } catch (dbError) {
      console.error('Error fetching email from database:', dbError);
      
      // If not in database, try fetching from EWS directly as fallback
      console.log('Attempting to fetch from EWS as fallback for ID:', id);
      const ewsEmail = await getEmailById(id);
      
      if (!ewsEmail) {
        return NextResponse.json({ error: 'Email not found' }, { status: 404 });
      }
      
      // Add to database for future queries
      try {
        const folderId = await emailDbService.getFolderByWorkMailName(
          WorkMailFolderName.Inbox, 
          userId
        );
        await emailDbService.saveEmail(ewsEmail, userId, folderId);
      } catch (saveError) {
        console.error('Error saving email to database:', saveError);
        // Continue even if saving fails
      }
      
      return NextResponse.json({ email: ewsEmail, fromDb: false });
    }
  } catch (error) {
    console.error('Error fetching email details:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch email details',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/emails/[id] - Delete email
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const hardDelete = searchParams.get('hardDelete') === 'true';

    // Validate email ID
    const parsed = deleteEmailSchema.safeParse({
      emailId: params.id,
      hardDelete,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const { emailId, hardDelete: shouldHardDelete } = parsed.data;

    // Delete email using EWS
    await deleteEmail(emailId, shouldHardDelete);
    
    // Invalidate cache
    await invalidateCache(`email:${emailId}`);
    
    // Also invalidate email list caches for the user
    if (session.user.email) {
      await invalidateCache(`emails:${session.user.email}:*`);
    }

    return NextResponse.json({
      success: true,
      message: 'Email deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting email:', error);
    return NextResponse.json({ error: 'Failed to delete email' }, { status: 500 });
  }
} 