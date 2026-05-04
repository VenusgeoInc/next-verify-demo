import { useEffect, useRef } from 'react';
import { sendToMaui } from '../mauiBridge';
import type { SessionType } from '../privateId/types';

interface NativeMessage {
  type: 'uuid';
  message: string; // The PUID/UUID value
  sentAt: string;
}

/**
 * Hook to communicate with native MAUI webview
 * Automatically sends verification results to native code
 */
export function useNativeBridge() {
  const hasSentResult = useRef(false);

  /**
   * Send UUID/PUID to native code in the client's expected format
   * Only sends once per result to avoid duplicates
   */
  const sendUuidToNative = (uuid: string) => {
    // Prevent duplicate sends
    if (hasSentResult.current) {
      console.log('[NativeBridge] Already sent result, skipping duplicate');
      return;
    }

    const message: NativeMessage = {
      type: 'uuid',
      message: uuid,
      sentAt: new Date().toISOString(),
    };

    console.log('[NativeBridge] Sending UUID to native:', message);

    const response = sendToMaui(message);

    if (response.ok) {
      console.log(`[NativeBridge] Successfully sent UUID via ${response.channel}`);
      hasSentResult.current = true;
    } else if (response.channel === 'none') {
      console.log('[NativeBridge] No native bridge detected - running in browser');
    } else {
      console.error(`[NativeBridge] Failed to send via ${response.channel}:`, response.error);
    }

    return response;
  };

  /**
   * Reset the sent flag when component unmounts or when starting a new verification
   */
  const reset = () => {
    hasSentResult.current = false;
    console.log('[NativeBridge] Reset sent flag');
  };

  /**
   * Send a close command to native to dismiss the webview
   */
  const sendCloseCommand = (reason?: 'success' | 'failure', errorMessage?: string) => {
    const message = {
      type: 'close',
      reason: reason || 'unknown',
      message: errorMessage,
      timestamp: new Date().toISOString(),
    };

    console.log('[NativeBridge] Sending close command to native:', message);
    return sendToMaui(message);
  };

  return {
    sendUuidToNative,
    sendCloseCommand,
    reset,
  };
}

/**
 * Hook that automatically sends verification result to native when verification completes
 *
 * SUCCESS case: Sends UUID message with PUID
 * FAILURE case: Sends verification_complete message with error
 *
 * This ensures native always receives a message indicating verification is done.
 */
export function useAutoSendPuid(
  sessionType: SessionType | undefined,
  status: string | undefined,
  puid: string | undefined,
  guid: string | undefined,
  errorMessage?: string
) {
  const { sendUuidToNative } = useNativeBridge();
  const hasSent = useRef(false);

  useEffect(() => {
    console.log('[NativeBridge] useAutoSendPuid triggered with:', {
      sessionType,
      status,
      hasPuid: !!puid,
      hasGuid: !!guid,
      puidValue: puid,
      errorMessage,
    });

    // Reset sent flag when status changes
    if (status === 'PENDING' || status === 'IN_PROGRESS') {
      hasSent.current = false;
    }

    if (!sessionType) {
      console.log('[NativeBridge] ❌ Not sending: sessionType is missing');
      return;
    }

    if (status !== 'SUCCESS' && status !== 'FAILED') {
      console.log(`[NativeBridge] ⏳ Not sending: Status is ${status}, waiting for final status`);
      return;
    }

    // Prevent duplicate sends
    if (hasSent.current) {
      console.log('[NativeBridge] Already sent result, skipping');
      return;
    }

    // SUCCESS case - send PUID
    if (status === 'SUCCESS' && puid) {
      console.log(`[NativeBridge] ✅ SUCCESS - sending PUID for ${sessionType}`);
      console.log(`[NativeBridge] 📤 PUID:`, puid);
      sendUuidToNative(puid);
      hasSent.current = true;
    }
    // FAILURE case - send completion message (different format)
    else if (status === 'FAILED') {
      console.log(`[NativeBridge] ❌ FAILED - sending failure notification`);
      const failureMessage = {
        type: 'verification_complete',
        status: 'failed',
        sessionType: sessionType.toLowerCase(),
        message: errorMessage || 'Verification failed',
        sentAt: new Date().toISOString(),
      };
      console.log('[NativeBridge] 📤 Failure message:', failureMessage);
      sendToMaui(failureMessage);
      hasSent.current = true;
    }
  }, [sessionType, status, puid, guid, errorMessage, sendUuidToNative]);
}
