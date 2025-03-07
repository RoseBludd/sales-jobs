import { NextRequest, NextResponse } from 'next/server';
import { getEmailUser } from '../config';

/**
 * GET handler for retrieving the current user's email
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user's email
    const email = await getEmailUser();
    
    return NextResponse.json({ email });
  } catch (error) {
    console.error('Error getting user email:', error);
    return NextResponse.json({ error: 'Failed to get user email' }, { status: 500 });
  }
} 