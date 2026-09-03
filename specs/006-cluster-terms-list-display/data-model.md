# Data Model: Cluster Term List Display, Persistent Option Borders & Debrief Language Fix

**Feature**: 006-cluster-terms-list-display | **Date**: 2026-08-11

This feature introduces **no new entities, fields, or persisted shapes**. It is a presentation fix
(US1/US2) plus a context-wiring fix (US3) over existing runtime data. Recorded here for
completeness, per the pattern established in `specs/005-responsive-loading/data-model.md`.

## Touched runtime shapes (unchanged wire/storage shape, changed usage)

### `ClusterCandidate.representativeWords: string[]`

Defined in [shared/types.ts:96,183](../../shared/types.ts#L96). Already an array of pre-split term
strings (multi-word terms are already single array elements, e.g. `"climate change"` is one string,
not two). US1 changes only how this array is *rendered* (from `.join(', ')` to a `<ul>`/`<li>`
list) — the array itself, its ordering, and every producer of it (live task, practice task,
debrief) are unchanged.

### `ServiceContext.language?: Locale`

Defined in [server/src/services/sessionService.ts:71](../../server/src/services/sessionService.ts#L71).
Already the correct type and already consumed correctly by `buildDebrief`/`toDebriefExample`
(research.md R3). US3 changes only whether `registerDebriefRoutes`
([server/src/routes/debrief.ts](../../server/src/routes/debrief.ts)) *populates* this field on the
context object it constructs — no field is added, removed, or retyped.

### `DebriefExample.clusterValidityExplanation: string`

Defined in [shared/types.ts:174,189](../../shared/types.ts#L174). Field shape and meaning are
unchanged; only its *value* changes (from always-English to locale-correct) once R3 is applied.

## No changes

- No new persisted entity, Volume path, or JSON record shape (Constitution II unaffected — no new
  data flow).
- No new client-side state, store, or query key.
- No change to `Messages` interface in `shared/i18n.ts` — `debriefExplainWord`/`debriefExplainCluster`
  are already implemented for both locales (R3 finding).
