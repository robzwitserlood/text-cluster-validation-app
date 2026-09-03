# Storage Contract: Unity Catalog Volume Layout

**Feature**: `001-cluster-validation` | **Date**: 2026-06-24
**Updated**: 2026-06-24 — multi-study layout: all studies share the Volume root
`/Volumes/dev/raw/landing/text_cluster_validation/`; each Study writes to one distinct
`{studyId}/` subdirectory (study-first partitioning). One deployment serves one Study, named by
the `STUDY_ID` config (FR-017, Clarification 2026-06-24).
**Updated**: 2026-06-24 — added `practice-responses/` path for retained practice records (FR-011).
**Updated**: 2026-06-22 — added `session-assignments/` path (FR-023, R14); updated participant
identity references from `{participantHash}` to `{participantId}` (anonymous UUID, R3 rewrite).

The Volume is the single durable store of record (no database — R1). Accessed through the AppKit
Files plugin (`app.files("files")`) against the volume configured by `DATABRICKS_VOLUME_FILES`
(`app.yaml` → `valueFrom: files`; volume `/Volumes/dev/raw/landing` = securable `dev.raw.landing`
in `databricks.yml`).

**Multi-study tenancy (FR-017, Clarification 2026-06-24).** All studies persist under one shared
root, `<volume>/text_cluster_validation/`, and each Study occupies a single distinct subdirectory
`{studyId}/` whose name uniquely maps to that Study. One app deployment serves exactly one Study;
the per-Study subdirectory is named by the deployment-level `STUDY_ID` config and MUST equal the
`studyId` inside that deployment's `study.json` (validated on load). The app constructs the constant
prefix `text_cluster_validation/{STUDY_ID}/` server-side for every read and write; no client-supplied
path segment selects a study. Running two concurrent studies = two deployments, each with its own
URL and its own `STUDY_ID`, sharing this root without commingling data.

## Layout

```
<volume>/                                               # /Volumes/dev/raw/landing (securable dev.raw.landing)
  text_cluster_validation/                              # shared root for ALL studies
    {studyId}/                                          # one distinct subdir per Study (= STUDY_ID config)
      study/
        study.json                                      # Study (data-model.md) — read-only to the app
      session-assignments/
        {participantId}.json                            # SessionAssignment — one per participant
      responses/
        {participantId}/
          {itemId}.json                                 # one Response per file (immutable, idempotent)
      practice-responses/
        {participantId}/
          {practiceId}.json                             # one PracticeResponse per attempt (FR-011)
```

All paths below are shown relative to the per-Study subdirectory
`text_cluster_validation/{studyId}/`.

## `study/study.json` (input — produced upstream)

- Conforms to `Study` in data-model.md (clusters, Sessions, word/cluster items with ground-truth
  intruders, practice sets, `StudyConfig`).
- Loaded by the server on demand; validated with zod; malformed items are withheld (FR-016).
- **Never** sent verbatim to the client — only stripped DTOs are (R5).

## `session-assignments/{participantId}.json` (output — written once)

- Conforms to `SessionAssignment` in data-model.md.
- Written on a participant's **first request** when no assignment exists yet.
- Written with `upload(path, json, { overwrite: false })` — a concurrent first-visit race writes
  one file and the other is a no-op; both callers then read the same assignment.
- **Never overwritten**: a participant's assigned `sessionId` is immutable (FR-023, R14).
- `participantId` is the anonymous UUID v4 sent by the client in `X-Participant-Id` (R3). It is
  not linked to any real-world identity — no HMAC or further hashing is needed.
- The server uses this directory to count assignments per session for the least-utilized strategy
  (R14): `list("session-assignments/")` (within this Study's subdir) yields the set of assignment
  files, each named `{participantId}.json`, from which assignment counts per `sessionId` are tallied.

## `responses/{participantId}/{itemId}.json` (output)

- Conforms to `Response` in data-model.md.
- **Path encodes uniqueness**: within a Study's subdir, at most one file per
  `(participantId, itemId)` ⇒ one-response-per-participant-per-item (FR-009).
- Written with `upload(path, json, { overwrite: false })`; an existing file ⇒ idempotent no-op
  (R4).
- `participantId` is the same anonymous UUID used in the assignment path above.

## `practice-responses/{participantId}/{practiceId}.json` (output)

- Conforms to `PracticeResponse` in data-model.md (`isPractice: true`).
- Written when a participant submits a **practice** attempt; kept in a **separate** tree from
  `responses/` so practice is never confused with validity data and never enters per-cluster
  judgment counts (SC-005) or `progress.answered` (FR-011).
- **Path encodes uniqueness**: within a Study's subdir, at most one file per
  `(participantId, practiceId)`; written with `upload(path, json, { overwrite: false })` (idempotent).
- Retained and exposed to study owners via the **same UC read grants** as `responses/`, for
  downstream skill assessment. The app applies no threshold, flag, or gate (FR-011).
- Recording is **silent** — nothing about practice screening is surfaced to the participant.

## Access model (R9, Principle II)

- The app reads/writes as its **service principal** (granted `WRITE_VOLUME` in
  `databricks.yml`/`app.yaml`; `WRITE VOLUME` also permits reading volume files).
- The server **enforces path isolation** on two levels: (1) every path is prefixed with this
  deployment's own `text_cluster_validation/{STUDY_ID}/` — `STUDY_ID` is a server-side config, never
  client-supplied, so a deployment can only ever touch its own Study's subdirectory; (2) within that
  subdir a participant request can only resolve paths containing its own `participantId`. Path
  components are constructed server-side from the validated `STUDY_ID` and UUID; no client-supplied
  path segments beyond the UUID are trusted.
- **Study owners** retrieve the raw set via **Unity Catalog read grants** on the volume
  (governed, least-privilege) — satisfies FR-018/US5 without a privileged app route. Because each
  Study lives under a single `text_cluster_validation/{studyId}/` subtree, grants can be scoped per
  Study if desired.

## Resume & progress (FR-007, FR-008)

- Read `session-assignments/{participantId}.json` (within this Study's subdir) → get assigned
  `sessionId`.
- Resolve `Session` from Study → ordered `wordItemIds`, `clusterItemIds`.
- `list("responses/{participantId}/")` → set of answered `itemId`s in this Session.
- Next-unanswered item in the fixed order (word phase, then cluster phase) = the resume point.
- `progress.answered` = count of answered **real** items in the assigned Session (practice excluded).
- Resume is single-device/single-browser: the UUID lives in `localStorage`; clearing storage or
  switching devices starts a new participant (FR-012, Edge Cases). Session instructions must warn
  participants of this constraint.

## Invariants

| Invariant                              | Mechanism                                                                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No PII outside the Volume              | All study text, participant UUID, responses, and practice records live only here; no client persistence of sensitive data; no PII in logs (R10)                          |
| Per-Study isolation                    | Every path is prefixed with `text_cluster_validation/{STUDY_ID}/` from server-side config; one deployment can only touch its own Study's subtree (FR-017)                |
| ≤1 response per item                   | Deterministic path + `overwrite:false`                                                                                                                                   |
| Practice never counts as validity data | Separate `practice-responses/` tree; excluded from cluster K and `progress.answered` (FR-011)                                                                            |
| Stable session assignment              | Assignment written once with `overwrite:false`; never overwritten (FR-023)                                                                                               |
| Stable resume                          | Responses + assignment are the source of truth; session state derived, not stored                                                                                        |
| No answer leak at rest in client       | Ground truth only in `study.json` + server-computed `correct`; never in client DTOs                                                                                      |
| Auditable data flow                    | Four read/write paths under `text_cluster_validation/{studyId}/` (`study/`, `session-assignments/`, `responses/`, `practice-responses/`), documented here (Principle IV) |
