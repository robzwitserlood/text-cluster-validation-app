# Tasks: Deployment Configuration Cleanup

**Input**: Design documents from `/specs/004-deployment-config/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [quickstart.md](quickstart.md)

**Tests**: Not requested for this feature. Verification is done via `databricks bundle
validate`/`bundle summary` (config-only change, no application test suite applies).

**Organization**: Tasks are grouped by user story. All three stories edit the same single file
(`databricks.yml`), in different, non-overlapping sections (`resources.apps.app` vs.
`targets`), so they are logically independent but **not** file-parallelizable — do them
sequentially in priority order (P1 → P2 → P3) to avoid edit conflicts.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task includes the exact file path to edit or the exact command to run

## Path Conventions

Single file at repository root: `databricks.yml`. One documentation file elsewhere:
`specs/001-cluster-validation/quickstart.md`. No `src/`/`backend/`/`frontend/` changes.

---

## Phase 1: Setup

**Purpose**: Capture the pre-change baseline so each story's change can be diffed against a
known-good starting point.

- [X] T001 Run `databricks bundle validate --profile DEFAULT` and
      `databricks bundle summary --profile DEFAULT -o json` against the current
      `databricks.yml`; note the baseline values (`Target: default`,
      `resources.apps.app.name == clustering-app`,
      `resources.apps.app.description == "A Databricks App powered by AppKit"`,
      `variables.files_path.value == /Volumes/dev/raw/landing`,
      `variables.files_id.value == dev.raw.landing`) for later comparison. No file changes.

---

## Phase 2: Foundational

**Not applicable.** There is no shared blocking prerequisite: User Story 1 edits the
`targets` block, User Stories 2 and 3 edit the `resources.apps.app` block, and none of the
three depends on infrastructure the others create. Proceed directly to Phase 3.

---

## Phase 3: User Story 1 - Environment-scoped storage paths (Priority: P1) 🎯 MVP

**Goal**: The volume path and Unity Catalog securable the app writes to are derived from the
active deployment target's name instead of being hardcoded, closing the drift risk described
in spec.md.

**Independent Test**: Deploy/validate the bundle with no `-t` override and confirm (via
`databricks bundle summary`) that `files_path` resolves to `/Volumes/dev/raw/landing` and
`files_id` resolves to `dev.raw.landing`, with neither value hardcoded outside the target's
own name.

### Implementation for User Story 1

- [X] T002 [US1] In `databricks.yml`: rename the target key `default` → `dev` (keep
      `default: true` on it so it remains the implicit target), and replace the hardcoded
      `files_path: /Volumes/dev/raw/landing` and `files_id: dev.raw.landing` under that target
      with `files_path: /Volumes/${bundle.target}/raw/landing` and
      `files_id: ${bundle.target}.raw.landing` respectively.

### Verification for User Story 1

- [X] T003 [US1] Run `databricks bundle validate --profile DEFAULT` (no `-t` flag) and confirm
      it reports `Target: dev`; then run
      `databricks bundle summary --profile DEFAULT -o json` and confirm
      `variables.files_path.value == /Volumes/dev/raw/landing` and
      `variables.files_id.value == dev.raw.landing`.

**Checkpoint**: `dev` is the resolved default target, and both variables are expressed via
`${bundle.target}` while still resolving to their original values.

---

## Phase 4: User Story 2 - Recognizable app identity (Priority: P2)

**Goal**: The app resource is named `human-val-text-analysis` so it's identifiable in the
workspace Apps list.

**Independent Test**: Run `databricks bundle summary --profile DEFAULT -o json` (after
deploy, `databricks apps get human-val-text-analysis`) and confirm the app is listed under
that name.

### Implementation for User Story 2

- [X] T004 [US2] In `databricks.yml`, change `resources.apps.app.name` from `clustering-app`
      to `human-val-text-analysis`.

### Verification for User Story 2

- [X] T005 [US2] Run `databricks bundle summary --profile DEFAULT -o json` and confirm
      `resources.apps.app.name == human-val-text-analysis` (also check `resources.apps.app.id`,
      which mirrors `name`).

**Checkpoint**: The app resource's technical name matches the requested identity, independent
of the Phase 3 target rename.

---

## Phase 5: User Story 3 - Descriptive app description (Priority: P3)

**Goal**: The app's `description` explains what the app does, opening with the human-readable
label "Human validation text analysis".

**Independent Test**: Run `databricks bundle summary --profile DEFAULT -o json` (after
deploy, `databricks apps get human-val-text-analysis`) and confirm the `description` field
opens with "Human validation text analysis" and explains the app's purpose.

### Implementation for User Story 3

- [X] T006 [US3] In `databricks.yml`, replace `resources.apps.app.description` (currently
      `"A Databricks App powered by AppKit"`) with:
      `"Human validation text analysis. Collects human validation (word- and
      cluster-intrusion judgments) of automatically generated text clusters and stores
      submitted responses in Unity Catalog Volumes."`

### Verification for User Story 3

- [X] T007 [US3] Run `databricks bundle summary --profile DEFAULT -o json` and confirm
      `resources.apps.app.description` starts with "Human validation text analysis" and
      mentions word/cluster-intrusion validation and Unity Catalog Volumes storage.

**Checkpoint**: All three user stories' changes are present in `databricks.yml` and each
verifies independently.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Keep documentation in sync (Constitution Principle IV) and confirm the combined
result is valid.

- [X] T008 [P] Fix the stale command in
      `specs/001-cluster-validation/quickstart.md:131` — change
      `databricks bundle run clustering-app` to `databricks bundle run app` (the bundle
      resource key, unaffected by the User Story 2 app-name rename).
- [X] T009 Run `databricks bundle validate --profile DEFAULT` and
      `databricks bundle summary --profile DEFAULT -o json` once more with all of T002, T004,
      and T006 applied together; confirm no schema errors and that every value listed in
      [quickstart.md](quickstart.md) "Validate" section matches.

**Note**: Actually deploying (`databricks bundle deploy` / `databricks bundle run app`) is
intentionally **not** a task here — per the `databricks-apps` platform guide, deployment
requires explicit user consent each time, and creates a *new* app in the workspace (the old
`clustering-app` app is left orphaned — see spec.md Edge Cases). Deploying is a follow-up
manual step for the user after this task list is complete, not part of the config-authoring
work.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run first to capture the baseline.
- **Foundational (Phase 2)**: N/A — nothing blocks the user stories.
- **User Stories (Phase 3-5)**: Each only depends on Setup (T001) for its baseline
  comparison. They edit disjoint sections of the same file, so run them **sequentially** in
  priority order (US1 → US2 → US3) to avoid clobbering each other's uncommitted edits, even
  though none of them logically depends on another's change.
- **Polish (Phase 6)**: T008 has no dependency on any other task (different file) and can run
  anytime. T009 depends on T002, T004, and T006 all being applied.

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on US2/US3.
- **User Story 2 (P2)**: No dependency on US1/US3.
- **User Story 3 (P3)**: No dependency on US1/US2.

### Parallel Opportunities

- T008 (doc fix in a different file) can run in parallel with any of T002-T007.
- T002, T004, and T006 all edit `databricks.yml` and must NOT be run in parallel with each
  other, despite belonging to independent stories.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001 (Setup baseline).
2. T002-T003 (User Story 1 — the change with real operational risk today).
3. **STOP and VALIDATE**: confirm `dev` resolves correctly before touching app identity/
   description.

### Incremental Delivery

1. T001 → baseline captured.
2. T002-T003 → US1 done, validated independently (MVP).
3. T004-T005 → US2 done, validated independently.
4. T006-T007 → US3 done, validated independently.
5. T008-T009 → docs corrected, combined result validated.
6. User (separately, with explicit consent) runs `databricks bundle deploy` +
   `databricks bundle run app` to actually deploy `human-val-text-analysis`.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- All verification tasks use `databricks bundle validate`/`bundle summary` only — no code
  changes, no deploy, so nothing here requires the destructive/outward-facing confirmation a
  live `bundle deploy` or `bundle run` would.
- Commit after each user story's implementation + verification pair.
