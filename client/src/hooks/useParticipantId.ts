import { useState } from 'react';

/**
 * Anonymous participant identity (FR-012, R3).
 *
 * On first visit the client generates a random UUID v4 (`crypto.randomUUID()`) and stores it in
 * `localStorage["participantId"]`. Every subsequent visit re-reads it. This UUID is the stable
 * participant key sent in the `X-Participant-Id` header on every request.
 *
 * The id is NOT linked to any real-world identity — no login, email, or platform user id is
 * captured or stored (FR-012, FR-013). Resume is therefore single-device/single-browser only:
 * clearing localStorage or switching devices starts a fresh participant identity (Edge Cases).
 */

const STORAGE_KEY = 'participantId';

/**
 * Read the existing participant id, or generate and persist a new one. Plain (non-hook) accessor
 * so non-React code (e.g. the api wrappers) can attach `X-Participant-Id` without a component.
 *
 * Degrades gracefully when `localStorage` is unavailable (e.g. private mode): a fresh UUID is
 * returned for the call without persistence rather than throwing.
 */
/** Remove the persisted participant id so the next visit starts a fresh identity. */
export function clearParticipantId(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

export function getParticipantId(): string {
  let store: Storage | undefined;
  try {
    store = window.localStorage;
  } catch {
    store = undefined;
  }

  const existing = store?.getItem(STORAGE_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  try {
    store?.setItem(STORAGE_KEY, id);
  } catch {
    // Storage unavailable/full — use the id for this session without persisting it.
  }
  return id;
}

/**
 * React hook exposing the stable participant id. Resolved once on mount (lazy initializer) so it
 * is consistent for the component's lifetime.
 */
export function useParticipantId(): string {
  const [participantId] = useState(getParticipantId);
  return participantId;
}
