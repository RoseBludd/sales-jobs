import { NextRequest, NextResponse } from 'next/server';
import { getContacts, createContact } from '@/lib/ews';
import { contactsQuerySchema, contactSchema } from '@/lib/validation';
import { getCachedContacts, cacheContacts, invalidateCache } from '@/lib/cache';

// GET /api/contacts - List contacts
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const pageSizeParam = searchParams.get('pageSize') || '50';
    const pageParam = searchParams.get('page') || '1';
    
    // Validate query parameters
    const validatedParams = contactsQuerySchema.parse({
      pageSize: pageSizeParam,
      page: pageParam
    });
    
    const { pageSize, page } = validatedParams;
    
    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;
    
    // Get user ID from session (placeholder for now)
    const userId = 'current-user';
    
    // Try to get cached contacts
    const cachedContacts = await getCachedContacts(userId);
    
    if (cachedContacts) {
      // Apply pagination to cached contacts
      const paginatedContacts = cachedContacts.slice(offset, offset + pageSize);
      return NextResponse.json({ contacts: paginatedContacts });
    }
    
    // Fetch contacts from EWS
    const contacts = await getContacts(pageSize, offset);
    
    // Cache the contacts
    await cacheContacts(userId, contacts);
    
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

// POST /api/contacts - Create a new contact
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request body
    const validatedData = contactSchema.parse(body);
    
    // Create the contact
    const contactId = await createContact(
      validatedData.displayName,
      validatedData.emailAddress,
      validatedData.businessPhone,
      validatedData.mobilePhone,
      validatedData.jobTitle,
      validatedData.company,
      validatedData.department,
      validatedData.notes
    );
    
    // Invalidate cache
    const userId = 'current-user'; // Placeholder for now
    await invalidateCache(`contacts:${userId}`);
    
    return NextResponse.json({ 
      success: true,
      contactId
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
} 