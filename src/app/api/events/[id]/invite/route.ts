import { NextRequest, NextResponse } from 'next/server';
import { manageEventAttendees } from '@/lib/ews';
import { eventIdSchema } from '@/lib/validation';
import { z } from 'zod';
import { invalidateCalendarCaches } from '@/lib/cache';

// Validation schema for attendee management
const attendeeManagementSchema = z.object({
  add: z.array(
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
      required: z.boolean().default(true),
    })
  ).optional(),
  remove: z.array(z.string().email()).optional(),
});

// POST /api/events/:id/invite - Manage attendees for an event
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate event ID
    const { id } = eventIdSchema.parse(params);
    
    // Parse request body
    const body = await request.json();
    
    // Validate request body
    const validatedData = attendeeManagementSchema.parse(body);
    
    // Manage attendees
    const success = await manageEventAttendees(
      id,
      validatedData.add,
      validatedData.remove
    );
    
    // Invalidate cache
    const userId = 'current-user'; // Placeholder for now
    await invalidateCalendarCaches(userId);
    
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error managing event attendees:', error);
    return NextResponse.json(
      { error: 'Failed to manage event attendees' },
      { status: 500 }
    );
  }
} 