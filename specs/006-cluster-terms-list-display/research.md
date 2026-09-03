# Research: Cluster Term List Display, Persistent Option Borders & Debrief Language Fix

**Feature**: 006-cluster-terms-list-display | **Date**: 2026-08-11

All three user stories are localized fixes to existing, already-correct-shaped code. No new
dependency, pattern, or architectural decision is required; each item below is a codebase finding
that pins down exactly what changes.

## R1 — Cluster term rendering (US1, FR-001/FR-002/FR-003)

**Decision**: Replace `candidate.representativeWords.join(', ')` with an unordered list (`<ul>` of
`<li>`) in each of the three call sites that build a cluster candidate's `label`.

**Finding**: The same one-line pattern is duplicated verbatim in three places, all constructing the
`RadioGroup` candidate `label` consumed by `TaskItem`:

- [client/src/routes/cluster/task.tsx:56](../../client/src/routes/cluster/task.tsx#L56) — live cluster task
- [client/src/components/PracticeItem.tsx:36](../../client/src/components/PracticeItem.tsx#L36) — practice cluster task
- [client/src/components/Debrief.tsx:33](../../client/src/components/Debrief.tsx#L33) — debrief review

Each already wraps the joined string in `<span className="leading-relaxed">{...}</span>`; the fix
is a small shared rendering helper (or inlined identical JSX) swapping the `.join(', ')` string for
a `<ul>` whose `<li>` items are `candidate.representativeWords` — no data shape change, since
`representativeWords: string[]` ([shared/types.ts:96,183](../../shared/types.ts#L96)) already
carries the terms pre-split, so multi-word terms (e.g. "climate change") are naturally preserved as
single list items with no parsing needed.

**Alternatives considered**: A shared `<ClusterTermList>` component vs. duplicating three small
`<ul>` blocks inline. Given Simplicity (III) and that three call sites already duplicate the join
logic today, a tiny shared presentational component (`client/src/components/ClusterTermList.tsx`)
is preferred over inline triplication — one obvious way to render terms, per the constitution.

## R2 — Always-visible option border (US2, FR-004/FR-005)

**Decision**: Change the unselected/resting border color token in `TaskItem.tsx` from
`border-muted` to a token with real contrast against `bg-card` (candidate: `border-border`, the
shadcn/Tailwind default visible-border token already used elsewhere in the design system per
[specs/003-survey-copy-house-style/design-tokens.md](../003-survey-copy-house-style/design-tokens.md)),
while leaving the hover (`hover:border-primary/60`) and selected (`border-primary`) states
untouched so the three states stay visually distinct.

**Finding**: [client/src/components/TaskItem.tsx:129-134](../../client/src/components/TaskItem.tsx#L129-L134)
is the single render site for every answer option tile (word and cluster, live and practice —
`PracticeItem` and the live task routes all render through `TaskItem`). The resting state currently
uses `border-muted`, a low-contrast token close to the card background, which is why the border is
effectively invisible until `hover:border-primary/60` or the `isSelected` branch
(`border-primary`) kicks in. This is a one-token change in one file; no other option-rendering path
exists to update.

**Alternatives considered**: Adding a new `border-2` box-shadow instead of swapping the color token
— rejected as unnecessary complexity (Simplicity III) when the existing `border-border` token
already exists in the design system and gives sufficient resting-state contrast in both light and
dark themes without introducing a new visual language (spec Assumptions).

## R3 — Debrief explanation language (US3, FR-006/FR-007/FR-008)

**Decision**: Pass `language: deps.language` through in
[server/src/routes/debrief.ts:24](../../server/src/routes/debrief.ts#L24) so `buildDebrief`'s
`ServiceContext.language` is populated the same way `/api/session` already populates it.

**Finding — root cause located**: `buildDebrief` (called from `GET /api/debrief`) already resolves
the localized explanation correctly in
[server/src/services/sessionService.ts:544](../../server/src/services/sessionService.ts#L544) via
`messages[ctx.language ?? 'en']`, and both `debriefExplainWord`/`debriefExplainCluster` are already
implemented for both locales in [shared/i18n.ts:111-118](../../shared/i18n.ts#L111-L118). The bug is
that `registerDebriefRoutes` never forwards the deployment language into the context object it
builds — [server/src/routes/debrief.ts:24](../../server/src/routes/debrief.ts#L24) constructs
`{ storage: deps.storage, studyId: deps.studyId, study }` and omits `language`, even though
`RouteDeps` (imported from `./session`) already declares `language?: Locale` and
[server/src/routes/session.ts:34](../../server/src/routes/session.ts#L34) shows the correct pattern
for forwarding it. Because `ctx.language` is therefore always `undefined`, the `?? 'en'` fallback at
line 544 silently always selects English — this exactly matches the reported symptom (debrief
explanations always in English regardless of `SURVEY_LANGUAGE`) and requires no change to the i18n
catalog, the explanation templates, or the client.

**Alternatives considered**: None needed — this is a one-line omission with an established, correct
pattern already present in the sibling route (`session.ts`) to mirror. No new data flow, no new
dependency.

## Testing approach

- **R3** is directly unit-testable: `tests/unit/sessionService.test.ts` already exercises
  `buildDebrief`; extend it with a case that builds `ServiceContext` with `language: 'nl'` and
  asserts `clusterValidityExplanation` matches the `nl` catalog output (and a companion case for
  `en`/default, guarding against regression per SC-005).
- **R1**/**R2** are presentational (no existing client unit-test harness in this repo — client
  behavior is covered by `tests/smoke.spec.ts` / Playwright e2e per
  [specs/005-responsive-loading/plan.md](../005-responsive-loading/plan.md)). Verification is via
  the Playwright smoke suite plus manual/quickstart visual check (list rows, always-visible border)
  rather than new unit tests, consistent with how existing presentational-only changes in this repo
  are verified.
