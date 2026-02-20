import { NextRequest } from 'next/server';
import { sessionStore } from '@/lib/session/store';

/**
 * Server-Sent Events (SSE) endpoint for real-time session updates
 * Used by iframe flow to receive live updates when webhook arrives
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  console.log('[API /sessions/:id/stream] SSE connection requested for session:', sessionId);

  // Check if session exists
  const session = sessionStore.get(sessionId);
  if (!session) {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Create a readable stream for SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      console.log('[API /sessions/:id/stream] SSE stream started for session:', sessionId);

      let isClosed = false;
      let heartbeatInterval: NodeJS.Timeout | null = null;
      let unsubscribe: (() => void) | null = null;

      // Helper to safely close the stream
      const closeStream = () => {
        if (isClosed) return;
        isClosed = true;

        console.log('[API /sessions/:id/stream] Closing stream:', sessionId);

        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }

        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }

        try {
          controller.close();
        } catch (error) {
          // Controller already closed, ignore
        }
      };

      // Send initial session state
      const initialData = `data: ${JSON.stringify(session)}\n\n`;
      controller.enqueue(encoder.encode(initialData));

      // Subscribe to session updates
      unsubscribe = sessionStore.subscribe(sessionId, (updatedSession) => {
        if (isClosed) return;

        console.log('[API /sessions/:id/stream] Sending update via SSE:', sessionId);

        try {
          const eventData = `data: ${JSON.stringify(updatedSession)}\n\n`;
          controller.enqueue(encoder.encode(eventData));

          // If session is complete, close the stream
          if (updatedSession.status === 'SUCCESS' || updatedSession.status === 'FAILED') {
            console.log('[API /sessions/:id/stream] Session complete, scheduling close:', sessionId);
            setTimeout(() => {
              closeStream();
            }, 1000); // Small delay to ensure message is sent
          }
        } catch (error) {
          console.error('[API /sessions/:id/stream] Error sending SSE update:', error);
          closeStream();
        }
      });

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log('[API /sessions/:id/stream] Client disconnected:', sessionId);
        closeStream();
      });

      // Send heartbeat every 30 seconds to keep connection alive
      heartbeatInterval = setInterval(() => {
        if (isClosed) {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          return;
        }

        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (error) {
          // Stream closed, clean up
          closeStream();
        }
      }, 30000);
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
}
