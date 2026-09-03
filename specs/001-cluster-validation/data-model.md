# Phase 1 Data Model: Cluster Validation via Intrusion Tasks

**Feature**: `001-cluster-validation` | **Date**: 2026-06-24
**Source**: spec.md Key Entities + Functional Requirements; decisions in research.md
**Updated**: 2026-06-24 — added PracticeResponse stored entity (FR-011 practice recording); removed
the `cant_tell` selection variant (FR-006 removed), narrowing `Selection` to a single chosen
candidate.
**Updated**: 2026-06-22 — added Session entity (FR-023, R14); revised participant identity to
anonymous UUID model (FR-012/FR-013, R3 rewrite); added SessionAssignment stored entity.

Types are TypeScript, defined in `shared/` and validated with `zod` (already a dependency). The
**critical invariant** is the split between **server-only** shapes (carry the ground-truth
intruder) and **client-facing DTOs** (never carry the intruder until the debrief). See R5.

---

## Entity overview

| Entity               | Persistence                                                                | Notes                                                                   |
| -------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Study                | `study/study.json` (read)                                                  | Clusters + items + practice + Sessions + config + ground truth          |
| Session              | within Study                                                               | Researcher-pre-defined item subset; multiple per Study (FR-023)         |
| Cluster              | within Study                                                               | id, optional label, representative words, member texts                  |
| WordIntrusionItem    | within Study                                                               | candidate words + true intruder word                                    |
| ClusterIntrusionItem | within Study                                                               | target text + candidate clusters + true intruder cluster                |
| PracticeItem         | within Study                                                               | demo content; may reveal answer (the question definition)               |
| Participant          | not persisted as identity                                                  | only the anonymous `participantId` UUID appears at rest                 |
| SessionAssignment    | `…/{studyId}/session-assignments/{participantId}.json` (write)             | which Session was assigned                                              |
| Response             | `…/{studyId}/responses/{participantId}/{itemId}.json` (write)              | one file per real response                                              |
| PracticeResponse     | `…/{studyId}/practice-responses/{participantId}/{practiceId}.json` (write) | one file per practice attempt; excluded from cluster judgments (FR-011) |
| ValidationSession    | derived at request time                                                    | assignment + progress + phase; not stored                               |
| StudyConfig          | within Study                                                               | tunable parameters (K, counts, sample size)                             |

---

## Study (server-only)

```ts
interface Study {
  studyId: string;
  config: StudyConfig;
  sessions: Session[]; // researcher-pre-defined item subsets (FR-023, R14)
  clusters: Cluster[];
  wordItems: WordIntrusionItem[]; // pool of all word-intrusion items across all sessions
  clusterItems: ClusterIntrusionItem[]; // pool of all cluster-intrusion items across all sessions
  practice: {
    word: PracticeWordItem[]; // exactly 2 used per session (FR-011)
    cluster: PracticeClusterItem[]; // exactly 2 used per session
  };
}

interface StudyConfig {
  judgmentsPerCluster: number; // K target (SC-005) — informational metadata for downstream analysis only; NOT enforced, monitored, or consumed by in-app Session assignment (which is least-utilized by Session, R14)
  wordCandidatesPerItem: number; // default e.g. 6 (validation: >= 3); FR-001
  clusterCandidatesPerItem: number; // default e.g. 5 (validation: >= 3)
  debriefSampleSize: number; // how many answered items the debrief shows (FR-019); default 3
}
```

**Validation**: `studyId` non-empty; `judgmentsPerCluster >= 1`; candidate counts `>= 3`;
`debriefSampleSize >= 1`; `practice.word` and `practice.cluster` each have `>= 2` entries;
`sessions` non-empty.

---

## Session (server-only; defined within Study)

A researcher-pre-defined subset of items drawn from the Study. Each participant is assigned
exactly one Session (R14, FR-023). Multiple Sessions allow equal distribution of judgments
across the full item pool.

```ts
interface Session {
  sessionId: string;
  wordItemIds: string[]; // ordered subset of WordIntrusionItem ids from this study
  clusterItemIds: string[]; // ordered subset of ClusterIntrusionItem ids from this study
}
```

**Validation**: `sessionId` unique within Study; all referenced item ids must resolve to a
`WordIntrusionItem` / `ClusterIntrusionItem` in the same Study; each list non-empty.

---

## Cluster (server-only)

```ts
interface Cluster {
  clusterId: string;
  label?: string; // optional human-readable label
  representativeWords: string[]; // top words shown for cluster-intrusion candidates
  memberTextIds?: string[]; // references to member texts (not all loaded to client)
  mlflowExperimentId?: string; // MLFlow experiment reference (US6, FR-023 assumption)
  mlflowRunId?: string; // MLFlow run reference (US6)
}
```

**Validation**: `clusterId` unique within study; `representativeWords` non-empty.

---

## WordIntrusionItem (server-only)

```ts
interface WordIntrusionItem {
  itemId: string;
  taskType: 'word';
  clusterId: string; // cluster these words represent
  candidateWords: string[]; // representative words of the cluster + intruder
  intruderWord: string; // GROUND TRUTH — must be present in candidateWords
  wordCount?: number; // per-item override of config.wordCandidatesPerItem (FR-001; min 3)
}
```

**Validation**: effective candidate count `>= Math.max(3, item.wordCount ?? config.wordCandidatesPerItem)`;
`intruderWord` present exactly once among `candidateWords`; `itemId` unique. Malformed items
(missing intruder, too few candidates) are **withheld with a notice**, not shown (FR-016).

---

## ClusterIntrusionItem (server-only)

```ts
interface ClusterIntrusionItem {
  itemId: string;
  taskType: 'cluster';
  targetTextId: string; // the text the participant reads
  targetText: string; // shown to participant
  candidateClusterIds: string[]; // clusters shown, each by representativeWords
  intruderClusterId: string; // GROUND TRUTH — the cluster that does NOT belong
}
```

**Validation**: `candidateClusterIds.length >= config.clusterCandidatesPerItem`;
`intruderClusterId ∈ candidateClusterIds`; all ids resolve to a `Cluster`; `itemId` unique.

---

## PracticeItem (server-only; question definition)

```ts
type PracticeWordItem = Omit<WordIntrusionItem, 'itemId'> & { practiceId: string; explanation: string };
type PracticeClusterItem = Omit<ClusterIntrusionItem, 'itemId'> & { practiceId: string; explanation: string };
```

`explanation` is teaching feedback that may reveal the answer (FR-011, exempt from FR-021).
Practice items are **never** written to `responses/` and their attempts **never** count toward K.
Each attempt **is** recorded as a `PracticeResponse` (below) in the separate `practice-responses/`
store for downstream skill assessment (FR-011).

---

## Participant (identity not persisted)

```ts
// Request-time only. Never stored.
type ParticipantId = string; // UUID v4, generated by client on first visit; stored in localStorage (FR-012, R3)
```

**Rules**:

- The client generates `crypto.randomUUID()` on first visit → stores in `localStorage["participantId"]`.
- Every request sends `X-Participant-Id: <uuid>` header.
- The server validates UUID format (prevents path traversal) and uses the UUID directly as the
  stable participant key in storage paths.
- **No platform user ID, email, or login credential is captured or stored** (FR-012, FR-013, R3).
- The UUID is already anonymous — no HMAC or further hashing is needed.
- Resume is single-device/single-browser only. Clearing localStorage or switching devices starts
  a fresh participant identity (FR-012, Edge Cases).

---

## SessionAssignment (persisted — enables stable assignment)

Written the first time a participant is seen; never overwritten (FR-023, R14).

```ts
interface SessionAssignment {
  studyId: string;
  participantId: ParticipantId;
  sessionId: string; // which pre-defined Session was assigned
  assignedAt: string; // ISO 8601 timestamp
  schemaVersion: 1;
}
```

**Path**: `text_cluster_validation/{studyId}/session-assignments/{participantId}.json`
**Written with** `upload(path, json, { overwrite: false })` — idempotent; a concurrent duplicate
first-visit request produces the same assignment or loses to the one already written.

**State**: `absent → assigned`; no further transitions. A participant's session id is immutable
once the assignment file exists.

---

## Response (persisted — the product's output)

```ts
// A selection is exactly one chosen candidate — a chosen word, or a chosen clusterId.
// (The "I can't tell" variant was removed with FR-006.)
interface Selection {
  kind: 'candidate';
  value: string;
}

interface Response {
  studyId: string;
  participantId: ParticipantId;
  itemId: string;
  taskType: 'word' | 'cluster';
  clusterId: string; // the cluster being judged (links response→cluster, FR-018/US5)
  selection: Selection;
  correct: boolean; // server-computed vs ground truth
  submittedAt: string; // ISO 8601 timestamp (FR-005)
  timeTakenMs?: number; // optional (Key Entities: time taken)
  schemaVersion: 1;
}
```

**Validation / rules**:

- One file per `(studyId, participantId, itemId)` → at most one Response per participant per
  item (FR-009).
- `selection` MUST identify exactly one displayed candidate; a missing/invalid selection is
  rejected and nothing is recorded (FR-002, spec AS US1.2/US2.2).
- `correct` is computed **server-side only**; never sent to client before debrief (R5).
- No real identity, no free-form PII fields. `clusterId` enables per-cluster aggregation
  downstream (FR-018) and the ≥K check (SC-005).

**State**: a Response is **append-only and immutable** once written. (`absent → recorded`)

---

## PracticeResponse (persisted — retained for downstream skill assessment, FR-011)

A participant's attempt at one practice exercise. Same per-item shape as a `Response` but keyed by
`practiceId`, marked as practice, and stored in a separate path so it is never confused with a
validity response and never counts toward a cluster's K judgments.

```ts
interface PracticeResponse {
  studyId: string;
  participantId: ParticipantId;
  practiceId: string; // identifies the practice exercise (not a real itemId)
  taskType: 'word' | 'cluster';
  selection: Selection; // the chosen candidate
  correct: boolean; // server-computed vs the practice item's ground truth
  isPractice: true; // explicit marker (FR-011)
  submittedAt: string; // ISO 8601 timestamp
  timeTakenMs?: number; // optional
  schemaVersion: 1;
}
```

**Validation / rules**:

- One file per `(studyId, participantId, practiceId)` → idempotent, at most one record per
  attempt slot (written with `overwrite:false`, same as Response).
- **Never** written under `responses/`; **never** included in per-cluster judgment counts
  (SC-005) or in `progress.answered`.
- Recorded **silently** — the participant is not told practice is recorded; instructions say
  nothing about screening (FR-011).
- The app performs **no** pass/fail, threshold, flag, or gate on these records; exclusion of an
  underperforming participant is a manual researcher decision made downstream (FR-011). Records are
  retained and exposed to study owners via the same UC grants as `responses/`.

**State**: append-only and immutable once written. (`absent → recorded`)

---

## ValidationSession (derived at request time; not stored)

Assembled per request from the Study + the participant's SessionAssignment + their recorded
responses. Not persisted; resumability comes from the recorded responses and the stable
assignment, not from session storage.

```ts
type Phase =
  | 'word-instructions'
  | 'word-practice'
  | 'word-items'
  | 'cluster-instructions'
  | 'cluster-practice'
  | 'cluster-items'
  | 'debrief'
  | 'complete';

interface SessionState {
  // == client DTO returned by GET /api/session
  studyId: string;
  sessionId: string; // the assigned pre-defined Session (FR-023)
  phase: Phase;
  progress: { answered: number; total: number }; // real items in assigned Session only (FR-007)
  current:
    | { phase: 'word-instructions' | 'cluster-instructions'; taskType: 'word' | 'cluster' }
    | { phase: 'word-practice' | 'cluster-practice'; practice: ClientPracticeItem; index: number; of: number }
    | { phase: 'word-items'; item: ClientWordItem }
    | { phase: 'cluster-items'; item: ClientClusterItem }
    | { phase: 'debrief' | 'complete' };
}
```

**Phase machine (server-enforced, FR-022 / R7)**: advances strictly in the order above. Only
items from the participant's assigned Session are shown. Cluster phases are unreachable — and
never serialized — until all assigned word items are answered.

**Derivation**:

1. Read `SessionAssignment` → get `sessionId`.
2. Resolve `Session` (from Study) → ordered `wordItemIds`, `clusterItemIds`.
3. List `text_cluster_validation/{studyId}/responses/{participantId}/` → set of answered `itemId`s.
4. Phase = first phase with unanswered items; `progress.answered` = count of answered real items
   in the assigned Session.

---

## Client-facing item DTOs (NO ground truth — R5)

```ts
interface ClientWordItem {
  itemId: string;
  taskType: 'word';
  candidateWords: string[]; // seeded-shuffled order (R6, seed = participantId+itemId); intruder NOT marked
}

interface ClientClusterItem {
  itemId: string;
  taskType: 'cluster';
  targetText: string;
  candidates: { clusterId: string; representativeWords: string[] }[]; // seeded-shuffled; intruder NOT marked
}

type ClientPracticeItem =
  | (ClientWordItem & { explanation: string }) // practice may reveal answer (FR-011)
  | (ClientClusterItem & { explanation: string });
```

The mapping `Server*Item → Client*Item` **drops** `intruderWord` / `intruderClusterId`. A unit
test asserts no client DTO contains an intruder field (R5/R13).

---

## Debrief DTOs (revealed only after completion — FR-019/FR-020, US3)

```ts
interface DebriefExample {
  itemId: string;
  taskType: 'word' | 'cluster';
  yourSelection: Selection; // participant's own selection
  correctIntruder: string; // word or clusterId — revealed ONLY here
  correct: boolean;
  clusterValidityExplanation: string; // plain-language, framed around the CLUSTER (FR-020)
}

interface DebriefState {
  examples: DebriefExample[]; // random sample up to config.debriefSampleSize (FR-019)
  // No score, no pass/fail, no aggregate stats (Assumptions / Edge Cases)
}
```

**Rule**: only reachable when `phase === "debrief" | "complete"`. The explanation describes what
identifying/missing the intruder says about that **cluster's** validity, never judging the
participant (FR-020, Edge Cases).

---

## Relationships

```
Study 1───* Session                      (session.wordItemIds / clusterItemIds → items in Study)
Study 1───* Cluster
Study 1───* WordIntrusionItem            (item.clusterId → Cluster)
Study 1───* ClusterIntrusionItem         (item.candidateClusterIds → Cluster; intruderClusterId → Cluster)
Participant(id) 1───1 SessionAssignment  (assignment.sessionId → Session in Study)
Participant(id) 1───* Response           (response.itemId → Word/ClusterIntrusionItem; response.clusterId → Cluster)
Participant(id) 1───* PracticeResponse   (practiceResponse.practiceId → PracticeItem; excluded from cluster judgments)
ValidationSession = f(Study, SessionAssignment, Responses for participantId)   // derived, not stored
```

Per-cluster validity downstream (FR-018, SC-005): group `Response` by `clusterId`, count
distinct `participantId` with `correct === true` vs total → coherence/assignment signal. The
app stores the raw responses; it does **not** compute these metrics (Principle III, FR-018).
