'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PrivateIdIframe from '@/components/PrivateIdIframe';
import ResultDisplay from '@/components/ResultDisplay';
import type { SessionType, SessionData } from '@/lib/privateId/types';

export default function IframeFlow() {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [requireFace, setRequireFace] = useState(true);
  const [requireDocument, setRequireDocument] = useState(false);

  const startVerification = async (sessionType: SessionType) => {
    setLoading(true);
    setError(null);
    setShowResults(false);
    setSessionData(null);

    try {
      // Build requirements array
      const requirements: string[] = [];
      if (requireFace) requirements.push('face');
      if (sessionType === 'ENROLL' && requireDocument) requirements.push('identity_document');

      console.log('[IframeFlow] Starting verification:', sessionType, 'with requirements:', requirements);

      // Get current hostname for webhook URL
      const baseUrl = window.location.origin;

      // Call API to create session
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionType,
          flowType: 'iframe',
          baseUrl, // Send current hostname for webhook URL
          requirements, // Send selected requirements
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const data = await response.json();

      console.log('[IframeFlow] Session created:', data);

      // Create initial session data
      const initialSession: SessionData = {
        sessionId: data.sessionId,
        sessionType,
        status: 'PENDING',
        verificationUrl: data.verificationUrl,
        flowType: 'iframe',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setSessionData(initialSession);
      setLoading(false);

      // Establish SSE connection for real-time updates
      establishSSEConnection(data.sessionId);
    } catch (err) {
      console.error('[IframeFlow] Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const establishSSEConnection = (sessionId: string) => {
    console.log('[IframeFlow] Establishing SSE connection for session:', sessionId);

    const eventSource = new EventSource(`/api/sessions/${sessionId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const updatedSession: SessionData = JSON.parse(event.data);
        console.log('[IframeFlow] Received SSE update:', updatedSession);

        setSessionData(updatedSession);

        // Show results when verification is complete
        if (updatedSession.status === 'SUCCESS' || updatedSession.status === 'FAILED') {
          console.log('[IframeFlow] Verification complete, showing results');
          setShowResults(true);
          eventSource.close();
        }
      } catch (error) {
        console.error('[IframeFlow] Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[IframeFlow] SSE error:', error);
      eventSource.close();

      // Don't show error if we already have results
      if (!showResults) {
        setError('Lost connection to server. Results may not update in real-time.');
      }
    };

    // Cleanup on component unmount
    return () => {
      console.log('[IframeFlow] Closing SSE connection');
      eventSource.close();
    };
  };

  useEffect(() => {
    // Cleanup SSE connection on unmount
    return () => {
      // SSE cleanup is handled in establishSSEConnection
    };
  }, []);

  const resetFlow = () => {
    setSessionData(null);
    setShowResults(false);
    setError(null);
  };

  // Show results view
  if (showResults && sessionData) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="max-w-4xl w-full space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              Verification Complete
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              iFrame Flow - Real-time results via Server-Sent Events
            </p>
          </div>

          {/* Results */}
          <ResultDisplay sessionData={sessionData} />

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={resetFlow}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start New Verification
            </button>
            <Link
              href="/"
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-900 dark:text-gray-100"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Show iframe view
  if (sessionData && !showResults) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="max-w-4xl w-full space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Complete Verification
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Session: <span className="font-mono text-sm">{sessionData.sessionId}</span>
            </p>
          </div>

          {/* iframe */}
          <PrivateIdIframe verificationUrl={sessionData.verificationUrl} />

          {/* Status */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Waiting for verification to complete...
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Results will appear automatically via real-time updates
            </p>
          </div>

          <button
            onClick={resetFlow}
            className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Cancel
          </button>
        </div>
      </main>
    );
  }

  // Show initial view
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Link
            href="/"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            iFrame Flow
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            PrivateID verification embedded in your application with real-time updates.
          </p>
        </div>

        {/* How it Works */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">
            How it works
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>Click one of the buttons below to start verification</li>
            <li>PrivateID verification loads in an embedded iframe</li>
            <li>Complete the verification process (face scan + ID document)</li>
            <li>Our server receives a webhook with verification results</li>
            <li>Results appear instantly via Server-Sent Events (SSE)</li>
            <li>No page refresh required - seamless real-time updates</li>
          </ol>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {/* Verification Requirements */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">
            Verification Requirements
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requireFace}
                onChange={(e) => setRequireFace(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Face Verification
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Required for both ENROLL and VERIFY flows
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requireDocument}
                onChange={(e) => setRequireDocument(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Identity Document
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Only applicable for ENROLL (driver's license, passport, etc.)
                </p>
              </div>
            </label>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Current Selection:</strong>{' '}
              {requireFace && 'Face'}
              {requireFace && requireDocument && ' + '}
              {requireDocument && 'Identity Document'}
              {!requireFace && !requireDocument && 'None selected'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => startVerification('ENROLL')}
            disabled={loading}
            className="border border-gray-300 dark:border-gray-600 rounded-lg p-8 hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
              {loading ? 'Loading...' : 'Start Enrollment'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Register a new user with face and identity document verification.
            </p>
            <div className="text-blue-600 dark:text-blue-400 font-medium">
              {loading ? 'Creating session...' : 'Start Enrollment →'}
            </div>
          </button>

          <button
            onClick={() => startVerification('VERIFY')}
            disabled={loading}
            className="border border-gray-300 dark:border-gray-600 rounded-lg p-8 hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
              {loading ? 'Loading...' : 'Start Verify'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Verify an existing user with face verification.
            </p>
            <div className="text-blue-600 dark:text-blue-400 font-medium">
              {loading ? 'Creating session...' : 'Start Verify →'}
            </div>
          </button>
        </div>

        {/* Technical Note */}
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <strong>Note:</strong> This demo uses the iframe integration pattern with Server-Sent
            Events (SSE) for real-time updates. The verification interface loads in an embedded
            iframe, and results appear automatically when the webhook is received.
          </p>
        </div>
      </div>
    </main>
  );
}
