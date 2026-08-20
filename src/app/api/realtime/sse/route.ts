import { NextRequest } from 'next/server';
import { realtimeHub } from '@/lib/realtime';
import { RealtimeEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let intervalId: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection packet
      const initMsg = `event: connected\ndata: ${JSON.stringify({
        status: 'connected',
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(initMsg));

      // Subscribe to real-time events from our hub
      unsubscribe = realtimeHub.subscribe((event: RealtimeEvent) => {
        const payload = `event: message\ndata: ${JSON.stringify(event)}\n\n`;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream closed
        }
      });

      // Keep-alive heartbeat every 15s to prevent timeouts
      intervalId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          if (intervalId) clearInterval(intervalId);
        }
      }, 15000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
