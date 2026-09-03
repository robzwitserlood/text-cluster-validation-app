# API Contract Deltas — Feature 002

Extends `specs/001-cluster-validation/contracts/api.md`. Cross-cutting rules (the `X-Participant-Id`
UUID header, `X-Ack-Instructions`, generic PII-free error bodies `{ error: { code } }`) are
unchanged. Only additions/changes are listed.

## `GET /api/session` (changed)

`X-Ack-Instructions` is extended to also carry the non-PII `welcome` flag (comma-separated with the
existing `word`/`cluster` values). The server uses `welcome` only to advance past the welcome phase.

`SessionState` additions:

- `Phase` includes a leading `"welcome"`.
- New `current` variant:

```json
{ "phase": "welcome", "welcome": { "greeting": "…", "whatText": "…", "whyText": "…" } }
```

`welcome.*` is the researcher-authored copy from `study.welcome`, or the localized built-in default
when the study omits it. `progress` during `welcome` is `{ "answered": 0, "total": N }`.

Cluster item DTOs change `targetText` → **`targetHtml`** (server-sanitized safe-subset HTML):

```json
{
  "phase": "cluster-items",
  "item": {
    "itemId": "c-001",
    "taskType": "cluster",
    "targetHtml": "<p>Sanitized <strong>document</strong> HTML…</p>",
    "candidates": [{ "clusterId": "k12", "representativeWords": ["…"] }]
  }
}
```

The same `targetText` → `targetHtml` change applies to the cluster practice DTO
(`current.practice` when `taskType === "cluster"`).

**Sanitization guarantee (FR-007)**: `targetHtml` is limited to the presentational allowlist
(`p, br, span, strong, em, b, i, u, s, h1–h4, ul, ol, li, blockquote, code, pre, hr`), carries no
attributes, and contains no scripts, event handlers, styles, form controls, embedded objects, or
external/remote references. Malformed input degrades to readable text with no raw markup.

## `POST /api/responses` (changed)

Request body is **unchanged** (`{ itemId, taskType, selection, timeTakenMs? }`). For a **cluster**
response, the persisted record additionally stores `selectedClusterWords` (see storage.md, FR-016);
the response body (`{ recorded, next }`) is unchanged and still never reveals correctness.

## `GET /api/debrief` (changed)

Now returns **all** answered real items in session order (not a random sample). Each `DebriefExample`
is extended with the fields needed to re-render the session layout read-only (FR-019):

```json
{
  "examples": [
    {
      "itemId": "c-001",
      "taskType": "cluster",
      "yourSelection": { "kind": "candidate", "value": "k12" },
      "correctIntruder": "k12",
      "correct": true,
      "clusterValidityExplanation": "…",
      "targetHtml": "<p>…</p>",
      "candidates": [{ "clusterId": "k12", "representativeWords": ["…"] }]
    },
    {
      "itemId": "w-003",
      "taskType": "word",
      "yourSelection": { "kind": "candidate", "value": "otter" },
      "correctIntruder": "otter",
      "correct": true,
      "clusterValidityExplanation": "…",
      "candidateWords": ["otter", "…"]
    }
  ]
}
```

- `correctIntruder` remains the only ground-truth field and is exposed only here, after completion.
- `targetHtml` uses the same server sanitization as the live item.
- Still `409 { error: { code: "not_complete" } }` before all assigned items are answered.
