# API Contract: Cluster Validation

**Feature**: `001-cluster-validation` | **Date**: 2026-06-24
**Updated**: 2026-06-24 — POST /api/responses now records practice attempts as PracticeResponse
records (FR-011); removed the `cant_tell` selection variant (FR-006 removed).
**Updated**: 2026-06-22 — revised identity model to anonymous UUID (R3); added Session assignment
behaviour to GET /api/session (FR-023, R14).

HTTP/JSON endpoints added to the AppKit Express server via `appkit.server.extend((app) => …)` in
`server/server.ts`. Types reference `data-model.md`.

**Cross-cutting rules**

- **Participant identity**: every request that needs a participant context MUST include the
  `X-Participant-Id` header containing a UUID v4. The server validates UUID format (rejects
  non-UUID values with `400 Bad Request`) and uses the value directly as the participant key.
  No platform identity (email, user id) is read, used, or stored for participant requests.
- No endpoint ever returns a ground-truth intruder before completion (R5). Session and response
  payloads carry **no** intruder fields.
- Error bodies are generic (`{ "error": { "code": string, "message": string } }`); no PII, no
  cluster text in messages (R10).
- All item/response state is keyed by the server-validated `X-Participant-Id`; the client cannot
  override identity beyond what it sends in this header.
- **Instruction acknowledgement (UI advance hint)**: the instructions phase has no server-recorded
  state, so the client sends an optional `X-Ack-Instructions` header — a comma-separated list of the
  task segments whose instructions it has acknowledged (`word`, `cluster`). The server uses it only
  to advance `GET /api/session` past an `*-instructions` phase to the first practice item; it carries
  no PII and never affects what is recorded. Absent or unrecognized values are ignored (the
  instructions phase is shown). The client persists the acknowledged segments locally (non-PII
  flags) so a returning participant who has begun is not re-shown the instructions.

---

## GET `/api/current-user` _(optional — study-owner UI only)_

Returns the platform-resolved identity for display. Used only for study-owner tooling, not for
participant flows. **Participants do not call this endpoint**; no platform identity is required
to complete tasks (FR-013).

```jsonc
200 OK
{ "id": "string", "email": "string|null", "name": "string", "isUserContext": true }
```

---

## GET `/api/session`

Return the participant's current session state: phase, progress, and the single piece of content
to render now. Handles first-visit Session assignment (FR-023, R14) transparently.

**Headers**: `X-Participant-Id: <uuid>` (required)

**Behaviour on first visit** (no prior `SessionAssignment` exists):

1. Server selects the least-utilized pre-defined `Session` from the Study (R14).
2. Writes `text_cluster_validation/{studyId}/session-assignments/{participantId}.json` with
   `overwrite:false` (`{studyId}` = this deployment's `STUDY_ID` config).
3. Returns the session state for the assigned Session, starting at `word-instructions`.

**Behaviour on subsequent visits**: reads the existing `SessionAssignment` → resolves the same
`Session` → derives current phase and progress from recorded responses (R1, R7).

**Response** `200 OK` — `SessionState` (see data-model.md). Examples:

```jsonc
// Word-intrusion item phase
{
  "studyId": "study-001",
  "sessionId": "session-A",
  "phase": "word-items",
  "progress": { "answered": 3, "total": 12 },
  "current": {
    "phase": "word-items",
    "item": {
      "itemId": "w-014",
      "taskType": "word",
      "candidateWords": ["soil", "nitrogen", "keyboard", "livestock", "deposition", "agriculture"],
    },
  },
}
```

```jsonc
// Practice phase (answer may be revealed as teaching feedback)
{
  "studyId": "study-001",
  "sessionId": "session-A",
  "phase": "word-practice",
  "progress": { "answered": 0, "total": 12 },
  "current": {
    "phase": "word-practice",
    "index": 1,
    "of": 2,
    "practice": {
      "itemId": "wp-2",
      "taskType": "word",
      "candidateWords": ["river", "lake", "ocean", "spreadsheet", "stream"],
      "explanation": "'spreadsheet' is unrelated to bodies of water.",
    },
  },
}
```

```jsonc
// Completed
{
  "studyId": "study-001",
  "sessionId": "session-A",
  "phase": "complete",
  "progress": { "answered": 12, "total": 12 },
  "current": { "phase": "complete" },
}
```

**Guarantees**

- When `phase` is any `word-*`, the response contains **no** cluster-intrusion content (FR-022).
- Item DTOs never include the intruder; candidate order is the seeded shuffle (R6, seed =
  `participantId + itemId`) and is stable across calls for this participant+item.
- `progress` counts **real** items in the assigned Session only (practice excluded, FR-007/FR-011).
- `sessionId` is stable across all calls for the same `X-Participant-Id` (FR-023).

**Errors**: `400` invalid/missing `X-Participant-Id`; `500` generic if the study definition is
missing/unreadable.

---

## POST `/api/responses`

Record one response for the **current** item, compute correctness server-side, and advance the
phase. Idempotent per `(participantId, itemId)` (FR-009, R4).

**Headers**: `X-Participant-Id: <uuid>` (required)

**Request body**:

```jsonc
{
  "itemId": "w-014", // real itemId, OR a practiceId for a practice attempt
  "taskType": "word",
  "selection": { "kind": "candidate", "value": "keyboard" },
  "timeTakenMs": 8231, // optional
}
```

**Validation** (`422 Unprocessable Entity` on failure, FR-002 / spec AS-2):

- `itemId` (or `practiceId`) must equal the participant's current item/practice slot in their
  assigned Session; `taskType` must match.
- `selection` required and MUST identify exactly one displayed candidate
  (`kind: "candidate"`, `value` one of the displayed candidates). A missing/invalid selection is
  rejected and **nothing is recorded** (spec AS US1.2 / US2.2). (There is no "I can't tell"
  option — FR-006 was removed.)

**Response** `200 OK` — `SubmitResult`:

```jsonc
{
  "recorded": true, // true also when already recorded (idempotent)
  "next": {
    /* SessionState, identical shape to GET /api/session */
  },
}
```

**Behaviour**

- Writes `text_cluster_validation/{studyId}/responses/{participantId}/{itemId}.json` with
  `overwrite:false`; a duplicate submission is a no-op that still returns `recorded:true` with the
  advanced `next` state (FR-009).
- `correct` is computed and stored but **not** included in the response (R5).
- **Practice** submissions (a `practiceId`) are recorded as a `PracticeResponse` under
  `text_cluster_validation/{studyId}/practice-responses/{participantId}/{practiceId}.json`
  (`overwrite:false`, idempotent),
  marked `isPractice: true`. They are **not** written to `responses/`, **not** counted toward a
  cluster's K, and **not** counted in `progress.answered` (FR-011). Recording is silent — no
  pass/fail or feedback about screening is returned. `next` advances the practice index or moves
  to the first real item. (For practice, the teaching `explanation` may already reveal the answer,
  exempt from FR-021.)
- Submitting a cluster-phase item while word items remain unanswered ⇒ `409 Conflict`
  (`code: "phase_locked"`), enforcing FR-022.

**Errors**: `400` invalid/missing header; `422` invalid/missing selection; `409` out-of-phase or
wrong item; `500` generic storage failure (the client surfaces a retry-able error state, no PII).

---

## GET `/api/debrief`

Return the post-completion debrief: a random sample of answered items with the participant's own
selection, the correct intruder, and a cluster-framed explanation (FR-019/FR-020, US3).

**Headers**: `X-Participant-Id: <uuid>` (required)

**Pre-condition**: reachable **only** when the participant has answered all assigned items in
their Session.

**Response** `200 OK` — `DebriefState`:

```jsonc
{
  "examples": [
    {
      "itemId": "w-003",
      "taskType": "word",
      "yourSelection": { "kind": "candidate", "value": "banana" },
      "correctIntruder": "banana",
      "correct": true,
      "clusterValidityExplanation": "Most participants who saw this group also flagged 'banana', which suggests the remaining words form a coherent cluster.",
    },
  ],
}
```

**Guarantees**: this is the **only** endpoint that returns `correctIntruder`/`correct` (R5). No
score, pass/fail, or aggregate statistics (Assumptions / Edge Cases).

**Errors**: `400` invalid/missing header; `409 Conflict` (`code: "not_complete"`) if requested
before completion — the correct answer is never revealed early (FR-021, spec AS US3.3).

---

## (Optional) GET `/api/admin/export` _(study-owner only — may be deferred)_

Stream the complete raw response set for downstream quantification (FR-018/US5). Gated to
configured study-owner identities via platform identity; `403 Forbidden` otherwise. **Default
plan**: owners retrieve responses via Unity Catalog read grants on the Volume (R9), so this
endpoint is optional and not required for US5.

```jsonc
200 OK   // application/x-ndjson — one Response per line (data-model.md Response)
```

---

## Endpoint → requirement map

| Endpoint                      | Requirements                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| GET `/api/session`            | FR-001, FR-003, FR-004, FR-007, FR-008, FR-010, FR-011, FR-012, FR-016, FR-021, FR-022, FR-023 |
| POST `/api/responses`         | FR-002, FR-005, FR-009, FR-011, FR-017, FR-021, FR-022                                         |
| GET `/api/debrief`            | FR-019, FR-020, FR-021                                                                         |
| GET `/api/current-user`       | (study-owner UI only; not used for participant flow)                                           |
| (opt) GET `/api/admin/export` | FR-013, FR-018                                                                                 |
