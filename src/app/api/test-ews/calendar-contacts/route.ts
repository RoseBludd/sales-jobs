import { NextRequest, NextResponse } from 'next/server';
import { 
  getCalendarEvents, 
  getCalendarEventById, 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent,
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  searchContacts
} from '@/lib/ews';

// Test route for calendar and contacts functionality
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'test';
    
    // Calendar tests
    if (action === 'calendar-list') {
      // Get calendar events for the next 30 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      
      const events = await getCalendarEvents(startDate, endDate);
      return NextResponse.json({ events });
    }
    
    if (action === 'calendar-create') {
      // Create a test calendar event
      const subject = 'Test Event ' + new Date().toISOString();
      const start = new Date();
      start.setHours(start.getHours() + 1);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      
      const eventId = await createCalendarEvent(
        subject,
        start,
        end,
        'Test Location',
        'This is a test event created via API'
      );
      
      return NextResponse.json({ 
        success: true, 
        message: 'Calendar event created',
        eventId
      });
    }
    
    if (action === 'calendar-get' && searchParams.get('id')) {
      // Get a specific calendar event
      const eventId = searchParams.get('id') as string;
      const event = await getCalendarEventById(eventId);
      
      return NextResponse.json({ event });
    }
    
    if (action === 'calendar-update' && searchParams.get('id')) {
      // Update a calendar event
      const eventId = searchParams.get('id') as string;
      const success = await updateCalendarEvent(eventId, {
        subject: 'Updated Test Event ' + new Date().toISOString(),
        body: 'This event was updated via API'
      });
      
      return NextResponse.json({ 
        success, 
        message: 'Calendar event updated'
      });
    }
    
    if (action === 'calendar-delete' && searchParams.get('id')) {
      // Delete a calendar event
      const eventId = searchParams.get('id') as string;
      const success = await deleteCalendarEvent(eventId);
      
      return NextResponse.json({ 
        success, 
        message: 'Calendar event deleted'
      });
    }
    
    // Contacts tests
    if (action === 'contacts-list') {
      // Get contacts
      const contacts = await getContacts();
      return NextResponse.json({ contacts });
    }
    
    if (action === 'contacts-create') {
      // Create a test contact
      const displayName = 'Test Contact ' + new Date().toISOString();
      const emailAddress = `test-${Date.now()}@example.com`;
      
      const contactId = await createContact(
        displayName,
        emailAddress,
        '555-123-4567',
        '555-987-6543',
        'Test Job Title',
        'Test Company',
        'Test Department',
        'This is a test contact created via API'
      );
      
      return NextResponse.json({ 
        success: true, 
        message: 'Contact created',
        contactId
      });
    }
    
    if (action === 'contacts-get' && searchParams.get('id')) {
      // Get a specific contact
      const contactId = searchParams.get('id') as string;
      const contact = await getContactById(contactId);
      
      return NextResponse.json({ contact });
    }
    
    if (action === 'contacts-update' && searchParams.get('id')) {
      // Update a contact
      const contactId = searchParams.get('id') as string;
      const success = await updateContact(contactId, {
        displayName: 'Updated Test Contact ' + new Date().toISOString(),
        notes: 'This contact was updated via API'
      });
      
      return NextResponse.json({ 
        success, 
        message: 'Contact updated'
      });
    }
    
    if (action === 'contacts-delete' && searchParams.get('id')) {
      // Delete a contact
      const contactId = searchParams.get('id') as string;
      const success = await deleteContact(contactId);
      
      return NextResponse.json({ 
        success, 
        message: 'Contact deleted'
      });
    }
    
    if (action === 'contacts-search' && searchParams.get('query')) {
      // Search contacts
      const query = searchParams.get('query') as string;
      const contacts = await searchContacts(query);
      
      return NextResponse.json({ contacts });
    }
    
    // Default test response
    return NextResponse.json({
      message: 'Calendar and Contacts Test API',
      availableActions: [
        'calendar-list',
        'calendar-create',
        'calendar-get?id=...',
        'calendar-update?id=...',
        'calendar-delete?id=...',
        'contacts-list',
        'contacts-create',
        'contacts-get?id=...',
        'contacts-update?id=...',
        'contacts-delete?id=...',
        'contacts-search?query=...'
      ]
    });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { error: 'Test API error', message: (error as Error).message },
      { status: 500 }
    );
  }
} 