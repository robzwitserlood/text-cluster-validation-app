---
description: 'Task list for Plain Cluster Term List (No Bullets)'
---

# Tasks: Plain Cluster Term List (No Bullets)

**Input**: Design documents from `/specs/007-plain-cluster-terms-list/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: INCLUDED, per the project's established convention (constitution Development Workflow &
Quality Gates; `vitest` + Playwright smoke/e2e required before merge) and the pattern set by
`specs/006-cluster-terms-list-display/tasks.md`. This repo has no client component unit-test
harness — client behavior is verified via `tests/smoke.spec.ts` (Playwright), so the US1 test is a
smoke-test assertion extension, not a new unit test.

**Organization**: Single user story (spec.md: US1, P1) — the entire feature is one Tailwind-class
change on one already-shared component.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 — the spec's only user story
- All paths are repository-root-relative

## Path Conventions

- `client/src/components/ClusterTermList.tsx`, `tests/smoke.spec.ts` (per plan.md "Source Code").

---

## Phase 1: Setup

**Purpose**: Project initialization.

Not required — this feature adds no new dependency, tooling, or project structure.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure that all user stories depend on.

Not required — the single user story is a one-file, one-class-list change with no shared new type,
service, or route to stand up first.

---

## Phase 3: User Story 1 - Scan cluster terms without bullet clutter (Priority: P1) 🎯 MVP

**Goal**: Every cluster option's representative terms keep rendering as a vertical list (one term
per row, multi-word terms intact — unchanged from feature 006) but with no bullet, dash, number, or
other marker glyph in front of any row, everywhere cluster options are shown — live task, practice
task, debrief review.

**Independent Test**: Open the cluster intrusion task (live, practice, and debrief review) and
visually confirm each cluster's terms still render as separate rows, with no marker glyph preceding
any row.

### Tests for User Story 1 ⚠️ (write first, ensure they fail)

- [X] T001 [US1] In `tests/smoke.spec.ts`, extend `expectClusterTermRows` (~line 99, the shared
      helper already called at the cluster-practice step and the live cluster item step) to also
      assert no marker glyph is rendered: locate the `<ul>` ancestor of the `nitrogen deposition`
      `<li>` (e.g. `term.locator('xpath=..')` or an added `data-testid` on the list root) and assert
      its computed `list-style-type` (or `list-style`) is `'none'` via
      `locator.evaluate(el => getComputedStyle(el).listStyleType)`, guarding FR-001/SC-001

### Implementation for User Story 1

- [X] T002 [US1] In `client/src/components/ClusterTermList.tsx:8`, change the `<ul>`'s className
      from `"list-inside list-disc space-y-1 leading-relaxed"` to `"list-none space-y-1
      leading-relaxed"` (drop `list-disc`, which renders the bullet, and `list-inside`, which is a
      no-op once there is no marker; `list-none` is required — not just deleting `list-disc` — because
      browsers apply a default `list-style: disc` to bare `<ul>` elements, per research.md R1); keep
      `space-y-1` and `leading-relaxed` unchanged so row spacing and line-height are unaffected

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently — run
`npm run test:e2e` and confirm T001 passes.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Final verification.

- [X] T003 [P] Run `npm run typecheck` and `npm run lint` and fix any violations introduced by T002
- [X] T004 Run `npm run test:e2e` (Playwright, both `chromium` and `chromium-nl` projects) and
      confirm all pass, including T001
- [X] T005 Walk through `quickstart.md`'s manual checks (unmarked term rows in live/practice/debrief;
      single-term and long-term edge cases; scannability) and confirm each

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** / **Foundational (Phase 2)**: N/A — no blocking prerequisites (see above)
- **User Story 1 (Phase 3)**: No dependency on Setup/Foundational
- **Polish (Phase 4)**: Depends on User Story 1 being complete

### Within User Story 1

- T001 (test) MUST be written and fail before T002 (implementation)
- T002 depends on nothing else — single file, single line change

### Parallel Opportunities

- None beyond T003, which can run alongside T004/T005 once T002 lands — T001 and T002 are
  sequential (test-first) on the same small scope, and T004/T005 both require T002 complete

---

## Implementation Strategy

### MVP First (and only) Scope

1. Complete Phase 3: User Story 1 (T001-T002)
2. **STOP and VALIDATE**: Run `npm run test:e2e`, confirm T001 passes, visually confirm no bullets
3. Complete Phase 4: Polish (T003-T005)
4. Deploy/demo

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to the spec's single user story for traceability
- This feature has no Setup/Foundational phase and only one user story — the entire change is a
  one-line Tailwind class swap on an already-shared component (feature 006)
- Verify T001 fails before implementing T002
- Commit after the task group lands
