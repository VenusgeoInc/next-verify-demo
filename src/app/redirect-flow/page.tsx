'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SessionType } from '@/lib/privateId/types';

export default function RedirectFlow() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requireFace, setRequireFace] = useState(true);
  const [requireDocument, setRequireDocument] = useState(false);

  const startVerification = async (sessionType: SessionType) => {
    setLoading(true);
    setError(null);

    try {
      // Build requirements array
      const requirements: string[] = [];
      if (requireFace) requirements.push('face');
      if (sessionType === 'ENROLL' && requireDocument) requirements.push('identity_document');

      console.log('[RedirectFlow] Starting verification:', sessionType, 'with requirements:', requirements);

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
          flowType: 'redirect',
          baseUrl, // Send current hostname for webhook URL
          requirements, // Send selected requirements
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const data = await response.json();

      console.log('[RedirectFlow] Session created:', data);

      // Redirect to PrivateID verification URL
      window.location.href = data.verificationUrl;
    } catch (err) {
      console.error('[RedirectFlow] Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

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
            Redirect Flow
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            You'll be redirected to PrivateID for verification, then return here with results.
          </p>
        </div>

        {/* How it Works */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">
            How it works
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>Click one of the buttons below to start verification</li>
            <li>You'll be redirected to PrivateID's hosted verification page</li>
            <li>Complete the verification process (face scan + ID document)</li>
            <li>PrivateID will redirect you back to our result page</li>
            <li>Our server receives a webhook with the verification results</li>
            <li>The result page will poll for and display the webhook data</li>
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
            <strong>Note:</strong> This demo uses the redirect integration pattern. After clicking
            a button, you'll be redirected to PrivateID's verification interface. Upon completion,
            you'll be redirected back to the result page where webhook data will be displayed.
          </p>
        </div>
      </div>
    </main>
  );
}
