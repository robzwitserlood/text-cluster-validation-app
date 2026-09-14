# Implementation Plan: Personal Demo Refactor

**Branch**: `008-personal-demo-refactor` | **Date**: 2026-09-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-personal-demo-refactor/spec.md`

## Summary

Refactor the text cluster validation survey from a Databricks AppKit-based deployment into a standalone local application. Remove all `@databricks/*` dependencies, replace Unity Catalog Volume storage with a public Scaleway Object Storage bucket (S3-compatible), replace PBL government branding with a neutral theme, and preserve all existing survey functionality identically. The refactored app starts with `npm install && npm run dev` and runs entirely locally without any Databricks infrastructure.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (strict mode, `skipLibCheck` enabled)  
**Primary Dependencies**: Express 4.22.0, React 19.2.4, @aws-sdk/client-s3, shadcn/ui (new-york style, neutral base), TanStack Router 1.170, TanStack React Query 5.100, Tailwind CSS 4.0, Zod 4.1, sanitize-html 2.17  
**Storage**: Scaleway Object Storage (S3-compatible API, public bucket — no access keys required)  
**Testing**: Vitest 4.0 (unit), Playwright 1.57 (e2e/smoke)  
**Target Platform**: Local developer machine (Linux, macOS, Windows WSL2) running Node.js 22+  
**Project Type**: Web application (React SPA + Express API server)  
**Performance Goals**: Startup <30s from `npm run dev`, study load <5s, response write <2s  
**Constraints**: No Databricks workspace/credentials/infrastructure, no PBL branding, no server-side ML computation, public bucket only (no authentication)  
**Scale/Scope**: Single-developer demo, ~20K LOC across server, client, shared, tests

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

This feature's explicit mandate — removing all Databricks dependencies — fundamentally conflicts with the current constitution (v1.0.0), which assumes Databricks AppKit infrastructure. All violations are intentional and justified; the constitution requires amendment to v2.0.0 as part of this plan.

| Gate | Status | Detail |
|------|--------|--------|
| **UX First (I)** | ⚠️ VIOLATION | "UI MUST be built from `@databricks/appkit-ui` component set" — replaced with shadcn/ui (pre-configured `components.json`, new-york style, neutral base). All replacement components provide equivalent accessible, keyboard-usable behavior. |
| **PII Control (II)** | ⚠️ VIOLATION | "PII MUST stay inside Databricks governance boundary (Unity Catalog / Volumes)" — replaced with public Scaleway Object Storage bucket. Study data contains no real PII (synthetic text clusters); participant IDs are anonymous UUIDs. |
| **Simplicity (III)** | ⚠️ VIOLATION | "Prefer built-in AppKit and platform capabilities" — AppKit removed entirely. Express + @aws-sdk/client-s3 is a simpler stack for a standalone local demo with no Databricks platform dependency. |
| **Documentation (IV)** | ✅ PASS | All artifacts updated: spec, plan, research, data-model, quickstart, contracts. AGENTS.md updated. README will be updated during implementation. |

**Technology & Platform Constraints violations**: "application is a Databricks App built on Databricks AppKit" / "Data access MUST go through the AppKit Files plugin into Unity Catalog / Volumes" — both intentionally removed per feature spec FR-008 through FR-011.

**Required action**: Amend constitution to v2.0.0, replacing Databricks-specific principles with standalone-local equivalents. See Complexity Tracking for detailed justification.

## Project Structure

### Documentation (this feature)

```text
specs/008-personal-demo-refactor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # API contract
└── tasks.md             # Phase 2 output (via /speckit-tasks)
```

### Source Code (repository root)

```text
server/
├── src/
│   ├── lib/
│   │   ├── storage.ts           # S3Storage interface + writeOnce() + listSafe()
│   │   ├── scalewayStorage.ts   # Implements S3Storage via @aws-sdk/client-s3
│   │   ├── paths.ts             # Storage path builders (UNCHANGED)
│   │   ├── config.ts            # Bucket config + startup validation
│   │   ├── sanitizeHtml.ts      # HTML sanitizer (UNCHANGED)
│   │   ├── shuffle.ts           # Seeded PRNG (UNCHANGED)
│   │   └── http.ts              # Error helpers (UNCHANGED)
│   ├── routes/
│   │   ├── session.ts           # GET /api/session (REFACTORED — new dep types)
│   │   ├── responses.ts         # POST /api/responses (REFACTORED)
│   │   └── debrief.ts           # GET /api/debrief (REFACTORED)
│   └── services/
│       ├── studyLoader.ts       # Loads study.json from bucket (REFACTORED)
│       ├── studyProvider.ts     # Memoized study loader (REFACTORED)
│       ├── sessionService.ts    # Phase machine + assignment (UNCHANGED core logic)
│       └── responseService.ts   # Response recording (UNCHANGED core logic)
├── server.ts                    # Standalone Express entry point (REWRITTEN)
└── server-dev.ts                # Dev-mode with Vite proxy (NEW)

client/
├── index.html
├── vite.config.ts               # Updated: remove AppKit, add proxy to Express
├── components.json              # UNCHANGED (shadcn/ui already configured)
├── public/                      # Static assets
│   └── fonts/                   # Replaced: PBL fonts → system-ui stack
└── src/
    ├── main.tsx                 # REFACTORED: remove ThemeProvider, Toaster wiring
    ├── routeTree.gen.ts         # Auto-generated, UNCHANGED
    ├── ErrorBoundary.tsx        # REFACTORED: remove AppKit Card imports
    ├── index.css                # REWRITTEN: remove AppKit styles, PBL tokens
    ├── components/
    │   ├── ui/                  # NEW: shadcn/ui components
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── alert.tsx
    │   │   ├── badge.tsx
    │   │   ├── spinner.tsx
    │   │   ├── label.tsx
    │   │   ├── progress.tsx
    │   │   ├── radio-group.tsx
    │   │   ├── sidebar.tsx
    │   │   └── avatar.tsx
    │   ├── TaskItem.tsx         # REFACTORED: AppKit imports → shadcn/ui
    │   ├── Instructions.tsx     # REFACTORED
    │   ├── Welcome.tsx          # REFACTORED
    │   ├── PracticeItem.tsx     # REFACTORED
    │   ├── Debrief.tsx          # REFACTORED
    │   ├── LoadError.tsx        # REFACTORED
    │   ├── InlineErrorAlert.tsx # REFACTORED
    │   ├── LoadingMessage.tsx   # REFACTORED
    │   ├── ProgressBar.tsx      # REFACTORED
    │   ├── ClusterTermList.tsx  # UNCHANGED
    │   ├── Instructions.tsx     # UNCHANGED logic
    │   ├── DefaultPendingFallback.tsx # UNCHANGED
    │   ├── SafeHtml.tsx         # UNCHANGED
    │   └── apx/                 # REMOVED entirely (AppKit-dependent chrome)
    ├── routes/
    │   ├── __root.tsx           # REWRITTEN: new layout (no PblChrome, no ThemeProvider)
    │   ├── index.tsx            # UNCHANGED logic
    │   ├── complete.tsx         # REFACTORED: AppKit imports → shadcn/ui
    │   ├── word/
    │   │   ├── instructions.tsx # UNCHANGED logic
    │   │   ├── practice.tsx     # UNCHANGED logic
    │   │   └── task.tsx         # UNCHANGED logic
    │   └── cluster/
    │       ├── instructions.tsx # UNCHANGED logic
    │       ├── practice.tsx     # UNCHANGED logic
    │       └── task.tsx         # UNCHANGED logic
    ├── hooks/
    │   ├── useParticipantId.ts  # UNCHANGED
    │   └── use-mobile.ts       # UNCHANGED
    └── lib/
        ├── api.ts               # UNCHANGED
        ├── queries.ts           # UNCHANGED
        ├── flow-router.ts       # UNCHANGED
        ├── flow-route-state.ts  # UNCHANGED
        ├── flow-pages.tsx       # UNCHANGED logic
        ├── i18n.tsx             # REFACTORED: remove AppKit theme, update chrome strings
        ├── i18n-context.ts      # UNCHANGED
        ├── config.ts            # UNCHANGED
        └── utils.ts             # UNCHANGED

shared/
├── types.ts                     # UNCHANGED (client DTOs, no AppKit references)
├── schemas.ts                   # UNCHANGED
├── i18n.ts                      # MODIFIED: remove PBL chrome strings, add neutral titles
└── config.ts                    # UNCHANGED

tests/
├── unit/                        # ADAPTED: replace fakeStorage with S3-compatible fake
│   ├── sessionService.test.ts
│   ├── responseService.test.ts
│   ├── studyLoader.test.ts
│   ├── shuffle.test.ts
│   ├── piiHygiene.test.ts       # UPDATED: PII checks for standalone context
│   ├── sanitizeHtml.test.ts
│   ├── config.test.ts
│   └── helpers/
│       ├── fakeStorage.ts       # REWRITTEN: S3Storage interface
│       └── study.ts             # UNCHANGED
├── e2e/
│   ├── harness.ts               # REWRITTEN: no Databricks, Express + fake S3
│   └── fixtures/
│       └── study.ts             # UNCHANGED
└── smoke.spec.ts                # REFACTORED: updated harness import

REMOVED files:
├── databricks.yml
├── app.yaml
├── appkit.plugins.json
├── .databricks/                 # Entire directory
├── shared/appkit-types/         # Entire directory
└── client/src/components/apx/   # Entire directory

NEW files:
├── .env.example                 # REWRITTEN: Scaleway config instead of Databricks
├── server/src/lib/scalewayStorage.ts
└── server/server-dev.ts
```

**Structure Decision**: The existing three-package monorepo (`server/`, `client/`, `shared/`) is preserved. The server layer changes from AppKit-wrapped Express → standalone Express. The client layer removes AppKit chrome components and replaces AppKit UI components with shadcn/ui equivalents. The shared layer is largely unchanged. No new top-level packages or directories are introduced.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Constitution v1.0.0 assumes Databricks AppKit throughout — all four principles and technology constraints reference Databricks-specific infrastructure | Feature spec FR-008—FR-011 explicitly mandates removal of all Databricks dependencies. The entire purpose of this feature is to create a standalone local demo. | Keeping Databricks defeats the feature's purpose. A standalone local app with `npm run dev` startup is the explicitly requested simpler alternative. |
| Replace `@databricks/appkit-ui` with shadcn/ui (violates Principle I's "built from appkit-ui" mandate) | FR-011 requires replacement with a React component library. shadcn/ui is pre-configured (`components.json`), uses the same Tailwind CSS foundation, and provides equivalent accessible components. | MUI or Radix would require additional CSS framework changes. shadcn/ui leverages the existing Tailwind setup without adding a competing design system. |
| Move data off Databricks Unity Catalog Volumes to public Scaleway bucket (violates Principle II's PII boundary) | FR-003—FR-004 require S3-compatible object storage. The study contains synthetic text clusters, not real PII. Participant IDs are anonymous UUIDs. The demo context does not involve governed personal data. | A local filesystem would not support sharing with collaborators. A private bucket would require credential management (contrary to FR-006). Public bucket + anonymous IDs is the simplest fit-for-purpose solution. |
| Remove AppKit server plugin and Files plugin (violates Principle III's "prefer AppKit" mandate) | FR-008—FR-010 require no Databricks packages. Express is already the underlying framework; removing the AppKit wrapper is a reduction, not an addition. @aws-sdk/client-s3 is a single well-known dependency for S3-compatible storage. | Building a custom HTTP server or S3 client would add unnecessary complexity. Express and the AWS SDK are industry-standard choices with minimal API surface. |
| Remove `next-themes` (was used by AppKit ThemeProvider) | No longer needed without AppKit theme system. shadcn/ui handles dark/light via CSS variables with a simpler approach. | Keeping `next-themes` without AppKit would be dead weight. |
| Constitution amendment required (v1.0.0 → v2.0.0) | All four principles and the Technology & Platform Constraints section are written for a Databricks App. The refactored app is a standalone local web application with no Databricks dependency. | Amending the constitution is required for the plan to pass the Constitution Check gate. The amendment will preserve the spirit of each principle (UX first, data control, simplicity, documentation) while removing Databricks-specific platform references. |