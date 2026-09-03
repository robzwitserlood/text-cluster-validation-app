---
description: 'Task list for Cluster Validation via Intrusion Tasks'
---

# Tasks: Cluster Validation via Intrusion Tasks

**Input**: Design documents from `/specs/001-cluster-validation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/storage.md, quickstart.md

**Tests**: INCLUDED — the constitution workflow gates and research R13 / quickstart §5 explicitly
require vitest unit tests and Playwright smoke/e2e (no-leak trace, keyboard-only, gating, dedupe).

**Organization**: Tasks are grouped by user story (spec.md priorities P1→P3) so each story can be
implemented and tested independently. The app is a server-driven phase machine on the existing
AppKit monorepo (`client/`, `server/`, `shared/`); several core services are created in US1 and
**extended** (not rewritten) by later stories — those extensions are sequential, never `[P]`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US6, mapping to the spec's user stories
- All paths are repository-root-relative

## Path Conventions

- `client/src/{routes,components,hooks,lib}`, `server/src/{routes,services,lib}`, `shared/`,
  `tests/unit/`, `tests/smoke.spec.ts` (per plan.md "Source Code").
- Storage prefix is **always** server-built: `text_cluster_validation/${STUDY_ID}/…` (storage.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project structure, plugin/config cleanup, test tooling.

- [x] T001 Create the source-tree directories from plan.md: `server/src/{routes,services,lib}`, `client/src/{components,hooks,lib}`, and `tests/unit/` (keep existing `shared/`)
- [x] T002 [P] Remove the unused Analytics plugin (R11): drop `analytics` from the plugins array and import in `server/server.ts`, and remove its entries from `appkit.plugins.json`, `app.yaml`, and `databricks.yml`; then run `npm run sync && npm run typegen` so `shared/appkit-types/analytics.d.ts` is regenerated/dropped — the app declares only Files + Server
- [x] T003 [P] Add `STUDY_ID` (and optional `STUDY_OWNER_IDS`) to `.env.example` with the shared-root note from quickstart §1; keep `DATABRICKS_VOLUME_FILES=/Volumes/dev/raw/landing`
- [x] T004 [P] Ensure test tooling is ready: confirm `vitest.config.ts` includes `tests/unit/**`, and add a Playwright config plus a `tests/smoke.spec.ts` placeholder (scripts already exist in `package.json`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data contracts, study loading, and client primitives that EVERY user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 [P] Define client-facing contract types in `shared/types.ts` — `Phase`, `Selection`, `ClientWordItem`, `ClientClusterItem`, `ClientPracticeItem`, `SessionState` (+ `current` union), `SubmitResult`, `DebriefExample`, `DebriefState` (data-model.md "Client-facing item DTOs" + "Debrief DTOs"); **no ground-truth fields**
- [x] T006 [P] Define shared zod schemas in `shared/schemas.ts` — `SelectionSchema`, `SubmitRequestSchema` (POST `/api/responses` body), and a UUID-v4 `participantId` validator (contracts/api.md cross-cutting rules)
- [x] T007 Implement `server/src/services/studyLoader.ts` — server-only Study graph types (`Study`, `StudyConfig`, `Session`, `Cluster`, `WordIntrusionItem`, `ClusterIntrusionItem`, `Practice*Item`) with zod validation; load `text_cluster_validation/${process.env.STUDY_ID}/study/study.json` via the Files plugin; assert `study.studyId === STUDY_ID`; withhold malformed word items (missing/duplicate intruder, fewer than `max(3, wordCount ?? config.wordCandidatesPerItem)` candidates) with a notice (FR-016); ground truth never returned to client (data-model.md, storage.md, R5)
- [x] T008 [P] Implement `server/src/lib/shuffle.ts` — seeded deterministic shuffle keyed by `participantId + itemId` (R6); same participant+item → identical order across calls; differs across participants
- [x] T009 [P] Implement `client/src/hooks/useParticipantId.ts` — read or generate `crypto.randomUUID()` in `localStorage["participantId"]` and expose it for the `X-Participant-Id` header (FR-012, R3)
- [x] T010 Implement `client/src/lib/api.ts` — typed fetch wrappers for `GET /api/session`, `POST /api/responses`, `GET /api/debrief`; attach `X-Participant-Id` from `useParticipantId`; generic error mapping with no PII (contracts/api.md, R10)

**Checkpoint**: Contracts, study loader, and client primitives ready — user stories can begin.

---

## Phase 3: User Story 1 - Complete a word intrusion task (Priority: P1) 🎯 MVP

**Goal**: A participant sees word-intrusion instructions → 2 practice → real word items, selects one
word per item, submits, and each answer is durably recorded (practice stored separately).

**Independent Test**: Load a single word intrusion item, select a word, submit, and confirm the
response (chosen word + item id + timestamp + server-computed correctness) is durably recorded and
the participant advances to the next item or a completion state.

### Tests for User Story 1 ⚠️ (write first, ensure they fail)

- [x] T011 [P] [US1] `tests/unit/studyLoader.test.ts` — valid study loads; a malformed word item (missing/duplicate intruder, too few candidates) is withheld; `STUDY_ID`/`studyId` mismatch is rejected (FR-001, FR-016)
- [x] T012 [P] [US1] `tests/unit/shuffle.test.ts` — order is deterministic and stable per `participantId+itemId`, differs across participants, and intruder position is not fixed (FR-003, R6)
- [x] T013 [P] [US1] `tests/unit/sessionService.test.ts` — first visit assigns the least-utilized Session and writes the assignment once (`overwrite:false`, immutable on re-read); word phase order is `word-instructions → word-practice(2) → word-items`; `progress` counts real items only (FR-023, FR-007, FR-011)
- [x] T014 [P] [US1] `tests/unit/responseService.test.ts` — a word Response is recorded with `correct` computed server-side; writes are idempotent per `(participant,item)`; the returned `SubmitResult` and client DTOs contain **no** intruder field; a practice attempt writes a `PracticeResponse` under `practice-responses/` (not `responses/`) and is excluded from `progress`/K (FR-005, FR-009, FR-011, R5)

### Implementation for User Story 1

- [x] T015 [US1] Implement `server/src/services/sessionService.ts` — init Files client; first-visit least-utilized Session assignment (list `session-assignments/`, write `{participantId}.json` with `overwrite:false`, immutable) (FR-023, R14); read assignment; list `responses/{participantId}/` for answered ids; compute `progress` over the assigned Session's real items; phase resolver for the **word** phases returning seeded-shuffled `ClientWordItem`/`ClientPracticeItem` (via T008) with no ground truth (data-model.md, R5/R6)
- [x] T016 [US1] Implement `server/src/services/responseService.ts` — reject a missing/invalid selection (nothing recorded); compute `correct` server-side vs ground truth; write `responses/{participantId}/{itemId}.json` with `overwrite:false` (idempotent, FR-009); record practice as `practice-responses/{participantId}/{practiceId}.json` (`isPractice:true`, silent, excluded from K/progress) (FR-002, FR-005, FR-009, FR-011)
- [x] T017 [US1] Implement `server/src/routes/session.ts` — `GET /api/session`: validate `X-Participant-Id` UUID (400 otherwise); return `SessionState` from `sessionService`; emit **no** cluster content while in a word phase (contracts/api.md, FR-022)
- [x] T018 [US1] Implement `server/src/routes/responses.ts` and register routes — `POST /api/responses`: validate header + `SubmitRequestSchema` (422 on failure); dispatch real vs practice to `responseService`; return `SubmitResult { recorded, next }` with no `correct` (R5); wire `session.ts` + `responses.ts` into `appkit.server.extend(...)` in `server/server.ts`
- [x] T019 [P] [US1] Implement `client/src/components/TaskItem.tsx` — keyboard radio-group single-select candidate renderer (arrow keys, Space/Enter, visible focus rings), with loading/empty/error states; forced choice that blocks an empty submit (FR-002, FR-015, R12)
- [x] T020 [P] [US1] Implement `client/src/components/Instructions.tsx` — per-task instructions screen with the "answers are final" and single-device/single-browser resume warnings (FR-012, US4.4); makes **no** mention of practice recording (FR-011)
- [x] T021 [P] [US1] Implement `client/src/components/PracticeItem.tsx` — practice renderer reusing `TaskItem`, showing the teaching `explanation` after submit (FR-011, exempt from FR-021)
- [x] T022 [US1] Implement `client/src/routes/index.tsx` — server-driven flow page: fetch `GET /api/session`, render `Instructions`/`PracticeItem`/`TaskItem` by `phase`, submit via `api.ts`, advance using `next`; explicit loading/empty/error states (US1, FR-007)

**Checkpoint**: Word instructions → 2 practice → word items all work; responses and practice records are written to the correct, separate paths.

---

## Phase 4: User Story 2 - Complete a cluster intrusion task (Priority: P2)

**Goal**: After all word items are answered, the participant completes cluster-intrusion
(instructions → 2 practice → real items), selecting the intruding cluster; gating is server-enforced.

**Independent Test**: Load a single cluster intrusion item, select the intruding cluster, submit,
and confirm the response is recorded with item id, selection, correctness, and timestamp.

### Tests for User Story 2 ⚠️

- [x] T023 [P] [US2] `tests/unit/sessionService.test.ts` (extend) — cluster phases are unreachable until all assigned word items are answered; afterwards `cluster-instructions → cluster-practice(2) → cluster-items`; no cluster content is serialized during the word phase (FR-022, R7)
- [x] T024 [P] [US2] `tests/unit/responseService.test.ts` (extend) — cluster Response correctness is computed vs `intruderClusterId`; submitting a cluster item while word items remain returns `409 phase_locked` (FR-004, FR-022)
- [x] T024a [P] [US2] `tests/unit/studyLoader.test.ts` (extend) — a malformed cluster item (candidate count < `clusterCandidatesPerItem`, `intruderClusterId` not among candidates, or an unresolved cluster id) is withheld with a notice, is not shown, and does NOT abort the rest of the study load (FR-016, parity with the word-item case in T011)

### Implementation for User Story 2

- [x] T025 [US2] Extend `server/src/services/studyLoader.ts` — validate `ClusterIntrusionItem` (candidate count ≥ `clusterCandidatesPerItem`, `intruderClusterId ∈ candidateClusterIds`, all ids resolve to a `Cluster`); **withhold malformed cluster items (too few candidates, intruder not among candidates, or an unresolved cluster id) with a clear notice rather than failing the load (FR-016)**; build `ClientClusterItem` (targetText + candidates as `representativeWords`, seeded-shuffled, intruder unmarked) (data-model.md, FR-016) — DTO mapping lives in `sessionService.ts` (`toClientClusterItem`) alongside `toClientWordItem`, since the seeded shuffle needs the request-time `participantId`
- [x] T026 [US2] Extend `server/src/services/sessionService.ts` — add cluster phases to the resolver once all word items are answered; enforce FR-022 ordering; emit `ClientClusterItem`/cluster `ClientPracticeItem`
- [x] T027 [US2] Extend `server/src/routes/responses.ts` — return `409 Conflict` (`code: "phase_locked"`) for a cluster-phase submission while word items remain unanswered (contracts/api.md, FR-022) — enforced in `responseService.recordResponse` via `assertClusterSegmentUnlocked`; the route already maps `ResponseError(409, 'phase_locked')`
- [x] T028 [P] [US2] Extend `client/src/components/TaskItem.tsx` — render cluster candidates (each a block of representative words) with the same radio-group semantics, target text shown above (FR-004, FR-015) — already satisfied in US1: `TaskItem` accepts `targetText` + per-candidate `ReactNode` labels
- [x] T029 [US2] Extend `client/src/routes/index.tsx` — render `cluster-instructions`/`cluster-practice`/`cluster-items` phases using the same components — already satisfied in US1: `PhaseView` handles all three cluster phases

**Checkpoint**: The full word-then-cluster flow works with server-enforced phase gating.

---

## Phase 5: User Story 3 - See feedback after completing the form (Priority: P2)

**Goal**: After finishing all assigned items, the participant sees a debrief with sampled items,
their own selection, the correct intruder, and a cluster-framed explanation — never earlier.

**Independent Test**: Complete a short session, reach completion, and confirm the debrief shows the
participant's own selections, the correct answers for those example items, and a plain-language
explanation of what each result indicates about that cluster's validity.

### Tests for User Story 3 ⚠️

- [x] T030 [P] [US3] `tests/unit/sessionService.test.ts` (extend) — debrief is reachable only after all assigned items are answered; `GET /api/debrief` before completion returns `409 not_complete`; sample is up to `config.debriefSampleSize` (all if fewer answered); `correctIntruder` is exposed **only** here (FR-019, FR-021, R5)

### Implementation for User Story 3

- [x] T031 [US3] Extend `server/src/services/sessionService.ts` — `buildDebrief` builds `DebriefState` from a deterministic per-participant sample (≤ `config.debriefSampleSize`, R6) of answered items: `yourSelection`, `correctIntruder`, `correct`, and a cluster-framed `clusterValidityExplanation` (FR-019, FR-020); throws `DebriefError(409, not_complete)` before completion. The terminal phase stays `complete` (api.md) — the debrief is served by the dedicated endpoint, not a new phase value.
- [x] T032 [US3] Implement `server/src/routes/debrief.ts` and register it — `GET /api/debrief`: validate header; `409 not_complete` before completion; otherwise return `DebriefState`; wired into `appkit.server.extend(...)` in `server/server.ts` (contracts/api.md)
- [x] T033 [P] [US3] Implement `client/src/components/Debrief.tsx` — render sampled examples (your pick, correct intruder, cluster-validity explanation), framed around the cluster not the participant; no score, pass/fail, or aggregate stats (FR-020, Edge Cases)
- [x] T034 [US3] Extend `client/src/routes/index.tsx` — on `phase === "debrief" | "complete"`, fetch `GET /api/debrief` and render `Debrief`

**Checkpoint**: Completion reveals the debrief; correct answers are never shown before completion.

---

## Phase 6: User Story 4 - Work through and resume a validation session (Priority: P3)

**Goal**: The participant sees progress, can pause, and resumes at the next unanswered item without
losing or repeating completed responses.

**Independent Test**: Start a multi-item session, complete some items, leave, return, and confirm
resume at the first unanswered item with prior responses retained and a correct progress indicator.

### Tests for User Story 4 ⚠️

- [x] T035 [P] [US4] `tests/unit/sessionService.test.ts` (extend) — resume returns the first unanswered item; completed items are not reshown; `progress` updates after each submit; once all assigned items are answered the completion state stops presenting items (FR-007, FR-008, FR-010)

### Implementation for User Story 4

- [x] T036 [P] [US4] Implement `client/src/components/ProgressBar.tsx` — render items completed/remaining from `SessionState.progress` (FR-007)
- [x] T037 [US4] Extend `client/src/routes/index.tsx` — mount `ProgressBar`; ensure the opening instructions state that submitted answers are final and that resume is single-device/single-browser (FR-012, US4.4); resume lands at the next unanswered item (server-derived in `sessionService`) — instructions warnings already satisfied by `Instructions.tsx` (T020); resume is server-derived in `sessionService` (T015)

**Checkpoint**: Progress is visible and resume works across the same browser.

---

## Phase 7: User Story 5 - Retrieve responses to quantify validity (Priority: P3)

**Goal**: Study owners retrieve the complete raw response set via governed UC access for downstream
validity quantification (the app computes no metrics).

**Independent Test**: After responses exist, retrieve the complete set and confirm every response
carries participant, item, cluster, selection, correctness, and timestamp for per-cluster analysis.

### Tests for User Story 5 ⚠️

- [x] T038 [P] [US5] `tests/unit/responseService.test.ts` (extend) — a persisted Response carries `studyId`, `participantId`, `itemId`, `clusterId`, `taskType`, `selection`, `correct`, `submittedAt`, enabling per-cluster aggregation downstream (FR-005, FR-018, SC-005)

### Implementation for User Story 5

- [x] T039 [P] [US5] Document study-owner retrieval via Unity Catalog read grants in `specs/001-cluster-validation/quickstart.md` "Retrieving responses" and confirm `databricks.yml` grants the app `WRITE_VOLUME` on `dev.raw.landing` (R9, FR-013, FR-018) — quickstart now documents the `GRANT … READ VOLUME` least-privilege model; `databricks.yml` `WRITE_VOLUME` on `dev.raw.landing` confirmed (`resources.app.resources[files]`)
- [ ] T040 [US5] (Optional, may be deferred) Implement `server/src/routes/admin.ts` — `GET /api/admin/export` streaming all Responses as NDJSON, gated to `STUDY_OWNER_IDS` via platform identity (`403` otherwise); register in `server/server.ts` (contracts/api.md — optional enhancement, not required for US5) — **DEFERRED**: UC read grants (T039) satisfy US5; build only if a self-service export endpoint is later required

**Checkpoint**: The full raw response set is retrievable and analysis-complete.

---

## Phase 8: User Story 6 - Trace validation results back to MLFlow experiments (Priority: P3)

**Goal**: Each cluster references its source MLFlow experiment/run so judgments can be grouped by
cluster and traced to the originating run, including clusters from different runs in one study.

**Independent Test**: Retrieve responses grouped by cluster; confirm each cluster carries its MLFlow
experiment/run reference and that two clusters referencing different runs are distinguished.

### Tests for User Story 6 ⚠️

- [x] T041 [P] [US6] `tests/unit/studyLoader.test.ts` (extend) — clusters accept optional `mlflowExperimentId`/`mlflowRunId`; two clusters referencing different runs both load and remain distinguishable (US6 acceptance, data-model.md)

### Implementation for User Story 6

- [x] T042 [P] [US6] Extend `server/src/services/studyLoader.ts` — parse and retain optional `mlflowExperimentId`/`mlflowRunId` on each `Cluster` (data-model.md) — already satisfied: `Cluster` interface + `ClusterSchema` carry both optional fields, retained on `study.clusters`
- [x] T043 [US6] Verify `server/src/services/responseService.ts` writes `Response.clusterId` so each response links to its `Cluster` (and thus its MLFlow run) for downstream grouping (FR-018, US6) — verified: word responses write `wordItem.clusterId`, cluster responses write `clusterItem.intruderClusterId`, both persisted on every `Response`

**Checkpoint**: Responses are traceable to the MLFlow run that produced each cluster.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: PII hygiene, accessibility, end-to-end safety, and the merge gates.

- [x] T044 [P] PII-hygiene pass across `server/src/routes/` and `server/src/services/` (R10, FR-014): no cluster text, participant id, or selections in logs, telemetry, or error bodies; client errors are generic — add a `tests/unit/` assertion guarding it — **done**: audit confirmed error bodies are static (`lib/http.ts`), the only telemetry is a count-only `console.warn` (`studyProvider.ts`), and DTO mappers drop ground truth; guarded by `tests/unit/piiHygiene.test.ts` (generic error bodies + telemetry-carries-no-PII)
- [x] T045 [P] Implement `tests/smoke.spec.ts` (Playwright) — full flow word→cluster→debrief; keyboard-only completion (SC-006); resume mid-session; debrief only after completion (SC-008); network-trace assertion that no `/api/session` or `/api/responses` payload contains an intruder field before debrief (R13, FR-021) — **done**: `tests/smoke.spec.ts` + self-contained e2e harness (`tests/e2e/harness.ts` mounts the REAL route handlers over in-memory storage seeded with `tests/e2e/fixtures/study.ts`, serving the built client); `webServer` wired in `playwright.config.ts`. The full flow, phase progression, no-leak invariant, and debrief gating were verified at the API level against the harness; the headed/headless browser run executes in CI (browser binary required)
- [x] T046 [P] Accessibility verification across `client/src/components/` — focus visibility, contrast, and radio-group semantics in `TaskItem`/`PracticeItem`/`Instructions`/`Debrief` (FR-015, SC-006, Principle I) — **verified**: `TaskItem` uses `RadioGroup`/`RadioGroupItem` with an `aria-label`, `Label htmlFor` association, and `focus-within` rings; all components use `@databricks/appkit-ui` theme tokens for contrast; keyboard operability is exercised end-to-end by the T045 keyboard-only flow
- [x] T047 Run `specs/001-cluster-validation/quickstart.md` §4 acceptance checks and §5 quality gates (`npm run typecheck && npm run lint && npm run format && npm run test`) — all green before merge — **done**: typecheck ✓, lint ✓ (0 errors), format ✓ (prettier-ignored the codegen-managed `routeTree.gen.ts` + `appkit.plugins.json`), vitest ✓ (47 tests); Playwright smoke runs in CI (browser binary required). §4 acceptance scenarios validated at the API level via the harness
- [x] T048 [P] Confirm `databricks.yml`/`app.yaml` declare only Files + Server resources (no analytics/SQL warehouse) with the `WRITE_VOLUME` grant on `dev.raw.landing` (R9, R11) — **confirmed**: `databricks.yml` grants only the `files` VOLUME resource `WRITE_VOLUME` on `dev.raw.landing`; `app.yaml` binds only `DATABRICKS_VOLUME_FILES` (from `files`) + `STUDY_ID` (no warehouse env); `server/server.ts` activates only `files()` + `server()`. (`appkit.plugins.json` is the sync-generated plugin catalog, not a grant)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**.
- **User Stories (Phase 3–8)**: All depend on Foundational. US1 is the MVP. Because the app is a
  single server-driven phase machine, US2/US3/US4 **extend** `sessionService.ts`,
  `responseService.ts`, `routes/responses.ts`, and `routes/index.tsx` created in US1 — so they run
  **after** US1 (priority order P1 → P2 → P3), not fully in parallel with it.
- **Polish (Phase 9)**: Depends on the desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Foundational only. Independently testable (word flow end-to-end).
- **US2 (P2)**: Builds on US1's services/routes/flow page (extends the phase machine for cluster
  phases). Independently testable once present (cluster item record).
- **US3 (P2)**: Builds on US1 (and US2 for a full sample). Independently testable (debrief after a
  short completed session).
- **US4 (P3)**: Builds on US1 derivation (resume is already server-side); adds progress UI + notices.
- **US5 (P3)**: Depends on recorded responses (US1+). Mostly storage/docs + optional export.
- **US6 (P3)**: Depends on study loading + response `clusterId` (US1). Adds optional MLFlow fields.

### Within Each User Story

- Tests first (must fail), then services, then routes, then client components/flow wiring.
- Same-file extensions across stories are sequential (never `[P]`).

### Parallel Opportunities

- Setup: T002, T003, T004 in parallel.
- Foundational: T005, T006, T008, T009 in parallel (T007 then T010 follow).
- US1 tests T011–T014 in parallel; US1 components T019, T020, T021 in parallel.
- Polish: T044, T045, T046, T048 in parallel.

---

## Parallel Example: User Story 1

```bash
# Tests for US1 together (different files):
Task: "tests/unit/studyLoader.test.ts — load + malformed-item withholding (T011)"
Task: "tests/unit/shuffle.test.ts — deterministic seeded shuffle (T012)"
Task: "tests/unit/sessionService.test.ts — assignment + word phase order (T013)"
Task: "tests/unit/responseService.test.ts — idempotent write + DTO stripping (T014)"

# Client components for US1 together (different files):
Task: "client/src/components/TaskItem.tsx (T019)"
Task: "client/src/components/Instructions.tsx (T020)"
Task: "client/src/components/PracticeItem.tsx (T021)"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup
2. Phase 2: Foundational (CRITICAL — blocks all stories)
3. Phase 3: US1 — word intrusion end-to-end
4. **STOP and VALIDATE**: record a word response and a separate practice record in the Volume
5. Deploy/demo — US1 already produces coherence-validation data on its own

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → word intrusion (MVP) → demo
3. US2 → cluster intrusion with gating → demo
4. US3 → debrief → demo
5. US4 → progress + resume → demo
6. US5 → governed retrieval → US6 → MLFlow traceability
7. Phase 9 polish → all merge gates green

---

## Notes

- `[P]` = different files, no dependency on incomplete tasks.
- `[Story]` labels map tasks to spec.md user stories for traceability.
- Ground truth (intruder) lives only in `study.json` and server-computed `correct`; it must never
  appear in client DTOs before the debrief — guarded by T014 and the T045 no-leak trace.
- All storage paths are server-built under `text_cluster_validation/${STUDY_ID}/`; no client-supplied
  path segment beyond the validated participant UUID.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
