# Tasks: Personal Demo Refactor

**Input**: Design documents from `/specs/008-personal-demo-refactor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Test adaptation tasks are included in US4 (functional verification). No new tests are requested — existing tests are adapted for the new infrastructure.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Remove Databricks dependencies, install new packages, update configuration

- [x] T001 Remove Databricks config files: `databricks.yml`, `app.yaml`, `appkit.plugins.json` and the `.databricks/` directory
- [x] T002 [P] Remove `@databricks/appkit`, `@databricks/appkit-ui`, `@databricks/sdk-experimental`, `next-themes`, `@ast-grep/napi`, `babel-plugin-react-compiler`, and `tsdown` from `server/package.json` and `client/package.json`
- [x] T003 [P] Add `@aws-sdk/client-s3` to `server/package.json` dependencies
- [x] T004 [P] Remove `shared/appkit-types/` directory entirely
- [x] T005 [P] Rewrite `.env.example` with Scaleway configuration variables (SCALEWAY_BUCKET, SCALEWAY_ENDPOINT, SCALEWAY_REGION, STUDY_ID, SURVEY_LANGUAGE, PORT) per research.md section 7
- [x] T006 Update root `package.json` scripts: replace `databricks app run` with `npm run dev` that starts `server/server-dev.ts` via `tsx`, update `build`/`start` scripts for standalone operation per research.md section 5
- [x] T007 Run `npm install` from repo root to install updated dependencies and verify no `@databricks/*` packages remain in `node_modules`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core storage adapter and standalone Express server infrastructure — MUST be complete before any user story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Create `S3Storage` interface in `server/src/lib/storage.ts` — replace existing `VolumeStorage` interface with an equivalent interface (`read`, `list`, `upload`, `exists`) per data-model.md and research.md section 9
- [x] T009 [P] Create `server/src/lib/config.ts` with config validation — read SCALEWAY_ENDPOINT, SCALEWAY_REGION, SCALEWAY_BUCKET, STUDY_ID, SURVEY_LANGUAGE, PORT from environment variables and validate all required fields at startup per research.md section 7
- [x] T010 Create `server/src/lib/scalewayStorage.ts` implementing the `S3Storage` interface via `@aws-sdk/client-s3` — `GetObjectCommand` for read, `ListObjectsV2Command` for list, `PutObjectCommand` with `IfNoneMatch: *` for idempotent uploads, `HeadObjectCommand` for exists, no credentials (unsigned requests) per research.md sections 1 and 9
- [x] T011 Rewrite `server/server.ts` as a standalone Express entry point — create Express app with `express.json()` middleware, initialize `S3Storage` adapter, load study via studyProvider, register API routes (`/api/session`, `/api/responses`, `/api/debrief`, `/api/health`), serve client static files in production mode per research.md section 8
- [x] T012 Create `server/server-dev.ts` as the development entry point — wrap `server.ts` Express app with Vite dev server middleware (`middlewareMode: true`) for single-process HMR dev serving per research.md section 5
- [x] T013 [P] Refactor `server/src/routes/session.ts` route handler to accept the new `S3Storage` dependency type in place of `VolumeStorage`
- [x] T014 [P] Refactor `server/src/routes/responses.ts` route handler to accept the new `S3Storage` dependency type in place of `VolumeStorage`
- [x] T015 [P] Refactor `server/src/routes/debrief.ts` route handler to accept the new `S3Storage` dependency type in place of `VolumeStorage`

**Checkpoint**: Foundation ready — server can start, storage adapter is functional, routes reference S3Storage. User story implementation can now begin.

---

## Phase 3: User Story 1 - Run Locally Without Databricks (Priority: P1) 🎯 MVP

**Goal**: The application starts with `npm run dev` and serves the survey on localhost without any Databricks workspace, credentials, or infrastructure.

**Independent Test**: Run `npm install && npm run dev` from a clean checkout; verify the server starts, the health endpoint responds at `/api/health`, and a styled error or welcome page loads in a browser at `http://localhost:3001` without any Databricks dependencies.

### Implementation for User Story 1

- [x] T016 [US1] Add `GET /api/health` endpoint in `server/server.ts` — return `{ status: "ok", studyId, uptime }` per contracts/api.md endpoint 4
- [x] T017 [US1] Implement startup error handling in `server/server.ts` — catch missing config, unreachable bucket, invalid study JSON; log detailed error to console; start a minimal HTTP server serving a static HTML error page for all routes when the study cannot load per FR-007 and research.md section 8
- [x] T018 [P] [US1] Update `client/vite.config.ts` — remove all `@databricks/appkit` references, add proxy for `/api/*` to `http://localhost:3001` per research.md section 5
- [x] T019 [P] [US1] Remove `client/src/components/apx/` directory entirely (AppKit-dependent chrome components)
- [x] T020 [US1] Refactor `client/src/main.tsx` — remove `ThemeProvider` import and wiring, remove `Toaster` from `@databricks/appkit-ui`, add Sonner `Toaster` from shadcn/ui per research.md section 3
- [x] T021 [US1] Refactor `client/src/ErrorBoundary.tsx` — replace `@databricks/appkit-ui` Card imports with shadcn/ui Card components
- [x] T022 [US1] Refactor `client/src/routes/__root.tsx` — rewrite layout to remove `PblChrome`, `ThemeProvider`, and `@databricks/appkit-ui` imports; replace with a minimal shadcn/ui-based layout per research.md section 3 and 4
- [x] T023 [US1] Refactor `client/src/routes/complete.tsx` — replace `@databricks/appkit-ui` imports (Card, Button, Badge, etc.) with shadcn/ui equivalents
- [x] T024 [US1] Refactor `client/src/components/TaskItem.tsx` — replace `@databricks/appkit-ui` imports (RadioGroup, Button, Card, Spinner, Label, Empty, Badge) with shadcn/ui equivalents
- [x] T025 [US1] Refactor `client/src/components/PracticeItem.tsx` — replace `@databricks/appkit-ui` imports with shadcn/ui equivalents
- [x] T026 [US1] Refactor `client/src/components/Welcome.tsx` — replace `@databricks/appkit-ui` Card imports with shadcn/ui Card
- [x] T027 [US1] Refactor `client/src/components/Instructions.tsx` — replace `@databricks/appkit-ui` imports with shadcn/ui equivalents
- [x] T028 [US1] Refactor `client/src/components/Debrief.tsx` — replace `@databricks/appkit-ui` imports with shadcn/ui equivalents
- [x] T029 [US1] Refactor `client/src/components/LoadError.tsx` — replace `@databricks/appkit-ui` imports (Alert, Button) with shadcn/ui equivalents
- [x] T030 [US1] Refactor `client/src/components/InlineErrorAlert.tsx` — replace `@databricks/appkit-ui` Alert imports with shadcn/ui Alert
- [x] T031 [US1] Refactor `client/src/components/LoadingMessage.tsx` — replace `@databricks/appkit-ui` Spinner import with custom `Spinner` component (wrapping lucide `Loader2` with `animate-spin`)
- [x] T032 [US1] Refactor `client/src/components/ProgressBar.tsx` — replace `@databricks/appkit-ui` Progress import with shadcn/ui Progress
- [x] T033 [US1] Verify `npm run dev` starts both the Express API server and Vite dev server, and the browser loads the survey at `http://localhost:3001`

**Checkpoint**: User Story 1 complete — app runs locally, all pages render without AppKit, health check responds. Ready for storage integration.

---

## Phase 4: User Story 2 - Load Study and Store Responses via Scaleway Object Storage (Priority: P2)

**Goal**: Study data loads from a public Scaleway Object Storage bucket and participant responses are written back to it, with idempotent writes preventing overwrites.

**Independent Test**: Configure a Scaleway bucket with a valid study.json, run the app, complete a survey, and verify response JSON files appear in the bucket at the expected paths.

### Implementation for User Story 2

- [x] T034 [US2] Refactor `server/src/services/studyLoader.ts` to use `S3Storage` — replace Volume-based load with `storage.read()` using path builders from `server/src/lib/paths.ts` per data-model.md entity 1
- [x] T035 [US2] Refactor `server/src/services/studyProvider.ts` to accept `S3Storage` — memoized study loader that reads from the S3-compatible bucket at startup and validates study JSON per data-model.md entity 1 validation rules
- [x] T036 [US2] Refactor `server/src/services/sessionService.ts` to use `S3Storage` — replace Volume-based `list()` and `upload()` calls with `storage.list()` and `storage.upload()` for session assignment listing and `writeOnce()` per data-model.md entity 4
- [x] T037 [US2] Refactor `server/src/services/responseService.ts` to use `S3Storage` — replace Volume-based `upload()` with `storage.upload()` for writing response JSON and practice response JSON, preserving `writeOnce()` idempotency per data-model.md entities 2 and 3
- [x] T038 [US2] Implement `writeOnce()` idempotency via S3 `IfNoneMatch: *` in `server/src/lib/scalewayStorage.ts` — the `upload()` method with `overwrite: false` must set `IfNoneMatch: '*'` header to let S3 reject duplicate writes with 412 Precondition Failed per research.md section 9
- [x] T039 [US2] Integrate startup study loading into `server/server.ts` — at startup, call `studyProvider()` to load and validate the study from the S3 bucket; if study is missing or invalid, serve the browser error page per FR-002 and FR-007
- [x] T040 [US2] Verify full storage round-trip: upload a study.json to the S3 bucket, start the server (study loads), complete a practice and real item in the survey, verify response JSON files appear at `text_cluster_validation/{studyId}/responses/{participantId}/{itemId}.json` and practice responses at `text_cluster_validation/{studyId}/practice-responses/{participantId}/{practiceId}.json`

**Checkpoint**: User Story 2 complete — study loads from Scaleway bucket, responses are persisted idempotently, all survey data paths work.

---

## Phase 5: User Story 3 - Neutral, Non-Government Theming (Priority: P3)

**Goal**: The application uses a clean, neutral visual design with no PBL logos, Rijksoverheid ribbon, government color schemes, or PBL attribution text.

**Independent Test**: Visually inspect every page of the survey and confirm no PBL logos, Rijksoverheid ribbon, government color schemes, or PBL attribution text appear anywhere in the UI chrome.

### Implementation for User Story 3

- [x] T041 [US3] Rewrite `client/src/index.css` — remove `@databricks/appkit-ui/styles.css` import, remove all PBL CSS custom properties (`--pbl-*`), remove Rijkshuisstijl color tokens (#007bc7, PBL green, grey tones), use shadcn/ui neutral-base CSS variables per research.md section 4
- [x] T042 [US3] Replace font face declarations in `client/src/index.css` — remove `@font-face` rules for RijksoverheidSans, RijksoverheidSerif, and Fira Sans; use system-ui font stack (`system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`) per FR-015 and research.md section 4
- [x] T043 [US3] Remove PBL web font files from `client/public/fonts/` directory
- [x] T044 [US3] Update `shared/i18n.ts` — remove PBL-specific chrome strings (publisher name, government masthead text, footer attribution); replace with neutral application title strings keyed by `SURVEY_LANGUAGE` per FR-012 and FR-017
- [x] T045 [US3] Update `client/src/lib/i18n.tsx` — remove references to AppKit theme strings; ensure all UI chrome (header, footer, errors) uses neutral i18n keys from the updated shared/i18n.ts per FR-014
- [x] T046 [US3] Verify visual neutrality — load every page in the browser (welcome, word instructions/practice/task, cluster instructions/practice/task, completion/debrief) and confirm no PBL branding, government colors, or Rijkshuisstijl elements are present

**Checkpoint**: User Story 3 complete — application has a fully neutral, non-government visual identity with no PBL branding.

---

## Phase 6: User Story 4 - Preserved Survey Functionality (Priority: P1)

**Goal**: All existing survey flows (word intrusion, cluster intrusion, practice, progress tracking, debrief, pause/resume) work identically to the pre-refactored version with no regressions.

**Independent Test**: Run through the complete survey flow (welcome → word instructions → word practice → word task → cluster instructions → cluster practice → cluster task → completion/debrief) and verify every step behaves identically to the pre-refactored version.

### Implementation for User Story 4

- [x] T047 [P] [US4] Rewrite `tests/unit/helpers/fakeStorage.ts` to implement the new `S3Storage` interface (in-memory fake matching the S3Storage shape) per plan.md tests section
- [x] T048 [P] [US4] Adapt `tests/unit/studyLoader.test.ts` to test against `S3Storage` interface using the new `fakeStorage` helper
- [x] T049 [P] [US4] Adapt `tests/unit/sessionService.test.ts` to test against `S3Storage` interface using the new `fakeStorage` helper
- [x] T050 [P] [US4] Adapt `tests/unit/responseService.test.ts` to test against `S3Storage` interface using the new `fakeStorage` helper
- [x] T051 [P] [US4] Adapt `tests/unit/shuffle.test.ts` — verify shuffle behavior is unchanged (no storage dependency, but verify tests still pass)
- [x] T052 [P] [US4] Adapt `tests/unit/config.test.ts` to validate Scaleway config (endpoint, region, bucket) instead of Databricks config
- [x] T053 [P] [US4] Adapt `tests/unit/piiHygiene.test.ts` — update PII checks for standalone local context (no Databricks governance boundary)
- [x] T054 [P] [US4] Adapt `tests/unit/sanitizeHtml.test.ts` — verify HTML sanitization behavior is unchanged per FR-018 (no storage dependency expected)
- [x] T055 [US4] Rewrite `tests/e2e/harness.ts` — replace Databricks AppKit harness with Express + fake S3 storage harness for e2e tests per plan.md tests section
- [x] T056 [US4] Refactor `tests/smoke.spec.ts` — update harness import to use the rewritten e2e harness per plan.md tests section
- [x] T057 [US4] Run `npm run test` and verify all unit tests pass with the new `S3Storage` interface
- [x] T058 [US4] Run `npm run test:e2e` and verify smoke/e2e tests pass with the new standalone server
- [x] T059 [US4] Perform manual end-to-end walkthrough of the complete survey flow: welcome → word instructions → word practice → complete all word items → cluster instructions → cluster practice → complete all cluster items → debrief → complete; verify every step works identically to pre-refactor behavior per spec acceptance scenarios 1-6
- [x] T060 [US4] Verify pause/resume: start survey, answer a few items, close browser, reopen, verify progress is restored and participant continues from where they left off per US4 acceptance scenario 4
- [x] T061 [US4] Verify keyboard accessibility: navigate the entire survey flow using only keyboard; confirm focus rings, radio-group semantics, and tab order are preserved per US4 acceptance scenario 5
- [x] T062 [US4] Verify loading states: navigate between survey phases and confirm loading indicators appear during data fetching (no blank screens) per US4 acceptance scenario 6

**Checkpoint**: User Story 4 complete — all survey functionality verified, all tests pass, no regressions from pre-refactor behavior.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and cleanup

- [x] T063 [P] Run `npm run typecheck` from repo root and fix any TypeScript errors
- [x] T064 [P] Run `npm run lint` from repo root and fix any lint violations
- [x] T065 [P] Amend constitution from v1.0.0 to v2.0.0 — remove all Databricks-specific platform references; replace with standalone-local equivalents per plan.md Constitution Check and Complexity Tracking
- [x] T066 Update `README.md` — replace Databricks-specific setup instructions with the quickstart flow from `specs/008-personal-demo-refactor/quickstart.md` (npm install → .env config → npm run dev)
- [x] T067 Validate quickstart.md flow: perform a clean checkout, follow all steps in quickstart.md, confirm the app starts and the survey is functional within 30 seconds per SC-001
- [x] T068 Final cleanup — verify no `@databricks/*` references remain in any source file, configuration file, or documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T007) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion — delivers MVP (local app runs)
- **User Story 2 (Phase 4)**: Depends on US1 completion (needs running Express server to integrate storage)
- **User Story 3 (Phase 5)**: Depends on US1 completion (needs working client to apply theme) — can run in parallel with US2
- **User Story 4 (Phase 6)**: Depends on US1, US2, and US3 (needs all infrastructure and UI in place for full verification)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories. **Must complete first** — all other stories need the running app.
- **User Story 2 (P2)**: Can start after US1 complete — needs working server for storage integration. Independently testable with Scaleway bucket.
- **User Story 3 (P3)**: Can start after US1 complete — needs working client to apply theme. Independently testable via visual inspection. Can run in parallel with US2.
- **User Story 4 (P1)**: Can start after US1 + US2 + US3 — needs full infrastructure, storage, and UI for end-to-end verification.

### Within Each User Story

- Server tasks before client tasks (within their respective sections)
- Refactoring before verification
- Individual component refactoring tasks marked [P] can run in parallel

### Parallel Opportunities

- T002, T003, T004, T005 (Phase 1 setup) can run in parallel
- T009, T013, T014, T015 (Phase 2 foundational) can run in parallel
- T018-T032 (US1 component refactoring) are all in different files and can run in parallel after T016-T017
- T047-T054 (US4 unit test adaptation) can all run in parallel (different test files)
- US2 (Phase 4) and US3 (Phase 5) can run in parallel after US1 completes
- T063, T064, T065 (Phase 7 polish) can run in parallel

---

## Parallel Example: User Story 1

```bash
# After Phase 2 foundational is done and T016-T017 (server health + error handling) are complete,
# launch all client component refactoring tasks together:
Task: "Refactor client/src/main.tsx in client/src/main.tsx"
Task: "Refactor client/src/ErrorBoundary.tsx in client/src/ErrorBoundary.tsx"
Task: "Refactor client/src/routes/__root.tsx in client/src/routes/__root.tsx"
Task: "Refactor client/src/routes/complete.tsx in client/src/routes/complete.tsx"
Task: "Refactor client/src/components/TaskItem.tsx in client/src/components/TaskItem.tsx"
Task: "Refactor client/src/components/PracticeItem.tsx in client/src/components/PracticeItem.tsx"
Task: "Refactor client/src/components/Welcome.tsx in client/src/components/Welcome.tsx"
Task: "Refactor client/src/components/Instructions.tsx in client/src/components/Instructions.tsx"
Task: "Refactor client/src/components/Debrief.tsx in client/src/components/Debrief.tsx"
Task: "Refactor client/src/components/LoadError.tsx in client/src/components/LoadError.tsx"
Task: "Refactor client/src/components/InlineErrorAlert.tsx in client/src/components/InlineErrorAlert.tsx"
Task: "Refactor client/src/components/LoadingMessage.tsx in client/src/components/LoadingMessage.tsx"
Task: "Refactor client/src/components/ProgressBar.tsx in client/src/components/ProgressBar.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup — remove Databricks dependencies, add new packages
2. Complete Phase 2: Foundational — S3Storage adapter, Express server, route refactoring
3. Complete Phase 3: User Story 1 — server health endpoint, error handling, client component refactoring
4. **STOP and VALIDATE**: Run `npm run dev`, verify server starts, health check responds, survey pages render locally
5. This is the MVP — the app runs without Databricks, though study data comes from a stub/error state

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (S3Storage adapter, Express server)
2. Add User Story 1 → App runs locally without Databricks → **MVP milestone**
3. Add User Story 2 → Study loads from Scaleway, responses persist → **Data milestone**
4. Add User Story 3 → Neutral theme, no PBL branding → **Visual milestone**
5. Add User Story 4 → All tests pass, full survey flow verified → **Production-ready milestone**
6. Polish → Typecheck, lint, docs, constitution — final cleanup

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Developer A: User Story 1 (server + client refactoring, the bulk of the work)
3. Once US1 is done:
   - Developer A: User Story 2 (storage integration)
   - Developer B: User Story 3 (neutral theming)
4. After US2 + US3 done:
   - All developers: User Story 4 (testing + verification)
5. Polish phase: parallel per-developer

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- US2 and US3 can truly run in parallel after US1 completes
- US4 is gated by US1 + US2 + US3 — it's the integration verification phase
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All API endpoints must conform to contracts/api.md schemas
- All data entities must follow data-model.md storage paths