import { NextRequest, NextResponse } from 'next/server';
import { simpleParser } from 'mailparser';
import { rateLimit } from '../utils';

/**
 * API route for extracting email attachments
 * This keeps the mailparser dependency on the server side only
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!rateLimit.checkLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { rawEmail } = body;

    if (!rawEmail) {
      return NextResponse.json(
        { error: 'Raw email content is required' },
        { status: 400 }
      );
    }

    // Parse the email using simpleParser
    const parsed = await simpleParser(rawEmail);

    // Extract and format attachments
    const attachments = parsed.attachments?.map(att => ({
      id: att.contentId || Math.random().toString(36).substring(2, 9),
      name: att.filename || 'unnamed',
      size: att.size || 0,
      type: att.contentType || 'application/octet-stream',
    })) || [];

    // Return the attachments
    return NextResponse.json(attachments);
  } catch (error) {
    console.error('Error extracting attachments:', error);
    return NextResponse.json(
      { error: 'Failed to extract attachments' },
      { status: 500 }
    );
  }
} 