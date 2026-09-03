# Feature Specification: Cluster Term List Display, Persistent Option Borders & Debrief Language Fix

**Feature Branch**: `006-cluster-terms-list-display`
**Created**: 2026-08-11
**Status**: Draft
**Input**: User description: "Clusters can be represented as a set of terms, terms do not nessesarily consist of one word but can for example also be two words. In the cluster intrusion task, it hard to scan the options when the terms are only seperated by commas and not listed in seperate rows. Make sure the terms are shown as un unordered list. And to make the visualization even more clear, make sure the pil edges around every option are visible at all times, not only at hover over. During the explanation phase at the end, the explanations per item are always in english even when the survey language is nl. Make sure the explanations are in the configures survey language."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Scan cluster terms at a glance (Priority: P1)

A survey participant is doing the cluster intrusion task and is shown several candidate clusters, each represented by a handful of terms (some single words, some short phrases). Today all terms for a cluster run together in one comma-separated line, making it hard to tell where one term ends and the next begins — especially when a term itself is two words. The participant needs to quickly scan and compare the terms within each option to judge which one doesn't belong.

**Why this priority**: This is the core readability problem the participant experiences on every single task item; it directly affects how accurately and quickly they can complete the primary study task.

**Independent Test**: Open the cluster intrusion task (live task, practice task, or debrief review) and visually confirm each cluster's terms are rendered as separate list rows rather than one comma-joined line, and that a two-word term stays together as one row.

**Acceptance Scenarios**:

1. **Given** a cluster option with terms `["climate change", "emissions", "renewable energy", "policy"]`, **When** the option is displayed in the cluster intrusion task, **Then** each term appears on its own row in the list, with "climate change" and "renewable energy" each shown intact as a single row (not split into separate words).
2. **Given** a cluster option with a single representative term, **When** it is displayed, **Then** it appears as a one-item list, not as bare unformatted text.
3. **Given** the same cluster option is shown in the practice task or in the post-task debrief review, **When** the participant views it, **Then** the terms are presented as a list in the same way as in the live task.

---

### User Story 2 - Distinguish answer options without hovering (Priority: P2)

A participant scanning a list of selectable answer options (word or cluster intrusion tasks) currently only sees a clear tile boundary once their cursor hovers over an option, or after they select it. This makes it hard to visually separate the options from one another and from the page background before interacting with them, particularly for participants using touch devices or reviewing the screen before choosing.

**Why this priority**: This is a visual-clarity improvement that compounds the benefit of User Story 1 (cleaner term lists) by making each option's boundary legible at all times, but it does not block task comprehension the way unreadable term lists do.

**Independent Test**: Load a task screen and, without moving the pointer over any option, confirm every answer option tile shows a visible border around its edges; hovering or selecting an option should still be visually distinguishable from the resting state.

**Acceptance Scenarios**:

1. **Given** a task screen with multiple answer options and no pointer interaction, **When** the participant views the screen, **Then** every option tile shows a visible border around its full edge.
2. **Given** an option is hovered, **When** the participant moves the pointer over it, **Then** the option's border remains visually distinct from its resting-state border (e.g., stronger emphasis), confirming hover state is still perceivable.
3. **Given** an option is selected, **When** the participant views the selected option next to unselected ones, **Then** the selected option remains clearly distinguishable from the other, still-bordered, unselected options.

---

### User Story 3 - Read end-of-survey explanations in the survey's language (Priority: P1)

At the end of the survey, a participant who completed a Dutch-language survey reaches the debrief/explanation screen that reviews their answers. The explanation text for each item is currently always shown in English, even though every other part of the survey was presented in Dutch. This breaks the participant's experience and makes the final, most reflective part of the survey incomprehensible or jarring for non-English speakers.

**Why this priority**: This is a correctness defect that produces the wrong output (wrong language) for every participant in a non-English-configured survey, undermining trust in the study and data quality for feedback collected on this screen; it is as critical as the term-scanning issue.

**Independent Test**: Complete a survey session configured for Dutch through to the debrief/explanation screen and confirm every per-item explanation is displayed in Dutch, matching the language used throughout the rest of the survey. Repeat for an English-configured survey to confirm explanations remain in English.

**Acceptance Scenarios**:

1. **Given** a survey deployment configured for the Dutch language, **When** a participant reaches the end-of-survey explanation screen, **Then** every per-item explanation is displayed in Dutch.
2. **Given** a survey deployment configured for the English language, **When** a participant reaches the end-of-survey explanation screen, **Then** every per-item explanation is displayed in English (no regression).
3. **Given** a participant is viewing the explanation screen, **When** they compare the explanation text to the rest of the survey's language, **Then** the language is consistent throughout — no mixed-language content on the same screen.

---

### Edge Cases

- What happens when a cluster has only one representative term? It should still render as a properly formatted single-item list, not fall back to plain text.
- What happens when a term is unusually long (e.g., a long phrase)? The list row should wrap gracefully without breaking the list layout or overlapping adjacent rows.
- What happens when a cluster has many terms (a long list)? The option tile should grow to accommodate the list without clipping content or breaking alignment with neighboring option tiles.
- How does the always-visible border render for both the selected and unselected states at the same time on screen, and does it remain readable in both light and dark presentation contexts already supported by the app?
- What happens on the debrief screen if the survey language is neither of the two currently supported languages, or is unset? The system should fall back to the same default language behavior already used elsewhere in the survey for that case.
- Do word intrusion task explanations (not just cluster ones) on the debrief screen also need to honor the survey language? Yes — both word and cluster per-item explanations on the debrief screen are in scope.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display each cluster candidate's representative terms as a vertical list of individual items (one term per row), rather than as a single comma-separated line of text.
- **FR-002**: System MUST preserve multi-word terms intact as a single list item — a term consisting of more than one word MUST NOT be split across multiple rows or treated as multiple terms.
- **FR-003**: The list-style presentation of cluster terms MUST apply consistently everywhere cluster options are shown to a participant, including the live cluster intrusion task, the practice cluster task, and the post-task debrief review.
- **FR-004**: System MUST display a visible border around every selectable answer option tile (word intrusion and cluster intrusion, live and practice) at all times, regardless of pointer hover state.
- **FR-005**: The always-visible resting-state border MUST remain visually distinguishable from the option's hover-state and selected-state appearance, so participants can still perceive hover and selection feedback.
- **FR-006**: System MUST display per-item explanations on the end-of-survey debrief/explanation screen in the survey's configured language.
- **FR-007**: The debrief/explanation screen's language behavior MUST match the language used for the rest of the survey content for that session, for both currently supported survey languages, with no mixed-language content on the same screen.
- **FR-008**: FR-006 and FR-007 apply to both word-intrusion and cluster-intrusion item explanations shown on the debrief screen.

### Key Entities

- **Cluster Candidate / Option**: An answer choice in the intrusion task, represented by a set of representative terms (single words or short phrases); the display of its terms is the subject of User Story 1.
- **Answer Option Tile**: The selectable visual container for a word or cluster candidate in an intrusion task, whose border visibility is the subject of User Story 2.
- **Debrief Explanation**: Per-item explanatory text shown to a participant on the end-of-survey review screen, generated in the survey's configured language; the subject of User Story 3.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of cluster options across the live task, practice task, and debrief review display their terms as a row-per-term list rather than comma-separated text.
- **SC-002**: Participants can correctly count the number of distinct terms in a cluster option without hovering or clicking, verified in a static (no-interaction) view of the screen.
- **SC-003**: 100% of answer option tiles show a visible border in a static screenshot taken with no pointer interaction on the page.
- **SC-004**: 100% of per-item explanations shown on the debrief screen of a Dutch-configured survey are in Dutch, with zero instances of English text appearing on that screen.
- **SC-005**: English-configured surveys show no change in explanation language behavior (100% remain in English, no regression).

## Assumptions

- "Configured survey language" refers to the single language setting already used to localize the rest of the survey's built-in UI text for a given deployment; this feature makes the debrief explanations consistent with that same setting rather than introducing a new language configuration.
- Only the languages already supported by the existing survey UI are in scope; behavior for any additional future languages is out of scope.
- The list-style presentation for cluster terms should reuse the app's existing visual style conventions (spacing, typography) rather than introduce a new visual language, and applies only to cluster term display — the underlying data (which terms belong to a cluster, and their order) is unchanged.
- The always-visible border should reuse the app's existing color and contrast conventions, adjusted only so the resting (unselected, non-hovered) state is visible, without changing the meaning or number of interaction states (resting, hover, selected).
- Researcher-authored, single-language practice-phase explanatory text (shown immediately after a practice attempt, not on the final debrief screen) is a separate, intentionally non-localized piece of content and is out of scope for this feature.
