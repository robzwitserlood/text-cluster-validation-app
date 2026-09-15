# Tasks: Survey UI Styling & Complete Flow Navigation

**Input**: Design documents from `/specs/009-survey-ui-styling-navigation/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: No new test-first tasks. The spec does not request TDD. Existing test files are updated for the navigation fix per the implementation plan.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Verify project readiness — all dependencies are already installed from spec 008, no new scaffolding needed.

> No setup tasks required. The project is initialized with Tailwind CSS v4, shadcn/ui, TanStack Router, TanStack React Query, and all other dependencies already configured.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Server-side practice count plumbing and i18n strings that both user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 [P] Add progress bar label strings (`progress.step`, `progress.question`, `progress.phase`) to `shared/i18n.ts`
- [X] T002 [P] Return pre-computed `practiceAnswered` count from `recordResponse` in `server/src/services/responseService.ts`
- [X] T003 [P] Accept optional `practiceAnswered` parameter in `getSessionState` in `server/src/services/sessionService.ts`
- [X] T004 Wire practice counts through the response route handler in `server/src/routes/responses.ts` (depends on T002, T003)

**Checkpoint**: Foundation ready — server-side counts are computed in-memory, i18n strings available. User story implementation can begin.

---

## Phase 3: User Story 1 - Complete Survey From Start to Finish (Priority: P1) 🎯 MVP

**Goal**: Fix the practice item navigation bug so participants can advance from the first practice item to the second, and complete the entire survey flow from welcome through closing without getting stuck.

**Independent Test**: Run through the full survey flow (welcome → word instructions → word practice 1 → word practice 2 → word items → cluster instructions → cluster practice 1 → cluster practice 2 → cluster items → debrief → closing) and verify every transition occurs without dead ends.

### Implementation for User Story 1

- [X] T005 [US1] Fix same-route navigation for practice items using `invalidateQueries` + `fetchQuery` in `client/src/lib/flow-route-state.ts`
- [X] T006 [US1] Update unit test for practice item advancement in `tests/unit/sessionService.test.ts`
- [X] T007 [US1] Add full-flow navigation e2e test to verify complete survey traversal in `tests/smoke.spec.ts`

**Checkpoint**: User Story 1 should be fully functional — a participant can navigate the full survey from welcome to completion.

---

## Phase 4: User Story 2 - Visually Polished and Consistent UI (Priority: P2)

**Goal**: Apply Tailwind CSS v4 and shadcn/ui styling to every survey page so all components render with proper typography, spacing, card styling, button styling, and color theming — presenting a professional, neutral appearance.

**Independent Test**: Visually inspect every page in the survey flow and verify that all components (cards, buttons, radio groups, alerts, progress bar, badges, typography) render with proper styling from the shadcn/ui + Tailwind CSS system.

### Implementation for User Story 2

- [X] T008 [P] [US2] Rename `.welcome-prose` to `.survey-prose` and configure neutral `prose` defaults in `client/src/index.css`
- [X] T009 [P] [US2] Apply centered container layout (`mx-auto max-w-screen-md/px-4/py-6/space-y-6`) via `FlowRouteFrame` in `client/src/lib/flow-pages.tsx`
- [X] T010 [P] [US2] Apply Card wrapper with `prose survey-prose` Markdown content and styled "Begin" button in `client/src/components/Welcome.tsx`
- [X] T011 [P] [US2] Apply Card wrapper with `prose survey-prose` instructions content and styled "Begin" button in `client/src/components/Instructions.tsx`
- [X] T012 [P] [US2] Add option tile wrapper with hover (`hover:border-primary/50 hover:bg-accent/50`) and selected (`data-[state=checked]:border-primary data-[state=checked]:bg-accent`) states in `client/src/components/PracticeItem.tsx`
- [X] T013 [P] [US2] Add option tile wrapper with hover and selected states to candidate options in `client/src/components/TaskItem.tsx`
- [X] T014 [US2] Enhance ProgressBar to display phase label ("Step X of 9") and per-task item counter ("Question Y of Z") using i18n strings in `client/src/components/ProgressBar.tsx`
- [X] T015 [P] [US2] Apply Card layout per debrief example with styled "Next"/"Finish" buttons in `client/src/components/Debrief.tsx`
- [X] T016 [P] [US2] Apply consistent Badge spacing and Card styling to candidate cluster terms in `client/src/components/ClusterTermList.tsx`
- [X] T017 [P] [US2] Apply consistent Card/Button styling (outline variant for "Try Again") to error state display in `client/src/components/LoadError.tsx`
- [X] T018 [P] [US2] Apply consistent Card styling to loading state display in `client/src/components/LoadingMessage.tsx`

**Checkpoint**: All 9 page types render with visibly styled shadcn/ui components. Option tiles have hover/selected visual feedback. Progress bar shows dual indicators.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verification and validation across both user stories.

- [X] T019 Verify `InlineErrorAlert` destructive alert is rendered for all mutation errors across practice/task route pages in `client/src/routes/word/practice.tsx`, `client/src/routes/word/task.tsx`, `client/src/routes/cluster/practice.tsx`, `client/src/routes/cluster/task.tsx`
- [X] T020 Run typecheck (`npm run typecheck`), lint (`npm run lint`), and unit tests (`npm run test`) to validate no regressions
- [X] T021 Run quickstart.md full-flow walkthrough to validate end-to-end survey completion with styled UI

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — already complete from spec 008.
- **Foundational (Phase 2)**: No dependencies — server-side changes and i18n strings are independent. **BLOCKS all user stories.**
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) — requires server-side practice count plumbing to fix navigation.
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) — requires i18n strings for ProgressBar. Independent of US1.
- **Polish (Phase 5)**: Depends on US1 and US2 being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2. No dependency on US2.
- **User Story 2 (P2)**: Can start after Phase 2. No dependency on US1.

### Within Each Phase

#### Phase 2 (Foundational)
```
T001 (i18n) ──────────┐
T002 (responseService) ─┤── T004 (route wiring)
T003 (sessionService) ─┘
```
T001, T002, T003 are all [P] — run in parallel. T004 depends on T002 + T003.

#### Phase 3 (US1)
```
T005 (nav fix) → T006 (unit test) + T007 (e2e test)
```

#### Phase 4 (US2)
```
T008 (index.css) ─┐
T009 (layout)    ─┤
T010 (Welcome)   ─┤
T011 (Instructions) ─┤
T012 (PracticeItem) ─┤── All [P] independent styling tasks
T013 (TaskItem)  ─┤
T015 (Debrief)   ─┤
T016 (ClusterTermList) ─┤
T017 (LoadError) ─┤
T018 (LoadingMessage) ─┘

T014 (ProgressBar) — depends on T001 (i18n strings)
```

### Parallel Opportunities

- All Phase 2 tasks T001–T003 can run in parallel
- US1 and US2 can be implemented in parallel after Phase 2
- All US2 styling tasks T008–T013, T015–T018 can run in parallel (10 tasks on 10 different files)
- T006 and T007 (US1 tests) can run in parallel after T005

---

## Parallel Example: Phase 2 Foundational

```bash
# Launch all three foundational tasks together:
Task: "Add progress bar label strings to shared/i18n.ts"
Task: "Return practiceAnswered count from recordResponse in server/src/services/responseService.ts"
Task: "Accept optional practiceAnswered parameter in getSessionState in server/src/services/sessionService.ts"

# After all three complete, wire them together:
Task: "Wire practice counts through response route handler in server/src/routes/responses.ts"
```

## Parallel Example: User Story 2

```bash
# Launch all independent styling tasks together (10 tasks, 10 different files):
Task: "Rename .welcome-prose to .survey-prose in client/src/index.css"
Task: "Apply centered container layout via FlowRouteFrame in client/src/lib/flow-pages.tsx"
Task: "Apply Card + prose styling to Welcome in client/src/components/Welcome.tsx"
Task: "Apply Card + prose styling to Instructions in client/src/components/Instructions.tsx"
Task: "Add option tile hover/selected states to PracticeItem in client/src/components/PracticeItem.tsx"
Task: "Add option tile hover/selected states to TaskItem in client/src/components/TaskItem.tsx"
Task: "Apply Card layout to Debrief in client/src/components/Debrief.tsx"
Task: "Apply Badge/Card styling to ClusterTermList in client/src/components/ClusterTermList.tsx"
Task: "Apply Card/Button styling to LoadError in client/src/components/LoadError.tsx"
Task: "Apply Card styling to LoadingMessage in client/src/components/LoadingMessage.tsx"

# After i18n is available (T001):
Task: "Enhance ProgressBar with phase label + item counter in client/src/components/ProgressBar.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (server-side fixes + i18n)
2. Complete Phase 3: User Story 1 (navigation fix)
3. **STOP and VALIDATE**: Test full survey flow end-to-end
4. Demo the working navigation

### Incremental Delivery

1. Complete Phase 2: Foundational → server ready, i18n available
2. Add Phase 3 (US1) → Navigation works end-to-end → **MVP achieved!**
3. Add Phase 4 (US2) → All pages visually styled → **Full feature complete**
4. Add Phase 5 (Polish) → Validated and verified

### Parallel Team Strategy

With two developers after Phase 2:
- **Developer A**: Phase 3 (US1) — navigation fix + tests
- **Developer B**: Phase 4 (US2) — UI styling (10 parallel tasks)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- No new files, directories, or dependencies are introduced
- The navigation fix in T005 is the critical path item — it unblocks the entire survey flow
- All styling tasks use existing Tailwind v4 utilities and shadcn/ui components — no custom CSS needed beyond `index.css` changes
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently