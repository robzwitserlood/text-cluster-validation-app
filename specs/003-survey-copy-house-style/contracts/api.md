# Contract: API Deltas

This feature adds **no new endpoints** and changes no request/response *wire* contract. It is
recorded here for completeness and to make explicit what does NOT change.

## `POST /api/responses` — request UNCHANGED

The submitted body and `Selection` are unchanged:

```ts
interface SubmitRequest {
  itemId: string;
  taskType: 'word' | 'cluster';
  selection: { kind: 'candidate'; value: string }; // UNCHANGED — no selectedClusterWords on the wire
  timeTakenMs?: number;
}
```

- FR-012 is a **server write-time / storage** concern only. The client never sends
  `selectedClusterWords`; the server resolves and nests it when persisting (see
  `contracts/storage.md`). `SubmitResult` (`{ recorded, next }`) is unchanged and still never carries
  `correct` (R5).

## `GET /api/session` — response UNCHANGED shape

- `SessionState` shape is unchanged. The welcome phase's `current.welcome` still carries
  `WelcomeContent`; the built-in default is richer (FR-002) but travels through the same fields
  (plus the optional default-only body field, if added — see data-model.md). Researcher-supplied
  welcome is unchanged and shown verbatim (FR-015).
- The canonical section list (FR-001) is **static built-in copy** and is NOT added to the session
  payload — it lives client+server-side in `shared/i18n.ts` (research.md R1).

## `GET /api/debrief` — UNCHANGED

- The debrief/walkthrough payload (`DebriefState`) and its ground-truth-revealing rules are
  unchanged. The completion page's copy/framing changes (FR-008/FR-009) are client-side only.
- *Update (2026-07-16, post-003)*: `examples` now carries a random sample of up to
  `config.debriefSampleSize` answered items (default 3; all answered items when fewer), per the
  original 001 spec. The sample is participant-seeded, so repeated fetches return the same set.
  Payload shape and ground-truth rules are otherwise unchanged.
