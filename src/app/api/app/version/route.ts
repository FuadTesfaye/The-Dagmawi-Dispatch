import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const versionData = {
    appName: 'The Lurkening',
    appId: 'com.lurkening.dispatch',
    version: '1.0.1',
    buildCode: 202689,
    buildName: '2026.89-ROYAL',
    releaseDate: '2026-08-21',
    title: 'The Lurkening Sovereign Broadsheet Update',
    notes: [
      'Super-responsive royal navbar with live teletype status & instant search launcher',
      'Pixel-perfect safe-area handling for Android notches, camera cutouts & gesture navigation',
      'Real-time update notification engine for downloaded APKs & Progressive Web Apps',
      'Enhanced offline broadsheet cache & high-performance 120Hz smooth scroll engine',
      'Ultra-crisp dark ink & authentic broadsheet light mode appearance modes'
    ],
    apkDownloadUrl: '/api/download/apk',
    apkSize: '5.7 MB',
    minSupportedVersion: '1.0.0',
    mandatoryUpdate: false,
  };

  return NextResponse.json(versionData, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
