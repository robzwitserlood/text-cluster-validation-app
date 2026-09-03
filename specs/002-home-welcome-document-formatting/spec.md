# Feature Specification: Welcome Home Page & Researcher-Specified Document Formatting

**Feature Branch**: `002-home-welcome-document-formatting`
**Created**: 2026-06-30
**Status**: Draft
**Input**: User description: "Home page that welcomes the participant and briefly describes what he or she is about to do and why. Moreover, the document shown for any cluster-intrusion task needs to be formatted as specified by the researcher."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Land on a welcoming home page (Priority: P1)

A participant opens the survey link and, before any task begins, sees a home page that
welcomes them, briefly explains in plain language what they are about to do (complete a short
set of text-judgment tasks), and why it matters (their judgments help validate
automatically-generated groupings of text). From this page they start the session. The home
page sets expectations and reassures the participant, reducing early drop-off before the first
task.

**Why this priority**: It is the participant's first impression and the entry point to the
entire flow. A welcoming, clear introduction directly supports completion rates and trust, and
it is the simplest standalone slice — it can be shipped and demonstrated on its own without
changing the existing task mechanics.

**Independent Test**: Open the app as a first-time visitor and confirm a welcome page appears
before any task, containing a greeting, a short description of what the participant will do and
why, and a clear control to begin; confirm starting from this page leads into the existing task
flow.

**Acceptance Scenarios**:

1. **Given** a participant opens the survey link for the first time, **When** the app loads,
   **Then** a welcome home page is shown before any task instructions, practice, or items.
2. **Given** the welcome home page is shown, **When** the participant reads it, **Then** it
   contains a greeting, a brief description of what they are about to do, and a brief
   explanation of why their participation matters.
3. **Given** the welcome home page is shown, **When** the participant activates the control to
   begin, **Then** they proceed into the existing session flow (first task's instructions and
   practice).
4. **Given** a returning participant with an in-progress session, **When** they reopen the
   link, **Then** they are not forced to repeat completed items (the welcome page does not
   reset or discard prior progress).

---

### User Story 2 - Read a properly formatted document in a cluster-intrusion task (Priority: P1)

During a cluster-intrusion task the participant is shown one target document (text) alongside
candidate clusters. Today that document is rendered as undifferentiated plain text. For many
study materials this is hard to read and can misrepresent the source. The researcher needs the
document to be displayed with the formatting they specify (e.g., paragraphs, line breaks,
emphasis, headings/lists) so the participant reads it as intended, leading to more accurate
intrusion judgments.

**Why this priority**: The readability and faithful presentation of the target document
directly affects the quality of the cluster-intrusion judgments — the core data the study
collects. Misformatted documents bias or degrade responses, so this is essential, not cosmetic.

**Independent Test**: Load a cluster-intrusion item whose target document includes
researcher-specified formatting (e.g., multiple paragraphs and emphasis) and confirm the
document renders with that formatting rather than as a single unbroken plain-text block, while
the candidate clusters and selection mechanics remain unchanged.

**Acceptance Scenarios**:

1. **Given** a cluster-intrusion item whose target document carries researcher-specified
   formatting, **When** the item is presented to the participant, **Then** the document is
   displayed with that formatting applied.
2. **Given** a target document that contains paragraph breaks, **When** it is displayed,
   **Then** the paragraph structure is visibly preserved rather than collapsed into one block.
3. **Given** a target document with no formatting specified, **When** it is displayed, **Then**
   it renders as readable plain text with no errors (backward compatible with existing items).
4. **Given** a target document whose formatting is malformed or unsupported, **When** it is
   displayed, **Then** the participant still sees the readable text content without a broken
   page or leaked markup, consistent with graceful-degradation handling.
5. **Given** any displayed document, **When** it is rendered, **Then** no executable or active
   content embedded in the document can run in the participant's browser (formatting only,
   never code execution).

---

### User Story 3 - Present the survey in the researcher-configured language (Priority: P2)

The survey can be presented in Dutch or English. The language is fixed for the whole deployment
by an app-wide configuration setting the researcher controls. Every app-provided text — the
welcome/home page chrome, navigation and button labels, system/notice messages, and the built-in
default welcome copy — is shown consistently in the configured language. Researcher-authored
content (welcome copy, practice-item explanations) is displayed exactly as authored, and
the intrusion **task items themselves are never translated or altered** by the language setting.
The per-item debrief correct/incorrect explanation is system-generated built-in text and is
localized like the rest of the app chrome.
In principle a researcher could run the app in Dutch while presenting English task items; this is
not expected, but the task items must remain exactly as supplied.

**Why this priority**: Reaching Dutch-speaking participants directly affects comprehension and
completion, but it layers on top of the existing flow rather than blocking it.

**Independent Test**: Set the deployment language to Dutch and confirm the home page, buttons,
and system messages appear in Dutch while a supplied (e.g., English) intrusion task item is
displayed unchanged; switch to English and confirm the app chrome changes while task items are
still displayed exactly as supplied.

**Acceptance Scenarios**:

1. **Given** the deployment language is set to Dutch, **When** any app-provided screen is shown,
   **Then** all built-in text (greeting chrome, button labels, system/notice messages, default
   welcome) appears in Dutch.
2. **Given** the deployment language is set to English, **When** the same screens are shown,
   **Then** all built-in text appears in English, consistently across the whole survey.
3. **Given** any configured language, **When** an intrusion task item (word list, candidate
   clusters, target document) is presented, **Then** the task item content is displayed exactly
   as supplied and is never translated or modified.
4. **Given** the researcher supplies welcome/practice/debrief content, **When** it is displayed,
   **Then** it is shown exactly as authored (the language setting does not translate
   researcher-authored content).

---

### User Story 4 - Debrief walkthrough after completing the tasks (Priority: P2)

After the participant completes all tasks, they first see a thank-you page that clearly states
the survey is complete and that they may close the window or continue to an explanation. If they
continue, each item they responded to is presented again in the same layout as during the
session, with their selection marked and an explanation shown below the item. The explanation is
framed around the automated grouping being validated — not the participant — with one message
when the selection matches the cluster's expected answer and a different message when it does
not. After the participant has stepped through all debrief items, a closing page again thanks
them and tells them the window may be closed.

**Why this priority**: The debrief improves participant trust and transparency, but it runs after
all response data is already recorded, so it does not affect the core data collection.

**Independent Test**: Complete a session, confirm a thank-you/completion page appears with both a
close affordance and a continue affordance; on continue, confirm each responded item is re-shown
in the session layout with the selection marked and a correct/incorrect explanation beneath it;
after the last item, confirm a final thank-you/closing page is shown.

**Acceptance Scenarios**:

1. **Given** a participant finishes the last task, **When** the session completes, **Then** a
   thank-you page is shown stating the survey is complete and offering to either close the window
   or continue to the explanation.
2. **Given** the participant chooses to continue, **When** the debrief walkthrough starts,
   **Then** each responded item is presented in the same layout as during the session, with the
   participant's selection visibly marked.
3. **Given** a debrief item is shown, **When** its explanation is displayed below the item,
   **Then** it uses a system-generated message — one variant when the selection matches the
   cluster's expected answer and another when it does not — phrased so the participant understands
   the automated grouping (not the participant) is what is being validated.
4. **Given** the participant steps through all debrief items, **When** the last item is passed,
   **Then** a closing thank-you page is shown indicating the window may be closed.
5. **Given** the participant chooses to close at the first thank-you page, **When** they do so,
   **Then** no debrief walkthrough is required and no recorded response data is changed.

---

### Edge Cases

- The target document is empty or missing → the item is withheld/skipped with a clear notice
  rather than shown as a broken document (consistent with existing malformed-item handling).
- The document contains formatting directives the app does not support → unsupported directives
  are ignored and the underlying text is still shown readably; no raw markup leaks to the
  participant.
- The document contains content that could be interpreted as active/executable content →
  it is treated strictly as inert text/formatting and never executed (the document originates
  from researcher-supplied study data, but is still rendered safely).
- A very long document is shown in a cluster-intrusion task → it remains readable and the
  selection controls for candidate clusters remain reachable (including by keyboard).
- The welcome page copy is long or localized → it remains readable and the begin control stays
  reachable by keyboard.
- A participant who has already completed the session reopens the link → they see the
  completion/debrief state, not the welcome page as a fresh start.
- A practice item is shown before the participant submits an answer → its explanation stays
  hidden for every practice item (not only the first) and is revealed only after the participant
  submits an answer for that item.
- The configured survey language differs from the language of the supplied task items → the app
  still works; app chrome uses the configured language and task items are shown exactly as
  supplied without translation.
- The participant closes the window at any point during the debrief walkthrough → recorded
  responses are unaffected and the debrief is simply left incomplete.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST present a welcome home page as the first screen of a participant's
  session, before any task instructions, practice exercises, or items.
- **FR-002**: The welcome home page MUST include a greeting, a brief plain-language description
  of what the participant is about to do, and a brief explanation of why their participation
  matters.
- **FR-003**: The welcome home page MUST provide a clear control for the participant to begin,
  which leads into the existing session flow without altering task order (word intrusion before
  cluster intrusion) or existing recording behavior.
- **FR-004**: The welcome home page MUST NOT reveal any task answers, intruder words/clusters,
  or other content that would bias responses (consistent with the existing no-early-reveal
  rule).
- **FR-005**: Presenting the welcome home page MUST NOT reset, discard, or duplicate a
  returning participant's prior progress or recorded responses.
- **FR-006**: System MUST render the target document of a cluster-intrusion item using the
  formatting the researcher supplies as **HTML** for that document, rather than as
  undifferentiated plain text. The researcher authors the document as HTML in the study
  definition, and the app displays it with that formatting applied.
- **FR-007**: Before rendering, the system MUST sanitize the researcher-supplied document HTML
  to a safe subset of presentational elements (e.g., paragraphs, line breaks, emphasis,
  headings, lists). The system MUST strip and never execute scripts, event handlers, embedded
  objects, inline/remote styles or fonts, form controls, and any external or remote content
  references. Document formatting MUST be limited to inert presentation only. (Constitution
  Principle II — content stays inert and within the governed boundary.)
- **FR-008**: When a target document has no formatting specified, the system MUST display it as
  readable plain text, preserving backward compatibility with existing cluster-intrusion items.
- **FR-009**: When a target document's formatting is malformed or contains unsupported
  directives, the system MUST still present the readable text content without leaking raw
  markup and without breaking the page (graceful degradation, consistent with existing
  malformed-item handling).
- **FR-010**: Formatted documents MUST remain fully usable via keyboard and meet accessible
  contrast and focus-visibility expectations; formatting MUST NOT trap focus or prevent reaching
  the candidate-cluster selection controls. (Constitution Principle I)
- **FR-011**: The document content and any researcher-specified formatting MUST stay within the
  governed data boundary and MUST NOT be emitted into logs, telemetry, error messages, or any
  external service. (Constitution Principle II)
- **FR-012**: The welcome home page content (greeting + what/why description) MUST be authored
  by the researcher per study and supplied in the study definition. When the researcher does
  not supply welcome content, the system MUST fall back to a sensible built-in default so every
  deployment still shows a complete welcome page.
- **FR-013**: The system MUST support presenting the entire survey in either Dutch or English,
  selected by an app-wide deployment configuration setting the researcher controls (not per-study
  content and not participant-selectable).
- **FR-014**: The configured language MUST be applied consistently across the whole survey —
  including the welcome/home page chrome, all button and navigation labels, system/notice
  messages, and the system-generated debrief correct/incorrect explanations (FR-020).
- **FR-015**: The language setting MUST switch only app-provided/built-in text.
  Researcher-authored content (welcome copy, practice-item explanations) MUST be displayed
  exactly as authored, and intrusion **task items (word lists, candidate clusters, target
  documents) MUST never be translated, reordered, or otherwise altered** by the language setting.
  The per-item debrief correct/incorrect explanation is **system-generated built-in text**, not
  researcher-authored, so it is localized by the language setting (FR-014, FR-020) rather than shown
  verbatim. The app MUST function correctly even if the configured language differs from the
  language of the supplied task items.
- **FR-016**: When a participant's cluster-intrusion response is written to the volume, the
  recorded response MUST include the representative words/terms of the selected cluster as shown
  to the participant, in addition to the cluster's study-defined ID, so responses are
  interpretable without cross-referencing the study definition. Selection recording behavior is
  otherwise unchanged.
- **FR-017**: During practice items, the explanation for a practice item MUST remain hidden until
  the participant submits an answer for that item, and this MUST hold for every practice item
  (correcting the current behavior where the second practice item reveals its explanation before
  an answer is submitted).
- **FR-018**: After all tasks are completed, the system MUST first present a completion/thank-you
  page that states the survey is finished and offers the participant to either close the window
  or continue to an explanatory debrief.
- **FR-019**: When the participant continues to the debrief, the system MUST present each item
  they responded to in the same layout used during the session, with the participant's own
  selection visibly marked and an explanation shown below the item.
- **FR-020**: Each debrief explanation MUST be system-generated from fixed built-in templates with
  two variants — one shown when the participant's selection matches the cluster's expected answer
  and one when it does not — and MUST be framed so that the automated cluster/grouping is what is
  being validated, never judging the participant's ability (consistent with the existing principle
  that the participant is not evaluated; the grouping is). These templates are app-provided (not
  researcher-authored) and are localized by the configured deployment language (FR-014).
- **FR-021**: After the participant has stepped through all debrief items, the system MUST present
  a closing thank-you page indicating the window may be closed.
- **FR-022**: The debrief flow MUST NOT alter, add to, or discard any recorded response data;
  closing the window at any debrief step MUST leave recorded responses intact.

### Key Entities _(include if feature involves data)_

- **Welcome Content**: The greeting and brief what/why description shown on the home page,
  authored by the researcher in the study definition, with a built-in default used when not
  supplied (FR-012). Contains no task answers or ground truth.
- **ClusterIntrusionItem (extended)**: The existing cluster-intrusion question entity. Its
  target document carries researcher-authored HTML formatting in addition to its text content;
  the candidate clusters and ground-truth intruder are unchanged. Formatting is inert
  presentation metadata, not new ground truth, and is sanitized before display (FR-007).
- **Survey Language (deployment setting)**: An app-wide configuration value (Dutch or English)
  that selects which set of built-in/app-provided strings is used. It does not affect
  researcher-authored content or task items (FR-013–FR-015).
- **ClusterIntrusion Response (extended)**: The recorded response for a cluster-intrusion item.
  In addition to the selected cluster's study-defined ID, it now also records the selected
  cluster's representative words as shown to the participant (FR-016). No other recorded fields
  change.
- **Debrief Item**: A read-only re-presentation of an item the participant responded to, shown in
  the session layout with the participant's selection marked and a correct/incorrect,
  grouping-focused explanation beneath it. It records no new response data (FR-018–FR-022).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of first-time participants see the welcome home page (greeting + what + why)
  before any task content is shown.
- **SC-002**: From the welcome home page, a participant can reach the first task in a single
  action (one begin control), and the entire welcome step is completable by keyboard alone.
- **SC-003**: 100% of cluster-intrusion target documents that carry researcher-specified
  formatting are displayed with that formatting applied (paragraph structure and emphasis
  visibly preserved), as verified against the study materials.
- **SC-004**: 0% of displayed documents leak raw formatting markup to the participant or
  execute any embedded active content.
- **SC-005**: Existing cluster-intrusion items without specified formatting continue to display
  correctly with no regression (100% backward compatibility).
- **SC-006**: Adding the welcome page and document formatting introduces no early reveal of any
  intruder answer and no change to recorded response data fields.
- **SC-007**: With the deployment language set, 100% of app-provided text (home page chrome,
  buttons, system messages, default welcome) appears in the configured language, while 100% of
  task items are displayed unchanged regardless of the configured language.
- **SC-008**: 100% of recorded cluster-intrusion responses include the selected cluster's
  representative words in addition to its study-defined ID.
- **SC-009**: 0% of practice items reveal their explanation before the participant submits an
  answer for that item.
- **SC-010**: 100% of completed sessions present the completion → optional walkthrough → closing
  sequence, with each walkthrough item showing the marked selection and a correct/incorrect
  grouping-focused explanation, and with 0% change to recorded response data.

## Clarifications

### Session 2026-06-30

- Q: How should a researcher specify the formatting of a cluster-intrusion target document? →
  A: Researcher authors the document as **HTML** in the study definition; the app sanitizes it
  to a safe presentational subset and strips/never executes scripts, active content, and
  external/remote references (FR-006, FR-007).
- Q: Where does the welcome home page copy come from? → A: **Researcher-configured per study**
  in the study definition, with a built-in default used when not supplied (FR-012).

### Session 2026-07-01

- Q: How is the survey language (Dutch vs. English) configured? → A: **App-wide deployment
  setting** controlled by the researcher — a single configuration for the whole deployment, not
  per-study content and not participant-selectable (FR-013).
- Q: What does the language setting translate, given task items must never be translated? → A:
  **App-provided/built-in strings only** (UI chrome, buttons, system messages, built-in default
  welcome). Researcher-authored content is shown exactly as authored, and intrusion task items
  are never translated or altered (FR-014, FR-015).
- Q: What cluster representation is stored with a cluster-intrusion response? → A: The
  **representative words/terms of the selected cluster as shown** to the participant, in addition
  to the cluster's study-defined ID (FR-016).
- Q: What explanation is shown below each debrief item? → A: A **system-generated reveal with two
  variants** — one when the selection matches the cluster's expected answer and one when it does
  not — framed so the automated cluster/grouping is what is validated, never judging the
  participant (FR-020).
- Q: Is the per-item debrief correct/incorrect explanation researcher-authored or system-generated?
  → A: **System-generated from fixed built-in templates** (two variants: match / no-match); it is
  app-provided text, not researcher-authored, so it is **not** covered by the "displayed exactly as
  authored" rule (FR-015, FR-020).
- Q: Is the system-generated debrief explanation localized by `SURVEY_LANGUAGE`? → A: **Yes** — the
  built-in match/no-match templates live in the shared string catalog and follow the configured
  deployment language like all other built-in chrome (FR-014, FR-020).

## Assumptions

- The formatting requirement applies specifically to the **target document** of
  cluster-intrusion items (the "document shown for any cluster-intrusion task"), not to word
  lists, candidate-cluster word displays, or debrief content. Those remain as currently
  specified.
- The document text and its formatting are supplied upstream by the researcher as part of the
  study definition, consistent with how clusters, items, and intruders are already supplied;
  the app renders them and does not author study content.
- The welcome home page is informational only: it records no response data and does not change
  the participant-identification, session-assignment, or storage behavior defined in feature 001.
- Rendering safety applies even though content is researcher-supplied: documents are treated as
  inert text/formatting and never as executable content, preserving the constitution's data and
  safety guarantees.
- Standard web readability and accessibility expectations apply (no specific performance target
  beyond the existing per-item median timing in feature 001).
- Survey language is a single deployment-wide setting; mixed-language operation (e.g., Dutch app
  chrome with English task items) is permitted though not expected, because task items are never
  translated.
- "Cluster representation" in a recorded response means the representative words/terms already
  shown to the participant for the selected cluster; no new ground truth is introduced.
- The debrief walkthrough covers the items the participant actually responded to during the
  session, re-shown read-only; it records no new response data and does not change the storage
  behavior defined in feature 001.
