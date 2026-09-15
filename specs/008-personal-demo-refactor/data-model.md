# Data Model: Personal Demo Refactor

**Feature**: 008-personal-demo-refactor
**Date**: 2026-09-14

## Overview

The data model is **unchanged** from the pre-refactor application. All entities, their fields, relationships, validation rules, and state transitions remain identical. The only change is the **storage backend**: Unity Catalog Volumes → Scaleway Object Storage (S3-compatible public bucket).

This document re-states the complete data model for reference, noting the storage mechanism change where relevant.

---

## Entities

### 1. Study

**Description**: The complete survey definition loaded once at server startup. Read-only for the lifetime of the server process. Stored as a single JSON file at `text_cluster_validation/{studyId}/study/study.json` in the Scaleway bucket.

**Storage**: `GET text_cluster_validation/{studyId}/study/study.json`

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `studyId` | `string` | Yes | Must match `STUDY_ID` env var |
| `config` | `StudyConfig` | Yes | Survey-wide configuration |
| `config.judgmentsPerCluster` | `number` | Yes | Target judgments per cluster (metadata, not enforced) |
| `config.wordCandidatesPerItem` | `number` | Yes | Number of candidate words per item (min 3, default 6) |
| `config.clusterCandidatesPerItem` | `number` | Yes | Number of candidate clusters per item (min 3, default 5) |
| `config.debriefSampleSize` | `number` | Yes | Number of debrief examples to show (default 3) |
| `welcome` | `{ content: string }` | No | Researcher-authored Markdown welcome page |
| `sessions` | `Session[]` | Yes | Pre-defined item subsets for participant assignment |
| `session.sessionId` | `string` | Yes | Unique session identifier |
| `session.wordItemIds` | `string[]` | Yes | Word item IDs in this session |
| `session.clusterItemIds` | `string[]` | Yes | Cluster item IDs in this session |
| `clusters` | `Cluster[]` | Yes | Metadata about text clusters |
| `cluster.clusterId` | `string` | Yes | Unique cluster identifier |
| `cluster.label` | `string` | No | Human-readable cluster name |
| `cluster.representativeWords` | `string[]` | Yes | Top words representing this cluster |
| `cluster.memberTextIds` | `string[]` | No | Text IDs belonging to this cluster |
| `cluster.mlflowExperimentId` | `string` | No | MLflow metadata |
| `cluster.mlflowRunId` | `string` | No | MLflow metadata |
| `wordItems` | `WordIntrusionItem[]` | Yes | All word-intrusion items |
| `wordItem.itemId` | `string` | Yes | Unique item identifier |
| `wordItem.taskType` | `'word'` | Yes | Task discriminator |
| `wordItem.clusterId` | `string` | Yes | The cluster being judged |
| `wordItem.candidateWords` | `string[]` | Yes | Display candidates (includes intruder) |
| `wordItem.intruderWord` | `string` | Yes | GROUND TRUTH — never sent to client |
| `wordItem.wordCount` | `number` | No | Number of candidate words |
| `clusterItems` | `ClusterIntrusionItem[]` | Yes | All cluster-intrusion items |
| `clusterItem.itemId` | `string` | Yes | Unique item identifier |
| `clusterItem.taskType` | `'cluster'` | Yes | Task discriminator |
| `clusterItem.targetTextId` | `string` | Yes | ID of the target document |
| `clusterItem.targetText` | `string` | Yes | Raw HTML content of target document |
| `clusterItem.candidateClusterIds` | `string[]` | Yes | Clusters to show as candidates |
| `clusterItem.intruderClusterId` | `string` | Yes | GROUND TRUTH — never sent to client |
| `practice` | `PracticeConfig` | Yes | Practice exercise definitions |
| `practice.word` | `PracticeWordItem[]` | Yes | Min 2 word practice items |
| `practice.cluster` | `PracticeClusterItem[]` | Yes | Min 2 cluster practice items |

**Validation Rules (unchanged)**:
- `studyId` must match `STUDY_ID` environment variable
- Items with missing intruder are withheld (logged, not shown to participants)
- Items with fewer candidates than configured minimum are withheld
- Practice items must have at least 2 per task type
- Sessions must reference valid item IDs
- Malformed items do not prevent startup; they are skipped with a notice

**State**: Static. Loaded once at startup, cached in memory.

---

### 2. Participant Response

**Description**: A recorded answer to a single real (non-practice) survey item. Immutable after first write. One file per (`participantId`, `itemId`).

**Storage**: `PUT text_cluster_validation/{studyId}/responses/{participantId}/{itemId}.json` (with `IfNoneMatch: *` → idempotent)

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `studyId` | `string` | Yes | Study identifier |
| `participantId` | `string` (UUID v4) | Yes | Anonymous participant identity |
| `itemId` | `string` | Yes | Item being answered |
| `taskType` | `'word' \| 'cluster'` | Yes | Task type |
| `clusterId` | `string` | Yes | The cluster being judged |
| `selection` | `StoredSelection` | Yes | Participant's answer |
| `selection.kind` | `'candidate'` | Yes | Always 'candidate' (no skip option) |
| `selection.value` | `string` | Yes | The selected candidate string |
| `selection.selectedClusterWords` | `string[]` | No | For cluster items: representative words of chosen cluster |
| `correct` | `boolean` | Yes | Server-computed correctness |
| `submittedAt` | `string` (ISO 8601) | Yes | Submission timestamp |
| `timeTakenMs` | `number` | No | Time spent on this item |
| `schemaVersion` | `1` | Yes | Schema version for forward compatibility |

**Validation Rules (unchanged)**:
- `participantId` must be valid UUID v4 format
- `selection.value` must be one of the displayed candidates
- `correct` is computed server-side by comparing `selection.value` to `intruderWord` / `intruderClusterId`
- Duplicate submission: if file already exists, 409 Conflict returned (idempotent — no overwrite)

**State**: Immutable after creation. Written once, never updated.

---

### 3. Practice Response

**Description**: A recorded answer to a practice exercise. Stored separately from real responses. Not used for correctness scoring; recorded for potential downstream skill analysis.

**Storage**: `PUT text_cluster_validation/{studyId}/practice-responses/{participantId}/{practiceId}.json` (with `IfNoneMatch: *`)

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `studyId` | `string` | Yes | Study identifier |
| `participantId` | `string` (UUID v4) | Yes | Anonymous participant identity |
| `practiceId` | `string` | Yes | Practice item identifier |
| `taskType` | `'word' \| 'cluster'` | Yes | Task type |
| `selection` | `Selection` | Yes | Participant's answer |
| `correct` | `boolean` | Yes | Server-computed correctness |
| `isPractice` | `true` | Yes | Explicit marker to prevent mixing with real responses |
| `submittedAt` | `string` (ISO 8601) | Yes | Submission timestamp |
| `timeTakenMs` | `number` | No | Time spent |
| `schemaVersion` | `1` | Yes | Schema version |

**Storage separation**: Practice responses are stored in `practice-responses/` tree, separate from real `responses/`. The server lists from separate prefixes and exclusions are applied in-code (practice count is tracked but doesn't affect real-item progress).

**Idempotency**: Same as real responses — `IfNoneMatch: *` prevents overwrite.

---

### 4. Session Assignment

**Description**: Maps a participant to a pre-defined session (item subset). Written exactly once per participant on first visit.

**Storage**: `PUT text_cluster_validation/{studyId}/session-assignments/{participantId}.json` (with `IfNoneMatch: *`)

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `studyId` | `string` | Yes | Study identifier |
| `participantId` | `string` (UUID v4) | Yes | Participant identity |
| `sessionId` | `string` | Yes | Assigned session identifier |
| `assignedAt` | `string` (ISO 8601) | Yes | Assignment timestamp |
| `schemaVersion` | `1` | Yes | Schema version |

**Assignment Strategy (unchanged)**:
1. List all existing assignments from `session-assignments/`
2. Count per `sessionId`
3. Pick the session with the fewest existing participants
4. Write assignment with `writeOnce()` (idempotent)
5. If the participant already has an assignment, return the existing one

**State**: Immutable after creation. Written once per participant.

---

### 5. Participant Identity

**Description**: An anonymous UUID v4 string generated client-side on first visit and stored in browser `localStorage`. Used as the stable participant key in all server interactions.

**Storage**: `localStorage` key `participantId` (client-side only — never sent to a third party)

**Generation**: `crypto.randomUUID()` in the browser

**Transmission**: `X-Participant-Id` header on all API requests

**Lifecycle**: Persisted across browser sessions on the same device. Clearing browser storage starts a new participant identity (and a new session assignment).

---

## Storage Layer Changes

### Before (AppKit / Unity Catalog Volumes):
```
VolumeStorage interface:
  read(key: string): Promise<string>
  list(prefix: string): Promise<string[]>
  upload(key: string, body: string): Promise<void>
  exists(key: string): Promise<boolean>

Implementation: servicePrincipalStorage.ts
  → Databricks REST API: /api/2.0/fs/files/{path}
  → Auth: Service principal OAuth token
  → Root: /Volumes/dev/raw/landing/text_cluster_validation/{studyId}/
```

### After (Scaleway S3):
```
S3Storage interface:
  read(key: string): Promise<string>
  list(prefix: string): Promise<string[]>
  upload(key: string, body: string): Promise<void>
  exists(key: string): Promise<boolean>

Implementation: scalewayStorage.ts
  → AWS SDK: GetObjectCommand, PutObjectCommand, ListObjectsV2Command, HeadObjectCommand
  → Auth: None (public bucket)
  → Root: {bucket}/text_cluster_validation/{studyId}/
```

### Unchanged:
- Path structure within the bucket (`text_cluster_validation/{studyId}/...`)
- All file names and JSON schemas
- `writeOnce()` idempotency logic
- `listSafe()` empty-prefix handling
- All path builders in `server/src/lib/paths.ts`

---

## Entity Relationships

```
Study (1) ───has many──→ Session (N)
Study (1) ───has many──→ Cluster (N)
Study (1) ───has many──→ WordIntrusionItem (N)
Study (1) ───has many──→ ClusterIntrusionItem (N)
Study (1) ───has many──→ PracticeWordItem (N)
Study (1) ───has many──→ PracticeClusterItem (N)

Session (1) ───references──→ WordIntrusionItem (N, via wordItemIds)
Session (1) ───references──→ ClusterIntrusionItem (N, via clusterItemIds)

Participant (1) ───assigned to──→ Session (1) [via SessionAssignment]
Participant (1) ───has many──→ Response (N) [per item answered]
Participant (1) ───has many──→ PracticeResponse (N) [per practice attempted]

Cluster (1) ───referenced by──→ WordIntrusionItem (N) [via clusterId]
Cluster (1) ───referenced by──→ ClusterIntrusionItem (N) [as intruder or candidate]
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Scaleway Bucket                          │
│  (public, unauthenticated S3-compatible reads & writes)          │
│                                                                 │
│  text_cluster_validation/{studyId}/                              │
│  ├── study/study.json              ← Read at startup            │
│  ├── session-assignments/           ← Written once per part.    │
│  │   └── {participantId}.json                                   │
│  ├── responses/                     ← Written per answer        │
│  │   └── {participantId}/                                       │
│  │       └── {itemId}.json                                      │
│  └── practice-responses/            ← Written per practice      │
│      └── {participantId}/                                       │
│          └── {practiceId}.json                                  │
└─────────────────────────────────────────────────────────────────┘
         ▲                               ▲
         │ GET (study, lists)            │ PUT (responses, assignments)
         │                               │
┌────────┴────────────────────────────────┴───────────────────────┐
│                    Express Server (localhost:3001)               │
│                                                                 │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ studyLoader.ts  │  │ sessionService.ts│  │ responseService│  │
│  │ (load+validate) │  │ (phase machine,  │  │ (record,       │  │
│  │                 │  │  assignment)     │  │  correctness)  │  │
│  └────────┬────────┘  └────────┬─────────┘  └───────┬───────┘  │
│           │                    │                     │          │
│  ┌────────┴────────────────────┴─────────────────────┴───────┐  │
│  │                    S3Storage Adapter                       │  │
│  │  (read, list, upload, exists via @aws-sdk/client-s3)      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  API Routes                                               │   │
│  │  GET  /api/session    → SessionState DTO (no ground truth)│   │
│  │  POST /api/responses  → { recorded, next }               │   │
│  │  GET  /api/debrief    → DebriefState (post-completion)   │   │
│  │  GET  /api/health     → { status: "ok" }                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         ▲
         │ HTTP (X-Participant-Id header)
         │
┌────────┴────────────────────────────────────────────────────────┐
│                    React SPA (Browser)                           │
│                                                                 │
│  localStorage: participantId (UUID v4)                          │
│  TanStack Router + React Query                                  │
│  shadcn/ui components (neutral theme, system fonts)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Immutability and Idempotency

| Entity | Write Strategy | Idempotency Mechanism |
|--------|---------------|----------------------|
| Study | Never written (read-only) | N/A |
| Session Assignment | `writeOnce()` | `IfNoneMatch: *` on S3 PUT → 412 if exists |
| Response | `writeOnce()` | `IfNoneMatch: *` on S3 PUT → 412 if exists |
| Practice Response | `writeOnce()` | `IfNoneMatch: *` on S3 PUT → 412 if exists |

The existing `writeOnce()` function in `server/src/lib/storage.ts` performs `exists()` → `upload()` with `overwrite: false`. The `S3Storage.upload()` implementation translates `overwrite: false` to `IfNoneMatch: '*'` in the S3 `PutObjectCommand`. This preserves identical idempotency semantics.