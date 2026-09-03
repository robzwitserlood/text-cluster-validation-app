# Implementation Plan: Survey Copy Refinements & PBL Branded Page Chrome

**Branch**: `003-survey-copy-house-style` | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-survey-copy-house-style/spec.md`

## Summary

This feature refines the survey copy and reproduces PBL's branded page chrome around the existing
001/002 flow. Concretely it: enumerates the survey sections as one canonical, task-type-grouped list
(FR-001) and enriches the built-in default welcome to reference them (FR-002); simplifies each
per-task instructions screen to one subtitle + at most one box, swaps the "progress saved to this
browser" line for one-sitting/pause-resume advice, and adds a practice-first reminder (FR-003–FR-005);
adds a last-practice "real questions start next page" reminder (FR-006); removes the stop-survey
control (FR-007); clarifies the completion page (done, may close tab, explanation optional)
(FR-008/FR-009); wraps every participant-facing screen in a persistent PBL masthead + footer band with
house-style tokens (FR-010/FR-010a); localizes all new/changed copy in `nl` + `en` (FR-011); relocates
`selectedClusterWords` under `selection` in the persisted cluster response (FR-012); and adds HTML and
5-n-gram(1,2) cluster test coverage (FR-013/FR-014).

**Technical approach**: The change is overwhelmingly copy + presentation. Copy lives in the existing
localized `shared/i18n.ts` catalog; the branded chrome and house-style tokens are applied through the
app's existing AppKit theme-token layer (`client/src/index.css`) and a small persistent layout shell
in `client/src/routes/__root.tsx`, reusing existing `@databricks/appkit-ui` components. The only stored
change is a server write-time relocation of `selectedClusterWords`; the wire `Selection` and all API
contracts are unchanged. Detailed decisions: [research.md](./research.md); shapes:
[data-model.md](./data-model.md); deltas: [contracts/](./contracts/).

**House-style conflict resolution (user directive, 2026-07-13)**: Where a component's shadcn/AppKit
default visual treatment conflicts with the PBL branded chrome / house-style tokens, **PBL chrome
wins** — the shadcn default is overridden toward the PBL token/appearance rather than the reverse.
This is a presentation override only: it never changes component *behaviour*, structure, keyboard
accessibility, or focus order (which remain AppKit's), and it is realized through the token layer and
targeted overrides, not by replacing AppKit components. See research.md R8.

## Technical Context

**Language/Version**: TypeScript (strict) across `client/`, `server/`, `shared/`; React 19
**Primary Dependencies**: `@databricks/appkit` 0.24.0 (backend SDK), `@databricks/appkit-ui` 0.24.0
(shadcn-based UI + Tailwind), `@tanstack/react-router` 1.170.8, `zod` 4, `sanitize-html` 2.17 (002
HTML sanitiser), `next-themes`
**Storage**: JSON response records in a Unity Catalog Volume via the AppKit Files plugin
(`text_cluster_validation/{STUDY_ID}/…`); no DB. Governed boundary per Constitution II.
**Testing**: `vitest` (unit) + Playwright (smoke/e2e); see memory note re: WSL2 chromium download
**Target Platform**: Databricks App (Node/Express server + Vite-built React client), served per-locale
(`client/dist-nl`, `client/dist-en`)
**Project Type**: Web application (client + server + shared) — a Databricks AppKit app
**Performance Goals**: Interactive survey UI; no new performance-sensitive path (copy/presentation +
one server write-time enrichment). Existing responsiveness targets unchanged.
**Constraints**: Presentation-only for chrome/house-style — MUST NOT change task mechanics, copy
meaning, keyboard accessibility, focus order, or recorded data (FR-010a). Masthead/footer are in-flow
(static, not fixed) and branding-only (no outbound links, no task navigation). No PII leaves the UC
boundary. Do not commit RO font binaries (design-tokens.md). Both `nl` + `en` must stay in sync
(compile-time enforced by the `Messages` typing).
**Scale/Scope**: ~9 participant-facing screens (welcome, word/cluster instructions+practice+task,
completion, optional explanation walkthrough) wrapped by one shared shell; single-participant sessions.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Confirm this plan upholds the project constitution (`.specify/memory/constitution.md`):

- [x] **UX First (I)**: Every affected flow keeps its loading/empty/error states (no flow state is
  removed — only the stop-survey control and one instructions box, neither of which is a flow state).
  The branded chrome and copy are keyboard-usable and preserve focus order (FR-010a). UI stays built
  from `@databricks/appkit-ui` components; the PBL look is applied via the token layer and targeted
  overrides. **Where shadcn defaults and PBL chrome conflict, the resolution is PBL chrome** (user
  directive) — a presentation override that keeps AppKit component behaviour/structure intact, so the
  "built from AppKit components" expectation still holds (research.md R8; recorded in Complexity
  Tracking as a justified, bounded deviation from pure shadcn defaults). No dead ends introduced.
- [x] **PII Control (II)**: No new data flow leaves the governance boundary. `selection.selectedClusterWords`
  stores the same in-boundary, non-participant representative words as 002, in the same UC Volume; the
  relocation adds nothing to logs, telemetry, or client storage. HTML test targets exercise the
  existing server-side sanitiser (002) — no new untrusted boundary. Font/logo assets are static
  branding, not PII (data-model.md PII notes).
- [x] **Simplicity (III)**: Reuses existing seams — the i18n catalog, the AppKit token layer, the
  router root shell, and the 002 sanitiser/recording paths. Net removals (stop-survey button, one
  instructions box, top-level `selectedClusterWords`) outnumber additions. Greenfield data shape: no
  migration/back-compat code. The one bounded exception (PBL overrides winning over shadcn defaults)
  is recorded in Complexity Tracking.
- [x] **Documentation (IV)**: spec/plan/research/data-model/contracts/quickstart are kept in sync in
  this same change; quickstart documents the participant-visible changes and the data-shape check;
  data-flow/PII notes are in data-model.md. Font/logo licensing notes are captured in design-tokens.md.

**Result**: PASS (initial and post-design). One justified deviation recorded below.

## Project Structure

### Documentation (this feature)

```text
specs/003-survey-copy-house-style/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 decisions (R1–R8)
├── data-model.md        # Phase 1 entities + stored-shape change (FR-012)
├── design-tokens.md     # PBL house-style tokens (durable reference for FR-010)
├── quickstart.md        # Participant-visible changes + verification steps
├── contracts/           # api.md (no wire change), sections.md (FR-001), storage.md (FR-012)
├── checklists/          # requirements.md (spec quality checklist)
└── tasks.md             # Phase 2 output (/speckit-tasks) — regenerate after this re-plan
```

### Source Code (repository root)

```text
shared/
├── i18n.ts              # Localized message catalog (nl/en) — canonical sections (FR-001),
│                        #   expanded default welcome (FR-002), revised instructions copy
│                        #   (FR-003–FR-005), last-practice reminder (FR-006), completion copy
│                        #   (FR-008/FR-009); retire stopSurvey* + instructionsDeviceOnly keys
├── types.ts             # Phase/flow types (unchanged); StoredSelection shape reference (FR-012)
└── schemas.ts           # WelcomeContentSchema gains optional default-only body field (FR-002)

server/                  # Response recording: write selection.selectedClusterWords, drop
                         #   top-level field (FR-012). No new endpoints (contracts/api.md).

client/src/
├── index.css            # PBL house-style tokens on the AppKit :root layer (FR-010a); PBL
│                        #   overrides win over shadcn defaults where they conflict (R8)
├── routes/
│   ├── __root.tsx       # Persistent PBL masthead + footer shell wrapping every screen (FR-010)
│   ├── index.tsx        # Welcome (default-copy enrichment render, FR-002)
│   ├── complete.tsx     # Completion page copy/framing (FR-008/FR-009)
│   ├── word/            # instructions.tsx, practice.tsx, task.tsx
│   └── cluster/         # instructions.tsx, practice.tsx, task.tsx
├── components/
│   ├── Instructions.tsx # One subtitle + at most one box (FR-003–FR-005)
│   ├── PracticeItem.tsx # Last-practice "real questions next page" reminder (FR-006)
│   ├── Welcome.tsx      # Render optional default-only section walk-through (FR-002)
│   ├── StopSurveyButton.tsx  # REMOVE (FR-007) + its render site
│   └── apx/             # logo.tsx / navbar.tsx — reused/adapted for the PBL masthead
└── public/              # PBL logo asset (bundled; fonts NOT committed — design-tokens.md)

tests/
├── unit/                # responseService.test.ts: nested selection.selectedClusterWords (FR-012),
│                        #   HTML cluster target (FR-013), 5-n-gram(1,2) cluster (FR-014);
│                        #   helpers/study.ts fixtures
└── e2e|smoke            # multi-word representation renders; chrome present on each screen
```

**Structure Decision**: Existing web-app layout (`client/` + `server/` + `shared/`) is retained
unchanged. No new top-level directories, routes, endpoints, or dependencies are added; all work lands
in existing files. The branded chrome is a single persistent shell in `routes/__root.tsx` (so it wraps
every screen once) plus the token layer in `index.css`, keeping the presentation change centralized.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| PBL chrome overrides win over shadcn/AppKit component defaults where they conflict (Constitution I expects UI "built from `@databricks/appkit-ui`") | FR-010/FR-010a require the app to read as a genuine PBL product; a persistent PBL masthead/footer + house-style tokens are the point of the feature. The user explicitly directed that such conflicts resolve to **PBL chrome**. | Keeping pure shadcn defaults where they clash would defeat FR-010 (the app would not read as a PBL product). The deviation is bounded to *presentation* (tokens + targeted overrides) — AppKit components, their behaviour, keyboard accessibility, and focus order are unchanged (research.md R8), so this is the minimal override, not a re-platforming. |
