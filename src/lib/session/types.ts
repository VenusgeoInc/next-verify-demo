import type { SessionData } from '../privateId/types';

// Listener callback type for SSE subscriptions
export type SessionListener = (sessionData: SessionData) => void;

// Unsubscribe function type
export type Unsubscribe = () => void;
