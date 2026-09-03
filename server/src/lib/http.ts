/**
 * Generic, PII-free HTTP error helper (contracts/api.md cross-cutting rules, R10).
 *
 * Error bodies are always `{ error: { code, message } }`. Messages are static and generic — they
 * never carry cluster text, participant ids, selections, or any other PII. The stable `code` is
 * what the client branches on (e.g. `phase_locked`, `not_complete`).
 */

import type { Response } from 'express';

/** Stable error codes returned by the participant API. */
export type ApiErrorCode = 'invalid_participant' | 'invalid_request' | 'phase_locked' | 'not_complete' | 'server_error';

/** A segment whose gating screen the client can acknowledge via `X-Ack-Instructions` (US1 adds `welcome`). */
export type AckSegment = 'welcome' | 'word' | 'cluster';

const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  invalid_participant: 'A valid participant id is required.',
  invalid_request: 'The request could not be processed.',
  phase_locked: 'This step is not available yet.',
  not_complete: 'This is only available after completion.',
  server_error: 'Something went wrong. Please try again.',
};

/** Send a generic error response. The body carries only the code and a static message. */
export function sendError(res: Response, status: number, code: ApiErrorCode): void {
  res.status(status).json({ error: { code, message: DEFAULT_MESSAGES[code] } });
}

/**
 * Parse the `X-Ack-Instructions` header (e.g. `"welcome,word,cluster"`) into a set of acknowledged
 * segments. The `welcome` flag (US1) advances past the welcome home page; `word`/`cluster` advance
 * past the per-task instructions. All are non-PII UI-advance hints (contracts/api.md).
 */
export function parseAcknowledgedInstructions(header: string | undefined): Set<AckSegment> {
  const acked = new Set<AckSegment>();
  if (!header) return acked;
  for (const part of header.split(',')) {
    const seg = part.trim();
    if (seg === 'welcome' || seg === 'word' || seg === 'cluster') acked.add(seg);
  }
  return acked;
}
