import { NextRequest, NextResponse } from 'next/server';
import { WellKnownFolderName } from 'ews-javascript-api';
import { getEmails, sendEmail } from '@/lib/ews';

// GET /api/test-ews - Test EWS integration
export async function GET(request: NextRequest) {
  try {
    // Get emails
    const emails = await getEmails(WellKnownFolderName.Inbox, 10, 0);
    
    return NextResponse.json({
      success: true,
      emails,
      message: 'EWS integration test successful',
    });
  } catch (error) {
    console.error('Error testing EWS integration:', error);
    return NextResponse.json({ 
      error: 'Failed to test EWS integration',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST /api/test-ews - Test sending email
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { to, subject, body: emailBody } = body;
    
    if (!to || !subject || !emailBody) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        details: 'to, subject, and body are required' 
      }, { status: 400 });
    }
    
    // Send email
    const emailId = await sendEmail(
      Array.isArray(to) ? to : [to], 
      subject, 
      emailBody
    );
    
    return NextResponse.json({
      success: true,
      emailId,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ 
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 