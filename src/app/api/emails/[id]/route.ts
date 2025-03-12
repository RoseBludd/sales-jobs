import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getEmailById, deleteEmail } from '@/lib/ews';
import { getCachedEmail, cacheEmail, invalidateCache } from '@/lib/cache';
import { emailIdSchema, deleteEmailSchema } from '@/lib/validation';

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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const sync = searchParams.get('sync') === 'true';

    // Validate email ID
    const parsed = emailIdSchema.safeParse({ id: params.id });
    if (!parsed.success) {
      console.error('Invalid email ID:', params.id);
      return NextResponse.json({ error: 'Invalid email ID' }, { status: 400 });
    }

    const { id } = parsed.data;
    console.log('Fetching email with ID:', id);

    // Try to get email from cache first if not syncing
    if (!sync) {
      const cachedEmail = await getCachedEmail(id);
      if (cachedEmail) {
        console.log('Returning cached email for ID:', id);
        return NextResponse.json({
          email: cachedEmail,
          fromCache: true,
          lastSynced: Date.now(),
        });
      }
    }

    // If not in cache or syncing, fetch from EWS
    console.log('Fetching email from EWS for ID:', id);
    const email = await getEmailById(id);
    
    if (!email) {
      console.error('Email not found for ID:', id);
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }
    
    // Log the email body for debugging
    console.log('Email body length:', email.body ? email.body.length : 0);
    console.log('Email body preview:', email.body ? email.body.substring(0, 100) + '...' : 'No body');
    
    // Cache the result
    await cacheEmail(id, email);

    return NextResponse.json({
      email,
      fromCache: false,
      lastSynced: Date.now(),
    });
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