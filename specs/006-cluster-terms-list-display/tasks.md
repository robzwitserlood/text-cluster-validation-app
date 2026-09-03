---
description: 'Task list for Cluster Term List Display, Persistent Option Borders & Debrief Language Fix'
---

# Tasks: Cluster Term List Display, Persistent Option Borders & Debrief Language Fix

**Input**: Design documents from `/specs/006-cluster-terms-list-display/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: INCLUDED, per the project's established convention (constitution Development Workflow &
Quality Gates; `vitest` + Playwright smoke/e2e required before merge) and the pattern set by
`specs/001-cluster-validation/tasks.md`. This repo has no client component unit-test harness — client
behavior is verified via `tests/smoke.spec.ts` (Playwright, driving the real built client against the
real routes over `tests/e2e/harness.ts`), so US1/US2 tests are smoke-test assertions, not new unit
tests.

**Organization**: Tasks are grouped by user story (spec.md priorities: US1 P1, US3 P1, US2 P2) so
each story can be implemented and verified independently. All three stories touch disjoint files and
have no dependency on one another.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2, US3 — mapping to spec.md's three user stories
- All paths are repository-root-relative

## Path Conventions

- `client/src/{routes,components}`, `server/src/routes`, `tests/smoke.spec.ts` (per plan.md "Source
  Code").

---

## Phase 1: Setup

**Purpose**: Project initialization.

Not required — this feature adds no new dependency, tooling, or project structure. Every task below
lands in an existing file except one new small presentational component (T001).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure that all user stories depend on.

Not required — US1, US2, and US3 are fully independent fixes over disjoint existing files
(`cluster/task.tsx` + `PracticeItem.tsx` + `Debrief.tsx` for US1; `TaskItem.tsx` for US2;
`debrief.ts` for US3), with no shared new type, service, or route. All three stories can start
immediately and in parallel.

---

## Phase 3: User Story 1 - Scan cluster terms at a glance (Priority: P1) 🎯 MVP

**Goal**: Every cluster option's representative terms render as a vertical list (one term per row,
multi-word terms intact) everywhere cluster options are shown — live task, practice task, debrief
review.

**Independent Test**: Open the cluster intrusion task (live, practice, and debrief review) and
visually confirm each cluster's terms render as separate list rows rather than one comma-joined
line, with a multi-word term (e.g. the fixture's "nitrogen deposition") staying on one row.

### Tests for User Story 1 ⚠️ (write first, ensure they fail)

- [X] T001 [US1] In `tests/smoke.spec.ts`, extend the main flow test (`completes word→cluster→debrief...`, ~line 89) to assert the cluster item's candidate terms render as separate list rows (e.g. `page.locator('li')` under each candidate) rather than a single comma-joined text node, and that the fixture's multi-word term `"nitrogen deposition"` (from `tests/e2e/fixtures/study.ts` cluster `c1`) renders intact as one `<li>` — check this at the live cluster task step, at the "Practice 1/2" cluster-practice step (if the fixture's practice item is a cluster item; otherwise assert on the real cluster item), and again at the debrief walkthrough step for the same item (~line 179-181)

### Implementation for User Story 1

- [X] T002 [P] [US1] Create `client/src/components/ClusterTermList.tsx` — a small presentational component that takes `terms: string[]` and renders them as a Tailwind-styled `<ul>` of `<li>` rows (reusing existing spacing/typography conventions, e.g. `leading-relaxed`, `list-disc`/`list-inside` or equivalent per `specs/003-survey-copy-house-style/design-tokens.md`), replacing the `.join(', ')` pattern; a single-term array renders as a one-item list, and a long term wraps without breaking the row
- [X] T003 [P] [US1] In `client/src/routes/cluster/task.tsx:56`, replace `<span className="leading-relaxed">{candidate.representativeWords.join(', ')}</span>` with `<ClusterTermList terms={candidate.representativeWords} />` (depends on T002)
- [X] T004 [P] [US1] In `client/src/components/PracticeItem.tsx:36`, replace `<span className="leading-relaxed">{candidate.representativeWords.join(', ')}</span>` with `<ClusterTermList terms={candidate.representativeWords} />` (depends on T002)
- [X] T005 [P] [US1] In `client/src/components/Debrief.tsx:33`, replace `<span className="leading-relaxed">{candidate.representativeWords.join(', ')}</span>` with `<ClusterTermList terms={candidate.representativeWords} />` (depends on T002)

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently — run
`npm run test:e2e` and confirm T001 passes.

---

## Phase 4: User Story 3 - Read end-of-survey explanations in the survey's language (Priority: P1)

**Goal**: The debrief/explanation screen's per-item explanations (word and cluster) render in the
deployment's configured `SURVEY_LANGUAGE`, matching the rest of the survey, with no regression for
English deployments.

**Independent Test**: Complete a `SURVEY_LANGUAGE=nl` session through to the debrief/explanation
screen and confirm every per-item explanation is in Dutch; repeat for `en` and confirm explanations
remain in English.

### Tests for User Story 3 ⚠️ (write first, ensure they fail)

> Note: `tests/unit/sessionService.test.ts` already covers `buildDebrief`'s language selection
> directly against a hand-built `ServiceContext` (research.md R3) — that test already passes today
> and would **not** catch this bug, because the bug is that `registerDebriefRoutes`
> (`server/src/routes/debrief.ts`) never forwards `deps.language` into the `ServiceContext` it
> builds. The regression tests below exercise the actual route wiring via the real e2e harness
> (`tests/e2e/harness.ts`, which already forwards `deps.language` into `registerDebriefRoutes`
> exactly as production `server.ts` does), so they fail before the fix and pass after.

- [X] T006 [P] [US3] Extend the `@nl` smoke test (`tests/smoke.spec.ts:433`, currently stops after the first real word item) to continue through the remaining word item, cluster instructions/practice/item, completion, and into the debrief walkthrough, then assert the per-item explanation text shown for both a word example and the cluster example matches the Dutch `debriefExplainWord`/`debriefExplainCluster` output from `shared/i18n.ts`'s `nl` catalog (not the `en` wording)
- [X] T007 [P] [US3] In the main (English) flow test in `tests/smoke.spec.ts` (~lines 174-181, the existing debrief walkthrough section), add an assertion that the per-item explanation text matches the English `debriefExplainWord`/`debriefExplainCluster` output from `shared/i18n.ts`'s `en` catalog, guarding SC-005 (no regression for English deployments)

### Implementation for User Story 3

- [X] T008 [US3] In `server/src/routes/debrief.ts:24`, change `buildDebrief({ storage: deps.storage, studyId: deps.studyId, study }, participantId)` to also pass `language: deps.language`, mirroring the identical forwarding pattern already used in `server/src/routes/session.ts:34`

**Checkpoint**: At this point, User Stories 1 AND 3 both work independently — run `npm run test:e2e`
(including the `chromium-nl` project) and confirm T006/T007 pass.

---

## Phase 5: User Story 2 - Distinguish answer options without hovering (Priority: P2)

**Goal**: Every selectable answer-option tile (word or cluster, live or practice) shows a visible
border at rest, not only on hover/selection, while hover and selected states remain visually
distinct from the resting state.

**Independent Test**: Load a task screen and, without moving the pointer over any option, confirm
every answer-option tile shows a visible border around its edges; hovering or selecting an option
should still be visually distinguishable from the resting state.

### Tests for User Story 2 ⚠️ (write first, ensure they fail)

- [X] T009 [US2] In `tests/smoke.spec.ts`, add an assertion (e.g. in the main flow test, at the first real word item and again at the cluster item) that an unselected, non-hovered option `Label` tile's computed `border-color` is visually distinct from its computed `background-color` (e.g. via `locator.evaluate(el => getComputedStyle(el))`), i.e. the resting border is not effectively invisible

### Implementation for User Story 2

- [X] T010 [US2] In `client/src/components/TaskItem.tsx:134`, change the unselected/resting branch's border token from `border-muted` to `border-border` (the existing shadcn/Tailwind visible-border token backed by the `--border` CSS variable in `client/src/index.css`), leaving `hover:border-primary/60` (line 130) and the selected `border-primary` branch (line 133) unchanged so all three states stay visually distinct in both light and dark themes

**Checkpoint**: All user stories are now independently functional — run `npm run test:e2e` and confirm
T009 passes; visually confirm in light and dark presentation per quickstart.md.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all three stories.

- [X] T011 [P] Run `npm run typecheck` and `npm run lint` and fix any violations introduced by T002-T005, T008, T010
- [X] T012 Run `npm run test` (vitest) and `npm run test:e2e` (Playwright, both `chromium` and `chromium-nl` projects) and confirm all pass, including T001, T006, T007, T009
- [X] T013 Walk through `quickstart.md`'s manual checks (cluster term list in live/practice/debrief; always-visible border in light and dark; nl and en debrief explanation language) and confirm each

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** / **Foundational (Phase 2)**: N/A — no blocking prerequisites (see above)
- **User Stories (Phase 3-5)**: No dependency on Setup/Foundational; no dependency on each other —
  all three touch disjoint files and can proceed in parallel
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1, cluster term list)**: Independent — no dependency on US2 or US3
- **User Story 3 (P1, debrief language)**: Independent — no dependency on US1 or US2 (note: US1's
  `ClusterTermList` change and US3's debrief-language fix both touch the debrief walkthrough, but in
  disjoint files — `Debrief.tsx`/T005 vs `debrief.ts`/T008 — and are not order-dependent)
- **User Story 2 (P2, always-visible border)**: Independent — no dependency on US1 or US3

### Within Each User Story

- Tests (T001/T006-T007/T009) MUST be written and fail before the corresponding implementation task
- T003, T004, T005 depend on T002 (the shared component they import)
- Story complete before moving to Polish

### Parallel Opportunities

- All three user story phases (3, 4, 5) can be worked on in parallel by different people — no shared
  files
- Within US1: T002 first, then T003/T004/T005 in parallel (different files)
- Within US3: T006 and T007 can run in parallel (different test blocks); T008 is independent of both
  and can be written concurrently, but should land before T006/T007 are expected to pass
- T001, T006, T007, T009 (all in `tests/smoke.spec.ts`) touch the same file — coordinate merges even
  though they are logically independent

---

## Parallel Example: User Story 1

```bash
# After T002 (ClusterTermList component) lands, run these together:
Task: "Replace .join(', ') in client/src/routes/cluster/task.tsx:56 with ClusterTermList"
Task: "Replace .join(', ') in client/src/components/PracticeItem.tsx:36 with ClusterTermList"
Task: "Replace .join(', ') in client/src/components/Debrief.tsx:33 with ClusterTermList"
```

## Parallel Example: Across stories

```bash
# US1, US3, and US2 implementation tasks touch entirely disjoint files and can run together:
Task: "T002-T005 — ClusterTermList component + three call sites (US1)"
Task: "T008 — forward deps.language in server/src/routes/debrief.ts (US3)"
Task: "T010 — border-muted → border-border in client/src/components/TaskItem.tsx (US2)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (T001-T005)
2. **STOP and VALIDATE**: Run `npm run test:e2e`, confirm T001 passes, visually confirm term lists
3. Deploy/demo if ready

### Incremental Delivery

1. Add User Story 1 (cluster term list) → validate → deploy/demo (MVP)
2. Add User Story 3 (debrief language) → validate → deploy/demo — closes a correctness defect
   affecting every non-English deployment, same priority as US1
3. Add User Story 2 (always-visible border) → validate → deploy/demo
4. Phase 6: Polish — full typecheck/lint/test sweep and quickstart walkthrough

### Parallel Team Strategy

With multiple developers, since all three stories are file-disjoint:

1. Developer A: User Story 1 (client-only)
2. Developer B: User Story 3 (server-only + smoke test)
3. Developer C: User Story 2 (client-only)
4. Stories complete and integrate independently; one person runs Phase 6 once all three land

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- This feature has no Setup/Foundational phase — every fix lands in an existing file plus one new
  small presentational component (T002)
- Verify tests fail before implementing (T001, T006, T007, T009 before T002-T005, T008, T010
  respectively)
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
