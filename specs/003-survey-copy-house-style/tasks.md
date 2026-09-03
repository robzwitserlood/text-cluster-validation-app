# Tasks: Survey Copy Refinements & PBL Branded Page Chrome

**Input**: Design documents from `/specs/003-survey-copy-house-style/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (sections.md, storage.md, api.md), quickstart.md, design-tokens.md

**Tests**: Test tasks are included because the specification explicitly mandates test-suite changes (FR-013 HTML cluster targets, FR-014 five n-gram(1,2) representations) and behavioural verification (SC-001–SC-010). They are scoped to the relevant story/phase rather than written strictly test-first.

**Organization**: Tasks are grouped by user story (US1–US4 from spec.md), preceded by shared foundational work and followed by the cross-cutting data-shape/test-coverage phase (FR-012–FR-014) and polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Paths are repository-relative and match the AppKit monorepo layout (`shared/`, `server/`, `client/`, `tests/`)

## Path Conventions

Full-stack web app (monorepo): shared code in `shared/`, server in `server/src/`, client in `client/src/`, tests in `tests/`. Paths below are exact.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish a known-green baseline before copy/presentation changes. No new dependencies, routes, or config (per plan.md and quickstart.md).

- [X] T001 Confirm a green baseline by running `npm run typecheck && npm run lint && npm run test` from the repository root and noting any pre-existing failures before making changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the canonical survey-section vocabulary (FR-001) that the welcome (US2), instructions (US1), and completion (US3) copy all refer back to.

**⚠️ CRITICAL**: US2 (and the section references in US1/US3 copy) depend on this phase.

- [X] T002 Add the `SurveySection` type in `shared/types.ts` per `contracts/sections.md` (id `'welcome' | 'word-intrusion' | 'cluster-intrusion' | 'completion' | 'explanation'`, `label`, `order`, `optional`) (FR-001)
- [X] T003 Add the `SURVEY_SECTIONS` canonical ordered constant plus localized `nl`/`en` section labels in `shared/i18n.ts` per `contracts/sections.md` (welcome → word-intrusion [practice then real] → cluster-intrusion [practice then real] → completion → optional explanation) (FR-001, FR-011) (depends on T002)

**Checkpoint**: Canonical section list exists and is localized — user stories can now begin.

---

## Phase 3: User Story 1 - Clear, correctly structured per-task instructions screen (Priority: P1) 🎯 MVP

**Goal**: The per-task instructions screen shows one subtitle carrying the former "how it works" guidance and at most one supporting box; it advises one-sitting/pause-resume instead of device-saved progress, adds a practice-first reminder, surfaces the last-practice "real questions next" note, and removes the stop-survey control.

**Independent Test**: Open the word-intrusion and cluster-intrusion instructions screens — confirm exactly one subtitle (carrying the former first-box guidance), at most one box, the practice-first reminder, no "saved to this browser" text, and no stop-survey control. Walk to the last practice item and confirm the "real questions start on the next page" note (absent on earlier practice items).

### Implementation for User Story 1

- [X] T004 [US1] In `shared/i18n.ts`, fold the former informational "how it works" box copy into the instructions subtitle and remove the standalone info-box catalog key, for both `nl` and `en` (FR-003, FR-011)
- [X] T005 [US1] In `shared/i18n.ts`, replace the `instructionsDeviceOnly` (progress-saved-to-this-browser) copy with one-sitting-recommended / pause-and-resume-possible advice, for both `nl` and `en` (FR-004, FR-011)
- [X] T006 [US1] In `shared/i18n.ts`, add a practice-first reminder key and a last-practice "the real questions start on the next page" key, for both `nl` and `en` (FR-005, FR-006, FR-011)
- [X] T007 [US1] Remove the `stopSurvey*` catalog keys from `shared/i18n.ts` (FR-007)
- [X] T008 [US1] Update `client/src/components/Instructions.tsx` to render a single subtitle plus at most one supporting box (essential reminders: answers-final + one-sitting/pause-resume + practice-first); drop the informational box and the device-only line (FR-003, FR-004, FR-005) (depends on T004, T005, T006)
- [X] T009 [P] [US1] Update `client/src/components/PracticeItem.tsx` to show the last-practice "real questions next" note only when `index === of`; earlier practice items must not show it (FR-006) (depends on T006)
- [X] T010 [P] [US1] Remove the `StopSurveyButton` render site from `client/src/lib/flow-pages.tsx` (FR-007)
- [X] T011 [P] [US1] Delete `client/src/components/StopSurveyButton.tsx` (FR-007) (do after T010 so no import dangles)

**Checkpoint**: Instructions screen meets SC-001–SC-004; stop-survey control gone; last-practice reminder correct.

---

## Phase 4: User Story 2 - Understand the survey's structure up front and in the welcome (Priority: P1)

**Goal**: The built-in default welcome (used only when `study.welcome` is absent) is more detailed and walks through the enumerated sections in order; researcher-supplied welcome remains shown verbatim.

**Independent Test**: With no researcher-supplied `study.welcome`, open `/` and confirm the default welcome is detailed and names the sections in canonical order, using the same section names the instructions and completion copy use. With a researcher-supplied welcome, confirm it renders exactly as authored.

### Implementation for User Story 2

- [X] T012 [US2] Add the optional welcome body / section-walkthrough field to the `WelcomeContent` type in `shared/types.ts` and to `WelcomeContentSchema` in `shared/schemas.ts` as **optional**, so existing researcher studies still validate unchanged (FR-002)
- [X] T013 [US2] In `shared/i18n.ts`, expand the built-in default welcome copy (greeting / what / why plus a section walk-through that names `SURVEY_SECTIONS` in order) for both `nl` and `en` (FR-002, FR-011) (depends on T003)
- [X] T014 [US2] Update `resolveWelcome` in `server/src/services/sessionService.ts` to populate the expanded default (including the section walk-through) only when `study.welcome` is absent; researcher-supplied welcome is passed through unchanged (FR-002) (depends on T012, T013)
- [X] T015 [US2] Update `client/src/components/Welcome.tsx` to render the richer multi-section default body region; researcher-supplied welcome content still renders verbatim (FR-002) (depends on T012)

**Checkpoint**: Default welcome names all sections in order (SC-005); override behaviour unchanged.

---

## Phase 5: User Story 3 - Clear completion page at the end (Priority: P2)

**Goal**: The completion/thank-you page unambiguously states the survey is complete and the tab may be closed, and frames continuing to the explanation walkthrough as optional via a clearly-labelled control.

**Independent Test**: Complete a session and confirm the completion page states the survey is finished + the tab may be closed, presents the explanation as optional, and offers a clearly-labelled control to proceed. Closing the tab requires no walkthrough and changes no recorded data.

### Implementation for User Story 3

- [X] T016 [US3] In `shared/i18n.ts`, revise the completion copy to state the survey is complete + the tab may be closed, and to frame proceeding to the explanation walkthrough as optional with a clearly-labelled control label, for both `nl` and `en` (FR-008, FR-009, FR-011)
- [X] T017 [US3] Update the ThankYou step in `client/src/routes/complete.tsx` to render survey-complete + close-tab messaging and the optional, clearly-labelled control into the explanation walkthrough; the walkthrough/closing steps and `DebriefState` payload are unchanged (FR-008, FR-009) (depends on T016)

**Checkpoint**: Completion page meets SC-006; no recorded-data change.

---

## Phase 6: User Story 4 - Experience the app inside PBL's branded page chrome (Priority: P2)

**Goal**: Every participant-facing screen renders inside genuine PBL page structure — a persistent top masthead/header carrying the PBL logo and a persistent bottom PBL footer band wrap the existing content (FR-010) — and within that shell colours, typography, and spacing follow the PBL reference tokens (`design-tokens.md`) via the existing AppKit `:root` theme-token layer. Presentation only: behaviour, keyboard accessibility, focus order, and recorded data are unchanged; the masthead/footer are in-flow (static, not fixed), branding-only, and add no task navigation (FR-010a). Where a shadcn/AppKit default conflicts with the PBL chrome, PBL chrome wins (research.md R8).

**Independent Test**: Open each key screen (welcome, instructions, task, completion) and the optional explanation walkthrough; confirm the same top masthead/header with the PBL logo appears at the top and the same PBL footer band (branding-only, no clickable outbound links) appears at the bottom of every one, with existing content in between. Compare against <https://startanalyse.pbl.nl/> and `design-tokens.md`; confirm colours, typography, and spacing read as a PBL-branded equivalent and that behaviour, keyboard accessibility, focus order, and recorded data are unchanged.

### Implementation for User Story 4 — house-style tokens

- [X] T018 [US4] Map `design-tokens.md` colours (link-blue `#007bc7`, body `#242424` on background `#fbfbfb`, surfaces/greys, accent tint `#d9ebf7`) onto the AppKit `:root` theme custom properties in `client/src/index.css`; confirm exact values against the live site's computed CSS (FR-010)
- [X] T019 [US4] Set the RO Sans / RO Serif `font-family` stack in `client/src/index.css` to the sanctioned fallback (`Verdana, sans-serif` / `serif`) **only** — do NOT add an external `@font-face`/hotlink and do NOT commit font binaries. RO fonts are Rijkshuisstijl-licensed (design-tokens.md), so unlike the first-party logo (bundled per T029) they are neither hotlinked nor self-hosted; the fallback stack keeps the app self-contained and consistent with T029's no-external-asset policy, and the spec requires a PBL-branded *equivalent* rather than pixel-exact type (FR-010) (depends on T018)
- [X] T020 [US4] Verify accessible contrast (`#242424` on `#fbfbfb`, white on `#007bc7`) and a visible keyboard-focus outline (`#000000`) across welcome/instructions/task/completion; adjust tokens if any check fails (FR-010, SC-007) (depends on T018, T019)

### Implementation for User Story 4 — branded page chrome (masthead + footer shell)

- [X] T029 [US4] Add a bundled PBL logo asset to `client/public/` (e.g. `pbl-logo.svg`) sourced from PBL's first-party brand materials, and stop hotlinking the external `https://www.pbl.nl/logo.svg`; the masthead MUST use the bundled asset (FR-010)
- [X] T030 [P] [US4] Add localized (`nl`/`en`) chrome strings to `shared/i18n.ts` — footer copyright/attribution text and the masthead logo `alt` text — under new catalog keys (FR-010, FR-011)
- [X] T031 [US4] Add branding-only masthead + footer band components (adapt `client/src/components/apx/navbar.tsx` / `client/src/components/apx/logo.tsx`, or a new `client/src/components/PblChrome.tsx`): the masthead renders the bundled PBL logo as a non-linking brand mark (NO `to`/`Link`, no task navigation) and the footer renders the PBL wordmark/logo + copyright/attribution text with NO clickable outbound links (FR-010, FR-010a) (depends on T029, T030)
- [X] T032 [US4] Wrap `<Outlet />` in `client/src/routes/__root.tsx` with the persistent masthead + footer shell so every participant-facing screen (welcome, instructions, task, completion, and the explanation walkthrough) sits inside the chrome; masthead/footer are in-flow/static (not `fixed`/`sticky`) and the content area stays reachable on short viewports (FR-010) (depends on T031)
- [X] T033 [US4] Verify the chrome is presentation-only: keyboard focus order through the task controls is unchanged, the footer exposes no outbound links and the masthead adds no task navigation, the shell does not obstruct interactive controls on small viewports, and recorded data is unchanged (FR-010a, SC-007) (depends on T032)

**Checkpoint**: Branded chrome present on every screen and house style applied (SC-007), with behaviour, keyboard accessibility, focus order, and recorded data preserved.

---

## Phase 7: Data Shape & Test Coverage (FR-012–FR-014)

**Purpose**: Relocate the recorded cluster response's representative words under `selection` (greenfield, no migration) and extend fixtures/tests for HTML cluster targets and 5-n-gram(1,2) cluster representations. Independent of the copy stories; can ship on its own.

- [X] T021 Update the persisted-selection typing in `shared/types.ts` to allow `selectedClusterWords: string[]` nested on the cluster response's `selection` (StoredSelection), and remove/retire the top-level `Response.selectedClusterWords` field (greenfield — no backward-read) per `contracts/storage.md` (FR-012)
- [X] T022 Update the response-recording logic in `server/src/services/responseService.ts` to write `selection.selectedClusterWords` (resolved from `study.clusters` server-side) and to NOT write a top-level `selectedClusterWords`; word responses keep the bare `{ kind, value }` selection (FR-012) (depends on T021)
- [X] T023 [P] Add fixtures to `tests/unit/helpers/study.ts`: (a) one cluster target document authored as **well-formed** HTML and (b) one authored as **unsafe** HTML (e.g. `<script>`/`onerror`/`javascript:` markup) to exercise both formatting and the 002 sanitiser's safe-handling path; plus at least one cluster whose `representativeWords` are five n-grams in range (1,2) (unigram/bigram terms) (FR-013, FR-014)
- [X] T024 Extend `tests/unit/responseService.test.ts` to assert the recorded cluster response carries the words under `selection.selectedClusterWords` and no top-level field; and cover both HTML target-document cases — the well-formed doc renders its formatting and the unsafe doc has its dangerous markup stripped by the sanitiser (safe handling) — plus the 5-n-gram(1,2) cluster case (FR-012, FR-013, FR-014, SC-009, SC-010) (depends on T022, T023)
- [X] T025 [P] (Optional) Mirror an HTML target document and an n-gram(1,2) cluster in `tests/e2e/fixtures/study.ts` so smoke/e2e exercises the same representations (FR-013, FR-014)

**Checkpoint**: Recorded shape matches `contracts/storage.md` (SC-009); HTML + n-gram coverage passes (SC-010).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Behavioural verification across stories and final quality gates.

- [X] T026 [P] Update `tests/smoke.spec.ts` to assert: instructions show one subtitle + at-most-one box + practice-first reminder + no stop-survey control; the last-practice "real questions next" note appears only on the final practice item; the completion page states done + close-tab + optional explanation (US1/US3, SC-001–SC-004, SC-006)
- [X] T034 [P] Extend `tests/smoke.spec.ts` (or the e2e suite) to assert the PBL masthead (bundled logo) and the PBL footer band are present on welcome, instructions, task, completion, and the explanation walkthrough, and that the footer contains no clickable outbound links (US4, FR-010, FR-010a, SC-007) (depends on T032)
- [X] T035 Update `specs/003-survey-copy-house-style/quickstart.md` to include the branded-chrome verification (masthead + PBL logo and branding-only footer present on every screen, in-flow/not-fixed, no obstruction, focus order unchanged) alongside the existing house-style check (SC-007) (depends on T032)
- [X] T027 Run the quickstart.md manual checks for both `SURVEY_LANGUAGE=nl` and `SURVEY_LANGUAGE=en`: default welcome names all sections in order, instructions one-box/practice-first/no-stop, last-practice reminder, completion messaging, branded-chrome presence (masthead/footer on every screen), and house-style/contrast/focus comparison against the reference (SC-005, SC-007, SC-008)
- [X] T028 Run the full quality gates from the repository root: `npm run typecheck && npm run lint && npm run test && npm run test:e2e` (note the WSL2 Playwright/chromium download caveat in project memory) and confirm all green before merge

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. Blocks US2 (and provides the section labels referenced by US1/US3 copy).
- **US1 (Phase 3, P1)**: Depends on Foundational. Independently testable.
- **US2 (Phase 4, P1)**: Depends on Foundational (needs `SURVEY_SECTIONS`). Independently testable.
- **US3 (Phase 5, P2)**: Depends on Foundational (reuses section vocabulary). Independently testable.
- **US4 (Phase 6, P2)**: Depends only on Setup (presentation only) — may run any time after Phase 1. Independently testable.
- **Data & Test Coverage (Phase 7, FR-012–FR-014)**: Independent of the copy stories; depends only on Setup. Can ship on its own.
- **Polish (Phase 8)**: Depends on the stories/phases it verifies being complete.

### Story Independence

- US1, US2, US3, US4 are independently testable. US2/US3 reference the section vocabulary from Phase 2 but do not depend on each other's implementation.
- Phase 7 (data shape + tests) touches only `shared/types.ts`, `server/.../responseService.ts`, and test files — no overlap with the copy stories.

### Shared-file note (sequencing, not parallel across stories)

`shared/i18n.ts` is edited by Phase 2 (T003), US1 (T004–T007), US2 (T013), US3 (T016), and US4 chrome strings (T030). These edits touch distinct keys but the same file, so run them sequentially (they are NOT marked `[P]` across stories). Within a story, tasks in different files are marked `[P]`.

### Within Each User Story

- Catalog/i18n keys before the components that consume them (e.g., T004–T007 before T008; T006 before T009; T013 before T014/T015; T016 before T017; T030 before T031).
- Types/schema before server + client consumers (T012 before T014/T015; T021 before T022/T024).
- US4 chrome: logo asset + chrome strings (T029, T030) before the chrome components (T031); components before the root shell wrap (T032); shell wrap before the presentation-only verification (T033) and the chrome test/quickstart coverage (T034, T035).

---

## Parallel Opportunities

### User Story 1 (after T004–T006 land the keys)

```bash
# Different files, no interdependencies:
Task: "Update PracticeItem.tsx last-practice note (T009)"
Task: "Remove StopSurveyButton render site in flow-pages.tsx (T010)"
# Then delete the now-unused component:
Task: "Delete StopSurveyButton.tsx (T011)"
```

### Cross-phase (once Setup is done)

```bash
# US4 (house style) and Phase 7 (data shape + tests) share no files with the copy stories:
Task: "Map design tokens onto index.css (T018)"
Task: "Add HTML + n-gram fixtures to tests/unit/helpers/study.ts (T023)"
```

---

## Implementation Strategy

### MVP First

Both P1 stories are the MVP. Suggested order:

1. Phase 1 (Setup) → Phase 2 (Foundational section vocabulary).
2. Phase 3 (US1 — instructions) → **STOP & VALIDATE** against SC-001–SC-004.
3. Phase 4 (US2 — welcome) → **STOP & VALIDATE** against SC-005.
4. Ship the P1 MVP.

### Incremental Delivery

5. Phase 5 (US3 — completion, P2) → validate SC-006.
6. Phase 6 (US4 — branded page chrome + house style, P2) → tokens/fonts (T018–T020) then the masthead/footer shell (T029–T033); validate SC-007 (can run in parallel with US3 — different files).
7. Phase 7 (FR-012–FR-014 data shape + tests) → validate SC-009/SC-010 (independent; can run any time after Setup).
8. Phase 8 (Polish) → smoke assertions, bilingual manual checks, full quality gates.

### Notes

- `[P]` = different files, no dependencies on incomplete tasks.
- `[Story]` label maps a task to its spec user story; Setup/Foundational/Phase 7/Polish carry no story label by design.
- No new runtime dependencies, routes, or stores (plan.md); the feature is net-simplifying (removes `StopSurveyButton` and the top-level `selectedClusterWords`).
- Commit after each task or logical group; keep both `nl` and `en` copy in lock-step (FR-011).
