import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { GET as authConfig } from '../auth/[...nextauth]/route';
import { Session } from 'next-auth';
import { CalendarService } from './service';

const calendarService = new CalendarService();

export async function GET() {
  try {
    const session = await getServerSession(authConfig) as Session;
    if (!session) {
      console.log('Calendar API: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user?.email) {
      console.log('Calendar API: User email not found in session');
      return NextResponse.json({ error: 'Email not found' }, { status: 400 });
    }

    console.log(`Calendar API: Fetching events for user ${session.user.email}`);
    
    try {
      // Try to get real calendar events
      console.time('Calendar API: Real events fetch');
      const events = await calendarService.getEvents();
      console.timeEnd('Calendar API: Real events fetch');
      
      console.log(`Calendar API: Successfully fetched ${events.length} real events`);
      return NextResponse.json(events);
    } catch (error) {
      console.warn('Calendar API: Failed to fetch real calendar events, using mock data:', error);
      
      // Fallback to mock events if real calendar access fails
      console.time('Calendar API: Mock events generation');
      const mockEvents = calendarService.getMockEvents();
      console.timeEnd('Calendar API: Mock events generation');
      
      console.log(`Calendar API: Generated ${mockEvents.length} mock events`);
      return NextResponse.json(mockEvents);
    }
  } catch (error) {
    console.error('Calendar API: Unhandled error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authConfig) as Session;
    if (!session) {
      console.log('Calendar API: Unauthorized create attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user?.email) {
      console.log('Calendar API: User email not found in session for create');
      return NextResponse.json({ error: 'Email not found' }, { status: 400 });
    }

    // Parse the request body
    const eventData = await request.json();
    
    console.log('Calendar API: Received event data:', eventData);
    
    // Validate required fields
    if (!eventData.Subject || !eventData.Start || !eventData.End) {
      return NextResponse.json(
        { error: 'Missing required fields: Subject, Start, and End are required' },
        { status: 400 }
      );
    }
    
    console.log(`Calendar API: Creating event for user ${session.user.email}`);
    
    try {
      // Create the event
      const newEvent = await calendarService.createEvent(eventData);
      console.log(`Calendar API: Successfully created event with ID ${newEvent.Id}`);
      
      return NextResponse.json(newEvent, { status: 201 });
    } catch (error) {
      console.error('Calendar API: Error creating event:', error);
      return NextResponse.json(
        { error: 'Failed to create calendar event' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Calendar API: Unhandled error in POST:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}