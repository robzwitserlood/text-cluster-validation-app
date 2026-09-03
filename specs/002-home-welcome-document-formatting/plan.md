# Implementation Plan: Welcome Home Page & Researcher-Specified Document Formatting

**Branch**: `002-home-welcome-document-formatting` | **Date**: 2026-07-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-home-welcome-document-formatting/spec.md`

## Summary

Layer five participant-facing refinements onto the existing server-driven flow (feature 001)
without changing its recording behaviour or ground-truth secrecy:

1. **Welcome home page (US1)** — a researcher-authored greeting/what/why shown as the very first
   screen, with a built-in default when not supplied. Implemented as the existing index route `/`,
   which post-refactor is a real index route whose loader redirects to the current phase. Welcome
   becomes a new leading phase `welcome` that maps to `/`; the index route renders it (instead of
   redirecting) and its "begin" control advances into the existing word segment. Gating reuses the
   established `X-Ack-Instructions` acknowledgement pattern, so a returning in-progress participant
   is redirected straight to their phase and never re-sees the welcome as a fresh start.
2. **Researcher-specified document formatting (US2)** — the cluster-intrusion target document is
   authored as HTML in the study definition and rendered with that formatting. The exact seam is
   `cluster/task.tsx` passing `current.item.targetText` into `TaskItem`. The server sanitizes the
   HTML to a safe presentational subset **at the DTO boundary** (`toClientClusterItem`/
   `toClientClusterPractice`) and ships a `targetHtml` string the client renders inertly; plain
   text and malformed markup both degrade to readable text.
3. **Deployment language (US3)** — a single app-wide `SURVEY_LANGUAGE` (`nl`|`en`) config selects a
   shared typed message catalog for all built-in strings. Researcher-authored content and task
   items are never translated.
4. **Cluster response enrichment (FR-016)** — a recorded cluster response also stores the selected
   cluster's representative words as shown.
5. **Practice-reveal fix + debrief walkthrough (US4)** — every practice item hides its explanation
   until its own answer is submitted (FR-017), and completion becomes a thank-you → optional
   per-item walkthrough → closing sequence rendered from the debrief payload.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict); Node.js 22+ server, React 19 client
**Primary Dependencies**: `@databricks/appkit` / `@databricks/appkit-ui` 0.24; `@tanstack/react-router`
1.170 (file-based routes + loaders); `@tanstack/react-query` 5; `zod` 4; **new:** `sanitize-html`
(server-side HTML sanitization, see Complexity Tracking)
**Storage**: Unity Catalog Volume only (Files plugin via `DATABRICKS_VOLUME_FILES`), shared subtree
`text_cluster_validation/{STUDY_ID}/`. No new stores; response JSON gains one field (FR-016)
**Testing**: vitest (unit), Playwright (smoke + e2e)
**Target Platform**: Databricks Apps (Linux server + browser client)
**Project Type**: Full-stack web application (monorepo: `client/`, `server/`, `shared/`)
**Performance Goals**: Single item render < 200 ms; HTML sanitization is per-item and cached with
the memoized study — negligible per-request cost
**Constraints**: PII (cluster text, target document, participant id) MUST NOT leave the UC Volume
boundary; sanitized HTML is rendered inertly (no scripts/handlers/remote refs); no PII in logs; all
quality gates green before merge
**Scale/Scope**: Small academic study; tens–low-hundreds of participants; hundreds of items

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **UX First (I)**: Every new/changed view keeps explicit loading, empty, and error states.
      The welcome page and debrief walkthrough are keyboard-completable (single begin/continue
      controls, visible focus) and built from `@databricks/appkit-ui`. Formatted documents render
      as inert presentational HTML and never trap focus or block reaching the candidate radio group
      (FR-010). All built-in chrome is localized (FR-014). No dead ends: thank-you offers both
      close and continue; the walkthrough ends on a closing page.
- [x] **PII Control (II)**: Researcher HTML is sanitized **server-side** at the DTO boundary and the
      client only receives an inert, safe subset — the sanitizer never runs on unsanitized markup in
      the browser and the untrusted boundary stays on the server. Target-document HTML and the
      selected cluster's representative words stay inside the UC Volume; neither is logged, put in
      telemetry, error messages, or client persistent storage (FR-011). The language flag and ack
      flags are non-PII. `sanitize-html` runs in-memory on already-in-boundary study content and
      sends nothing externally.
- [x] **Simplicity (III)**: Welcome gating **reuses** the existing `X-Ack-Instructions` mechanism
      (one extra flag, no new store, no new phase machinery beyond one leading phase). Language is a
      plain typed dictionary keyed by locale — no i18n framework. The client bundle reads the
      deployment language from build-time `SURVEY_LANGUAGE`, avoiding a separate config request for
      pre-session chrome. The debrief walkthrough is a client-side stepper over the **existing**
      debrief payload — no new server flow. The only new dependency is `sanitize-html` (justified in
      Complexity Tracking).
- [x] **Documentation (IV)**: This plan, research.md, data-model.md, contracts/ (api + storage
      deltas), and quickstart.md ship with the feature; README/quickstart document the new
      `SURVEY_LANGUAGE` config and the HTML authoring/sanitization contract. Spec, plan, and tasks
      stay in sync.

**Post-design re-check**: ✅ all gates still pass. Design keeps the server as the single trusted
sanitization boundary (strengthens II), adds no session store, and confines the one new dependency
to the server. See research.md (R1–R6) and data-model.md.

Violations MUST be recorded and justified in the Complexity Tracking section below.

## Project Structure

### Documentation (this feature)

```text
specs/002-home-welcome-document-formatting/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── api.md           # session/response/debrief deltas
│   └── storage.md       # study.json welcome + HTML targetText; Response selectedClusterWords
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
shared/
├── config.ts                # NEW: parse/validate SURVEY_LANGUAGE values (default 'en')
├── types.ts                 # + WelcomeContent; ClientClusterItem.targetHtml (was targetText);
│                            #   SessionState welcome variant; DebriefExample render fields
├── schemas.ts               # + welcome + config validation; targetText stays a string (raw HTML)
└── i18n.ts                  # NEW: Locale type + built-in string catalog (nl/en), shared by client+server

server/
├── server.ts                # read SURVEY_LANGUAGE for server-generated defaults
├── src/
│   ├── lib/
│   │   ├── sanitizeHtml.ts   # NEW: strict allowlist wrapper around sanitize-html (FR-007)
│   │   └── config.ts         # NEW: parse/validate SURVEY_LANGUAGE (default 'en')
│   └── services/
│       ├── studyLoader.ts    # parse optional study.welcome; targetText remains raw HTML string
│       ├── sessionService.ts # welcome phase; targetHtml via sanitize; debrief render fields;
│       │                     #   buildDebrief returns all answered items in order (FR-019)
│       └── responseService.ts# record selectedClusterWords for cluster responses (FR-016)

client/
├── src/
│   ├── lib/
│   │   ├── config.ts         # NEW: client bundle language from SURVEY_LANGUAGE
│   │   ├── i18n.tsx          # NEW: language provider/hook; t() over shared catalog
│   │   └── flow-router.ts    # add 'welcome' -> '/' ; index no longer always redirects
│   ├── routes/
│   │   ├── index.tsx         # render Welcome when phase==='welcome', else redirect (unchanged path)
│   │   └── complete.tsx      # thank-you -> per-item walkthrough -> closing stepper
│   └── components/
│       ├── Welcome.tsx       # NEW: greeting/what/why + Begin (US1)
│       ├── SafeHtml.tsx      # NEW: renders server-sanitized targetHtml inertly
│       ├── TaskItem.tsx      # targetText -> targetHtml (SafeHtml); localized default labels
│       ├── PracticeItem.tsx  # key per practice id so reveal resets every item (FR-017)
│       └── Debrief.tsx       # per-item, session-layout read-only view w/ marked selection + explanation

tests/
├── unit/
│   ├── sanitizeHtml.test.ts      # NEW: strips script/handlers/style/remote refs; keeps p/em/lists (FR-007)
│   ├── sessionService.test.ts    # + welcome phase gating; targetHtml mapping; debrief covers all answered
│   ├── responseService.test.ts   # + selectedClusterWords recorded (FR-016)
│   └── studyLoader.test.ts       # + welcome parsing + default fallback
└── smoke.spec.ts                 # + welcome->begin; formatted doc renders (no raw markup, no script);
                                  #   nl chrome / unchanged item; practice reveal hidden; walkthrough
```

**Structure Decision**: Web application — existing AppKit monorepo (`client/`, `server/`, `shared/`).
No new top-level packages; all changes slot into the current directories.

## Complexity Tracking

| Violation                      | Why Needed                                                                                                                                                                                               | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New dependency `sanitize-html` | FR-007 requires stripping scripts, event handlers, styles, and remote/external references from researcher HTML before render; a hand-rolled allowlist parser is a security liability under Principle II. | A bespoke sanitizer would re-implement HTML parsing and is easy to get wrong (mutation-XSS, malformed nesting); a vetted, DOM-free Node library is the simplest way to meet the safety bar. Client-side DOMPurify rejected: ships a sanitizer to every browser and moves the trust boundary off the server. |
