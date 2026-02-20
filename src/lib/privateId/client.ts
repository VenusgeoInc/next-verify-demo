import { PRIVATEID_CONFIG } from './config';
import type { CreateSessionRequest, CreateSessionResponse, SessionType } from './types';

/**
 * PrivateID API Client
 * Handles communication with PrivateID verification API
 */
export class PrivateIdClient {
  private apiKey: string;
  private apiBase: string;

  constructor() {
    this.apiKey = PRIVATEID_CONFIG.apiKey;
    this.apiBase = PRIVATEID_CONFIG.apiBase;

    if (!this.apiKey) {
      throw new Error('PrivateID API key is not configured');
    }
  }

  /**
   * Create a verification session
   */
  async createSession(
    sessionType: SessionType,
    webhookUrl: string,
    redirectUrl?: string,
    customerId?: string,
    requirements?: string[]
  ): Promise<CreateSessionResponse> {
    const payload: CreateSessionRequest = {
      type: sessionType,
      callback: {
        url: webhookUrl,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      redirectURL: redirectUrl || '', // PrivateID requires this field
      locale: 'en-US',
      enableDesktop: true,
      sendImages: false,
      sendEventWebhooks: true,
      // Use provided requirements, or default: ENROLL = face + document, VERIFY = face only
      requirements: requirements || (sessionType === 'ENROLL' ? ['face', 'identity_document'] : ['face']),
    };

    // Add optional customer ID
    if (customerId) {
      payload.customerId = customerId;
    }

    try {
      console.log('[PrivateIdClient] Sending payload to PrivateID:', JSON.stringify(payload, null, 2));

      const response = await fetch(`${this.apiBase}/verification-session`, {
        method: 'POST',
        headers: {
          'x_api_key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PrivateIdClient] API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });

        throw new Error(
          `PrivateID API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();

      console.log('[PrivateIdClient] Session created successfully:', {
        sessionId: data.sessionId,
        launchUrl: data.launchUrl,
        type: sessionType,
      });

      // Map launchUrl to verificationUrl (PrivateID uses 'launchUrl' in their response)
      return {
        sessionId: data.sessionId,
        verificationUrl: data.launchUrl || data.verificationUrl || data.url,
        expiresAt: data.expiresAt,
      };
    } catch (error) {
      console.error('[PrivateIdClient] Error creating session:', error);
      throw error;
    }
  }

  /**
   * Fetch webhook data directly from PrivateID
   * Useful as a fallback if webhook POST is delayed or fails
   */
  async fetchWebhookData(privateIdSessionId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.apiBase}/verification-session/${privateIdSessionId}/webhook`,
        {
          method: 'GET',
          headers: {
            'x_api_key': this.apiKey,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PrivateIdClient] Webhook fetch error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });

        throw new Error(
          `PrivateID webhook fetch error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      console.log('[PrivateIdClient] Fetched webhook data:', {
        sessionId: data.sessionId,
        status: data.status,
      });

      return data;
    } catch (error) {
      console.error('[PrivateIdClient] Error fetching webhook data:', error);
      throw error;
    }
  }

  /**
   * Health check method (optional - for testing API connectivity)
   */
  async healthCheck(): Promise<boolean> {
    try {
      // This is a simple check - adjust based on PrivateID's actual health endpoint
      const response = await fetch(`${this.apiBase}/health`, {
        method: 'GET',
        headers: {
          'x_api_key': this.apiKey,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('[PrivateIdClient] Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const privateIdClient = new PrivateIdClient();
