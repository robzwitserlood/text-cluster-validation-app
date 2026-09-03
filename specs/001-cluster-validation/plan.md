# Implementation Plan: Cluster Validation via Intrusion Tasks

**Branch**: `001-cluster-validation` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-cluster-validation/spec.md`

## Summary

Build a participant-facing validation form on Databricks AppKit (TypeScript, React 19, Express)
that collects human judgments on automatically generated text clusters via two task types — word
intrusion and cluster intrusion — in that fixed order. Participants are anonymous (random UUID
stored in localStorage, no auth required); responses are written per-submission to a Unity Catalog
Volume. One deployment serves exactly one Study; all studies share the Volume root
`/Volumes/dev/raw/landing/text_cluster_validation/`, and each Study writes to one distinct
`{studyId}/` subdirectory named by the deployment's `STUDY_ID` config (FR-017) — so two researchers
run two deployments with two URLs against the same governed root without commingling data. Each task
type begins with instructions and two practice exercises; practice attempts are
recorded as **distinct practice records** (silent to the participant, never counted toward a
cluster's K judgments) so participant skill can be assessed downstream — the app applies no gate or
threshold. The server enforces phase gating, idempotency, Session assignment, and ground-truth
secrecy. Study owners retrieve the complete response and practice-record set via UC grants; the app
does not compute validity metrics.

## Technical Context

**Language/Version**: TypeScript 5.x (strict); Node.js 22+ server, React 19 client  
**Primary Dependencies**: `@databricks/appkit` 0.24 (Files + Server plugins); `zod` for
schema validation; `vitest` for unit tests; Playwright for smoke/e2e  
**Storage**: Unity Catalog Volume only (no database) — Files plugin via `DATABRICKS_VOLUME_FILES`
(volume `/Volumes/dev/raw/landing`). All data lives under the shared subtree
`text_cluster_validation/{studyId}/`; the per-Study subdirectory is named by a deployment-level
`STUDY_ID` config (FR-017) and MUST match `study.json`'s `studyId`  
**Testing**: vitest (unit), Playwright (smoke + e2e)  
**Target Platform**: Databricks Apps (Linux server + browser client)  
**Project Type**: Full-stack web application (monorepo: `client/`, `server/`, `shared/`)  
**Performance Goals**: Single item render < 200 ms; no latency SLO beyond that  
**Constraints**: PII (cluster text, participant ID) MUST NOT leave the UC Volume boundary;
no client-side persistent storage for sensitive data; all quality gates must be green before merge  
**Scale/Scope**: Small-scale academic study; tens to low hundreds of participants; hundreds of items

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Confirm this plan upholds the project constitution (`.specify/memory/constitution.md`):

- [x] **UX First (I)**: Every view has loading, empty, and error states. Keyboard-operable
      radio-group semantics for candidate selection. `@databricks/appkit-ui` components throughout.
      Full flow (instructions → practice → items → debrief) completable without a mouse (FR-015,
      SC-006). Practice recording is silent — instructions make no mention of it (FR-011).
- [x] **PII Control (II)**: Cluster text, candidate words, and the anonymous participant ID
      stay inside the UC Volume. No PII in logs, error messages, or client-side persistent storage.
      Responses and practice records written server-side per submission; no browser buffering of
      sensitive state. Participant ID is a random UUID — not linked to any real-world identity
      (FR-012, FR-014). Each deployment is confined to its own `text_cluster_validation/{STUDY_ID}/`
      subtree (server-side `STUDY_ID` prefix; no client-supplied study/path segment), so concurrent
      studies sharing the root cannot read or write each other's data (FR-017).
- [x] **Simplicity (III)**: No database. Session state derived from recorded responses. Session
      assignment stored as a single JSON file. Practice records reuse the same per-item record shape
      and write path as real responses (no separate subsystem). Analytics plugin removed (unused). No
      speculative abstraction — the app records and exposes practice results but performs **no**
      scoring, threshold, flag, or gate (FR-011). Multi-study support adds **no** routing or tenancy
      layer: one deployment = one Study, selected by a single `STUDY_ID` config that names a path
      prefix — the simplest mechanism that lets studies share a governed root (FR-017).
- [x] **Documentation (IV)**: This plan, research.md, data-model.md, contracts/, quickstart.md,
      and tasks.md ship with the feature and are kept in sync.

**Post-design re-check**: ✅ all gates pass — see updated research.md (R2 multi-study layout, R3,
R8, R14) and data-model.md (PracticeResponse entity; Selection narrowed to a single candidate after
FR-006 removal). Multi-study support (FR-017) adds only a `STUDY_ID` path prefix — no new
abstraction, and it strengthens PII isolation by confining each deployment to its own subtree.

Violations MUST be recorded and justified in the Complexity Tracking section below.

## Project Structure

### Documentation (this feature)

```text
specs/001-cluster-validation/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── api.md
│   └── storage.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
client/
├── src/
│   ├── routes/
│   │   └── index.tsx            # single-page app; server-driven phase machine owns navigation
│   ├── components/
│   │   ├── TaskItem.tsx         # shared word/cluster item renderer with radio-group semantics
│   │   ├── PracticeItem.tsx
│   │   ├── Instructions.tsx
│   │   ├── ProgressBar.tsx
│   │   └── Debrief.tsx
│   ├── hooks/
│   │   └── useParticipantId.ts  # generates/reads UUID from localStorage
│   └── lib/
│       └── api.ts               # typed fetch wrappers for all endpoints

server/
├── src/
│   ├── routes/
│   │   ├── session.ts           # GET /api/session
│   │   ├── responses.ts         # POST /api/responses (real + practice records)
│   │   └── debrief.ts           # GET /api/debrief
│   ├── services/
│   │   ├── studyLoader.ts       # load + validate study.json with zod
│   │   ├── sessionService.ts    # phase machine, session assignment, progress derivation
│   │   └── responseService.ts   # write response/practice record, idempotency, correctness
│   └── lib/
│       └── shuffle.ts           # seeded deterministic shuffle (R6)

shared/
├── types.ts                     # Client DTOs (no ground-truth fields)
└── schemas.ts                   # zod schemas shared between client and server

tests/
├── unit/
│   ├── shuffle.test.ts
│   ├── sessionService.test.ts   # phase gating, session assignment, debrief gate
│   ├── responseService.test.ts  # idempotency, correctness, practice-record write, dto-stripping
│   └── studyLoader.test.ts      # malformed-item handling
└── smoke.spec.ts                # Playwright: full flow, keyboard-only, resume, no-leak trace
```

**Structure Decision**: Web application (Option 2 variant) — uses the existing AppKit monorepo
layout (`client/`, `server/`, `shared/`) with no additional top-level packages added.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                                           | Why Needed                                                                                                                            | Simpler Alternative Rejected Because                                                                                                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session assignment storage (`session-assignments/`) | FR-023 requires that a participant's assigned Session never changes; the assignment must survive across requests and browser sessions | Deriving it on every request would change as other participants arrive, violating "once assigned, MUST NOT change"                                                                                       |
| Separate `practice-responses/` store                | FR-011 requires practice attempts be retained and exposed to study owners, yet excluded from validity responses and cluster K counts  | Writing practice into `responses/` would contaminate the per-cluster judgment counts (SC-005) and the per-item uniqueness invariant; a sibling path keeps them retained but cleanly separable downstream |
