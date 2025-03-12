import { NextRequest, NextResponse } from 'next/server';
import { 
  getCalendarEventById, 
  updateCalendarEvent, 
  deleteCalendarEvent 
} from '@/lib/ews';
import { eventIdSchema, calendarEventSchema } from '@/lib/validation';
import { invalidateCalendarCaches } from '@/lib/cache';

// GET /api/events/:id - Get a specific calendar event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate event ID
    const resolvedParams = await Promise.resolve(params);
    const { id } = eventIdSchema.parse(resolvedParams);
    
    // Fetch event details
    const event = await getCalendarEventById(id);
    
    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error fetching calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar event' },
      { status: 500 }
    );
  }
}

// PUT /api/events/:id - Update a calendar event
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate event ID
    const resolvedParams = await Promise.resolve(params);
    const { id } = eventIdSchema.parse(resolvedParams);
    
    // Parse request body
    const body = await request.json();
    
    // Validate request body
    const validatedData = calendarEventSchema.parse(body);
    
    // Update the event
    const success = await updateCalendarEvent(id, {
      subject: validatedData.subject,
      start: validatedData.start,
      end: validatedData.end,
      location: validatedData.location,
      body: validatedData.body,
      isAllDay: validatedData.isAllDay
    });
    
    // Invalidate cache
    const userId = 'current-user'; // Placeholder for now
    await invalidateCalendarCaches(userId);
    
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar event' },
      { status: 500 }
    );
  }
}

// DELETE /api/events/:id - Delete a calendar event
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate event ID
    const resolvedParams = await Promise.resolve(params);
    const { id } = eventIdSchema.parse(resolvedParams);
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const cancelMeeting = searchParams.get('cancelMeeting') === 'true';
    
    // Delete the event
    const success = await deleteCalendarEvent(id, cancelMeeting);
    
    // Invalidate cache
    const userId = 'current-user'; // Placeholder for now
    await invalidateCalendarCaches(userId);
    
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar event' },
      { status: 500 }
    );
  }
} 