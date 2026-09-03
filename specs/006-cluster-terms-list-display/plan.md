# Implementation Plan: Cluster Term List Display, Persistent Option Borders & Debrief Language Fix

**Branch**: `006-cluster-terms-list-display` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-cluster-terms-list-display/spec.md`

## Summary

Three small, independent fixes to the existing 001–005 participant flow: (1) render each cluster
option's `representativeWords` as a vertical list instead of a comma-joined string, in all three
places it appears — live task, practice task, debrief review (US1); (2) give every answer-option
tile (word and cluster, live and practice) a visible resting-state border instead of one that only
appears on hover/selection (US2); (3) fix a located bug where the debrief/explanation screen always
renders English per-item explanations regardless of the deployment's `SURVEY_LANGUAGE`, because the
debrief route never forwards the deployment language into the service context it builds (US3). All
three are content/presentation-only changes over existing data shapes — see
[research.md](./research.md) for the exact locations and root causes found by code audit; no new
entity, dependency, or wire-contract change (data-model.md, contracts/).

## Technical Context

**Language/Version**: TypeScript (strict) across `client/`, `server/`, `shared/`; React 19
**Primary Dependencies**: `@databricks/appkit` (backend SDK), `@databricks/appkit-ui`
(shadcn-based UI + Tailwind), `@tanstack/react-router`, `@tanstack/react-query`, `zod`
**Storage**: JSON response/assignment records in a Unity Catalog Volume via the AppKit Files plugin;
no DB; no new stored shapes in this feature
**Testing**: `vitest` (unit) + Playwright (smoke/e2e); see memory note re: WSL2 chromium download
**Target Platform**: Databricks App (Node/Express server + Vite-built React client), served per-locale
(`client/dist-nl`, `client/dist-en`)
**Project Type**: Web application (client + server + shared) — a Databricks AppKit app
**Performance Goals**: N/A — presentation and content-correctness fixes only; no change to load,
submit, or transition timing budgets established by `specs/005-responsive-loading/`
**Constraints**: FR-002 — multi-word terms MUST NOT be split across rows; FR-005 — resting-state
border MUST remain visually distinct from hover/selected states; FR-007 — no mixed-language content
on the debrief screen for either supported locale; no PII in logs/telemetry/client storage
(Constitution II, unaffected — no new data flow)
**Scale/Scope**: Three existing render sites for cluster terms (`cluster/task.tsx`,
`PracticeItem.tsx`, `Debrief.tsx`), one existing render site for option borders (`TaskItem.tsx`), one
existing route (`server/src/routes/debrief.ts`) — no new screens, endpoints, or data fields

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Confirm this plan upholds the project constitution (`.specify/memory/constitution.md`):

- [x] **UX First (I)**: Fixes a genuine readability gap (US1), a genuine visual-clarity gap (US2),
  and a genuine language-correctness defect (US3) using only existing `@databricks/appkit-ui`
  primitives and Tailwind tokens already in the design system — no bespoke UI, no new component
  library. No flow, keyboard path, or focus order changes.
- [x] **PII Control (II)**: No new data flow. US1/US2 are purely presentational over data already
  delivered to the client. US3 forwards an existing, already-non-PII deployment setting
  (`SURVEY_LANGUAGE`/`Locale`) one level deeper into an existing service call — no new field, no new
  log, no new client storage.
- [x] **Simplicity (III)**: Each fix is the smallest change that closes the located gap — a rendering
  swap (join → list), a Tailwind class swap (`border-muted` → `border-border`), and a one-argument
  forward (`language: deps.language`) mirroring the identical pattern already used in the sibling
  `session.ts` route. No new abstraction beyond one small shared `ClusterTermList` presentational
  component to avoid re-duplicating the list markup across three call sites (research.md R1).
- [x] **Documentation (IV)**: spec/plan/research/data-model/contracts/quickstart are kept in sync in
  this change; research.md records the exact root cause (with file:line references) for each user
  story so the "why" survives past this PR.

**Result**: PASS (initial and post-design). Phase 0/1 design work confirmed all three fixes are
localized, existing-pattern-following changes with no new dependency, persisted entity, wire change,
or bespoke UI. No re-evaluation changes the gates above.

## Project Structure

### Documentation (this feature)

```text
specs/006-cluster-terms-list-display/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 findings (R1–R3) — root cause + exact locations per user story
├── data-model.md        # Phase 1 — confirms no new persisted/wire shapes
├── quickstart.md        # Phase 1 — manual verification steps against SC-001..SC-005
├── contracts/           # api.md — confirms no wire shape change; documents the content fix
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
client/src/
├── routes/cluster/task.tsx        # US1 — live cluster task candidate label (line 56)
├── components/
│   ├── PracticeItem.tsx           # US1 — practice cluster task candidate label (line 36)
│   ├── Debrief.tsx                # US1 — debrief review candidate label (line 33)
│   ├── ClusterTermList.tsx        # US1 — NEW small shared presentational component (<ul>/<li>)
│   └── TaskItem.tsx               # US2 — answer-option tile border classes (lines 129-134);
│                                    #   single render site for word + cluster, live + practice

server/src/
├── routes/debrief.ts               # US3 — forward `language: deps.language` into the
│                                    #   ServiceContext passed to buildDebrief (line 24)
└── services/sessionService.ts      # US3 — buildDebrief/toDebriefExample already correct once
                                     #   ctx.language is populated (line 544); no change needed here

shared/
├── types.ts                        # Reference only — ClusterCandidate.representativeWords: string[]
│                                    #   already the right shape; no change
└── i18n.ts                         # Reference only — debriefExplainWord/debriefExplainCluster
                                     #   already implemented for both locales; no change

tests/
└── unit/
    └── sessionService.test.ts      # US3 — extend buildDebrief tests with an `nl`-language case
                                     #   asserting clusterValidityExplanation matches the nl catalog
```

**Structure Decision**: Existing web-app layout (`client/` + `server/` + `shared/`) is retained
unchanged; no new top-level directories, routes, or endpoints. Every fix lands in an existing file
except one small new presentational component (`ClusterTermList.tsx`) that replaces three
duplicated `.join(', ')` call sites with one obvious way to render cluster terms (Simplicity III).

## Complexity Tracking

_No violations — Constitution Check passed without exceptions. Table intentionally omitted._
