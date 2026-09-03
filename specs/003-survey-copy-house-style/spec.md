# Feature Specification: Survey Copy Refinements & PBL Branded Page Chrome

**Feature Branch**: `003-survey-copy-house-style`
**Created**: 2026-07-13
**Status**: Draft
**Input**: User description: "Enumerate the sections of the survey; make the default welcome verbatim more detailed and reference the enumerated sections; align the app with PBL house style (example website with source code to be provided); on the per-task instructions screen use one subtitle and one box max (fold the first box's content into the subtitle); remove the browser-progress-saved message and instead advise completing the survey in one go while allowing pause/resume; remind the participant that practice comes first and, on the last practice, that the real questions start on the next page; remove the 'stop survey' button; add HTML examples and 5-ngram range (1,2) cluster representations to the test cases; make the completion page clearly state the survey is done, the tab may be closed, and continuing to the explanation is optional; and move `selectedClusterWords` under `selection` in the data model."

## Clarifications

### Session 2026-07-13

- Q: Is the PBL house-style reference (example website + source code) available now, so US4/FR-010 ships in this feature, or should it stay a deferred dependency? → A: Reference available now — house-style alignment is in scope for this feature.
- Q: How should relocating `selectedClusterWords` under `selection` handle already-recorded responses? → A: Greenfield — no production responses exist yet; write only the new `selection.selectedClusterWords` shape (no migration or backward-read).
- Q: Which languages should the new/changed built-in copy be authored and shown in? → A: Both Dutch and English.
- Q: How granular should the enumerated survey-section list be? → A: Grouped by task type (welcome/intro; word-intrusion part = practice then real; cluster-intrusion part = practice then real; completion; optional explanation).
- Q: Does "PBL house style" mean recolouring the existing layout, or reproducing PBL's branded page chrome as real structure? → A: Reproduce the branded page chrome — a persistent top masthead/header carrying the PBL logo and a persistent PBL footer band wrap every screen (welcome, instructions, task, completion) as genuine page structure; house-style tokens (colours, typography, spacing) apply within that shell.
- Q: How faithful must the chrome be to the reference site? → A: PBL-branded equivalent — the shell must clearly read as a PBL product using the logo and house-style tokens, without pixel-matching the reference site's exact markup/dimensions.
- Q: Which branded bands wrap the content? → A: Both — a top masthead/header (with PBL logo) and a bottom footer band, on every screen.
- Q: Does the branded chrome also wrap the optional post-completion explanation/debrief walkthrough, or only the four named key screens? → A: Wrap the explanation walkthrough too — every participant-facing screen sits inside the shell.
- Q: What does the footer band contain, given the "no navigation / no leaving the flow" constraint? → A: Branding-only — PBL wordmark/logo and copyright/attribution text, no clickable outbound links.
- Q: Are the masthead/footer fixed/sticky in the viewport or in normal document flow? → A: In-flow / static — they scroll with the page; "persistent" means present on every screen, not pinned.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Read a clear, correctly structured per-task instructions screen (Priority: P1)

Before each task type (word intrusion, then cluster intrusion) the participant sees a short
instructions screen. Today that screen presents a title, a subtitle, and **two** stacked boxes
(an informational "how it works" box and a "before you begin" box). This is visually heavy and
splits closely related guidance. The participant should instead see a single subtitle that
already carries the "how it works" guidance, followed by **at most one** box that holds the
remaining essential reminders. The screen should also tell the participant that a few practice
examples come first and that the real survey follows, so they are not surprised by the transition.

**Why this priority**: This is the screen every participant reads before every task, and its
clarity directly affects comprehension and completion. It is a self-contained copy/layout change
that can be shipped and demonstrated on its own.

**Independent Test**: Open the word-intrusion (and cluster-intrusion) instructions screen and
confirm it shows exactly one subtitle carrying the former first-box guidance and no more than one
box; confirm the practice-first reminder appears; confirm the "stop survey" control is no longer
present.

**Acceptance Scenarios**:

1. **Given** the per-task instructions screen, **When** it is displayed, **Then** it shows a
   title, one subtitle, and at most one supporting box (the previously-shown first/informational
   box is removed and its content is folded into the subtitle).
2. **Given** the per-task instructions screen, **When** it is displayed, **Then** it no longer
   states that progress is saved to this device/browser, and instead advises the participant that
   completing the survey in one sitting is recommended while pausing and resuming later is
   possible.
3. **Given** the per-task instructions screen, **When** it is displayed, **Then** it reminds the
   participant that a few practice examples come first and that the real survey questions follow.
4. **Given** any screen where a "stop survey" control exists today, **When** this feature ships,
   **Then** that control is removed and no longer shown to the participant.

---

### User Story 2 - Understand the survey's structure up front and in the welcome (Priority: P1)

The participant should be able to see, in plain language, what the survey is made of: its named
sections in the order they occur. The built-in default welcome copy — used when the researcher
supplies none — should be more detailed than today and should reference those enumerated sections
so the participant knows what to expect (e.g., a welcome/intro, a word-intrusion part with
practice then real questions, a cluster-intrusion part with practice then real questions, and a
closing/optional explanation).

**Why this priority**: Setting accurate expectations at the outset reduces confusion and
mid-survey drop-off, and the enumerated sections become the shared vocabulary the rest of the copy
(instructions, practice reminders, completion page) refers back to.

**Independent Test**: With no researcher-supplied welcome content, open the welcome page and
confirm the default copy is detailed and names the survey's sections in order; confirm the same
section names are used consistently by the instructions and completion copy.

**Acceptance Scenarios**:

1. **Given** the survey has a defined set of sections, **When** the specification and built-in copy
   are authored, **Then** the sections are enumerated and named in a single canonical order that
   the rest of the app copy refers to.
2. **Given** the researcher supplies no welcome content, **When** the welcome page is shown,
   **Then** the built-in default welcome is more detailed than the previous default and explicitly
   references the enumerated sections and their order.
3. **Given** a researcher supplies their own welcome content, **When** the welcome page is shown,
   **Then** the researcher content is displayed exactly as authored (this feature changes only the
   built-in default, not the override behavior).

---

### User Story 3 - See a clear completion page at the end (Priority: P2)

After finishing all tasks, the participant reaches the completion/thank-you page. It should state
unambiguously that the survey is complete and that they may now close the browser tab. Continuing
to the explanation of how their responses are used is **optional**; if they are interested, a
clearly-labelled control proceeds to that explanation.

**Why this priority**: This is the last thing every completing participant sees; a clear
"you're done, you may close the tab, more is optional" message prevents uncertainty about whether
the survey really ended. It runs after all data is recorded, so it does not affect data capture.

**Independent Test**: Complete a session and confirm the completion page clearly states the survey
is finished and the tab may be closed, presents continuing to the explanation as optional, and
provides a control to proceed to the explanation for those interested.

**Acceptance Scenarios**:

1. **Given** the participant finishes the last task, **When** the completion page is shown,
   **Then** it clearly states the survey is complete and that the browser tab may be closed.
2. **Given** the completion page is shown, **When** the participant reads it, **Then** it states
   that learning more about how responses are used is optional and offers a clearly-labelled
   control to proceed to that explanation.
3. **Given** the participant closes the tab at the completion page, **When** they do so, **Then**
   no explanation walkthrough is required and no recorded response data is changed.

---

### User Story 4 - Experience the app inside PBL's branded page chrome (Priority: P2)

Every participant-facing screen — the key screens (welcome, instructions, task, completion) and the
optional post-completion explanation/debrief walkthrough — should render inside PBL's branded page
chrome — genuine page structure, not merely recoloured content. Specifically, a persistent top
**masthead/header** carrying the **PBL logo** wraps the top of every screen, and a persistent PBL
**footer band** wraps the bottom; the existing screen content sits in the content area between
them. Within that shell, the PBL house-style tokens (colours, typography, spacing) apply. The
chrome is a **PBL-branded equivalent**: it must clearly read as a PBL product using the logo and
house-style tokens, without pixel-matching the reference site's exact markup or dimensions. The PBL
reference site (<https://startanalyse.pbl.nl/>), with its house-style tokens captured in
`design-tokens.md`, is the reference. The participant experiences a survey that reads as a genuine
PBL product, increasing trust and legitimacy.

**Why this priority**: A branded page shell (masthead, logo, footer) is what makes the survey read
as an official PBL product rather than a recoloured generic app, supporting participant confidence.
It is a presentation-layer concern that wraps the existing flow without changing task mechanics or
recorded data.

**Independent Test**: Open each key screen (welcome, instructions, task, completion) and confirm the
same top masthead/header with the PBL logo appears at the top and the same PBL footer band appears
at the bottom of every one, with the existing screen content in between; confirm the shell and its
house-style tokens (colours, typography, spacing) read as a PBL product consistent with the
reference and `design-tokens.md`.

**Acceptance Scenarios**:

1. **Given** any key screen (welcome, instructions, task, completion), **When** it is shown, **Then**
   a persistent top masthead/header carrying the PBL logo is present at the top and a persistent PBL
   footer band is present at the bottom, wrapping the existing screen content.
2. **Given** the branded chrome, **When** the app is compared to the PBL reference and
   `design-tokens.md`, **Then** the masthead, footer, and content area read as a PBL-branded
   equivalent (logo and house-style colours, typography, and spacing applied consistently), without
   requiring a pixel-exact copy of the reference markup.
3. **Given** the chrome and house-style alignment, **When** any screen is shown, **Then** existing
   behaviour, copy meaning, keyboard accessibility, and recorded data are unchanged (presentation
   only), and the masthead/footer do not obstruct or alter the task interaction.

---

### Edge Cases

- The instructions screen must still fit "at most one box" even when the pause/resume advice and
  the practice-first reminder are both present → related reminders are consolidated into the single
  box (or the subtitle) rather than reintroducing a second box.
- The last practice item must additionally tell the participant that the real questions start on
  the next page; earlier practice items must not show that "next page is real" message.
- The researcher-supplied welcome overrides the built-in default entirely → the more-detailed
  default and its section enumeration are used only when no welcome content is supplied.
- The PBL reference source is available for this feature → branded-chrome and house-style alignment
  (FR-010, FR-010a, US4) proceeds within scope, driven by the reference's masthead/footer structure
  and its colours, typography, and spacing tokens rather than guessed.
- The persistent masthead and footer must not consume so much space that the task interaction is
  pushed off-screen or obstructed → the masthead and footer sit in normal document flow (static,
  scrolling with the page rather than pinned/fixed to the viewport), so on smaller/short viewports
  the content area remains reachable and the chrome does not overlap or hide interactive controls.
- The masthead/footer are presentation chrome only → they introduce no new navigation that could let
  a participant skip tasks or leave the flow, and they do not alter keyboard focus order through the
  task controls.
- A returning participant reopening the link mid-survey → the pause/resume advice is accurate: they
  resume where they left off (existing single-device/browser resume behaviour is unchanged).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The survey's sections MUST be enumerated as a single canonical, ordered list that
  serves as the shared reference for the welcome copy, instructions copy, and completion copy. The
  list MUST be grouped by task type: welcome/intro; the word-intrusion part (practice then real);
  the cluster-intrusion part (practice then real); completion; and the optional explanation —
  rather than listing each practice/real stage as a separate top-level section.
- **FR-002**: The built-in **default** welcome copy (used when the researcher supplies none, per
  002 FR-012) MUST be more detailed than the prior default and MUST reference the enumerated
  sections and their order. Researcher-supplied welcome content MUST continue to be displayed
  exactly as authored, unaffected by this change.
- **FR-003**: The per-task instructions screen MUST present a single subtitle and **at most one**
  supporting box. The content previously shown in the first/informational box MUST be folded into
  the subtitle, and that box MUST be removed.
- **FR-004**: The per-task instructions screen MUST NOT state that progress is saved to this
  device/browser. It MUST instead advise the participant that completing the survey in one sitting
  is recommended while pausing and resuming later is possible.
- **FR-005**: The per-task instructions screen MUST remind the participant that a few practice
  examples are shown first and that the real survey questions follow.
- **FR-006**: On the **last** practice item, the app MUST additionally inform the participant that
  the real questions start on the next page. Earlier practice items MUST NOT show this
  "next page is real" message.
- **FR-007**: The "stop survey" control MUST be removed wherever it exists today; this feature
  MUST NOT show it to the participant.
- **FR-008**: The completion page MUST clearly state that the survey is complete and that the
  browser tab may be closed.
- **FR-009**: The completion page MUST state that learning more about how responses are used is
  optional, and MUST provide a clearly-labelled control to proceed to that explanation for
  interested participants. Choosing not to proceed MUST NOT change any recorded response data
  (consistent with 002 FR-018 / FR-022).
- **FR-010**: Every participant-facing screen — the key screens (welcome, instructions, task,
  completion) and the optional post-completion explanation/debrief walkthrough — MUST render inside
  PBL's branded page chrome as genuine page structure: a persistent top masthead/header carrying the
  PBL logo MUST wrap the top of every screen, and a persistent PBL footer band MUST wrap the bottom,
  with the existing screen content in the content area between them. The chrome MUST be a
  PBL-branded equivalent — it MUST clearly read as a PBL product using the logo and house-style
  tokens, but is NOT required to pixel-match the reference site's exact markup or dimensions.
- **FR-010a**: Within the branded chrome, the app's visual presentation MUST follow the PBL house
  style, using the PBL reference site (<https://startanalyse.pbl.nl/>) and the extracted house-style
  tokens captured in `design-tokens.md` as the reference for colours, typography, spacing, and other
  visual-identity tokens. Neither the branded chrome nor the house-style alignment MUST change task
  mechanics, copy meaning, keyboard accessibility, focus order, or recorded data; the masthead and
  footer MUST NOT obstruct the task interaction or introduce navigation that lets the participant
  skip or leave the flow. Consistent with that constraint, the footer band MUST be branding-only —
  the PBL wordmark/logo and copyright/attribution text — and MUST NOT contain clickable outbound
  links.
- **FR-011**: All built-in copy added or changed by this feature (enumerated sections, expanded
  default welcome, revised instructions subtitle/box, pause/resume advice, practice-first and
  last-practice reminders, completion-page wording) MUST honour the app-wide survey language
  setting and be localised for both supported languages — Dutch and English — (consistent with
  002 FR-013–FR-015).
- **FR-012**: In the data model, `selectedClusterWords` MUST be represented as an attribute of the
  response's `selection` (e.g., `selection.selectedClusterWords`) rather than as a top-level
  attribute of the response record. The recorded information is otherwise unchanged: the
  representative words of the selected cluster as shown to the participant, alongside the cluster's
  study-defined ID (002 FR-016). No production responses exist yet, so only the new
  `selection.selectedClusterWords` shape is written; no migration of existing records or
  top-level backward-read path is required.
- **FR-013**: The test suite MUST include cluster-intrusion cases whose target documents are
  authored as **HTML** (exercising the researcher-supplied HTML formatting path from 002 FR-006 /
  FR-007), demonstrating both well-formed formatting and safe handling.
- **FR-014**: The test suite MUST include cluster representations expressed as **5 n-grams in the
  range (1, 2)** — i.e., representative terms that are each a unigram or bigram, five per cluster —
  so the tests cover multi-word cluster representations, their display, and their recording under
  `selection.selectedClusterWords` (FR-012).

### Key Entities _(include if feature involves data)_

- **Survey Section (new, descriptive)**: A named, ordered stage of the survey (e.g.,
  welcome/intro, word-intrusion practice, word-intrusion questions, cluster-intrusion practice,
  cluster-intrusion questions, completion, optional explanation). The canonical ordered list is the
  reference for welcome, instructions, and completion copy (FR-001). It introduces no new recorded
  data; it is a copy/structure concept.
- **Welcome Content — built-in default (changed)**: The fallback welcome copy used when the
  researcher supplies none. Now more detailed and references the enumerated sections (FR-002).
  Researcher-authored welcome content is unchanged.
- **Per-task Instructions Copy (changed)**: The title + single subtitle + at-most-one-box copy for
  each task type, including the folded-in "how it works" guidance, pause/resume advice, and
  practice-first reminder (FR-003–FR-005).
- **Completion Page Copy (changed)**: The end-of-survey message stating the survey is complete, the
  tab may be closed, and the explanation is optional, with a control to proceed (FR-008, FR-009).
- **PBL Branded Page Chrome (new, presentation)**: The persistent page shell wrapping every key
  screen — a top masthead/header carrying the PBL logo and a bottom PBL footer band, with the
  existing content in between (FR-010). It is a PBL-branded equivalent driven by the reference site
  and `design-tokens.md`; it carries no recorded data and adds no task navigation. The footer band is
  branding-only (PBL wordmark/logo and copyright/attribution text) with no clickable outbound links.
- **ClusterIntrusion Response — `selection` (changed)**: The recorded response's `selection` now
  carries `selectedClusterWords` (the representative words of the chosen cluster as shown),
  relocated from the top level of the response record (FR-012). No other recorded fields change;
  this is a shape/placement change to how the same information is stored.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of per-task instructions screens display exactly one subtitle and no more than
  one supporting box, with the former first-box content present in the subtitle.
- **SC-002**: 0% of per-task instructions screens mention progress being saved to the
  device/browser; 100% instead show the "recommended in one sitting, pausing and resuming is
  possible" advice.
- **SC-003**: 100% of per-task instructions screens show the practice-first reminder, and 100% of
  last-practice items (and 0% of earlier practice items) show the "real questions start on the next
  page" message.
- **SC-004**: The "stop survey" control is absent from 100% of the screens where it exists today.
- **SC-005**: With no researcher-supplied welcome, 100% of welcome pages show the expanded default
  copy that names the enumerated sections in order, and the same section names are used
  consistently across welcome, instructions, and completion copy.
- **SC-006**: 100% of completion pages clearly state the survey is complete and the tab may be
  closed, present the explanation as optional, and offer a control to proceed; 0% change to
  recorded response data results from this page.
- **SC-007**: 100% of participant-facing screens — the key screens (welcome, instructions, task,
  completion) and the optional post-completion explanation/debrief walkthrough — render inside the
  PBL branded chrome — the top masthead/header with the PBL logo and the bottom PBL footer band both
  present on every one — and follow the house-style reference tokens (colours, typography, spacing),
  reading as a PBL-branded equivalent, with no change to behaviour, keyboard accessibility, focus
  order, or recorded data, and no chrome obstruction of the task interaction.
- **SC-008**: 100% of newly added/changed built-in copy is available and shown in both supported
  languages.
- **SC-009**: 100% of recorded cluster-intrusion responses carry the representative words under
  `selection.selectedClusterWords` and none carry them as a top-level response field.
- **SC-010**: The test suite includes at least one **well-formed** HTML cluster target-document
  case and at least one **unsafe** HTML case whose dangerous markup is sanitised (safe handling),
  plus at least one cluster case whose representation is 5 n-grams in range (1, 2), and all pass.

## Assumptions

- This feature refines feature 002 (welcome page, document formatting, language, debrief/completion
  flow) rather than introducing new task mechanics; task order, recording, and data-collection
  semantics from features 001/002 are otherwise unchanged.
- "One box max" on the instructions screen means the single remaining supporting box holds the
  essential reminders (answers-final, pause/resume, practice-first); if all essential reminders fit
  the subtitle, zero boxes is also acceptable, but never more than one box.
- The "explanation of how responses are used" that the completion page optionally proceeds to is
  the existing post-completion debrief/explanation walkthrough defined in feature 002; this feature
  changes only the completion-page wording and framing, not the walkthrough itself.
- The enumerated survey sections reflect the actual flow but are presented grouped by task type
  (welcome/intro → word-intrusion part [practice then real] → cluster-intrusion part [practice then
  real] → completion → optional explanation); the exact section labels are finalised during
  planning but the order is fixed by the existing flow.
- The PBL house style is defined by the PBL reference site (<https://startanalyse.pbl.nl/>); its
  concrete tokens have been extracted into `design-tokens.md` for this feature, so branded-chrome and
  house-style alignment (FR-010, FR-010a, US4) is in scope and driven by that captured reference
  rather than guessed. The original source-code archive is transient and intentionally not kept in
  the repo.
- The branded page chrome is a **PBL-branded equivalent**, not a pixel-exact reproduction of the
  reference site: the goal is a shell that clearly reads as a PBL product (top masthead with PBL
  logo, bottom PBL footer band, house-style tokens), so exact reference markup, dimensions, and any
  reference-site navigation are deliberately out of scope.
- This is PBL's own first-party application and the PBL logo/branding are the organisation's own, so
  reproducing the PBL masthead and footer raises no third-party impersonation or licensing concern.
  The PBL logo asset is sourced from the PBL reference/brand materials; the exact masthead and footer
  labels are finalised during planning while their presence and placement are fixed by this spec.
- Relocating `selectedClusterWords` under `selection` is a data-shape change to how the same
  information is stored/represented; no production responses exist yet, so only the new nested
  shape is written (no migration of existing records or top-level backward-read path), and no
  information is lost or added.
- "5 n-grams in range (1, 2)" describes a cluster representation of five representative terms, each
  a unigram or bigram, used to exercise multi-word representations in tests; it does not change how
  clusters are defined by the researcher, only what the test fixtures cover.

## Dependencies

- **PBL house-style reference**: the PBL reference site (<https://startanalyse.pbl.nl/>); its
  branded-chrome structure (top masthead/header with PBL logo, bottom footer band) and its
  house-style tokens (colours, typography, spacing) have been extracted into `design-tokens.md`,
  which is the durable source for the branded-chrome and house-style alignment (FR-010, FR-010a,
  US4). The original source-code archive is transient and MUST NOT be committed to the repo.
- **PBL logo asset**: the PBL logo used in the masthead is sourced from PBL's own reference/brand
  materials (first-party); it MUST be available to the app as a bundled asset for the chrome.
- Builds on feature 002 (`specs/002-home-welcome-document-formatting`): welcome default copy,
  HTML target-document formatting/sanitisation, survey language setting, `selectedClusterWords`
  recording, and the completion/debrief flow.
