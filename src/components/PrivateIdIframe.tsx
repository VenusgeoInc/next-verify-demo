'use client';

import { useState } from 'react';

interface PrivateIdIframeProps {
  verificationUrl: string;
  onComplete?: () => void;
}

export default function PrivateIdIframe({ verificationUrl, onComplete }: PrivateIdIframeProps) {
  const [loading, setLoading] = useState(true);

  const handleLoad = () => {
    console.log('[PrivateIdIframe] iframe loaded');
    setLoading(false);
  };

  return (
    <div className="relative w-full h-[600px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="text-gray-600 dark:text-gray-400">Loading verification...</p>
          </div>
        </div>
      )}

      <iframe
        src={verificationUrl}
        title="PrivateID Verification"
        className="w-full h-full"
        onLoad={handleLoad}
        allow="camera; microphone"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        aria-label="PrivateID verification interface"
      />
    </div>
  );
}
