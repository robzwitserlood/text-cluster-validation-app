# Quickstart: Cluster Validation via Intrusion Tasks

**Feature**: `001-cluster-validation` | **Date**: 2026-06-22
**Updated**: 2026-06-22 — anonymous participant UUID model (R3); Session assignment (FR-023, R14).

How to set up, run, and verify the cluster-validation app locally and on Databricks. Assumes the
existing AppKit scaffold (`@databricks/appkit` 0.24, Files + Server plugins, TanStack file-based
router).

## Prerequisites

- Node.js 22+ and npm
- Databricks CLI authenticated to your workspace (`databricks auth login --host …`)
- A Unity Catalog **Volume** you can write to, and a `study/study.json` placed in it
- A workspace identity that the app can run as (service principal grant on the volume)

## 1. Configure environment

```bash
cp .env.example .env
```

Set in `.env`:

```env
DATABRICKS_HOST=https://<your-workspace>.azuredatabricks.net
DATABRICKS_VOLUME_FILES=/Volumes/dev/raw/landing
STUDY_ID=study-001                    # this deployment's Study; names its subdir under the shared root
DATABRICKS_APP_PORT=8000
# STUDY_OWNER_IDS=alice@org,bob@org   # only if the optional admin export route is built
```

> **One deployment = one Study (FR-017).** All studies share the Volume root
> `/Volumes/dev/raw/landing/text_cluster_validation/`; this deployment writes everything under
> `text_cluster_validation/${STUDY_ID}/`. `STUDY_ID` MUST match the `studyId` inside `study.json`.
> Run a second concurrent study by deploying a second app with a different `STUDY_ID` (its own URL).

> **No `RESPONSE_HASH_SALT` needed**: participants are identified by a client-generated anonymous
> UUID stored in their browser's `localStorage` (FR-012, R3). No platform identity is used, so
> no server-side HMAC salt is required.

> Secrets come from environment / Databricks config and are never committed (Constitution:
> Technology & Platform Constraints).

## 2. Seed the study definition

Upload a `study/study.json` (shape = `Study` in `data-model.md`) into the configured Volume.
The study definition MUST include:

- `clusters` — all clusters under validation (with optional `mlflowExperimentId`/`mlflowRunId`)
- `sessions` — researcher-pre-defined array of Sessions, each listing `wordItemIds` and
  `clusterItemIds` (FR-023); at least one Session required
- `wordItems` / `clusterItems` — the full item pool, each with its **true intruder** (ground truth)
- `practice.word` / `practice.cluster` — at least 2 practice items each (FR-011)
- `config` — `judgmentsPerCluster`, `wordCandidatesPerItem`, `clusterCandidatesPerItem`,
  `debriefSampleSize` (default 3)

```bash
# Upload into this Study's subdir; <studyId> MUST equal STUDY_ID (and study.json's studyId)
databricks fs cp ./study.json \
  dbfs:/Volumes/dev/raw/landing/text_cluster_validation/<studyId>/study/study.json
```

## 3. Install & run locally

```bash
pnpm install
pnpm run dev          # client + server with hot reload
```

Open the printed URL. You should land in the guided flow: **word instructions → 2 practice → word
items → cluster instructions → 2 practice → cluster items → debrief**.

On first load, the browser generates a random UUID and stores it in `localStorage["participantId"]`.
The server assigns the least-utilized pre-defined Session to that UUID and creates
`text_cluster_validation/{studyId}/session-assignments/{participantId}.json` in the Volume (R14).

## 4. Verify the acceptance scenarios

| Check                                                | How                                                                                                                                                            | Requirement    |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Session assigned on first visit                      | Inspect Volume: `text_cluster_validation/{studyId}/session-assignments/` should have one file after first load                                                 | FR-023, R14    |
| Same session on return                               | Close and reopen tab (same browser); confirm same `sessionId` in `GET /api/session` response                                                                   | FR-023         |
| Word intrusion records a choice and advances         | Select a word, submit; confirm next item loads                                                                                                                 | FR-002, US1.1  |
| Empty submit is blocked                              | Submit with nothing selected → prompt, nothing recorded                                                                                                        | US1.2          |
| Intruder position varies, stable on reload           | Reload mid-item → same layout; different across UUIDs                                                                                                          | FR-003, R6     |
| Practice recorded separately, never as validity data | Complete practice; confirm a file under `practice-responses/.../{practiceId}.json` (with `isPractice:true`) and **no** file under `responses/.../{practiceId}` | FR-011         |
| Cluster content hidden during word phase             | Inspect `GET /api/session` while in word phase → no cluster data                                                                                               | FR-022         |
| Answer never sent early                              | Network trace of `/api/session` + `/api/responses` → no intruder field                                                                                         | FR-021, R5     |
| Resume                                               | Answer a few items, close tab, reopen (same browser) → resumes at next unanswered                                                                              | FR-008         |
| Dedupe                                               | Double-submit same item → exactly one response file                                                                                                            | FR-009         |
| Completion + debrief                                 | Finish all items → debrief shows your picks + correct intruders + cluster explanation                                                                          | FR-019/20, US3 |
| Keyboard only                                        | Complete the whole flow without a mouse                                                                                                                        | FR-015, SC-006 |
| Anonymous identity                                   | Inspect all Volume paths and files → no email or platform user id                                                                                              | FR-012, SC-007 |

Inspect stored responses:

```bash
databricks fs ls   dbfs:/Volumes/dev/raw/landing/text_cluster_validation/<studyId>/session-assignments/
databricks fs ls   dbfs:/Volumes/dev/raw/landing/text_cluster_validation/<studyId>/responses/
databricks fs cat  dbfs:/Volumes/dev/raw/landing/text_cluster_validation/<studyId>/responses/<participantId>/<itemId>.json
databricks fs ls   dbfs:/Volumes/dev/raw/landing/text_cluster_validation/<studyId>/practice-responses/  # retained practice records (FR-011)
```

Confirm **no** real email/username appears in any path or file (FR-012, SC-007). The only
identifier in paths is the anonymous UUID generated by the participant's browser.

## 5. Quality gates (must be green before merge)

```bash
pnpm run typecheck
pnpm run lint
pnpm run format
pnpm run test          # vitest unit + Playwright smoke
pnpm run test:e2e      # full e2e (flow, keyboard, resume, no-leak trace)
```

Key unit test assertions (R13):

- No client DTO contains an intruder field before debrief
- Session assignment is stable across repeated calls for the same `X-Participant-Id`
- Phase gating blocks cluster content until all assigned word items are answered
- Debrief endpoint returns 409 before completion
- Practice attempts write to `practice-responses/` (not `responses/`) and never count toward K or progress (FR-011)

## 6. Deploy

```bash
databricks bundle validate
databricks bundle deploy
databricks bundle run app
```

Ensure the bundle grants the app `WRITE_VOLUME` on the responses volume (already wired in
`databricks.yml` → `resources.app.resources[files]`) and that study owners have UC **read** grants
to retrieve responses (R9).

## Retrieving responses for analysis (study owner)

Responses (and retained practice records) are governed Unity Catalog Volume files. There is **no
in-app export route by default** — study owners read the raw set directly through **UC read grants**,
keeping access governed and least-privilege (R9, FR-013/FR-018).

### Grant read access (least-privilege)

Grant the study owner (a user or group) read access to the volume that backs this deployment
(`dev.raw.landing`, declared in `databricks.yml`):

```sql
GRANT USE CATALOG ON CATALOG dev          TO `analysts`;
GRANT USE SCHEMA  ON SCHEMA  dev.raw      TO `analysts`;
GRANT READ VOLUME ON VOLUME  dev.raw.landing TO `analysts`;
```

The app itself writes as its **service principal** (granted `WRITE_VOLUME` in `databricks.yml` →
`resources.app.resources[files]`, which also permits reading its own files). Study-owner reads are a
**separate** UC grant — owners never need app credentials or a privileged app route. Because every
Study lives under its own `text_cluster_validation/{studyId}/` subtree, grants can be scoped per
Study if finer isolation is wanted.

### Read the raw set

```bash
# Real responses (the validity data) …
databricks fs ls  dbfs:/Volumes/dev/raw/landing/text_cluster_validation/<studyId>/responses/
databricks fs cat dbfs:/Volumes/dev/raw/landing/text_cluster_validation/<studyId>/responses/<participantId>/<itemId>.json

# … and the retained practice records, for downstream skill assessment (FR-011)
databricks fs ls  dbfs:/Volumes/dev/raw/landing/text_cluster_validation/<studyId>/practice-responses/
```

Each `responses/.../{itemId}.json` carries `studyId`, `participantId`, `itemId`, `clusterId`,
`taskType`, `selection`, `correct`, and `submittedAt` — the complete field set needed to **group by
`clusterId` and tally distinct participants with `correct === true` vs total** for a per-cluster
coherence/assignment signal (FR-018, SC-005). Practice records are marked `isPractice: true` and are
**excluded** from those counts (FR-011).

The app collects and exposes raw responses; it does **not** compute validity metrics — that is done
downstream (FR-018, Principle III). An optional owner-gated `GET /api/admin/export` (NDJSON) is
specified in `contracts/api.md` but **deferred**: the UC read grants above already satisfy US5.
