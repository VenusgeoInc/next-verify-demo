import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { privateIdClient } from '@/lib/privateId/client';
import { sessionStore } from '@/lib/session/store';
import { PRIVATEID_CONFIG } from '@/lib/privateId/config';
import type { SessionType, FlowType, SessionData } from '@/lib/privateId/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionType, flowType, baseUrl, requirements } = body as {
      sessionType: SessionType;
      flowType: FlowType;
      baseUrl?: string;
      requirements?: string[];
    };

    // Validate input
    if (!sessionType || !['ENROLL', 'VERIFY'].includes(sessionType)) {
      return NextResponse.json(
        { error: 'Invalid session type. Must be ENROLL or VERIFY' },
        { status: 400 }
      );
    }

    if (!flowType || !['redirect', 'iframe'].includes(flowType)) {
      return NextResponse.json(
        { error: 'Invalid flow type. Must be redirect or iframe' },
        { status: 400 }
      );
    }

    // Use baseUrl from request body, fallback to env, or use default
    const effectiveBaseUrl = baseUrl || PRIVATEID_CONFIG.baseUrl || 'http://localhost:3000';

    // Validate baseUrl format
    if (!effectiveBaseUrl.startsWith('http://') && !effectiveBaseUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Invalid baseUrl format. Must start with http:// or https://' },
        { status: 400 }
      );
    }

    // Generate internal session ID first (so we can include it in redirectURL)
    const internalSessionId = randomUUID();

    // Generate webhook URL
    const webhookUrl = `${effectiveBaseUrl}/api/webhook`;

    // Generate redirect URL with sessionId
    // PrivateID requires this even for iframe flows (as a fallback)
    // For iframe flow, user won't see this redirect, but API requires it
    const redirectUrl =
      flowType === 'redirect'
        ? `${effectiveBaseUrl}/redirect-flow/result?sessionId=${internalSessionId}`
        : `${effectiveBaseUrl}/iframe-flow?sessionId=${internalSessionId}`;

    // Generate customer ID (optional - using UUID for demo)
    const customerId = `customer-${randomUUID()}`;

    console.log('[API /sessions] Creating session:', {
      sessionType,
      flowType,
      webhookUrl,
      redirectUrl,
      internalSessionId,
    });

    // Call PrivateID API to create verification session
    const response = await privateIdClient.createSession(
      sessionType,
      webhookUrl,
      redirectUrl,
      customerId,
      requirements // Pass user-selected requirements
    );

    // Use our internal session ID (which is in the redirectURL)
    // Store PrivateID's sessionId separately for webhook correlation
    const sessionId = internalSessionId;
    const privateIdSessionId = response.sessionId;

    // Store session data
    const sessionData: SessionData = {
      sessionId,
      privateIdSessionId, // Store PrivateID's session ID for webhook correlation
      sessionType,
      status: 'PENDING',
      verificationUrl: response.verificationUrl,
      flowType,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    sessionStore.create(sessionData);

    console.log('[API /sessions] Session created successfully:', {
      sessionId,
      privateIdSessionId,
      verificationUrl: response.verificationUrl,
    });

    // Return session data to client
    return NextResponse.json(
      {
        sessionId,
        verificationUrl: response.verificationUrl,
        expiresAt: response.expiresAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API /sessions] Error creating session:', error);

    return NextResponse.json(
      {
        error: 'Failed to create verification session',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to list all sessions (for debugging)
export async function GET() {
  const sessions = sessionStore.getAll();

  return NextResponse.json({
    sessions,
    count: sessions.length,
  });
}
