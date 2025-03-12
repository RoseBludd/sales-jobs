import { NextRequest, NextResponse } from 'next/server';
import { getCalendarEvents, createCalendarEvent } from '@/lib/ews';
import { calendarEventsQuerySchema, calendarEventSchema } from '@/lib/validation';
import { getCachedCalendarEvents, cacheCalendarEvents, invalidateCalendarCaches } from '@/lib/cache';

// GET /api/events - List calendar events
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate') || new Date().toISOString();
    const endDateParam = searchParams.get('endDate') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const pageSizeParam = searchParams.get('pageSize') || '50';
    const pageParam = searchParams.get('page') || '1';
    const bypassCache = searchParams.get('bypass_cache') === 'true';
    
    // Validate query parameters
    const validatedParams = calendarEventsQuerySchema.parse({
      startDate: startDateParam,
      endDate: endDateParam,
      pageSize: pageSizeParam,
      page: pageParam
    });
    
    const { startDate, endDate, pageSize, page } = validatedParams;
    
    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;
    
    // Get user ID from session (placeholder for now)
    const userId = 'current-user';
    
    // Try to get cached events if not bypassing cache
    if (!bypassCache) {
      const cachedEvents = await getCachedCalendarEvents(
        userId,
        startDate.toISOString(),
        endDate.toISOString()
      );
      
      if (cachedEvents) {
        console.log(`Returning ${cachedEvents.length} cached events`);
        // Apply pagination to cached events
        const paginatedEvents = cachedEvents.slice(offset, offset + pageSize);
        return NextResponse.json({ events: paginatedEvents });
      }
    } else {
      console.log('Bypassing cache as requested');
    }
    
    // Fetch events from EWS
    console.log(`Fetching events from EWS from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    const events = await getCalendarEvents(startDate, endDate, pageSize, offset);
    console.log(`Fetched ${events.length} events from EWS`);
    
    // Cache the events if not bypassing cache
    if (!bypassCache) {
      await cacheCalendarEvents(
        userId,
        startDate.toISOString(),
        endDate.toISOString(),
        events
      );
    }
    
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

// POST /api/events - Create a new calendar event
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request body
    const validatedData = calendarEventSchema.parse(body);
    
    // Create the event
    const eventId = await createCalendarEvent(
      validatedData.subject,
      validatedData.start,
      validatedData.end,
      validatedData.location,
      validatedData.body,
      validatedData.isAllDay,
      validatedData.attendees
    );
    
    // Invalidate cache
    const userId = 'current-user'; // Placeholder for now
    await invalidateCalendarCaches(userId);
    
    return NextResponse.json({ 
      success: true,
      eventId
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
} 