import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Allow access to static files and api routes
    if (req.nextUrl.pathname.startsWith('/_next') || 
        req.nextUrl.pathname.startsWith('/api')) {
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

// Protect all routes except login and api
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - public assets (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|restoremasters_logo.png|restoremasters_logo_big.png|rm-icon.png|vercel.svg|next.svg|globe.svg|file.svg|window.svg).*)',
  ],
};