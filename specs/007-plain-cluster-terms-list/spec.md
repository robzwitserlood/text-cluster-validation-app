# Feature Specification: Plain Cluster Term List (No Bullets)

**Feature Branch**: `007-plain-cluster-terms-list`
**Created**: 2026-08-11
**Status**: Draft
**Input**: User description: "for cluster intrusion items, the terms of all the clusters are shown as a bullet list. It should be a list but without bullets or other line indicators"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Scan cluster terms without bullet clutter (Priority: P1)

A survey participant is doing the cluster intrusion task (live task, practice task, or the post-task debrief review) and is shown several candidate clusters, each represented by a handful of terms displayed one per row. Each row is currently preceded by a bullet character. The bullet adds visual noise without adding information — the participant only needs each term set apart on its own line, not marked with a symbol. The participant needs to scan and compare the terms within each option cleanly, with nothing but the term text itself on each row.

**Why this priority**: This is the only change requested and it affects every cluster option shown on every task item; it is the entire scope of this feature.

**Independent Test**: Open the cluster intrusion task (live task, practice task, or debrief review) and visually confirm each cluster's terms are still rendered one per row, but with no bullet, dash, number, or other marker character in front of any row.

**Acceptance Scenarios**:

1. **Given** a cluster option with terms `["climate change", "emissions", "renewable energy", "policy"]`, **When** the option is displayed in the cluster intrusion task, **Then** each term appears on its own row with no bullet, dash, number, or other marker preceding it.
2. **Given** a cluster option with a single representative term, **When** it is displayed, **Then** it appears as a one-row list with no marker, not as bare unformatted text and not as a bulleted single item.
3. **Given** the same cluster option is shown in the live task, the practice task, and the post-task debrief review, **When** the participant views any of these screens, **Then** the terms are presented as an unmarked, one-term-per-row list in the same way in all three places.

---

### Edge Cases

- What happens when a cluster has only one representative term? It still renders as a single-row list with no marker (not a bare text string).
- What happens when a term is unusually long (e.g., a long phrase)? The row should still wrap gracefully without a marker reappearing on the wrapped line and without breaking alignment with neighboring rows.
- What happens when a cluster has many terms (a long list)? All rows remain unmarked and evenly spaced, consistent with today's row spacing.
- Does removing the marker change the indentation or alignment of the term text? No — term text should align the same way it would with a marker removed, not shift to where the marker used to be plus its old text offset; rows should read as a clean, left-aligned block of text.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display each cluster candidate's representative terms as a vertical list of individual rows (one term per row), with no bullet, dash, number, or other marker glyph preceding any row.
- **FR-002**: The row-per-term layout (introduced previously) MUST be preserved — this feature only removes the marker glyph, it does not revert to comma-separated or run-together text.
- **FR-003**: The unmarked list presentation MUST apply consistently everywhere cluster options are shown to a participant: the live cluster intrusion task, the practice cluster task, and the post-task debrief review.
- **FR-004**: Multi-word terms MUST remain intact as a single row (unaffected by this change, carried over from the existing row-per-term behavior).

### Key Entities

- **Cluster Candidate / Option**: An answer choice in the intrusion task, represented by a set of representative terms (single words or short phrases); the display of its terms (specifically, removal of the bullet marker) is the subject of this feature.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of cluster options across the live task, practice task, and debrief review display their terms one per row with zero visible bullet, dash, number, or other marker characters.
- **SC-002**: Participants can still correctly count the number of distinct terms in a cluster option without hovering or clicking, verified in a static (no-interaction) view of the screen, matching the readability level already achieved by the row-per-term layout.

## Assumptions

- "Bullet list" in the user's request refers to the visual marker glyph shown at the start of each term row, not the underlying row-per-term structure; the row-per-term structure itself is a prior, already-delivered improvement (see the foundational flow in `specs/006-cluster-terms-list-display/plan.md`) and stays in place.
- No other visual property of the term rows (spacing, typography, indentation width, wrapping behavior) is expected to change beyond what naturally follows from removing the marker glyph.
- This feature is scoped strictly to cluster term display; it does not touch the option-tile borders or debrief-language behavior also covered by feature 006.
