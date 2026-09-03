# Phase 1 Data Model: Welcome Home Page & Document Formatting

This feature is additive to the feature-001 data model. Only the deltas are described here; all
unchanged entities (Study, Session, Cluster, WordIntrusionItem, SessionAssignment, PracticeResponse,
progress derivation, ground-truth secrecy) carry over unchanged. **Invariant preserved**: nothing in
`shared/types.ts` carries ground truth; the intruder is revealed only by the debrief after
completion.

## New / changed entities

### WelcomeContent (new — researcher-authored, FR-002/FR-012)

The greeting + what/why shown on the welcome home page. Authored per study; a localized built-in
default is used when absent. Contains no task answers or ground truth.

| Field      | Type     | Notes                                                       |
| ---------- | -------- | ----------------------------------------------------------- |
| `greeting` | `string` | Short greeting/title.                                       |
| `whatText` | `string` | Plain-language description of what the participant will do. |
| `whyText`  | `string` | Plain-language description of why participation matters.    |

- Source: `study.welcome` (optional) in `study.json`. When missing, the server supplies the built-in
  default in the deployment language from `shared/i18n.ts` (FR-012).
- Researcher-authored: displayed exactly as authored, never translated by the language setting
  (FR-015). Only the fallback default is localized.

### Survey Language (new — deployment setting, FR-013–FR-015)

| Field      | Type           | Notes                                                 |
| ---------- | -------------- | ----------------------------------------------------- |
| `language` | `'nl' \| 'en'` | App-wide, from `SURVEY_LANGUAGE` env; default `'en'`. |

- Not per-study, not participant-selectable. Selects which set of built-in strings (`shared/i18n.ts`)
  is used. The client reads it from `SURVEY_LANGUAGE` at build time; server-generated defaults read
  the same env var at runtime.

### ClientClusterItem (changed — FR-006/FR-007)

`targetText: string` → **`targetHtml: string`** (the server-sanitized safe-subset HTML string).
The client renders it inertly. Plain-text documents sanitize to readable escaped text (FR-008);
malformed markup degrades to readable text with no raw markup leaked (FR-009). `targetTextId`,
`candidates`, and all other fields are unchanged. `ClientPracticeItem` (cluster variant) changes the
same way.

### SessionState (changed — welcome phase, US1)

- `Phase` gains a leading `'welcome'`. `current` gains a variant:
  `{ phase: 'welcome'; welcome: WelcomeContent }`.
- The `welcome` phase is returned only at the very start (no real items answered, no practice
  attempted, `welcome` not yet acknowledged). All other phases behave as before.
- `progress` is `{ answered: 0, total: N }` during `welcome`; showing welcome never resets or
  duplicates recorded progress (FR-005).

### Response — persisted (changed — FR-016)

For **cluster** responses only, add:

| Field                  | Type       | Notes                                                         |
| ---------------------- | ---------- | ------------------------------------------------------------- |
| `selectedClusterWords` | `string[]` | Representative words of the cluster the participant selected. |

- Resolved server-side from `study.clusters` for `selection.value` (the chosen clusterId).
- Additive; all existing fields (`selection.value`, `clusterId` = intruder linkage, `correct`,
  `submittedAt`, `schemaVersion`) unchanged. Word responses unchanged. Stored in the Volume only.

### DebriefExample (changed — session-layout re-render, FR-019)

Extended so the walkthrough can reproduce the session layout read-only:

| Field (added)    | Type                                                     | Applies to | Notes                                               |
| ---------------- | -------------------------------------------------------- | ---------- | --------------------------------------------------- |
| `candidateWords` | `string[]`                                               | word       | The words shown for the item (session order).       |
| `targetHtml`     | `string`                                                 | cluster    | Server-sanitized document HTML (same as live item). |
| `candidates`     | `{ clusterId: string; representativeWords: string[] }[]` | cluster    | The candidate blocks shown for the item.            |

- Existing fields unchanged: `itemId`, `taskType`, `yourSelection`, `correctIntruder`, `correct`,
  `clusterValidityExplanation`. `correctIntruder` remains the only ground-truth field and is exposed
  only after completion (R5).

### DebriefState (changed — coverage, FR-019)

`examples` now contains **all** answered real items in session order (word items then cluster items),
not a random capped sample. Still no score, pass/fail, or aggregate statistics.

## Storage / study.json deltas

- `study.json` gains optional top-level `welcome?: { greeting, whatText, whyText }` (all non-empty
  strings when present).
- `clusterItems[].targetText` and `practice.cluster[].targetText` remain `string` but are now
  interpreted as **researcher-authored HTML** (sanitized server-side before display). Existing
  plain-text values remain valid and render unchanged.
- Persisted cluster `Response` JSON gains `selectedClusterWords: string[]`. `schemaVersion` stays
  `1` (additive, backward-compatible read).

See `contracts/storage.md` and `contracts/api.md` for the concrete shapes.
