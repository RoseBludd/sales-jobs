import { NextRequest, NextResponse } from 'next/server';
import { simpleParser } from 'mailparser';
import { rateLimit } from '../utils';

/**
 * API route for parsing email content
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

    // Return the parsed content
    return NextResponse.json({
      html: parsed.html || null,
      text: parsed.text || null,
      textAsHtml: parsed.textAsHtml || null,
      subject: parsed.subject || null,
    });
  } catch (error) {
    console.error('Error parsing email:', error);
    return NextResponse.json(
      { error: 'Failed to parse email' },
      { status: 500 }
    );
  }
} 