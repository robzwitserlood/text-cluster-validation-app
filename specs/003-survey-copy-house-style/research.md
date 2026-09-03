# Phase 0 Research: Survey Copy Refinements & PBL House-Style Alignment

All open questions from the spec were resolved in the 2026-07-13 clarification session (reference
available now; greenfield data shape; both `nl`/`en`; sections grouped by task type). No
`NEEDS CLARIFICATION` markers remain. This document records the design decisions that shape Phase 1.

## R1 — Canonical survey-section enumeration (FR-001)

- **Decision**: Represent the section list as a single typed constant in `shared/i18n.ts`, keyed the
  same way the message catalog is (per-locale labels), grouped by task type rather than by
  practice/real stage. Canonical order: `welcome` → `word-intrusion` (practice then real) →
  `cluster-intrusion` (practice then real) → `completion` → `explanation` (optional). The label text
  lives in the localized catalog so both `nl` and `en` stay in sync via the existing `Messages`
  typing discipline. The full list is documented in `contracts/sections.md`.
- **Rationale**: The spec makes the section list the *shared vocabulary* for welcome, instructions,
  and completion copy (SC-005). Co-locating it with the message catalog means one source of truth,
  compile-time enforcement that both locales define every label, and no new config surface
  (Simplicity III). Grouping by task type matches the clarified granularity answer.
- **Alternatives considered**: (a) A server-emitted section list in `SessionState` — rejected: the
  sections are static copy, not per-session data; shipping them over the wire adds a payload and a
  contract for no behavioural gain. (b) Listing each practice/real stage as its own top-level
  section — rejected by the clarification (too granular).

## R2 — Expanded default welcome referencing sections (FR-002)

- **Decision**: Grow the built-in `welcomeDefault*` copy so the `whatText`/`whyText` (or a new
  body field) walk the participant through the enumerated sections in order. Keep the resolution
  seam unchanged: `resolveWelcome` returns `study.welcome` verbatim when present, else the localized
  default. If the richer default needs more than greeting/what/why, extend `WelcomeContent` with an
  optional `bodyText`/section list that `Welcome.tsx` renders only for the default; researcher copy
  keeps the existing three fields and is never restructured.
- **Rationale**: Satisfies FR-002/SC-005 while preserving the FR-015 guarantee that researcher copy
  is shown exactly as authored. The default-only enrichment avoids forcing researchers to supply new
  fields.
- **Alternatives considered**: Overloading `whyText` with the whole section walk-through — rejected:
  cramming a list into one paragraph reads poorly and couples "why" with "structure". A dedicated,
  optional body region is clearer and still degrades to today's layout for researcher content.

## R3 — Instructions screen: one subtitle, at most one box (FR-003–FR-006)

- **Decision**: In `Instructions.tsx`, remove the informational `Info` box (its `how` copy folds
  into the `CardDescription` subtitle). Keep a single `Alert` box holding the essential reminders:
  answers-final, one-sitting-recommended / pause-resume-possible, and practice-first. Drop the
  `instructionsDeviceOnly` (progress-saved-to-this-browser) line entirely; replace with the
  one-sitting/pause-resume advice. The "real questions start on the next page" reminder is **not**
  on the instructions screen — it belongs on the *last practice item* (FR-006), rendered in
  `PracticeItem.tsx` when `index === of`. If all reminders comfortably fit the subtitle, zero boxes
  is acceptable, but never more than one (spec Assumptions).
- **Rationale**: Directly implements FR-003/FR-004/FR-005 and SC-001/SC-002. The last-practice
  reminder is naturally scoped by the existing `index`/`of` props already passed to `PracticeItem`,
  so FR-006 needs no server change and no new state.
- **Alternatives considered**: Keeping two boxes but relabeling — rejected by FR-003 ("at most one
  box"). Putting the last-practice message on the instructions screen — rejected: FR-006 ties it to
  the *last practice item* specifically, and SC-003 requires 0% of earlier practice items to show
  it.

## R4 — PBL house-style via the AppKit token layer (FR-010)

- **Decision**: Apply `design-tokens.md` by populating the app's existing AppKit theme tokens in
  `client/src/index.css` `:root` (currently commented-out placeholders) with PBL values — accent
  `#007bc7`, body text `#242424`, page background `#fbfbfb`, surface white, focus `#000000`, etc. —
  rather than authoring bespoke SCSS. Convert hex to the token format AppKit expects (the theme uses
  oklch; equivalent hex values are acceptable where the token accepts them). Set the font stack to
  `"RijksoverheidSans", Verdana, sans-serif` (body) and `"RijksoverheidSerif", serif` (headings).
  For the fonts, **do not commit the binaries**: either load them from the PBL-hosted path the live
  site uses or rely on the `Verdana`/`serif` fallback stack. Confirm exact values against the live
  site's computed CSS during implementation (the extracted archive is an older revision). Verify
  contrast (`#242424` on `#fbfbfb`; white on `#007bc7`) and keep focus visibility.
- **Rationale**: Reuses the existing token layer (Simplicity III), keeps every component and
  behaviour intact (FR-010), and treats fonts per the licensing note in `design-tokens.md`. Contrast
  verification preserves the accessibility guarantee.
- **Alternatives considered**: (a) Copying the legacy Rijkshuisstijl SCSS — rejected by
  `design-tokens.md` guidance and Simplicity. (b) Self-hosting the RO fonts in-repo — rejected:
  redistribution rights are unconfirmed; the fallback stack or PBL-hosted path avoids the risk.
  (c) A dark-mode PBL palette — deferred: the reference site is light-only; keep the existing dark
  tokens or map them conservatively without blocking the light-theme alignment.

## R5 — `selectedClusterWords` relocation under `selection` (FR-012)

- **Decision**: The submitted wire `Selection` (`{ kind: 'candidate', value }`) is **unchanged** —
  the client never sends representative words. Only the *persisted* cluster `Response.selection`
  gains `selectedClusterWords` (resolved server-side from `study.clusters`), replacing today's
  top-level `Response.selectedClusterWords`. Greenfield: write only the nested shape; remove the
  top-level field and add no backward-read path or migration. Word responses' `selection` stays
  `{ kind, value }` (no `selectedClusterWords`).
- **Rationale**: FR-012 explicitly relocates the field; the clarification confirms greenfield (no
  production data), so back-compat code would be speculative complexity (Simplicity III). Keeping the
  wire `Selection` unchanged means no client or API-request change — the enrichment is a server
  write-time concern only.
- **Alternatives considered**: Adding `selectedClusterWords` to the shared `Selection` type used for
  submission — rejected: it would imply the client submits it and pollute the request contract; the
  stored shape and the wire shape have different needs, so the persisted `Response.selection` is
  modeled as an extension of the wire `Selection` (see data-model.md).

## R6 — HTML + 5-n-gram(1,2) test coverage (FR-013/FR-014)

- **Decision**: Extend `tests/unit/helpers/study.ts` (and, where useful, `tests/e2e/fixtures/`) so
  at least one cluster target document is authored as **HTML** (well-formed formatting + a case
  that exercises safe handling of disallowed markup) and at least one cluster's
  `representativeWords` is **five terms, each a unigram or bigram** (n-gram range (1,2)). Assert in
  `responseService.test.ts` that the recorded cluster response carries those words under
  `selection.selectedClusterWords` (FR-012) and that the HTML target flows through the existing 002
  sanitiser to a safe subset. The smoke test verifies the multi-word representation renders.
- **Rationale**: Satisfies FR-013/FR-014/SC-010 by reusing the existing sanitisation and recording
  paths — no new production code, only fixtures + assertions.
- **Alternatives considered**: Adding a brand-new test study file — rejected: extending the existing
  fixtures keeps coverage co-located and avoids fixture drift.

## R7 — Removing the stop-survey control (FR-007)

- **Decision**: Delete `client/src/components/StopSurveyButton.tsx` and its single render site in
  `flow-pages.tsx`; retire the `stopSurvey*` catalog keys from `shared/i18n.ts`. No replacement
  control — pause/resume is covered by the instructions copy (FR-004) and the existing resume
  behaviour is unchanged.
- **Rationale**: FR-007/SC-004 require the control be absent everywhere. It is a net removal
  (Simplicity III). Resume/abandon is not a documented requirement beyond pause/resume, which needs
  no button.
- **Alternatives considered**: Hiding it behind a flag — rejected: FR-007 says removed, not gated.

## R8 — Resolving shadcn-default vs PBL-chrome conflicts (FR-010/FR-010a; user directive 2026-07-13)

- **Decision**: When a `@databricks/appkit-ui` (shadcn-based) component's default visual treatment
  conflicts with the PBL branded chrome or `design-tokens.md` house-style tokens, **the PBL chrome
  wins**: the default is overridden toward the PBL token/appearance (colour, typography, spacing,
  border/shadow) rather than leaving the shadcn default in place. The override is realized through
  the AppKit `:root` token layer in `client/src/index.css` first, and only where a token cannot
  express it, a narrow component-scoped class/style override. It is strictly a *presentation*
  override: the AppKit component, its DOM structure, keyboard behaviour, and focus order are left
  intact (FR-010a). Bespoke replacements of AppKit components are out of scope.
- **Rationale**: FR-010/FR-010a require the app to read as a genuine PBL product; that is the whole
  point of the feature, so a token/appearance clash must resolve toward PBL, not toward the generic
  shadcn look. Keeping the resolution at the token layer honours Constitution I ("built from AppKit
  components") and Simplicity III — components and behaviour are unchanged; only their skin changes.
  Recorded as a bounded, justified deviation in the plan's Complexity Tracking.
- **Alternatives considered**: (a) Preferring shadcn defaults where they clash — rejected: it would
  defeat FR-010 (the app would not read as a PBL product). (b) Forking/replacing AppKit components to
  hard-code the PBL look — rejected: unnecessary complexity and a maintenance/PII-surface cost when a
  token/override achieves the same visual result while preserving behaviour.
