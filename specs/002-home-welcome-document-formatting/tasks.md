---
description: 'Task list for Welcome Home Page & Researcher-Specified Document Formatting'
---

# Tasks: Welcome Home Page & Researcher-Specified Document Formatting

**Input**: Design documents from `/specs/002-home-welcome-document-formatting/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/storage.md, quickstart.md

**Tests**: Included — the spec and plan explicitly request unit (vitest) and smoke (Playwright)
coverage for every slice (`sanitizeHtml`, `sessionService`, `responseService`, `studyLoader`,
`smoke.spec.ts`).

**Organization**: Tasks are grouped by user story so each story can be implemented and tested
independently. This feature is additive to feature 001; unchanged entities carry over.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4); omitted for Setup/Foundational/Cross-Cutting/Polish
- Exact file paths are included in every task

## Path Conventions

Web-app monorepo (per plan.md): `shared/`, `server/`, `client/`, `tests/` at repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Bring in the one new dependency and record the new deployment config.

- [x] T001 Install `sanitize-html` and `-D @types/sanitize-html` (updates `package.json` / `package-lock.json`) per quickstart.md §1
- [x] T002 [P] Document the new `SURVEY_LANGUAGE` (`nl`|`en`, default `en`) env var in `.env.example` and `README.md` (config section)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Deployment-language machinery (`shared/i18n.ts` catalog, shared config parser, client
provider). All stories depend on this: US1's localized default welcome, US3's chrome, and US4's
system-generated debrief copy are all keyed through the shared catalog.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

- [x] T003 [P] Create `shared/i18n.ts`: `type Locale = 'nl' | 'en'` and a typed `messages[locale]` catalog with keys for all built-in chrome (button/navigation labels, task prompts, system/notice/error copy, the built-in default welcome greeting/what/why, and the **two system-generated debrief explanation templates** — match and no-match variants, grouping-framed — per FR-020/FR-014); TypeScript must enforce key completeness across both locales (research.md R4)
- [x] T004 [P] Add shared language parsing for client/server config
- [x] T005 Create `server/src/lib/config.ts`: `parseSurveyLanguage(env)` reading `SURVEY_LANGUAGE`, validating `nl`|`en`, defaulting to `en` on unset/invalid (research.md R4, storage.md)
- [x] T006 Expose `SURVEY_LANGUAGE` to the Vite client bundle
- [x] T007 In `server/server.ts`, read `SURVEY_LANGUAGE` alongside `STUDY_ID` for server-generated default copy
- [x] T008 Create `client/src/lib/i18n.tsx`: a `LanguageProvider` + `t(key)` hook that uses the build-time language and looks up the shared `shared/i18n.ts` catalog
- [x] T009 Mount `LanguageProvider` in `client/src/routes/__root.tsx` with no config fetch (research.md R4)
- [x] T010 [P] Create `tests/unit/config.test.ts`: `parseSurveyLanguage` returns `nl`/`en` for valid input and defaults to `en` for unset/invalid values

**Checkpoint**: Language config resolvable server- and client-side; user stories can now begin.

---

## Phase 3: User Story 1 - Land on a welcoming home page (Priority: P1) 🎯 MVP

**Goal**: Show a researcher-authored (or localized-default) welcome page as the first screen at `/`,
with a single Begin control that advances into the existing flow without resetting returning
participants (FR-001–FR-005, FR-012).

**Independent Test**: Open the app as a first-time visitor → welcome page (greeting + what + why +
Begin) appears at `/` before any task; Begin → word instructions; reopen mid-session → land on the
current phase, not the welcome page.

### Tests for User Story 1

- [x] T011 [P] [US1] Extend `tests/unit/studyLoader.test.ts`: optional `study.welcome` parses when present and falls back to the localized built-in default when absent (FR-012)
- [x] T012 [P] [US1] Extend `tests/unit/sessionService.test.ts`: `resolveSessionState` returns the `welcome` phase only at the very start, and a returning in-progress participant (recorded progress or `welcome` ack) is not reset to welcome (FR-005)

### Implementation for User Story 1

- [x] T013 [P] [US1] In `shared/types.ts`: add `WelcomeContent { greeting, whatText, whyText }`, add leading `'welcome'` to `Phase`, add the `{ phase: 'welcome'; welcome: WelcomeContent }` `current` variant, and keep `progress` `{ answered: 0, total: N }` for welcome (data-model.md)
- [x] T014 [P] [US1] In `shared/schemas.ts`: add optional top-level `welcome` validation (each field a non-empty string when present) per storage.md
- [x] T015 [US1] In `server/src/services/studyLoader.ts`: parse optional `study.welcome`; leave unset when absent so the service can supply the default
- [x] T016 [US1] In `server/src/services/sessionService.ts`: return the `welcome` phase at session start (no real items answered, no practice attempted, `welcome` not yet acknowledged); populate `welcome` from `study.welcome` or the localized `shared/i18n.ts` default (FR-012)
- [x] T017 [US1] In `server/src/routes/session.ts`: accept the non-PII `welcome` value in the `X-Ack-Instructions` header (comma-separated with existing `word`/`cluster`) and use it only to advance past welcome (contracts/api.md)
- [x] T018 [P] [US1] Create `client/src/components/Welcome.tsx`: greeting/what/why + a single keyboard-reachable Begin control with visible focus, built from `@databricks/appkit-ui`, strings via `t()` (FR-002, FR-010, Constitution I)
- [x] T019 [US1] In `client/src/lib/flow-router.ts`: map `'welcome'` → `'/'` so the index route is the welcome route
- [x] T020 [US1] In `client/src/routes/index.tsx`: render `Welcome` when `phase === 'welcome'`, otherwise redirect to the phase route as today; Begin records the `welcome` ack (localStorage + `X-Ack-Instructions`) and calls `refreshAndNavigate()` (research.md R1)
- [x] T021 [US1] Extend `tests/smoke.spec.ts`: first-time visitor sees welcome at `/` then Begin → word instructions; welcome reveals no task answers (FR-004)

**Checkpoint**: US1 is independently functional — welcome page shows, Begin advances, resume is intact.

---

## Phase 4: User Story 2 - Read a properly formatted document (Priority: P1)

**Goal**: Render the cluster-intrusion target document with researcher-authored HTML formatting,
sanitized server-side to an inert presentational subset (FR-006–FR-011).

**Independent Test**: Load a cluster item whose `targetText` contains HTML (paragraphs + emphasis) →
it renders formatted (not one plain block), no raw markup or script leaks, and candidate selection is
unchanged and keyboard-reachable. Plain-text and malformed items still render readably.

### Tests for User Story 2

- [x] T022 [P] [US2] Create `tests/unit/sanitizeHtml.test.ts`: strips `script`/`style`/event handlers/`a`/`img`/`iframe`/remote refs and all attributes, keeps `p/strong/em/ul/ol/li/h1–h4/blockquote/code/pre/hr/br`, plain text passes through as readable text (FR-007/FR-008), malformed markup degrades to readable text with no raw markup (FR-009)
- [x] T023 [US2] Extend `tests/unit/sessionService.test.ts`: cluster item and cluster practice DTOs expose sanitized `targetHtml` (plain, formatted, and malformed inputs)

### Implementation for User Story 2

- [x] T024 [P] [US2] Create `server/src/lib/sanitizeHtml.ts`: strict `sanitize-html` wrapper — allowed tags `p, br, span, strong, em, b, i, u, s, h1, h2, h3, h4, ul, ol, li, blockquote, code, pre, hr`; no attributes; `allowedSchemes: []`; `allowProtocolRelative: false` (research.md R2, contracts/api.md)
- [x] T025 [US2] In `shared/types.ts`: change `ClientClusterItem.targetText: string` → `targetHtml: string` and apply the same change to the cluster `ClientPracticeItem` variant (data-model.md)
- [x] T026 [US2] In `server/src/services/sessionService.ts`: sanitize the raw `targetText` to `targetHtml` inside `toClientClusterItem` and `toClientClusterPractice` (single DTO seam) using `server/src/lib/sanitizeHtml.ts` (research.md R2)
- [x] T027 [P] [US2] Create `client/src/components/SafeHtml.tsx`: render the server-sanitized `targetHtml` inertly via `dangerouslySetInnerHTML` inside the existing muted `rounded-lg border bg-muted/30` container with readable typography; non-focusable so focus flows to the radio group (FR-010, research.md R3)
- [x] T028 [US2] In `client/src/components/TaskItem.tsx`: change the prop `targetText?` → `targetHtml?` and render it via `SafeHtml`; localize default labels via `t()` _(prop/SafeHtml done here; label `t()` localization deferred to US3/T033, which owns TaskItem's chrome)_
- [x] T029 [US2] In `client/src/routes/cluster/task.tsx` and `client/src/routes/cluster/practice.tsx`: pass `current.item.targetHtml` / practice `targetHtml` into `TaskItem`
- [x] T030 [US2] Extend `tests/smoke.spec.ts`: a formatted cluster document renders with structure, leaks no raw markup, executes no script, and candidate radios remain reachable

**Checkpoint**: US1 and US2 both work independently — welcome flow plus formatted, safe documents.

---

## Phase 5: User Story 3 - Present the survey in the configured language (Priority: P2)

**Goal**: Apply `SURVEY_LANGUAGE` across all built-in chrome via `t()` while leaving
researcher-authored content and task items verbatim (FR-013–FR-015). Machinery already exists from
Phase 2; this story localizes the remaining feature-001 chrome.

**Independent Test**: With `SURVEY_LANGUAGE=nl`, home page, buttons, prompts, and system messages are
Dutch while a supplied (English) task item is unchanged; switch to `en` and chrome flips while task
items stay verbatim.

### Tests for User Story 3

- [x] T031 [P] [US3] Extend `tests/smoke.spec.ts`: with `nl`, app chrome (welcome default, buttons, prompt, system message) is Dutch while a supplied task item displays exactly as authored; with `en`, chrome is English and the item is still verbatim (FR-014, FR-015)

### Implementation for User Story 3

- [x] T032 [US3] Localize instruction chrome via `t()` in `client/src/routes/word/instructions.tsx`, `client/src/routes/cluster/instructions.tsx`, and `client/src/components/Instructions.tsx` _(routes render `<Instructions>`; all instruction chrome localized in the component)_
- [x] T033 [US3] Localize task/practice labels and the cluster prompt (e.g. "Which group does not belong?") via `t()` in `client/src/components/TaskItem.tsx` and `client/src/components/PracticeItem.tsx` _(also the task-route call sites `word/task.tsx`/`cluster/task.tsx` that supply the prompt/description; added `wordTaskDescription`/`clusterTaskDescription`/`practiceLabel`/`practiceExplanationHeading`/`practiceContinue` catalog keys)_
- [x] T034 [US3] Localize system/notice/navigation chrome via `t()` in `client/src/components/LoadError.tsx`, `client/src/components/LoadingMessage.tsx`, `client/src/components/InlineErrorAlert.tsx`, `client/src/components/ProgressBar.tsx`, and `client/src/components/StopSurveyButton.tsx` _(`LoadingMessage`/`InlineErrorAlert` are content-agnostic wrappers; their strings are localized at the call sites — `flow-pages.tsx` for loading; added `loadErrorDescription`/`progressAnswered` catalog keys)_
- [x] T035 [US3] Audit that task-item content (word lists, candidate representative words, target document) is passed through verbatim and never routed through the `t()` catalog (FR-015) _(verified: `candidateWords`, `representativeWords`, `targetHtml`, `practice.explanation`, and `welcome.*` all render directly, never through `t()`)_

**Checkpoint**: All app chrome localizes consistently; task items remain untranslated.

---

## Phase 6: User Story 4 - Debrief walkthrough & practice-reveal fix (Priority: P2)

**Goal**: Hide each practice item's explanation until its own answer is submitted (FR-017), and turn
completion into thank-you → per-item walkthrough → closing, rendered from the debrief payload
(FR-018–FR-022).

**Independent Test**: Every practice item (including the second) hides its explanation until submit.
Finish a session → thank-you page offers close or continue; continue → each answered item re-shown in
the session layout with the selection marked and a correct/incorrect grouping-focused explanation →
closing thank-you.

### Tests for User Story 4

- [x] T036 [P] [US4] Extend `tests/unit/sessionService.test.ts`: `buildDebrief` returns all answered real items in session order (word then cluster) with the render fields, exposes no ground truth beyond `correctIntruder`, and emits the correct system-generated explanation variant (match vs no-match) localized per `SURVEY_LANGUAGE` (FR-019, FR-020, research.md R6)

### Implementation for User Story 4

- [x] T037 [P] [US4] In `client/src/routes/word/practice.tsx` and `client/src/routes/cluster/practice.tsx`: pass `key={current.practice.itemId}` to `PracticeItem` so `value`/`revealed` reset per item (FR-017, research.md R6)
- [x] T038 [US4] In `shared/types.ts`: extend `DebriefExample` with `candidateWords` (word), `targetHtml` + `candidates` (cluster), and change `DebriefState.examples` to cover all answered items in session order (data-model.md)
- [x] T039 [US4] In `server/src/services/sessionService.ts`: `buildDebrief` returns all answered items in session order with the render fields (reuse the same `sanitizeHtml` DTO mapping for cluster `targetHtml`, drop ground truth except `correctIntruder`); set `clusterValidityExplanation` from the system-generated `shared/i18n.ts` template chosen by `correct` (match/no-match) in the deployment language — not researcher-authored (FR-020, research.md R6)
- [x] T040 [US4] In `client/src/components/Debrief.tsx`: render one answered item read-only in the session layout — disabled radio group, participant's selection marked, correct/incorrect indicated, with the system-generated grouping-framed explanation below (FR-019, FR-020)
- [x] T041 [US4] In `client/src/routes/complete.tsx`: implement the client-side stepper — (1) thank-you with both close guidance and a continue control, (2) `Debrief` walkthrough over `GET /api/debrief` with a Next control, (3) closing thank-you (FR-018, FR-021); writes nothing (FR-022)
- [x] T042 [US4] Extend `tests/smoke.spec.ts`: second practice item keeps its explanation hidden until submit; completion shows thank-you → walkthrough (marked selection + explanation) → closing

**Checkpoint**: All four user stories work independently.

---

## Phase 7: Cross-Cutting — Cluster Response Enrichment (FR-016)

**Purpose**: Persist the selected cluster's representative words with cluster responses. Independent
of the user stories; recording behaviour is otherwise unchanged.

- [x] T043 In `server/src/services/responseService.ts`: for cluster responses, resolve the representative words of the cluster named by `selection.value` from `study.clusters` and persist `selectedClusterWords: string[]` (additive, `schemaVersion` stays `1`) per storage.md / research.md R5
- [x] T044 [P] Extend `tests/unit/responseService.test.ts`: a recorded cluster response includes `selectedClusterWords`; word responses are unchanged (FR-016)

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T045 [P] Update `README.md` / `specs/002-home-welcome-document-formatting/quickstart.md` for the `SURVEY_LANGUAGE` config and the HTML authoring/sanitization contract _(quickstart already covered both; added an "Authoring a study" section to `README.md` for the welcome copy + HTML/sanitization contract)_
- [x] T046 Extend `tests/unit/piiHygiene.test.ts`: assert `targetHtml`, `selectedClusterWords`, and the language flag never appear in logs/telemetry/error bodies (FR-011)
- [~] T047 Run quality gates: `npm run typecheck && npm run lint && npm run format && npm test` (quickstart.md §5) _(typecheck ✓, lint ✓ 0 errors, format ✓ after `format:fix`, vitest 78/78 ✓; the `test:smoke` (Playwright) portion was skipped — the `chromium_headless_shell` browser is not installed in this WSL2 env)_
- [ ] T048 Execute the quickstart.md §4 walkthrough end-to-end to confirm all five slices (SC-001…SC-010) _(deferred — requires a running app + browser; e2e skipped this session)_

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (language machinery).
- **US1 (Phase 3)**: Depends on Foundational (localized default welcome).
- **US2 (Phase 4)**: Depends on Setup (`sanitize-html`); shares `shared/types.ts` and
  `sessionService.ts` with US1, so sequence after US1 or coordinate those files.
- **US3 (Phase 5)**: Depends on Foundational; touches chrome components also edited by US1/US2, so
  run after them to avoid file conflicts.
- **US4 (Phase 6)**: Depends on US2 (`sanitizeHtml.ts` + `targetHtml` mapping reused by `buildDebrief`).
- **FR-016 (Phase 7)**: Independent — may run any time after Setup; isolated to `responseService`.
- **Polish (Phase 8)**: After all desired stories are complete.

### Within Each User Story

- Tests are written first and expected to fail before implementation.
- `shared/` types/schemas → server services/routes → client components/routes.
- Story complete and independently testable before moving to the next priority.

### Parallel Opportunities

- Setup: T002 [P] alongside T001.
- Foundational: T003, T004, T010 [P] together; T005–T009 follow.
- US1: T011, T012 (tests) [P]; T013, T014, T018 [P] (distinct files).
- US2: T022 [P] test; T024, T027 [P] (distinct files).
- Cross-story: once Foundational is done, FR-016 (Phase 7) can proceed in parallel with US1/US2.

---

## Parallel Example: User Story 1

```bash
# Tests first (distinct files):
Task: "Extend tests/unit/studyLoader.test.ts: welcome parse + default fallback"
Task: "Extend tests/unit/sessionService.test.ts: welcome-phase gating + resume not reset"

# Then independent implementation files:
Task: "Add WelcomeContent + welcome phase to shared/types.ts"
Task: "Add optional welcome validation to shared/schemas.ts"
Task: "Create client/src/components/Welcome.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1: Setup.
2. Phase 2: Foundational (language machinery — blocks all stories).
3. Phase 3: US1 (welcome page).
4. **STOP and VALIDATE**: first-time visitor sees welcome → Begin → flow; resume is intact.
5. Demo the MVP.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 (welcome) → test → demo (MVP).
3. US2 (formatted, sanitized documents) → test → demo.
4. US3 (deployment language) → test → demo.
5. US4 (practice-reveal fix + debrief walkthrough) → test → demo.
6. FR-016 enrichment + Polish → final gates green.

Each increment adds value without breaking previous stories; every quality gate must be green before
merge (Constitution IV, plan.md constraints).
