# Quickstart: Verify Plain Cluster Term List (No Bullets)

Manual verification steps against the spec's Success Criteria after implementing R1
([research.md](./research.md)).

## Prerequisites

- Dev server running (`npm run dev` per repo README) with a session that reaches the cluster
  intrusion task, a session mid-practice, and a completed session that reaches the debrief screen.

## Steps

1. **Live task (SC-001)**: Open the cluster intrusion task. For each cluster option with more
   than one term, confirm every term appears on its own row and no row has a bullet, dash,
   number, or other marker glyph in front of it.
2. **Single-term option (spec Edge Cases)**: Find or construct a cluster option with exactly one
   representative term; confirm it still renders as a one-row list with no marker (not bare text).
3. **Practice task (FR-003)**: Repeat step 1 on the practice cluster task screen; confirm the same
   unmarked, one-term-per-row rendering.
4. **Debrief review (FR-003)**: Complete a session and reach the debrief/explanation screen;
   confirm cluster term lists there are also unmarked and one-per-row, matching steps 1 and 3.
5. **Long term wrapping (spec Edge Cases)**: Find or construct a cluster option with an unusually
   long term (a long phrase); confirm the row wraps without a marker reappearing on the wrapped
   line and without breaking alignment with neighboring rows.
6. **Readability check (SC-002)**: Without hovering or clicking, count the terms in a
   multi-term cluster option by eye; confirm the count is unambiguous (rows remain clearly
   separated by spacing alone, without the marker previously aiding separation).

## Expected Result

All six checks pass with zero visible marker glyphs anywhere cluster terms are rendered, and the
row-per-term layout from feature 006 is otherwise unchanged (spacing, wrapping, alignment).
