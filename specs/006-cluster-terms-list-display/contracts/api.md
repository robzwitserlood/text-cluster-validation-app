# Contract: API Deltas

This feature adds **no new endpoints** and changes **no request/response wire shape**. It fixes a
server-side content bug (US3) and two client-only presentation issues (US1/US2). Recorded here for
completeness, per the pattern established in `specs/005-responsive-loading/contracts/api.md`.

## `GET /api/debrief` — shape UNCHANGED, response **content** fixed

- `DebriefState`/`DebriefExample` shape (`contracts/api.md` in `specs/001-cluster-validation/`) is
  unchanged: same fields, same types, including `clusterValidityExplanation: string`.
- **Content fix**: `clusterValidityExplanation` currently always renders the English
  `debriefExplainWord`/`debriefExplainCluster` template regardless of deployment
  `SURVEY_LANGUAGE`, because `registerDebriefRoutes` (`server/src/routes/debrief.ts:24`) never
  forwards `deps.language` into the `ServiceContext` it builds for `buildDebrief`, so
  `sessionService.ts:544`'s `ctx.language ?? 'en'` always falls through to `'en'` (research.md R3).
  After the fix, the field's *value* matches the deployment language exactly as `GET /api/session`'s
  `welcome` content already does (`sessionService.ts:327`) — no client change required, since the
  client already renders whatever string this field contains.

## `GET /api/session` — UNCHANGED

Not touched by this feature.

## `POST /api/responses` — UNCHANGED

Not touched by this feature.

## Client rendering (no wire contract — internal to `client/`)

- The `ClusterCandidate.representativeWords` array delivered by both `GET /api/session` and
  `GET /api/debrief` is unchanged; US1 only changes how the existing array is rendered client-side
  (list vs. comma-joined string).
- The `TaskItem` answer-option border styling (US2) is a Tailwind class change with no data
  dependency at all.
