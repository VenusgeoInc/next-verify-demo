'use client';

import { useState } from 'react';

export default function WebViewFlow() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startVerification = async (type: 'ENROLL' | 'VERIFY') => {
    setLoading(true);
    setError(null);

    try {
      console.log(`[WebView] Starting ${type}`);

      const baseUrl = window.location.origin;

      // Create session and redirect
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType: type,
          flowType: 'redirect',
          baseUrl,
          requirements: ['face'], // Only face verification
          isWebView: true, // Use minimal result page
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const data = await response.json();
      console.log(`[WebView] Session created, redirecting to PrivateID`);

      // Redirect to PrivateID
      window.location.href = data.verificationUrl;

    } catch (err) {
      console.error('[WebView] Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-sm space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={() => startVerification('ENROLL')}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
        >
          {loading ? 'Processing...' : 'Enroll'}
        </button>

        <button
          onClick={() => startVerification('VERIFY')}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
        >
          {loading ? 'Processing...' : 'Verify'}
        </button>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
          Face verification only
        </p>
      </div>
    </div>
  );
}
