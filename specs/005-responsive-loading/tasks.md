---
description: 'Task list for Responsive Survey Loading & Submission'
---

# Tasks: Responsive Survey Loading & Submission

**Input**: Design documents from `/specs/005-responsive-loading/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md), [quickstart.md](./quickstart.md)

**Tests**: This feature is explicitly scoped by plan.md/quickstart.md as "confirm and lock in with test
coverage" for behavior that research.md (R2–R7) found is *already correct* — only one real code
change exists (R1). Test tasks are therefore included as first-class deliverables, not optional
scaffolding: several assert the one real gap (fail today, pass after the Foundational task) and the
rest are regression guards for already-correct behavior this feature must not break.

**Organization**: Tasks are grouped by user story (spec.md P1/P1/P2) to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files/tests, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact; this feature touches only existing files — no new files, routes, or
  dependencies (plan.md Structure Decision)

---

## Phase 1: Setup

**Purpose**: Confirm the local toolchain can run this feature's test additions before writing them

- [X] T001 Run `npx playwright install chromium` (or `npm run test:smoke`, which does this
  automatically) once to confirm the Chromium browser is available locally for the Playwright smoke
  tests this feature adds/extends in `tests/smoke.spec.ts`. In WSL2 this download can hang — see the
  project's smoke-test memory note if it does. No files change in this task.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one concrete code change this whole feature depends on (research.md R1) — a shared
router-level pending fallback so no flow route ever renders blank while `GET /api/session` is in
flight. This is foundational rather than story-scoped because it is a single shared-infrastructure
change (router creation) that every flow route (`/`, `/word/instructions`, `/word/practice`,
`/word/task`, `/cluster/instructions`, `/cluster/practice`, `/cluster/task`, `/complete`) picks up
automatically, and US1's independent test depends on it directly.

**⚠️ CRITICAL**: The US1 test tasks (T003–T004) will fail until this task lands.

- [X] T002 In `client/src/main.tsx`, add a small pending-fallback component that renders
  `LoadingMessage` (from `@/components/LoadingMessage`) with the same `t('loading')` copy and
  `className="py-24"` wrapper `FlowRouteFrame` already uses for its own `isPending` branch
  (`client/src/lib/flow-pages.tsx:21`), wrapped in the same `<main className="mx-auto w-full
  max-w-3xl px-4 py-10">` shell so there is no layout shift between the router-level fallback and the
  resolved route's own frame. Wire it into `createRouter({...})` as `defaultPendingComponent`, and
  set **both** `defaultPendingMs: 0` and `defaultPendingMinMs: 0` — `defaultPendingMs` so the fallback
  appears immediately instead of after TanStack Router's default ~1000ms threshold, and
  `defaultPendingMinMs: 0` because the router's default (500ms) would otherwise force the spinner to
  stay visible for at least 500ms even when `GET /api/session` resolves instantly, which is exactly
  the "loading indicator MUST NOT itself add wait time" padding FR-001 and plan.md's Constraints
  section forbid. This is the only code change in this feature (research.md R1; FR-001, FR-002,
  SC-001).

**Checkpoint**: Every flow route now shows a spinner instead of a blank area while its loader is
pending, with zero added latency. User story test work can begin.

---

## Phase 3: User Story 1 - Home page appears quickly (Priority: P1) 🎯 MVP

**Goal**: A participant never sees a blank/frozen screen on first load or on a resumed session; they
see a loading indicator (via T002) and then the welcome content.

**Independent Test**: Open `/` with `GET /api/session` artificially delayed and confirm a visible
loading indicator appears before the welcome content, never a blank frame; repeat for a
reload-mid-session participant.

- [X] T003 [P] [US1] In `tests/smoke.spec.ts`, add a test that uses `page.route('**/api/session', ...)`
  to delay the response (e.g. ~300ms) before calling `page.goto('/')`, then asserts the translated
  loading text (`'Loading…'`, `shared/i18n.ts:169`) is visible, followed by the welcome greeting
  (`'Welcome'`, exact) becoming visible — proving the router never renders blank between navigation
  and content (US1 Acceptance Scenario 1, FR-001/FR-002, SC-001). This test fails before T002 lands
  (no `pendingComponent` exists today) and passes after it.
- [X] T004 [P] [US1] In `tests/smoke.spec.ts`, add a test mirroring the existing "resumes mid-session
  at the next unanswered item after a reload" test (`tests/smoke.spec.ts:201-224`): get a participant
  to one answered item, then delay `GET /api/session` via `page.route` as in T003 and `page.reload()`
  on the item page. Assert the same loading-indicator-then-content treatment (never blank) and that
  the participant lands back on their in-progress phase, not the welcome page (US1 Acceptance Scenario
  3, edge case "first item of a session versus a resumed session").

**Checkpoint**: US1 is independently testable — home page and resumed-session loads never render
blank, satisfying FR-002/SC-001 for this story.

---

## Phase 4: User Story 2 - Submitting an answer feels immediate (Priority: P1) 🎯 MVP

**Goal**: Lock in (no code change expected — research.md R3–R5) that submit acknowledgment is
instant, double-submits are inert, and failures are recoverable.

**Independent Test**: Submit an answer and confirm the control visibly acknowledges near-instantly,
well before the save completes; a second click during that window has no additional effect; a failed
save shows a clear, retryable error.

- [X] T005 [P] [US2] In `tests/smoke.spec.ts`, add a test that delays `POST /api/responses` via
  `page.route` (e.g. ~500ms), clicks Submit on a word item, and asserts the Submit control's
  disabled/"submitting" state (`TaskItem`'s `submitting` prop, `client/src/components/TaskItem.tsx:103,151-159`)
  is visible *while the route is still pending* — i.e. before letting the delayed response resolve
  (US2 Acceptance Scenario 1, FR-003, SC-002, research.md R3).
- [X] T006 [P] [US2] In `tests/smoke.spec.ts`, add a test that delays `POST /api/responses` via
  `page.route`, activates Submit twice in quick succession on the same item, then lets the response
  resolve and asserts progress advanced by exactly one item (e.g. "0 of 3 answered" → "1 of 3
  answered", never "2 of 3") with no error shown for the repeat click (US2 Acceptance Scenario 2,
  FR-004, research.md R4).
- [X] T007 [P] [US2] In `tests/smoke.spec.ts`, add a test that fulfills the first `POST
  /api/responses` call with an error (e.g. `route.fulfill({ status: 500, ... })` or `route.abort()`),
  submits an item, and asserts an error message is visible and the selection/Submit control remain
  usable; then let a second, unintercepted submit attempt succeed and confirm progress advances (US2
  Acceptance Scenario 3, FR-005, edge case "connection... briefly drops mid-submission", research.md
  R5).

**Checkpoint**: US2 is independently testable — submission acknowledgment, duplicate protection, and
failure/retry are locked in by tests, matching already-correct behavior.

---

## Phase 5: User Story 3 - The next question loads without a noticeable gap (Priority: P2)

**Goal**: Lock in (no code change expected — research.md R6) that item and completion transitions
never re-fetch the session over the network, so the gap stays flat regardless of session progress.

**Independent Test**: Submit several items in a row (including the last one) and confirm no
`GET /api/session` request occurs between a successful submit and the next item/completion screen
appearing.

- [X] T008 [US3] Extend the full-flow test in `tests/smoke.spec.ts`
  (`'completes word→cluster→debrief by keyboard...'`, `tests/smoke.spec.ts:89`) to also capture every
  `GET /api/session` request via `page.on('request', ...)` and assert none occurs between any
  `POST /api/responses` response and the next item (or, for the final submitted item, the completion
  screen) becoming visible — proving `advanceToSession`'s cache write (`client/src/lib/flow-route-state.ts:18-24`,
  research.md R6) is exercised for every transition in the flow, including word→cluster and the final
  item→completion transition (US3 Acceptance Scenarios 1–3, FR-007, SC-003/SC-006).

**Checkpoint**: All three user stories are independently functional and covered by regression tests.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T009 [P] Confirm (documentation-level only, no code change expected) that `SUBMIT_ERROR`
  (`client/src/lib/flow-route-state.ts:9`, `'Something went wrong. Please try again.'`) reads as an
  actionable retry prompt rather than a generic error, per research.md R5's deferred confirmation
  item; update the copy only if it fails that bar.
- [X] T010 Run the full quickstart.md validation: `npm run typecheck`, `npm run lint`, `npm run test`
  (vitest unit + `test:smoke`), and `npm run test:e2e` (both the `chromium` and `chromium-nl`
  projects), confirming all tasks above pass and no existing test in `tests/unit/` or
  `tests/smoke.spec.ts` regressed.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: No dependency on Setup's outcome, but do it first anyway. **Blocks
  T003–T004 (US1)** — those tests fail without T002.
- **User Stories (Phase 3-5)**: US2 (Phase 4) and US3 (Phase 5) have no dependency on T002 or on each
  other — they test already-correct behavior untouched by this feature — so they may proceed before
  or in parallel with Phase 2/3.
- **Polish (Phase 6)**: T009 has no dependency; T010 depends on all prior tasks being complete.

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational (T002); no dependency on US2/US3.
- **US2 (P1)**: No dependency on Foundational or US1/US3 — independently testable now.
- **US3 (P2)**: No dependency on Foundational or US1/US2 — independently testable now.

### Parallel Opportunities

- T003 and T004 (both edit `tests/smoke.spec.ts`, but as independent new test blocks) can be written
  in parallel and merged.
- T005, T006, T007 (US2) can all be drafted in parallel — independent test blocks in the same file.
- Once drafted, T003/T004/T005/T006/T007/T008 all land in the same file (`tests/smoke.spec.ts`); treat
  [P] as "independent to write," not "safe to run `git apply` concurrently" — reconcile into one file
  before running the suite.
- T001 and T009 have no dependencies and can run any time.

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2 — both P1 per spec.md)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational) — T002 is the only production code change in
   this entire feature.
2. Complete Phase 3 (US1) and Phase 4 (US2) — both P1, together the MVP.
3. **STOP and VALIDATE**: run `npm run test:smoke` and confirm T003–T007 all pass.

### Incremental Delivery

1. Setup + Foundational → the blank-screen gap is closed everywhere.
2. Add US1 tests → validate → this is the MVP's first half.
3. Add US2 tests → validate → MVP complete (both P1 stories covered).
4. Add US3 tests (P2) → validate → full feature scope covered.
5. Polish (T009–T010) → final full-suite validation per quickstart.md.
