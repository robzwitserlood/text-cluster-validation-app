# Phase 1 Data Model: Survey Copy Refinements & PBL House-Style Alignment

This feature is predominantly copy/presentation. The only recorded-data change is the relocation of
`selectedClusterWords` under `selection` (FR-012). Everything else is a copy/structure concept with
no new stored fields.

## Entities

### SurveySection (new, descriptive — not stored)

A named, ordered stage of the survey. The canonical list is the shared reference for welcome,
instructions, and completion copy (FR-001). Grouped by task type, not by practice/real stage.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `'welcome' \| 'word-intrusion' \| 'cluster-intrusion' \| 'completion' \| 'explanation'` | Stable key |
| `label` | localized string | From the `nl`/`en` catalog (FR-011) |
| `order` | number | Fixed by the existing flow |
| `optional` | boolean | `true` for `explanation` only |

- Introduces **no** recorded data. Lives as a typed constant + localized labels in `shared/i18n.ts`
  (research.md R1). Canonical order and labels: see `contracts/sections.md`.

### WelcomeContent — built-in default (changed)

The fallback welcome copy used when `study.welcome` is absent. Now more detailed and references the
enumerated sections in order (FR-002).

| Field | Type | Change |
| --- | --- | --- |
| `greeting` | string | unchanged shape; richer default text |
| `whatText` | string | unchanged shape; richer default text |
| `whyText` | string | unchanged shape; richer default text |
| `bodyText?` / section walk-through | optional string / list | **new, optional**; populated only for the built-in default, rendered by `Welcome.tsx`. Absent for researcher-supplied welcome (shown verbatim, FR-015). |

- Researcher-authored `study.welcome` is unchanged and still validated by `WelcomeContentSchema`
  (the new field is optional so existing studies validate unchanged).

### Per-task Instructions Copy (changed — not stored)

Title + single subtitle (now carrying the folded-in "how it works" guidance) + at most one
supporting box holding essential reminders (answers-final, one-sitting/pause-resume, practice-first).
The `instructionsDeviceOnly` (progress-saved) copy is removed (FR-003–FR-005). Catalog keys only.

### Practice last-item reminder (changed — not stored)

The last practice item (`index === of`) additionally shows a "the real questions start on the next
page" message; earlier practice items do not (FR-006). Driven by existing `index`/`of` props; adds
one localized catalog key. No new state or stored data.

### Completion Page Copy (changed — not stored)

End-of-survey thank-you states the survey is complete and the tab may be closed, and frames
continuing to the explanation walkthrough as optional with a clearly-labelled control (FR-008/
FR-009). Walkthrough and closing steps, and the `DebriefState` payload, are unchanged. Catalog keys
only.

### ClusterIntrusion Response — `selection` (changed — STORED)

The persisted cluster `Response` moves the selected cluster's representative words from a top-level
field to nested `selection.selectedClusterWords` (FR-012). The information is otherwise identical to
002 FR-016.

**Wire `Selection` (submission) — UNCHANGED:**

```ts
interface Selection {
  kind: 'candidate';
  value: string; // the chosen clusterId (or word)
}
```

**Persisted cluster `Response.selection` — new nested shape:**

```ts
// Stored shape (server write-time). Word responses keep the bare wire Selection.
type StoredSelection =
  | { kind: 'candidate'; value: string }                              // word responses
  | { kind: 'candidate'; value: string; selectedClusterWords: string[] }; // cluster responses
```

- The top-level `Response.selectedClusterWords` field is **removed** (greenfield — no migration, no
  backward-read; clarification 2026-07-13).
- `selectedClusterWords` is the representative words of the cluster named by `selection.value`,
  resolved server-side from `study.clusters` (same as 002). For a 5-n-gram(1,2) cluster these are
  five unigram/bigram terms (FR-014).
- All other `Response` fields (`studyId`, `participantId`, `itemId`, `taskType`, `clusterId`,
  `correct`, `submittedAt`, `timeTakenMs?`, `schemaVersion`) are unchanged. `schemaVersion` stays
  `1` (greenfield — no prior records to distinguish).

## Validation Rules

- `WelcomeContentSchema` gains the new optional field (default welcome only); researcher studies
  validate unchanged.
- Recording a cluster response MUST write `selection.selectedClusterWords` and MUST NOT write a
  top-level `selectedClusterWords` (SC-009).
- A cluster's `representativeWords` may be five terms each a unigram or bigram (FR-014); no new
  constraint is imposed on researcher clusters — this is fixture coverage, not a schema change.

## PII / Data-flow notes (Constitution II)

- `selection.selectedClusterWords` stores the same non-participant, in-boundary representative words
  as 002; the relocation does not change where the data lives (UC Volume) or expose it in logs,
  telemetry, or client storage.
- No new data leaves the governance boundary. HTML test targets exercise the existing server-side
  sanitiser (002) — no new untrusted boundary.
