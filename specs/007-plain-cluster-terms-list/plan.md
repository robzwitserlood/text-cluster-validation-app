# Implementation Plan: Plain Cluster Term List (No Bullets)

**Branch**: `007-plain-cluster-terms-list` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-plain-cluster-terms-list/spec.md`

## Summary

Remove the disc bullet marker from the shared `ClusterTermList` component so cluster candidate
terms keep rendering one-per-row (the row-per-term layout delivered by feature 006) but with no
bullet, dash, number, or other marker glyph in front of each row. The component is already shared
across all three display sites (live cluster task, practice cluster task, debrief review), so this
is a single-file, single-class change — see [research.md](./research.md) for the exact location.
No new entity, dependency, or wire-contract change.

## Technical Context

**Language/Version**: TypeScript (strict) across `client/`, `server/`, `shared/`; React 19
**Primary Dependencies**: `@databricks/appkit-ui` (shadcn-based UI + Tailwind); no new dependency
**Storage**: N/A — purely presentational change, no data shape touched
**Testing**: `vitest` (unit) + Playwright (smoke/e2e); manual visual check per quickstart.md
**Target Platform**: Databricks App (Node/Express server + Vite-built React client), served per-locale
(`client/dist-nl`, `client/dist-en`)
**Project Type**: Web application (client + server + shared) — a Databricks AppKit app
**Performance Goals**: N/A — CSS-class-only presentation change
**Constraints**: FR-002 — row-per-term layout MUST be preserved, only the marker glyph is removed;
FR-003 — the unmarked list MUST render identically in all three display sites
**Scale/Scope**: One existing file (`client/src/components/ClusterTermList.tsx`) — no new screens,
components, endpoints, or data fields

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Confirm this plan upholds the project constitution (`.specify/memory/constitution.md`):

- [x] **UX First (I)**: Removes visual noise (unnecessary bullet glyphs) while preserving the
  row-per-term readability gain from feature 006, using only Tailwind classes already in the
  design system on the existing shared component — no bespoke UI, no flow/keyboard/focus change.
- [x] **PII Control (II)**: No data flow touched at all — this changes only how already-delivered,
  non-PII term strings are styled. No new log, storage, or external call.
- [x] **Simplicity (III)**: Smallest possible change — drop the `list-disc` Tailwind class (and
  keep or drop `list-inside` as needed for alignment) on the one existing shared component; no new
  abstraction, no new component.
- [x] **Documentation (IV)**: spec/plan/research/data-model/quickstart kept in sync in this change;
  research.md records the exact file:line and current class list.

**Result**: PASS (initial). No design decisions expected to change this at Phase 1 re-check given
the trivial scope.

Violations MUST be recorded and justified in the Complexity Tracking section below.

## Project Structure

### Documentation (this feature)

```text
specs/007-plain-cluster-terms-list/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 findings — exact class list and location to change
├── data-model.md        # Phase 1 — confirms no new/changed entities
├── quickstart.md        # Phase 1 — manual verification steps against SC-001..SC-002
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory — this feature has no external interface, API, or wire-shape surface;
it is a single presentational component's CSS-class change.

### Source Code (repository root)

```text
client/src/
└── components/
    └── ClusterTermList.tsx   # Only file touched — remove `list-disc` (and adjust `list-inside`
                                #   as needed) from the shared <ul> so terms render one-per-row
                                #   with no marker glyph; already the single render path used by
                                #   cluster/task.tsx, PracticeItem.tsx, and Debrief.tsx (feature 006)
```

**Structure Decision**: Existing web-app layout (`client/` + `server/` + `shared/`) is retained
unchanged. This feature touches exactly one existing file — no new directories, components,
routes, or endpoints, and no server/shared changes, since `ClusterTermList.tsx` is already the
single shared render path for all three display sites.

## Complexity Tracking

_No violations — Constitution Check passed without exceptions. Table intentionally omitted._
