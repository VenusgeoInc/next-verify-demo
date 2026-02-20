import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/session/store';

/**
 * Get session status by ID
 * Used by redirect flow for polling session updates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    console.log('[API /sessions/:id] Fetching session:', sessionId);

    // Retrieve session from store
    const session = sessionStore.get(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found', sessionId },
        { status: 404 }
      );
    }

    // Return session data (sanitized)
    return NextResponse.json({
      sessionId: session.sessionId,
      sessionType: session.sessionType,
      status: session.status,
      flowType: session.flowType,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      webhookData: session.webhookData,
    });
  } catch (error) {
    console.error('[API /sessions/:id] Error fetching session:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch session',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Delete a session by ID (optional cleanup)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    console.log('[API /sessions/:id] Deleting session:', sessionId);

    const deleted = sessionStore.delete(sessionId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Session not found', sessionId },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('[API /sessions/:id] Error deleting session:', error);

    return NextResponse.json(
      {
        error: 'Failed to delete session',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
