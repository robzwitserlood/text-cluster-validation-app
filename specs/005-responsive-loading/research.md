# Phase 0 Research: Responsive Survey Loading & Submission

All items below were resolved by auditing the current implementation (client TanStack Router/Query
routes, `server/src/services/sessionService.ts`, `server/src/routes/responses.ts`) rather than by
external research — this is a responsiveness/UX-completeness feature on an existing flow, not a new
technology choice. Each decision maps back to the FR(s) it resolves.

## R1 — Blank screen during route navigation (FR-001, FR-002, SC-001)

- **Decision**: Give the flow routes that block on `GET /api/session` (`/`, `/word/task`,
  `/cluster/task`, `/complete`, and the other `loadSessionForPhases`/`loadCurrentSession` loader
  consumers) a `pendingComponent` that renders the existing `LoadingMessage` spinner, with
  `pendingMs: 0` so it appears immediately rather than after TanStack Router's default ~1s
  threshold.
- **Rationale**: None of these routes currently declare a `pendingComponent`. TanStack Router's
  loader (`client/src/lib/flow-router.ts:36-55`) fully blocks route rendering on
  `queryClient.ensureQueryData(sessionQueryOptions())` before the component mounts; with no
  `pendingComponent` configured anywhere (verified: no `pendingComponent`/`pendingMs` references in
  `client/src`) and no `pendingComponent` on the root route (`client/src/routes/__root.tsx`), the
  content area under `PblChrome` is simply empty until the fetch resolves — precisely the "blank or
  unresponsive screen" FR-002 forbids and the failure mode US1's acceptance scenario #1 calls out.
  `FlowRouteFrame`'s own `isPending` branch (`client/src/lib/flow-pages.tsx:21`) never fires in this
  case, because by the time the component exists the loader has already resolved the query — it
  only helps a same-route refetch, not first navigation.
- **Alternatives considered**: A Suspense boundary around the route tree — rejected, the codebase
  uses the router's own loader/pending lifecycle everywhere else (Constitution III: one obvious
  mechanism, don't introduce a second). Speeding up `GET /api/session` alone without a pending
  fallback — insufficient on its own per FR-002, since *any* nonzero latency (including tail
  latency, cold starts, poor connections) must never render blank; a fallback is required
  regardless of how fast the median case is.

## R2 — Two-stage welcome reveal (FR-008)

- **Decision**: No change to `Welcome.tsx`'s data dependency. Keep the greeting, description, and
  Begin control resolving and rendering together, as they do today.
- **Rationale**: FR-008 is permissive ("MAY appear together... the begin control MAY show a loading
  indicator") not mandatory. `Welcome` (`client/src/components/Welcome.tsx:21-52`) renders the
  greeting/description and the Begin button from the same already-resolved `session.current.welcome`
  payload — both come from the single `GET /api/session` call R1 already makes non-blank. There is
  no second, slower fetch that the button specifically waits on, so splitting the UI into two stages
  would add state and complexity (Constitution III) without reducing time-to-interactive: the whole
  card is only as fast as the one fetch that already governs both parts. If a future change made the
  begin control depend on extra async work, FR-008 already permits staging it then.

## R3 — Submit acknowledgment timing (FR-003, SC-002)

- **Decision**: No change. `useFlowResponseMutation`'s `responseMutation.isPending`
  (`client/src/lib/flow-route-state.ts:40-56`) already flips synchronously the instant
  `mutateAsync()` is called (React Query sets pending state before the async `mutationFn` runs), and
  `TaskItem` already renders the disabled/spinner "submitting…" state from that flag
  (`client/src/components/TaskItem.tsx:103,151-159`). `handleSubmit` in `word/task.tsx:30-44` (and
  the `cluster/task.tsx` mirror) does no synchronous work before calling `mutateAsync`, so the
  acknowledgment is bounded by a single React re-render — far under the 150ms budget.
- **Rationale**: Confirmed by reading the click-to-render path end to end; nothing sits between the
  click and the pending-state re-render. Building a separate optimistic-UI layer would duplicate
  what React Query's mutation lifecycle already provides.

## R4 — Duplicate-submission protection (FR-004)

- **Decision**: No change. Existing client + server behavior already prevents a second recorded
  response for the same item.
- **Rationale**: Client-side, the submit button is `disabled={!value || submitting}`
  (`TaskItem.tsx:151`), so a repeat click while `responseMutation.isPending` is true is inert.
  Server-side, `recordResponse` persists via `writeOnce` (`server/src/lib/storage.ts:45-52`), which
  uploads with `overwrite: false` and treats an already-existing file as a successful no-op — so
  even a genuine concurrent duplicate (e.g. a retried request after a dropped response) can never
  overwrite or duplicate the first recorded answer.

## R5 — Failure feedback and retry (FR-005)

- **Decision**: No structural change; verify copy clarity only (documentation-level, not code).
  `useFlowResponseMutation`'s `onError` already sets a user-visible `submitError`
  (`flow-route-state.ts:47-49`), rendered via `InlineErrorAlert`, and the failed submission does not
  clear `selection` (`word/task.tsx:39` only clears it in the success path) or otherwise lock the
  control — so the existing Submit button *is* the retry action once the participant clicks it
  again.
- **Rationale**: This already matches "clearly informed... able to retry, rather than being left in
  an ambiguous state" (FR-005 / edge case). Nothing to build; only confirm during Phase 2 tasks that
  `SUBMIT_ERROR`'s copy (`flow-route-state.ts:9`) reads as an actionable retry prompt, not just a
  generic error.

## R6 — Next-item transition has no second round trip (FR-007, SC-003, "no indicator needed" clarification)

- **Decision**: No change. `advanceToSession` (`flow-route-state.ts:18-24`) already writes the
  server-resolved `next: SessionState` directly into the TanStack Query cache
  (`queryClient.setQueryData(sessionQueryKey, next)`) before navigating; combined with
  `sessionQueryOptions()`'s `staleTime: Infinity` (`client/src/lib/queries.ts:13`), the destination
  route's loader resolves from cache with zero additional network requests. This already matches the
  clarified requirement that no loading indicator is needed between items — there is no gap for one
  to fill.
- **Rationale**: The full submit→next-item budget (SC-003, 1.0s) is therefore entirely the
  `POST /api/responses` server round trip (R7), not any client-side re-fetch.

## R7 — Server-side per-request cost as a session progresses (FR-007, SC-006)

- **Decision**: Preserve `sessionService.ts`'s already-merged optimization (commit `ecb9362`,
  "fix: make first load faster") unchanged: the single-session short-circuit in
  `pickLeastUtilizedSession` and the bounded-concurrency (`mapWithConcurrency`, cap 16) batched
  assignment reads. No further change to that function in this feature.
- Separately audited (no code change): `listAnsweredItemIds`/`listPracticeResponseIds`
  (`sessionService.ts:265-284`), called on every `getSessionState`, each do one
  `storage.list()` against *that participant's own* response directory
  (`responsesDir(studyId, participantId)` / `practiceResponsesDir(...)`). This count is bounded by
  the number of items in that participant's assigned session (small, fixed by study design), not by
  the total number of participants or total items ever answered study-wide — the class of problem
  `ecb9362` fixed. Growth here is bounded and not the kind of unbounded, population-scaling cost
  FR-007/SC-006 target.
- **Rationale**: Distinguishes the *already-fixed* unbounded cost (cross-participant assignment scan,
  `ecb9362`) from the *inherently-bounded* cost (a participant's own answered-item listing) so this
  plan doesn't re-optimize something that isn't actually the risk, per Constitution III (no
  speculative work). If Phase 2 task execution or load testing surfaces evidence this listing is
  measurably slow in practice, that would be a new, separately-justified task — not assumed here.

## R8 — Loading indicator component reuse (Constitution I)

- **Decision**: `LoadingMessage` (`client/src/components/LoadingMessage.tsx`) remains the only
  loading primitive used anywhere this feature adds a pending fallback (R1). `TaskItem`'s existing
  `loading` prop (`TaskItem.tsx:80-88`) is already available if a future item-level loading state is
  ever needed, but R6 shows the item transition has no such gap today, so it stays unused by this
  feature.
- **Rationale**: No bespoke UI; reuse over invention (Constitution I/III).
