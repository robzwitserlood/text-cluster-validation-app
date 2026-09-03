# Implementation Plan: Responsive Survey Loading & Submission

**Branch**: `005-responsive-loading` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-responsive-loading/spec.md`

## Summary

Make the home page, answer submission, and next-item transition feel immediate: never show a blank
screen while data is being prepared (FR-002), acknowledge a submit within 150ms independent of save
time (FR-003/SC-002), and keep the submit→next-item gap flat regardless of how many items a
participant has already completed (FR-007/SC-006) — all without adding indicator-induced delay
(FR-001) or changing any existing correctness guarantee (FR-006).

**Technical approach**: An audit of the current implementation (see [research.md](./research.md))
found that most of the target behavior is *already* correct — React Query's `isPending` flips
synchronously on `mutate()`, `TaskItem` already renders a disabled/spinner "submitting" state from
it, the submit button is already re-enabled with the selection preserved on failure, and
`advanceToSession` already writes the server-resolved next `SessionState` straight into the query
cache (no second network round trip between items). The concrete, verified gap is that none of the
flow routes (`/`, `/word/task`, `/cluster/task`, `/complete`, etc.) declare a `pendingComponent`, so
TanStack Router's default pending behavior renders nothing while a route loader's blocking
`GET /api/session` fetch is in flight — a blank content area on first paint or a slow connection,
violating FR-002 directly. The fix is to wire the existing `LoadingMessage` spinner as the shared
pending fallback for these routes so *something* always paints immediately, with no change to how
fast the underlying fetch resolves. On the server side, this plan explicitly preserves the
first-load optimization already merged in commit `ecb9362` (`sessionService.ts`:
single-session short-circuit + bounded-concurrency batched assignment reads) as-is — it already
satisfies the "flat cost regardless of study size" half of FR-007/SC-006; this plan's server-side
scope is limited to confirming (not rewriting) that the remaining per-request work
(`listAnsweredItemIds`/`listPracticeResponseIds`) stays bounded by a single participant's own
(small, session-scoped) response count rather than the whole study population. Detailed decisions:
[research.md](./research.md); the touched runtime shapes: [data-model.md](./data-model.md); wire
contracts (unchanged): [contracts/](./contracts/).

## Technical Context

**Language/Version**: TypeScript (strict) across `client/`, `server/`, `shared/`; React 19
**Primary Dependencies**: `@databricks/appkit` 0.24.0 (backend SDK), `@databricks/appkit-ui` 0.24.0
(shadcn-based UI + Tailwind), `@tanstack/react-router` 1.170.8, `@tanstack/react-query` 5.100.14, `zod` 4
**Storage**: JSON response/assignment records in a Unity Catalog Volume via the AppKit Files plugin
(`text_cluster_validation/{STUDY_ID}/…`); no DB; no new stored shapes in this feature
**Testing**: `vitest` (unit) + Playwright (smoke/e2e); see memory note re: WSL2 chromium download
**Target Platform**: Databricks App (Node/Express server + Vite-built React client), served per-locale
(`client/dist-nl`, `client/dist-en`)
**Project Type**: Web application (client + server + shared) — a Databricks AppKit app
**Performance Goals**: SC-001 home page visible+interactive ≤1s (p95); SC-002 submit acknowledgment
≤150ms (100% of submissions, independent of backend save time); SC-003 next item/completion visible
≤1.0s (p95) of a successful submission; SC-006 no perceptible growth in per-item wait as completed
items accumulate in a session
**Constraints**: FR-001 — a loading indicator MUST NOT itself add wait time (no artificial delay,
no `pendingMs` padding); FR-002 — never a blank/unresponsive screen at any point in these three
flows; FR-006 — zero behavior change to exactly-once recording, no early answer reveal, and resume
correctness; no PII in client-side persistent storage or logs (Constitution II)
**Scale/Scope**: Three existing flows touched (home load, item submission, next-item load) across
the ~9 participant-facing screens established by 001–003; no new screens, endpoints, or data fields

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Confirm this plan upholds the project constitution (`.specify/memory/constitution.md`):

- [x] **UX First (I)**: This feature exists to complete the loading state everywhere it was missing
  (FR-002) using the existing `LoadingMessage`/`TaskItem` loading primitives — no bespoke UI. No
  flow, keyboard path, or focus order is removed or altered.
- [x] **PII Control (II)**: No new data flow; no data leaves the Unity Catalog / Volumes boundary;
  no new logging, telemetry, or client persistent storage. Purely presentation-timing and
  cache-wiring changes.
- [x] **Simplicity (III)**: The audit deliberately avoids adding mechanisms where the current
  behavior already satisfies an FR (e.g., submit acknowledgment, duplicate-submit protection,
  failure retry, next-item cache write — see research.md R2–R6). The one server-side optimization
  this feature depends on (`ecb9362`) is preserved unchanged rather than reimplemented.
- [x] **Documentation (IV)**: spec/plan/research/data-model/contracts/quickstart are kept in sync in
  this change; research.md records, per-FR, which behavior was already correct and which needed a
  change, so the "why" survives past this PR.

**Result**: PASS (initial and post-design). Phase 0/1 design work (research.md, data-model.md,
contracts/) introduced no new dependency, persisted entity, wire change, or bespoke UI — it confirmed
that most target behavior was already correct and scoped the one real gap (a missing
`pendingComponent` fallback, R1) to existing components only. No re-evaluation changes the gates
above.

## Project Structure

### Documentation (this feature)

```text
specs/005-responsive-loading/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 decisions (R1–R8)
├── data-model.md         # Phase 1 — client loading-state model; no new persisted entities
├── quickstart.md        # Phase 1 — manual verification steps against SC-001/002/003/006
├── contracts/            # api.md — confirms no wire contract changes
└── tasks.md              # Phase 2 output (/speckit-tasks) — not created by /speckit-plan
```

### Source Code (repository root)

```text
client/src/
├── main.tsx               # Router creation — candidate site for a shared default pending fallback
├── lib/
│   ├── flow-router.ts      # loadSessionForPhases/loadCurrentSession loaders (block on GET /api/session)
│   ├── flow-route-state.ts # useFlowSession/useFlowResponseMutation — advanceToSession cache write
│   ├── flow-pages.tsx      # FlowRouteFrame — existing isPending/isError → LoadingMessage/LoadError
│   └── queries.ts          # sessionQueryOptions (staleTime: Infinity) — unchanged
├── routes/
│   ├── index.tsx            # Home page (US1) — loader currently has no pendingComponent
│   ├── word/task.tsx         # Submit + next-item (US2/US3) — mutation/advanceToSession wiring
│   ├── cluster/task.tsx      # Mirrors word/task.tsx
│   └── complete.tsx          # Terminal phase — same loader-blocking pattern as index.tsx
└── components/
    ├── LoadingMessage.tsx    # Existing spinner primitive — reused as the pending fallback
    └── TaskItem.tsx           # Existing `submitting`/`loading` props — already wired correctly

server/src/
├── services/sessionService.ts  # ensureAssignment/pickLeastUtilizedSession (ecb9362, preserved as-is);
│                                 #   listAnsweredItemIds/listPracticeResponseIds audited, not rewritten
└── routes/responses.ts          # POST /api/responses — recordResponse + getSessionState sequencing

tests/
├── unit/                  # sessionService.test.ts (ecb9362 coverage preserved); new assertions for
│                           #   bounded per-participant list cost if research.md flags a gap
└── smoke/e2e               # New/updated assertions: no blank frame on navigation, submit-ack timing
```

**Structure Decision**: Existing web-app layout (`client/` + `server/` + `shared/`) is retained
unchanged; no new top-level directories, routes, or endpoints. Every change lands in an existing
file. The `ecb9362` commit in `sessionService.ts` is treated as prior, already-shipped work for this
feature's FR-007/SC-006 goal and is not modified — this plan's server-side task (if any survives the
research audit) is additive/confirmatory only, never a rewrite of that function.

## Complexity Tracking

_No violations — Constitution Check passed without exceptions. Table intentionally omitted._
