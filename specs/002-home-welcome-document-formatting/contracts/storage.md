# Storage Contract Deltas — Feature 002

Extends `specs/001-cluster-validation/contracts/storage.md`. All paths, the `STUDY_ID` prefix
isolation, and the service-principal access model are unchanged. Only study-definition and record
shape deltas are listed.

## `study.json` (read) — additions

Path unchanged: `text_cluster_validation/{STUDY_ID}/study/study.json`.

### New optional top-level `welcome` (FR-012)

```json
{
  "studyId": "…",
  "welcome": {
    "greeting": "Welkom",
    "whatText": "Je beoordeelt een korte reeks teksten…",
    "whyText": "Jouw oordelen helpen automatisch gevormde groeperingen te valideren…"
  }
}
```

- Optional. When present, each field is a non-empty string, displayed **exactly as authored** (never
  translated by `SURVEY_LANGUAGE`).
- When absent, the server renders the localized built-in default from `shared/i18n.ts` (FR-012).

### `targetText` is now HTML (FR-006/FR-007)

`clusterItems[].targetText` and `practice.cluster[].targetText` remain JSON strings, validated as
before (`min length 1`), but are interpreted as **researcher-authored HTML**. The server sanitizes
them to a safe presentational subset before display (see `contracts/api.md`). Existing plain-text
values remain valid and render unchanged (backward compatible, FR-008). No schema type change is
required.

## Deployment config — new env var

| Var               | Values       | Default | Purpose                                                    |
| ----------------- | ------------ | ------- | ---------------------------------------------------------- |
| `SURVEY_LANGUAGE` | `nl` \| `en` | `en`    | App-wide UI language for built-in strings (FR-013–FR-015). |

Invalid/unset values fall back to `en`. Not participant-selectable; not per-study.

## Response record (write) — cluster addition (FR-016)

Path unchanged: `responses/{participantId}/{itemId}.json`. **Cluster** responses add one field:

```json
{
  "studyId": "…",
  "participantId": "…",
  "itemId": "c-001",
  "taskType": "cluster",
  "clusterId": "k12",
  "selection": { "kind": "candidate", "value": "k12" },
  "selectedClusterWords": ["river", "delta", "silt"],
  "correct": true,
  "submittedAt": "2026-07-01T10:00:00.000Z",
  "schemaVersion": 1
}
```

- `selectedClusterWords`: the representative words of the cluster identified by `selection.value`,
  resolved server-side from `study.clusters`. Present on cluster responses only.
- `schemaVersion` stays `1` (additive field; older records read without it). Word responses are
  unchanged. Practice records are unchanged.
