import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Direct redirect to the statically-served APK binary in /public/downloads
  const downloadUrl = new URL('/downloads/the-lurkening.apk', req.nextUrl.origin);
  return NextResponse.redirect(downloadUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
