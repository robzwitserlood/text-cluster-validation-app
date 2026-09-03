# Phase 0 Research: Cluster Validation via Intrusion Tasks

**Feature**: `001-cluster-validation` | **Date**: 2026-06-08
**Inputs**: spec.md, constitution v1.0.0, existing AppKit scaffold (`@databricks/appkit` 0.24, Files + Server + Analytics plugins, TanStack file-based router)

This document resolves the open technical questions for the plan. Each entry records the
decision, the rationale, and the alternatives rejected.

---

## R1. Where do responses live — browser, database, or Volume?

**Context**: The planning prompt proposed "store responses locally in the browser while
completing the form and write to a Volume once completed (no database needed then, right?)".

**Decision**:

- **No relational database is needed** — confirmed. The AppKit **Files plugin → Unity Catalog
  Volume** is the durable store of record for both the study definition (read) and participant
  responses (write). Lakebase/Postgres is _not_ introduced (Principle III, Simplicity).
- **Responses are persisted to the Volume per submission**, server-side, the moment each item is
  answered — _not_ buffered in the browser until the end. The browser holds only ephemeral,
  non-PII UI state in memory (e.g. the current step index).

**Rationale**:

- **Principle II forbids PII in client-side persistent storage** ("MUST NOT appear in … any
  client-side persistent storage (e.g. `localStorage`, caches that survive the session)").
  In-progress responses reference cluster text and candidate words, which the assumptions state
  may contain personal/sensitive data. Buffering them in `localStorage`/`IndexedDB` would breach
  the constitution and FR-014.
- **Durability (SC-004, FR-017)** requires 100% of submitted responses to be recorded with no
  loss. A browser-only buffer is lost if the tab is closed, the browser cache is cleared, the
  device dies, or the participant switches devices — directly violating SC-004.
- **Resume (FR-008, US4)** must restore the next-unanswered position even after leaving and
  returning, potentially on another device. Only server-side state can guarantee this.
- Writing each response immediately also makes **one-response-per-item idempotency (FR-009)**
  enforceable server-side (see R4).

**Alternatives considered**:

- _Browser `localStorage` buffer, flush on completion_ (as proposed) — **rejected**: violates
  Principle II, SC-004, and cross-device FR-008.
- _`sessionStorage` for in-progress state_ — **rejected for PII**: even though it clears on tab
  close, it still places cluster text in client storage and would be lost on resume. Permitted
  only for non-sensitive ephemeral hints (we keep such state in React memory instead).
- _Lakebase/Postgres_ — **rejected**: adds a database, an OAuth pool, and schema management for
  a write-once, append-only response log that fits naturally as Volume JSON (YAGNI).

---

## R2. Storage layout in the Volume

**Decision**: Use the single configured volume (`files`, env `DATABRICKS_VOLUME_FILES` =
`/Volumes/dev/raw/landing`). All studies share the root subtree `text_cluster_validation/`, and
each Study occupies one distinct subdirectory `{studyId}/` (study-first partitioning). The
per-Study subdirectory is named by a deployment-level `STUDY_ID` config — one deployment serves one
Study (FR-017, Clarification 2026-06-24):

```
<volume>/                                            # /Volumes/dev/raw/landing
  text_cluster_validation/                           # shared root for ALL studies
    {studyId}/                                        # one distinct subdir per Study (= STUDY_ID config)
      study/study.json                                # study definition incl. ground-truth intruders
      responses/{participantId}/{itemId}.json         # one file per recorded response (idempotent)
```

- **Study definition** (`{studyId}/study/study.json`): clusters, word-intrusion items,
  cluster-intrusion items, practice items, the true intruder for every item, and study config
  (items per session, K judgments/cluster, candidate counts, debrief sample size). Read-only to the
  app. Its internal `studyId` MUST equal the deployment's `STUDY_ID`.
- **Responses**: **one file per response**, at a deterministic path keyed by participant id + item
  id, within the Study's subtree.

**Rationale**:

- One-file-per-response makes the write **naturally idempotent** (FR-009): a deterministic path
  plus `upload(..., { overwrite: false })` means a duplicate/double-click is a no-op, with no
  read-modify-write race.
- A single participant only ever writes under their own `{participantId}/` prefix → **no
  concurrent-writer conflict** (Volumes have no append; whole-file overwrite is the only write).
- A single `STUDY_ID`-derived path prefix gives **per-Study isolation with no routing/tenancy
  layer**: concurrent studies share the governed root yet cannot touch each other's subtree
  (FR-017, Principle III). Two researchers = two deployments, two URLs, two `STUDY_ID`s.
- **Resume** = list `text_cluster_validation/{studyId}/responses/{participantId}/` to learn which
  item ids are already answered; the next unanswered item in the fixed order is the resume point.
- All data stays inside the **UC governance boundary** (Principle II).

**Alternatives considered**:

- _One growing JSONL file per session_ — **rejected**: requires read-modify-write, which races
  across concurrent tabs and risks lost writes; harder to make idempotent.
- _Concern-first partitioning_ (`responses/{studyId}/…`) — **rejected**: scatters one Study's data
  across sibling concern dirs; study-first keeps each Study in one auditable, separately grantable
  subtree.
- _A study-routing layer / studyId in the URL on one deployment_ — **rejected** (YAGNI): one
  deployment per Study is simpler and gives each researcher their own URL for free.
- _Separate study and responses volumes_ — deferred: a single governed volume with path
  isolation is sufficient now; a second volume can be added later if grants must diverge.

---

## R3. Participant identity — anonymous UUID, no platform auth (FR-012, FR-013, Principle II)

**Context**: The original research proposed deriving a server-side HMAC from the platform
identity (`x-forwarded-user`). The clarified spec (Session 2026-06-22) explicitly contradicts
this: "No authentication is required to complete tasks. The participant ID MUST NOT be linked to
any real-world identity; no login credentials, email address, or platform user ID are captured
or stored." (FR-012, FR-013)

**Decision**:

- The client generates a **random UUID v4** on the participant's first visit and stores it in
  `localStorage` under a fixed key (`participantId`). On every subsequent request the client
  reads and re-sends this UUID.
- The server receives the UUID in the **`X-Participant-Id` request header**. It validates UUID
  format (prevents path injection) and uses it as the stable participant key for:
  - Session assignment lookup/creation (R14)
  - Response path derivation (`text_cluster_validation/{studyId}/responses/{participantId}/{itemId}.json`)
  - Idempotency and resume (R4, R1)
- **No platform identity is read, used, or stored.** The server does not consult
  `x-forwarded-user` / `x-forwarded-email` for participant identification.
- The UUID itself is anonymous — it is not derived from any personal attribute — so it may
  appear in Volume paths and files without violating Principle II (there is no real→UUID
  mapping to protect).

**Rationale**:

- FR-012 requires the participant ID to be "randomly generated … on their first visit … NOT
  linked to any real-world identity; no login credentials, email address, or platform user ID
  are captured or stored." Using the platform identity (even hashed) captures a platform user
  ID, which FR-012 explicitly forbids.
- FR-013 confirms: "Any participant who has access to the survey link MAY complete tasks without
  authentication." Platform-HMAC requires the server to read authenticated identity — incompatible.
- Resume is intentionally single-device/single-browser (clarification, 2026-06-22). Because the
  UUID lives in `localStorage`, a participant who clears storage or switches devices is treated
  as a new participant (FR-012 / Edge Cases). This is acceptable and must be communicated in the
  session instructions.
- A server-side UUID store is not needed: the client is the authoritative source of its own ID,
  the UUID is already anonymous, and the worst-case consequence of ID reuse (UUID collision,
  probability ≈ 0) is a minor response overwrite, not a PII leak.

**Alternatives considered**:

- _HMAC of platform identity (x-forwarded-user)_ — **rejected**: explicitly violates FR-012/FR-013
  ("no platform user ID are captured or stored"). Platform identity is read and used to derive
  the hash, which counts as capturing it.
- _Server-issued UUID (session cookie)_ — rejected: requires a round-trip before the participant
  can submit, adds cookie infrastructure, and still has no auth advantage over the client-UUID
  model since participation is open to anyone with the link.
- _Store raw email as the key_ — rejected (violates FR-012).

**Security note**: Because any UUID is accepted, a participant could theoretically supply
another participant's UUID and write responses under that ID. Given the low-stakes, academic
context (anonymous study, no financial or personal consequence), the risk is accepted. Responses
under a collided/spoofed ID will be written with `overwrite:false` — an attacker cannot
overwrite an existing response, only fill unanswered slots. Study owners must be aware of this
open-participation model.

---

## R4. One response per participant per item (FR-009)

**Decision**: Deterministic response path + `upload({ overwrite: false })`. The submit handler
treats an existing file as "already answered" and returns success idempotently without
rewriting. Accidental duplicate/double-click submissions therefore never create a second record.

**Rationale**: Pushes the uniqueness guarantee into the storage path itself; no locking or
transaction needed. Matches SC-004 ("no item ever records more than one response per
participant").

---

## R5. Never reveal the intruder before completion (FR-021, FR-005, US3)

**Decision**: Maintain a hard split between **server-only** and **client-facing** item shapes:

- The server loads items _with_ their ground-truth intruder, but the **session/item DTOs sent to
  the client omit the intruder** (candidate words/clusters only).
- **Correctness is computed server-side** on submit (compare selection to ground truth) and
  stored; the client is told only that the response was recorded, not whether it was correct.
- The **correct intruder and the correctness flag are returned only by the debrief endpoint**,
  which is reachable **only after all assigned items are completed**.

**Rationale**: Makes FR-021 ("MUST NOT reveal the correct answer before completion") and FR-005
(record correctness) structurally enforced rather than convention-based — the client literally
never receives the answer until the debrief.

**Alternatives considered**:

- _Send full items and hide the answer in the UI_ — rejected: the answer would be present in
  network payloads/devtools, biasing responses and breaching FR-021.

---

## R6. Stable randomized intruder position (FR-003) without extra storage

**Decision**: Randomize candidate order deterministically with a **seed derived from
`participantHash + itemId`** (e.g. a seeded shuffle). The same participant always sees the same
layout for a given item across reloads/resume, but placement does not reveal the intruder and
differs across participants.

**Rationale**: Satisfies FR-003 (placement does not reveal the answer) and keeps the display
**stable across resume** (FR-008) without persisting any per-item layout — no extra Volume
writes. The seed is computed identically on each request.

---

## R7. Fixed phase ordering & gating (FR-022, US2.5)

**Decision**: The server is the source of truth for **flow phase**. A session has an ordered
sequence of phases: `word-instructions → word-practice → word-items → cluster-instructions →
cluster-practice → cluster-items → debrief/complete`. The session endpoint returns the current
phase; submit advances it. **Cluster-intrusion content (instructions, practice, items) is never
included in any response while word-intrusion items remain unanswered.**

**Rationale**: Cluster representative words would leak word-intrusion answers (FR-022). Enforcing
ordering server-side (not by client routing) prevents deep-linking or API calls from jumping
ahead. The existing free-navigation sidebar (separate Word/Cluster pages) is replaced by this
single state-driven flow.

**Alternatives considered**:

- _Client-side route guards only_ — rejected: a participant could call the cluster endpoint
  directly and expose representative words; gating must be server-enforced.

---

## R8. Practice exercises (FR-011)

**Decision**: Each task type begins with **two practice items** drawn from the study definition's
practice set (demonstration content). Each practice attempt **is recorded** as a `PracticeResponse`
(selection, correctness, practiceId, taskType, timestamp; `isPractice: true`) in a **separate**
`practice-responses/` tree — never written to the `responses/` store and **never counted toward a
cluster's K judgments** or `progress.answered`. Practice _may_ show the correct answer as teaching
feedback (exempt from FR-021). Recording is **silent**: the participant is not told practice is
recorded, and the app applies **no** pass/fail, threshold, flag, or gate — excluding an
underperformer is a manual researcher decision made downstream.

**Rationale**: Directly implements FR-011 and the assumptions (clarified 2026-06-24); keeps
practice strictly separate from validity data while still retaining it for downstream skill
assessment. A sibling storage path (rather than a flag inside `responses/`) preserves the
per-cluster K count and one-response-per-item invariants unchanged.

---

## R9. File access mode: OBO vs service principal (Principle II, FR-013)

**Decision**: The app accesses the Volume **as the app's service principal** (the resource
granted `WRITE_VOLUME` in `databricks.yml`/`app.yaml`), with the **server enforcing per-participant
path isolation** (a participant can only ever touch
`text_cluster_validation/{studyId}/responses/{participantId}/`, where `{studyId}` is the
server-side `STUDY_ID` for this deployment).

- Study owners retrieve the raw response set via **Unity Catalog read grants on the volume**
  (governed access), satisfying FR-018/US5 without a privileged app endpoint. An optional
  study-owner-only export route can be added later if in-app retrieval is wanted.

**Rationale**: Writing responses as the SP (not OBO/per-user) prevents participants from reading
or tampering with one another's responses and keeps one-response-per-item integrity under app
control, while all data remains inside the UC boundary. `WRITE VOLUME` on a UC volume also grants
read of volume files, so the SP can read the study definition and a participant's own prior
responses for resume. Authorization for _completing tasks_ is the platform identity + the app's
access grant; authorization for _retrieval_ is UC grants to study owners (least privilege,
Principle II).

**Alternatives considered**:

- _OBO (`asUser(req)`) for response writes_ — rejected: would require granting every participant
  direct volume permissions, enabling cross-participant reads and weakening dedupe/integrity
  guarantees.

---

## R10. PII hygiene in logs, telemetry, and errors (FR-014, Principle II)

**Decision**:

- Never log request/response bodies, cluster text, candidate words, selections, or real
  identity. Log only non-sensitive metadata (item id, task type, phase, pseudonymous hash,
  status codes).
- Error responses to the client carry generic messages; detailed context (if any) stays in
  server logs and excludes PII.
- No analytics/telemetry of content; the Analytics (SQL warehouse) plugin is **not used** by this
  feature.

**Rationale**: Implements FR-014 and SC-007 (verifiable by inspecting logs/telemetry/client
storage) and keeps the data flow auditable (Principle IV).

---

## R11. Unused scaffold plugin (Principle III, Simplicity)

**Decision**: This feature depends only on the **Files** and **Server** plugins. The **Analytics**
(SQL warehouse) plugin from the scaffold is unused. **Recommendation: remove the Analytics plugin**
(from `server.ts`, `appkit.plugins.json`, `app.yaml`, `databricks.yml`) so the app declares no SQL
warehouse resource it does not use. If retained for a near-term need, that is a justified
exception to record in Complexity Tracking; absent such a need, removal is the Simplicity-aligned
choice. The `tasks` phase will include the removal as a concrete, low-risk task.

**Rationale**: Avoids requesting/holding a resource grant the feature never exercises, shrinking
the surface area (Principle III). Kept out of the critical path so it cannot block the core flow.

---

## R12. Accessibility & keyboard completability (FR-015, SC-006, Principle I)

**Decision**: Build the flow from `@databricks/appkit-ui` components. Candidate selection uses a
keyboard-operable single-select (radio-group semantics: arrow keys to move, Space/Enter to
select, Enter/primary button to submit), visible focus rings, and accessible contrast. Every
view has explicit loading, empty, and error states. The full journey — instructions, practice,
both task types, debrief — is completable with the keyboard alone.

**Rationale**: Implements Principle I and FR-015/SC-006. The existing word-intrusion page uses
plain `<button>` tiles without roving-tabindex/radio semantics; the new shared item component
will provide proper single-select keyboard semantics.

---

## R13. Testing strategy (Constitution Workflow gates)

**Decision**:

- **vitest (unit)**: pseudonymization stability, server-side correctness computation, seeded
  shuffle stability, idempotent write/dedupe, session assembly + phase gating (no cluster content
  before word phase done), debrief gating (blocked before completion), DTO stripping (no intruder
  leaks to client DTOs).
- **Playwright (smoke/e2e)**: complete a short session end-to-end, keyboard-only completion
  (SC-006), resume mid-session, debrief shown only after completion (SC-008), and a network-trace
  assertion that no item payload contains the intruder before completion.

**Rationale**: Maps the constitution's required green gates (typecheck, lint, format, vitest +
smoke/e2e) onto this feature's highest-risk invariants (answer leakage, dedupe, gating,
accessibility).

---

## R14. Session entity and server-side assignment (FR-023)

**Context**: The 2026-06-22 clarification introduced FR-023 — a new entity. A `Session` is a
researcher-pre-defined subset of items (word intrusion + cluster intrusion) drawn from the Study.
Multiple Sessions are defined in the study definition. The server must assign exactly one Session
to each arriving participant, and that assignment must never change.

**Decision**:

- `Session` is a named list of `wordItemIds` and `clusterItemIds`, defined by the researcher
  inside `study.json` alongside clusters and items. Multiple Sessions cover the full item set,
  each specifying a distinct subset.
- **Assignment**: on a participant's first request (no prior assignment file exists), the server:
  1. Lists all existing assignment files in
     `text_cluster_validation/{studyId}/session-assignments/` to count how many
     participants have been assigned to each `sessionId`.
  2. Picks the `sessionId` with the fewest current assignments (tie-break: first in definition
     order) — "least-utilized" strategy satisfying equal distribution (FR-023).
  3. Writes `text_cluster_validation/{studyId}/session-assignments/{participantId}.json` with
     `overwrite:false` to make
     the assignment atomic and idempotent.
- **Subsequent requests**: read the existing assignment file → same `sessionId` always returned.
  Once assigned, a participant's Session MUST NOT change (FR-023).
- The assigned `sessionId` constrains which items appear in the participant's word and cluster
  phases. `progress.total` is the count of items in the assigned Session, not the full Study.

**Rationale**:

- FR-023 requires (a) pre-defined Sessions in the study definition and (b) server-side assignment
  that is stable once made. Storing a single JSON file per participant satisfies (b) with the
  same `overwrite:false` idempotency pattern used for responses (R4), requiring no lock or
  transaction.
- "Least-utilized" achieves the equal distribution goal; it is simple enough to implement with a
  single directory listing and does not require a database or counter service (Principle III).
- The assignment file is a small, non-PII record (just `studyId`, `participantId`, `sessionId`,
  `assignedAt`) and safely lives in the same Volume under the UC governance boundary.

**Alternatives considered**:

- _Round-robin by total participant count_ — requires a global counter with compare-and-swap;
  not possible atomically with Volume file writes (no CAS). Least-utilized via directory listing
  is simpler and achieves the same goal without atomicity requirements.
- _Embed assignment in the first response file and derive it from responses_ — rejected: the
  assignment must be known before any response is recorded (it determines which items to show);
  deriving it post-hoc is impossible on a first-visit empty session.
- _Inline into participant's session state (not stored)_ — rejected: assignment would change as
  more participants arrive (the least-utilized session changes), violating "MUST NOT change"
  (FR-023).

---

## Resolved unknowns summary

| Question              | Resolution                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database needed?      | No — Files plugin → UC Volume only                                                                                                                                              |
| In-progress storage?  | Server-side per-submission; no PII in browser                                                                                                                                   |
| Storage format/layout | All under `text_cluster_validation/{studyId}/` (= `STUDY_ID` config): `study/study.json`; `session-assignments/{participantId}.json`; `responses/{participantId}/{itemId}.json` |
| Identity handling     | Client-generated anonymous UUID v4 stored in localStorage; no platform auth for participants (FR-012, FR-013)                                                                   |
| Session assignment    | Server picks least-utilized pre-defined Session on first visit; stored as assignment file; never changes (FR-023, R14)                                                          |
| Dedupe                | Deterministic path + `overwrite:false`                                                                                                                                          |
| Answer secrecy        | Server-only ground truth; debrief endpoint reveals post-completion                                                                                                              |
| Intruder position     | Seeded deterministic shuffle (`participantId+itemId`)                                                                                                                           |
| Phase gating          | Server-enforced phase machine; items from assigned Session only                                                                                                                 |
| File access mode      | Service principal + app-enforced path isolation; UC grants for owners                                                                                                           |
| Unused plugin         | Remove Analytics (or justify)                                                                                                                                                   |
