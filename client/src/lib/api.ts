import { getParticipantId } from '@/hooks/useParticipantId';
import type { DebriefState, SessionState, SubmitRequest, SubmitResult, TaskType } from '../../../shared/types';

/**
 * Segments whose gating screen the participant can acknowledge (US1 adds `welcome`, which advances
 * past the welcome home page). These are non-PII UI-advance flags sent in `X-Ack-Instructions`.
 */
export type AckSegment = 'welcome' | TaskType;

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string;
  isUserContext: boolean;
}

/**
 * Instruction acknowledgement (UI advance hint, contracts/api.md cross-cutting rules).
 *
 * The instructions screen has no server-recorded state, so the client remembers which segments'
 * instructions the participant has acknowledged (clicked "Begin") and sends them in the
 * `X-Ack-Instructions` header. The server uses this only to advance past the instructions phase to
 * the first practice item. The stored values are non-PII flags (`word`/`cluster`).
 */
const ACK_KEY = 'ackInstructions';

function isAckSegment(value: unknown): value is AckSegment {
  return value === 'welcome' || value === 'word' || value === 'cluster';
}

function readAck(): AckSegment[] {
  try {
    const raw = window.localStorage.getItem(ACK_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isAckSegment) : [];
  } catch {
    return [];
  }
}

/**
 * Record that the participant has acknowledged a gating screen (persists across reloads): the
 * `welcome` home page (US1) or a task's instructions. Sent in `X-Ack-Instructions` so the server
 * advances past that screen. Non-PII flags only.
 */
export function acknowledgeInstructions(segment: AckSegment): void {
  const current = readAck();
  if (current.includes(segment)) return;
  try {
    window.localStorage.setItem(ACK_KEY, JSON.stringify([...current, segment]));
  } catch {
    // Storage unavailable — the participant will simply see the screen again.
  }
}

/** Clear instruction acknowledgements so a restarted survey begins at the welcome home page. */
export function clearAcknowledgedInstructions(): void {
  try {
    window.localStorage.removeItem(ACK_KEY);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

/**
 * Typed fetch wrappers for the participant flow endpoints (contracts/api.md).
 *
 * Every request attaches `X-Participant-Id` from the anonymous participant id (R3, FR-012).
 * Errors are mapped to a generic {@link ApiError} carrying only the HTTP status and the server's
 * error `code` (e.g. `phase_locked`, `not_complete`) — never cluster text, selections, or any PII
 * (R10). Callers branch on `code`; user-facing copy is the caller's responsibility.
 */

/** A failed API call. Carries the HTTP status and a stable error code, no PII. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(`API request failed (${status}: ${code})`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Participant-Id': getParticipantId(),
        'X-Ack-Instructions': readAck().join(','),
        ...init?.headers,
      },
    });
  } catch {
    // Network/transport failure — no response body to read.
    throw new ApiError(0, 'network_error');
  }

  if (!res.ok) {
    let code = 'request_failed';
    try {
      const body: unknown = await res.json();
      if (
        body &&
        typeof body === 'object' &&
        'error' in body &&
        body.error &&
        typeof body.error === 'object' &&
        'code' in body.error &&
        typeof body.error.code === 'string'
      ) {
        code = body.error.code;
      }
    } catch {
      // Non-JSON error body — keep the generic code.
    }
    throw new ApiError(res.status, code);
  }

  return res.json() as Promise<T>;
}

/** `GET /api/session` — current phase, progress, and the single item/practice to render now. */
export function getSession(init?: Pick<RequestInit, 'signal'>): Promise<SessionState> {
  return request<SessionState>('/api/session', init);
}

/** `POST /api/responses` — record one response (or practice attempt); returns the advanced state. */
export function submitResponse(body: SubmitRequest): Promise<SubmitResult> {
  return request<SubmitResult>('/api/responses', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** `GET /api/debrief` — post-completion debrief; throws `ApiError` with code `not_complete` early. */
export function getDebrief(init?: Pick<RequestInit, 'signal'>): Promise<DebriefState> {
  return request<DebriefState>('/api/debrief', init);
}

/** `GET /api/current-user` — optional owner identity shown in the app shell. */
export function getCurrentUser(init?: Pick<RequestInit, 'signal'>): Promise<CurrentUser> {
  return request<CurrentUser>('/api/current-user', init);
}
