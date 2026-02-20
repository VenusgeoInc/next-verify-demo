import type { SessionData } from '../privateId/types';
import type { SessionListener, Unsubscribe } from './types';

/**
 * In-memory session store with pub/sub pattern for real-time updates.
 *
 * WARNING: This is a simple in-memory implementation suitable for demos.
 * For production use, replace with:
 * - Redis for distributed caching and pub/sub
 * - PostgreSQL/MongoDB for persistent storage
 * - Proper session expiration and cleanup
 */
class SessionStore {
  private sessions: Map<string, SessionData> = new Map();
  private listeners: Map<string, Set<SessionListener>> = new Map();

  /**
   * Create a new session in the store
   */
  create(sessionData: SessionData): void {
    this.sessions.set(sessionData.sessionId, sessionData);
    console.log(`[SessionStore] Created session: ${sessionData.sessionId}`);
  }

  /**
   * Get session data by ID
   */
  get(sessionId: string): SessionData | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Find session by PrivateID's session ID
   * This is used by webhook handler since webhooks contain PrivateID's sessionId
   */
  findByPrivateIdSessionId(privateIdSessionId: string): SessionData | undefined {
    for (const session of this.sessions.values()) {
      if (session.privateIdSessionId === privateIdSessionId) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * Update session data and notify all listeners
   */
  update(sessionId: string, updates: Partial<SessionData>): void {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.error(`[SessionStore] Session not found: ${sessionId}`);
      return;
    }

    // Merge updates
    const updatedSession: SessionData = {
      ...session,
      ...updates,
      updatedAt: new Date(),
    };

    this.sessions.set(sessionId, updatedSession);
    console.log(`[SessionStore] Updated session: ${sessionId}`, updates);

    // Notify all subscribers
    this.notifyListeners(sessionId, updatedSession);
  }

  /**
   * Subscribe to session updates (for SSE)
   * Returns an unsubscribe function
   */
  subscribe(sessionId: string, listener: SessionListener): Unsubscribe {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }

    this.listeners.get(sessionId)!.add(listener);
    console.log(`[SessionStore] Added listener for session: ${sessionId}`);

    // Return unsubscribe function
    return () => {
      const sessionListeners = this.listeners.get(sessionId);
      if (sessionListeners) {
        sessionListeners.delete(listener);
        console.log(`[SessionStore] Removed listener for session: ${sessionId}`);

        // Clean up empty listener sets
        if (sessionListeners.size === 0) {
          this.listeners.delete(sessionId);
        }
      }
    };
  }

  /**
   * Notify all listeners for a specific session
   */
  private notifyListeners(sessionId: string, sessionData: SessionData): void {
    const sessionListeners = this.listeners.get(sessionId);

    if (sessionListeners && sessionListeners.size > 0) {
      console.log(`[SessionStore] Notifying ${sessionListeners.size} listener(s) for session: ${sessionId}`);
      sessionListeners.forEach(listener => {
        try {
          listener(sessionData);
        } catch (error) {
          console.error(`[SessionStore] Error in listener for session ${sessionId}:`, error);
        }
      });
    }
  }

  /**
   * Get all sessions (for debugging)
   */
  getAll(): SessionData[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Delete a session
   */
  delete(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    this.listeners.delete(sessionId); // Clean up listeners
    console.log(`[SessionStore] Deleted session: ${sessionId}`);
    return deleted;
  }

  /**
   * Get count of active sessions
   */
  count(): number {
    return this.sessions.size;
  }

  /**
   * Clear all sessions (for testing)
   */
  clear(): void {
    this.sessions.clear();
    this.listeners.clear();
    console.log('[SessionStore] Cleared all sessions');
  }
}

// Singleton instance
export const sessionStore = new SessionStore();
