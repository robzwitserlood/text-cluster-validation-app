# API Contract: Text Cluster Validation Survey

**Feature**: 008-personal-demo-refactor
**Date**: 2026-09-14

## Overview

The API contract is **unchanged** from the pre-refactor application. All three participant-facing endpoints maintain identical request/response shapes, status codes, and error formats. The only differences are:

1. **Removed**: `GET /api/current-user` (was AppKit-internal, unused by participant flow)
2. **Added**: `GET /api/health` (health check for the standalone server)
3. **Server base URL**: Now `http://localhost:3001` instead of Databricks App URL

---

## Endpoints

### 1. GET /api/session

Returns the current session state for a participant, handling first-visit session assignment and progress-based phase resolution.

**Request Headers**:
- `X-Participant-Id`: `string` (UUID v4, required)
- `X-Ack-Instructions`: `string` (optional, comma-separated: `welcome`, `word`, `cluster`)

**Response `200 OK`**:
```json
{
  "phase": "welcome" | "word-instructions" | "word-practice" | "word-items"
        | "cluster-instructions" | "cluster-practice" | "cluster-items" | "complete",
  "progress": {
    "answered": 3,
    "total": 10
  },
  "item": {
    "itemId": "string",
    "taskType": "word" | "cluster",
    "candidateWords": ["string", "string", ...],
    // -- OR for cluster items: --
    "targetHtml": "string (sanitized HTML)",
    "candidates": [
      { "clusterId": "string", "representativeWords": ["string", ...] }
    ]
  }
}
```

**Response `409 Conflict`**:
```json
{
  "error": {
    "code": "phase_locked",
    "message": "Cluster tasks are available after completing all word items."
  }
}
```

**Response `500 Internal Server Error`**:
```json
{
  "error": {
    "code": "internal_error",
    "message": "string (no PII, no stack traces)"
  }
}
```

**Notes**:
- The `item` field is present only when the participant is in an active task phase (word-items or cluster-items). It is omitted for instruction, practice, welcome, and complete phases.
- Ground truth (`intruderWord`, `intruderClusterId`, `correct`) is **never** present in this response.
- Candidate order is deterministically shuffled per (`participantId`, `itemId`) using a seeded PRNG.

---

### 2. POST /api/responses

Records a participant's answer to a survey item (real or practice). Computes correctness server-side. Idempotent per (`participantId`, `itemId`).

**Request Headers**:
- `X-Participant-Id`: `string` (UUID v4, required)
- `Content-Type`: `application/json`

**Request Body**:
```json
{
  "itemId": "string",
  "taskType": "word" | "cluster",
  "selection": {
    "kind": "candidate",
    "value": "string"
  },
  "timeTakenMs": 1234
}
```

**Response `200 OK`**:
```json
{
  "recorded": true,
  "next": {
    "phase": "word-items",
    "progress": { "answered": 4, "total": 10 },
    "item": { ... }
  }
}
```

**Response `400 Bad Request`**:
```json
{
  "error": {
    "code": "invalid_request",
    "message": "string (describes validation failure)"
  }
}
```

**Response `409 Conflict`**:
```json
{
  "error": {
    "code": "duplicate_submission",
    "message": "Response already recorded for this item."
  }
}
```

```json
{
  "error": {
    "code": "phase_locked",
    "message": "Cluster tasks are available after completing all word items."
  }
}
```

**Response `500 Internal Server Error`**:
```json
{
  "error": {
    "code": "internal_error",
    "message": "string (no PII)"
  }
}
```

**Notes**:
- `correct` is computed server-side but **never returned** in the response. The response always says `recorded: true`, not `correct: true/false`.
- `next` contains the full `SessionState` after the submission, enabling the client to navigate to the next phase without a second network request.
- Practice submissions to practice items go to the `practice-responses/` storage tree and are excluded from `progress.answered` counts.
- Duplicate submissions return `409 Conflict` — the server enforces `writeOnce()` idempotency.

---

### 3. GET /api/debrief

Returns the post-completion debrief walkthrough. This is the **only endpoint that reveals ground truth**.

**Request Headers**:
- `X-Participant-Id`: `string` (UUID v4, required)

**Response `200 OK`**:
```json
{
  "examples": [
    {
      "itemId": "string",
      "taskType": "word" | "cluster",
      "candidateWords": ["string", "string", ...],
      "selectedWord": "string",
      "correctIntruder": "string",
      "correct": true,
      "explanation": "string (localized debrief framing)"
    },
    {
      "itemId": "string",
      "taskType": "cluster",
      "targetHtml": "string (sanitized HTML)",
      "candidates": [
        { "clusterId": "string", "representativeWords": ["string", ...] }
      ],
      "selectedClusterId": "string",
      "correctIntruderClusterId": "string",
      "correct": false,
      "explanation": "string (localized debrief framing)"
    }
  ]
}
```

**Response `409 Conflict`**:
```json
{
  "error": {
    "code": "not_completed",
    "message": "Debrief is available after completing all items."
  }
}
```

**Response `500 Internal Server Error`**:
```json
{
  "error": {
    "code": "internal_error",
    "message": "string (no PII)"
  }
}
```

**Notes**:
- Only accessible after all items in the participant's assigned session are answered.
- Examples are sampled up to `config.debriefSampleSize` items from the participant's answered items.
- This is the **only** API response that includes `correctIntruder`, `correctIntruderClusterId`, and `correct`.
- Explanations are localized using the deployment's `SURVEY_LANGUAGE`.

---

### 4. GET /api/health _(NEW)_

Simple health check to verify the server is running and the storage backend is reachable.

**Request**: No special headers required.

**Response `200 OK`**:
```json
{
  "status": "ok",
  "studyId": "example-study",
  "uptime": 12345
}
```

**Response `503 Service Unavailable`**:
```json
{
  "status": "error",
  "message": "Storage backend unreachable"
}
```

---

### 5. GET /api/current-user _(REMOVED)_

This AppKit-internal endpoint was used to return the authenticated Databricks user identity for the study owner. It was never used by the participant survey flow. **Removed entirely in the refactor.**

---

## Cross-Cutting Rules

| Rule | Scope |
|------|-------|
| `X-Participant-Id` required on all participant-scoped endpoints | Session, Responses, Debrief |
| `X-Participant-Id` must be valid UUID v4 format | Server validation |
| No ground truth in Session or Response endpoints | Security invariant |
| Error messages must not contain PII, stack traces, or internal paths | Error handling |
| `Content-Type: application/json` for all request/response bodies | HTTP convention |
| `X-Ack-Instructions` comma-separated, non-PII | Instructions acknowledgement |

---

## Error Codes Reference

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `invalid_request` | 400 | Malformed request body or invalid participant ID |
| `duplicate_submission` | 409 | Response already recorded for this item |
| `phase_locked` | 409 | Attempting cluster actions before word completion |
| `not_completed` | 409 | Debrief requested before all items completed |
| `storage_error` | 500 | S3/storage operation failed |
| `internal_error` | 500 | Unexpected server error |