import { NextRequest, NextResponse } from 'next/server';
import { 
  getContactById, 
  updateContact, 
  deleteContact 
} from '@/lib/ews';
import { contactIdSchema, contactSchema } from '@/lib/validation';
import { invalidateCache } from '@/lib/cache';

// GET /api/contacts/:id - Get a specific contact
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate contact ID
    const { id } = contactIdSchema.parse(params);
    
    // Fetch contact details
    const contact = await getContactById(id);
    
    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

// PUT /api/contacts/:id - Update a contact
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate contact ID
    const { id } = contactIdSchema.parse(params);
    
    // Parse request body
    const body = await request.json();
    
    // Validate request body
    const validatedData = contactSchema.parse(body);
    
    // Update the contact
    const success = await updateContact(id, {
      displayName: validatedData.displayName,
      emailAddress: validatedData.emailAddress,
      businessPhone: validatedData.businessPhone,
      mobilePhone: validatedData.mobilePhone,
      jobTitle: validatedData.jobTitle,
      company: validatedData.company,
      department: validatedData.department,
      notes: validatedData.notes
    });
    
    // Invalidate cache
    const userId = 'current-user'; // Placeholder for now
    await invalidateCache(`contacts:${userId}`);
    
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

// DELETE /api/contacts/:id - Delete a contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate contact ID
    const { id } = contactIdSchema.parse(params);
    
    // Delete the contact
    const success = await deleteContact(id);
    
    // Invalidate cache
    const userId = 'current-user'; // Placeholder for now
    await invalidateCache(`contacts:${userId}`);
    
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
} 