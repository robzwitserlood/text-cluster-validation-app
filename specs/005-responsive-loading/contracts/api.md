# Contract: API Deltas

This feature adds **no new endpoints** and changes **no request/response wire contract**. It is a
client-side rendering-timing change (research.md R1) plus confirmation (no rewrite) of existing
server logic (research.md R7). Recorded here for completeness, per the pattern established in
`specs/002-.../contracts/` and `specs/003-.../contracts/`.

## `GET /api/session` — UNCHANGED

- `SessionState` shape is unchanged (see `specs/001-cluster-validation/contracts/api.md`,
  `specs/003-survey-copy-house-style/contracts/api.md`). This feature changes only how the client
  reacts while this request is in flight (a `pendingComponent` fallback, research.md R1) — never the
  request itself, its headers, or its response shape.
- Server-side resolution (`getSessionState`/`resolveSessionState` in
  `server/src/services/sessionService.ts`) is unchanged by this feature; the first-load optimization
  it depends on (commit `ecb9362`) predates and is preserved by this plan (research.md R7).

## `POST /api/responses` — UNCHANGED

- `SubmitRequest`/`SubmitResult` (`{ recorded, next }`) are unchanged. This feature changes only
  when/how the client visually acknowledges the call (already-correct `isPending` wiring, research.md
  R3) and confirms (without changing) the sequencing inside the handler
  (`server/src/routes/responses.ts:28-39`: `ensureAssignment` started concurrently with
  `recordResponse`, then `getSessionState` computes `next`).
- Duplicate-submission protection (`writeOnce`, `overwrite: false`) and failure surfacing (existing
  error codes/`ApiError`) are unchanged (research.md R4/R5).

## `GET /api/debrief` — UNCHANGED

Not touched by this feature; `advanceToSession`'s existing terminal-phase prefetch
(`flow-route-state.ts:20-22`) is unrelated prior behavior, left as-is.
