// PrivateID API Configuration
export const PRIVATEID_CONFIG = {
  apiKey: process.env.PRIVATEID_API_KEY || '',
  apiBase: process.env.PRIVATEID_API_BASE || 'https://api-orchestration.uat.privateid.com/v2',
  baseUrl: process.env.BASE_URL, // Optional - can be provided dynamically by client
} as const;

// Validation
if (!process.env.PRIVATEID_API_KEY) {
  console.warn('Warning: PRIVATEID_API_KEY is not set in environment variables');
}

// BASE_URL is now optional - client sends window.location.origin dynamically
// This is especially useful for free ngrok where the URL changes on each restart
