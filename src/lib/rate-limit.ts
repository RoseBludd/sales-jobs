import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = process.env.REDIS_URL && process.env.REDIS_TOKEN
  ? new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN,
    })
  : null;

// Default rate limit settings
const DEFAULT_RATE_LIMIT = {
  MAX_REQUESTS: 100, // Maximum number of requests
  WINDOW_SIZE: 60, // Window size in seconds
};

// Rate limiter function
export async function rateLimit(
  req: NextRequest,
  options: {
    maxRequests?: number;
    windowSize?: number; // in seconds
  } = {}
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  // If Redis is not available, allow all requests
  if (!redis) {
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
    };
  }

  // Get client IP from headers or use a default value
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'anonymous';
  
  // Get the path for more granular rate limiting
  const path = req.nextUrl.pathname;
  
  // Create a key that combines IP and path
  const key = `rate-limit:${ip}:${path}`;
  
  // Set rate limit options
  const maxRequests = options.maxRequests || DEFAULT_RATE_LIMIT.MAX_REQUESTS;
  const windowSize = options.windowSize || DEFAULT_RATE_LIMIT.WINDOW_SIZE;
  
  // Get current count and timestamp
  const now = Math.floor(Date.now() / 1000);
  const requestData = await redis.get(key);
  
  if (!requestData) {
    // First request, set initial count and expiration
    await redis.set(key, JSON.stringify({ count: 1, timestamp: now }), { ex: windowSize });
    
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: now + windowSize,
    };
  }
  
  // Parse existing data
  const { count, timestamp } = JSON.parse(requestData as string);
  
  // Check if window has expired
  if (now - timestamp >= windowSize) {
    // Reset counter
    await redis.set(key, JSON.stringify({ count: 1, timestamp: now }), { ex: windowSize });
    
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: now + windowSize,
    };
  }
  
  // Check if rate limit exceeded
  if (count >= maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: timestamp + windowSize,
    };
  }
  
  // Increment counter
  await redis.set(key, JSON.stringify({ count: count + 1, timestamp }), { ex: windowSize - (now - timestamp) });
  
  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - (count + 1),
    reset: timestamp + windowSize,
  };
}

// Middleware to apply rate limiting
export async function withRateLimit(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    maxRequests?: number;
    windowSize?: number;
  } = {}
): Promise<NextResponse> {
  const result = await rateLimit(req, options);
  
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
          'Retry-After': (result.reset - Math.floor(Date.now() / 1000)).toString(),
        },
      }
    );
  }
  
  const response = await handler(req);
  
  // Add rate limit headers to response
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.reset.toString());
  
  return response;
} 