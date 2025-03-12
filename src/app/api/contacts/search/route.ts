import { NextRequest, NextResponse } from 'next/server';
import { searchContacts } from '@/lib/ews';
import { searchContactsSchema } from '@/lib/validation';

// GET /api/contacts/search - Search contacts
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const pageSizeParam = searchParams.get('pageSize') || '50';
    const pageParam = searchParams.get('page') || '1';
    
    // Validate query parameters
    const validatedParams = searchContactsSchema.parse({
      query,
      pageSize: pageSizeParam,
      page: pageParam
    });
    
    const { pageSize, page } = validatedParams;
    
    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;
    
    // Search contacts
    const contacts = await searchContacts(query, pageSize, offset);
    
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Error searching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to search contacts' },
      { status: 500 }
    );
  }
} 