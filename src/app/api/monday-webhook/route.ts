import { NextRequest, NextResponse } from 'next/server';
import handleWebhook from '../../../lib/monday-pg-sync/scripts/webhook-handler';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Convert NextRequest to a format compatible with our webhook handler
    const adaptedReq = {
      method: 'POST',
      headers: Object.fromEntries(req.headers.entries()),
      body
    };
    
    // Create a mock response object
    const adaptedRes = {
      status: (code: number) => ({
        json: (data: any) => data
      })
    };
    
    // Call the webhook handler
    const result = await handleWebhook(
      adaptedReq as any,
      adaptedRes as any
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error handling Monday.com webhook:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Disable body size limit for webhook payloads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    }
  }
};
