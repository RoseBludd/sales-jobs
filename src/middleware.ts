import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Allow access to static files
    if (req.nextUrl.pathname.startsWith('/_next')) {
      return NextResponse.next();
    }
    
    // Allow access to public API routes (login, etc.)
    if (req.nextUrl.pathname.startsWith('/api/auth')) {
      return NextResponse.next();
    }
    
    // Allow access to test routes for testing purposes
    if (req.nextUrl.pathname.startsWith('/api/test-ews')) {
      return NextResponse.next();
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

// Protect all routes except login, auth API, test routes, and static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (public API routes like login)
     * - api/test-ews (test routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - public assets (images, etc.)
     */
    '/((?!api/auth|api/test-ews|_next/static|_next/image|favicon.ico|login|restoremasters_logo.png|restoremasters_logo_big.png|rm-icon.png|vercel.svg|next.svg|globe.svg|file.svg|window.svg).*)',
    '/api/((?!auth|test-ews).*)',  // Protect all API routes except /api/auth/* and /api/test-ews/*
  ],
};