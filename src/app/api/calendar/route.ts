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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user?.email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 400 });
    }

    const events = await calendarService.getEvents();
    return NextResponse.json(events);
  } catch (error) {
    console.error('Calendar error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}