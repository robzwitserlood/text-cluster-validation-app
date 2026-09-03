# Phase 1 Data Model: Responsive Survey Loading & Submission

This feature introduces **no new persisted entities and no wire-shape changes** (see
[contracts/api.md](./contracts/api.md)). It changes when/how already-defined states render on the
client, and confirms (without changing) how existing server state is computed. The only "shape"
worth documenting is the client-side navigation loading state R1 in [research.md](./research.md)
adds.

## Existing entities referenced (unchanged)

- **`SessionState`** (`shared/types.ts`) — the server-resolved phase/progress/current-item payload
  returned by `GET /api/session` and, as `next`, by `POST /api/responses`. This feature does not add,
  remove, or rename any field; it only changes when the client shows a pending indicator versus this
  data.
- **`SessionAssignment`** (`server/src/services/sessionService.ts`) — participant→session mapping,
  written once via `writeOnce`. Unchanged; its read path (`ensureAssignment`/
  `pickLeastUtilizedSession`) is the code preserved as-is from commit `ecb9362` (research.md R7).

## New concept: route navigation loading state (client-only, not persisted)

TanStack Router's route lifecycle already models three states per route match: `pending` (loader in
flight), `error` (loader threw), and resolved (component renders with loader data). Today only the
`error`→handled-by-`FlowRouteFrame` and resolved states are ever visibly distinguished; `pending` has
no visual representation for the flow routes in scope. This feature's client-side design is a single
addition to that existing state machine:

| State | Trigger | Rendered as | Governing FR |
| --- | --- | --- | --- |
| `pending` | Route loader's `ensureQueryData`/`fetchQuery` call has not yet resolved (first navigation, hard reload, or a slow/cold `GET /api/session`) | `pendingComponent` → `LoadingMessage` spinner, no delay before showing it | FR-001, FR-002 |
| resolved / welcome | Loader resolved, `session.current.phase === 'welcome'` | `Welcome` (greeting + description + Begin, rendered together — research.md R2) | FR-002, FR-008 |
| resolved / item | Loader resolved, phase is `word-items`/`cluster-items` | `TaskItem` in its normal (non-`loading`) mode | FR-002 |
| `error` | Loader/query threw | `FlowRouteFrame`'s existing `LoadError` + retry (unchanged) | FR-002, FR-005 |

No new type is introduced for this — it is the router's built-in per-route lifecycle, given a visual
representation it currently lacks. It carries no participant data and is not persisted, so it has no
PII surface (Constitution II N/A).

## Submission acknowledgment state (client-only, already modeled — unchanged)

`useFlowResponseMutation`'s React Query mutation states (`idle` → `pending` → `success`/`error`) are
already the acknowledgment model FR-003/FR-004/FR-005 require (research.md R3–R5). This feature adds
no new states here; it is documented for completeness since it's the mechanism SC-002 depends on.

| Mutation state | UI | Governing FR |
| --- | --- | --- |
| `pending` | Submit button disabled, spinner + "submitting…" label (`TaskItem` `submitting` prop) | FR-003, FR-004, SC-002 |
| `error` | `InlineErrorAlert` with `submitError`; selection preserved; button re-enabled | FR-005 |
| `success` | `advanceToSession(result.next)` — cache write + navigate, no extra fetch (research.md R6) | FR-007, SC-003 |
