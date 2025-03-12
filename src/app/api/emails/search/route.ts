import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { searchEmails } from '@/lib/ews';
import { searchEmailSchema } from '@/lib/validation';

// POST /api/emails/search - Search emails
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const parsed = searchEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.format() }, { status: 400 });
    }

    const { query, folderIds, pageSize, page } = parsed.data;
    const offset = (page - 1) * pageSize;

    // Search emails using EWS
    const emails = await searchEmails(query, folderIds, pageSize, offset);

    return NextResponse.json({
      emails,
      total: emails.length,
      page,
      pageSize,
      query,
      lastSynced: Date.now(),
    });
  } catch (error) {
    console.error('Error searching emails:', error);
    return NextResponse.json({ error: 'Failed to search emails' }, { status: 500 });
  }
} 