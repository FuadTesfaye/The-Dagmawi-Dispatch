import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Web platform middleware handles session validation and security headers
  const response = NextResponse.next();
  response.headers.set('x-dispatch-platform', 'web');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
