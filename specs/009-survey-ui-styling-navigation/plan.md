# Implementation Plan: Survey UI Styling & Complete Flow Navigation

**Branch**: `009-survey-ui-styling-navigation` | **Date**: 2026-09-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-survey-ui-styling-navigation/spec.md`

## Summary

Apply visual styling (Tailwind CSS v4 + shadcn/ui) to all survey pages and fix the survey navigation so participants can advance through the entire flow from welcome to completion. The primary bug prevents advancing from the first practice item to the second because same-route navigation with `replace: true` fails to trigger a reliable re-render. Styling work includes applying prose typography to Markdown content, adding consistent container/layout constraints, and enhancing the progress bar to show both phase progress and per-task item count.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (strict mode, `skipLibCheck` enabled)  
**Primary Dependencies**: React 19.2.4, Express 4.22.0, Tailwind CSS 4.0.14, shadcn/ui (new-york style, neutral base), TanStack Router 1.170.8, TanStack React Query 5.100.14, @tailwindcss/typography 0.5.20, react-markdown 10.1.0, @aws-sdk/client-s3 3.749.0  
**Storage**: Scaleway Object Storage (S3-compatible API, public bucket)  
**Testing**: Vitest 4.0 (unit), Playwright 1.57 (e2e/smoke)  
**Target Platform**: Local developer machine (Linux, macOS, Windows WSL2) running Node.js 22+  
**Project Type**: Web application (React SPA + Express API server)  
**Performance Goals**: Navigation between phases <500ms, hover/focus visual response <100ms  
**Constraints**: Centered container max-width ~1024px, forward-only navigation, no loading spinners during phase transitions, consistent 1.5rem+ vertical spacing  
**Scale/Scope**: 9 distinct page types, single survey flow, ~10 client components to update

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

All gates pass against constitution v2.0.0 (amended in spec 008):

| Gate | Status | Detail |
|------|--------|--------|
| **UX First (I)** | ✅ PASS | Every flow covers loading/empty/error states; shadcn/ui components provide accessible keyboard-usable behavior. FR-005, FR-008, SC-006 cover error states and keyboard access. |
| **PII Control (II)** | ✅ PASS | No new data flows introduced. Survey responses remain server-side, no PII in new UI components. Participant IDs remain anonymous UUIDs in localStorage. |
| **Simplicity (III)** | ✅ PASS | No new dependencies. @tailwindcss/typography and react-markdown already installed. Fix leverages existing TanStack Router + React Query infrastructure. |
| **Documentation (IV)** | ✅ PASS | Spec, plan, research, data-model, quickstart, and contracts all produced. AGENTS.md updated to reference this plan. |

**Technology & Platform Constraints**: No violations. The feature uses the existing Express + React SPA + shadcn/ui + Tailwind stack. No new storage paths, no new dependencies, no architectural changes.

## Project Structure

### Documentation (this feature)

```text
specs/009-survey-ui-styling-navigation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── ui-layout.md     # Layout and styling contract
└── tasks.md             # Phase 2 output (via /speckit-tasks)
```

### Source Code (repository root)

```text
client/
├── vite.config.ts               # UNCHANGED (Tailwind v4 plugin already configured)
├── postcss.config.js            # UNCHANGED
├── tailwind.config.ts           # UNCHANGED
├── components.json              # UNCHANGED (shadcn/ui new-york, neutral)
└── src/
    ├── main.tsx                 # UNCHANGED
    ├── index.css                # MODIFIED: add global prose defaults, base layout styles
    ├── components/
    │   ├── Welcome.tsx          # MODIFIED: apply prose + card + button styling
    │   ├── Instructions.tsx     # MODIFIED: apply prose + card + button styling
    │   ├── PracticeItem.tsx     # MODIFIED: card styling, option tile hover/selected states
    │   ├── TaskItem.tsx         # MODIFIED: option tile hover/selected states
    │   ├── ProgressBar.tsx      # MODIFIED: show phase + item counter (FR-010)
    │   ├── Debrief.tsx          # MODIFIED: card/button styling
    │   ├── InlineErrorAlert.tsx # VERIFIED: destructive alert styling (already styled)
    │   ├── ClusterTermList.tsx  # MODIFIED: badge/card styling
    │   ├── SafeHtml.tsx         # UNCHANGED
    │   ├── LoadError.tsx        # MODIFIED: card/button styling consistency
    │   ├── LoadingMessage.tsx   # MODIFIED: card styling consistency
    │   ├── DefaultPendingFallback.tsx  # VERIFIED: no styling needed (instant transitions)
    │   └── ui/                  # UNCHANGED (shadcn/ui components already installed)
    ├── lib/
    │   ├── flow-route-state.ts  # MODIFIED: fix same-route navigation for practice items
    │   ├── flow-router.ts       # UNCHANGED (no new phases or routes)
    │   ├── flow-pages.tsx       # MODIFIED: apply max-width container, phase labels
    │   └── api.ts               # UNCHANGED
    ├── routes/
    │   ├── __root.tsx            # VERIFIED: layout wrapper (no chrome, no back button)
    │   ├── index.tsx             # UNCHANGED logic
    │   ├── complete.tsx          # UNCHANGED logic
    │   ├── word/
    │   │   ├── instructions.tsx  # UNCHANGED logic
    │   │   ├── practice.tsx      # UNCHANGED logic (fix in flow-route-state.ts)
    │   │   └── task.tsx          # UNCHANGED logic
    │   └── cluster/
    │       ├── instructions.tsx  # UNCHANGED logic
    │       ├── practice.tsx      # UNCHANGED logic (fix in flow-route-state.ts)
    │       └── task.tsx          # UNCHANGED logic
    └── hooks/
        ├── useParticipantId.ts   # UNCHANGED
        └── use-mobile.ts         # UNCHANGED

server/
├── src/
│   ├── services/
│   │   └── sessionService.ts    # MODIFIED: ensure practice response visibility
│   │   └── responseService.ts   # MODIFIED: return practice response count with result
│   └── routes/
│       └── responses.ts         # MODIFIED: pass practice count to session resolution
│   └── lib/
│       └── scalewayStorage.ts   # UNCHANGED

shared/
├── types.ts                     # UNCHANGED
├── schemas.ts                   # UNCHANGED
└── i18n.ts                      # MODIFIED: add progress bar label strings

tests/
├── unit/
│   └── sessionService.test.ts   # MODIFIED: add test for practice item advancement
└── e2e/
    └── smoke.spec.ts            # MODIFIED: add full-flow navigation test
```

**Structure Decision**: Minimal changes. The primary fix is in `flow-route-state.ts` (navigation mechanism) and `sessionService.ts` (server-side state resolution for practice items). Styling changes are isolated to individual components using existing Tailwind utilities and shadcn/ui primitives. No new files, directories, or dependencies added.

## Complexity Tracking

> No constitution violations. This section intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A | | |