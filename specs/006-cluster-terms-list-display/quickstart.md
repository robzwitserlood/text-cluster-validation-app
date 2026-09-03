# Quickstart: Cluster Term List Display, Persistent Option Borders & Debrief Language Fix

This feature is three small, independent fixes over the existing 001–005 flow. There is no new
setup, config, route, or dependency. Existing quickstart setup (env, `study.json`,
`SURVEY_LANGUAGE`) still applies.

## What changed for a participant

1. **Cluster terms are listed, not comma-joined** (US1) — every cluster option (live task, practice
   task, debrief review) shows its representative terms as a vertical list, one term per row, with
   multi-word terms (e.g. "climate change") kept intact as one row.
2. **Answer option borders are always visible** (US2) — every selectable tile (word or cluster, live
   or practice) shows a visible resting-state border, not only on hover/selection; hover and
   selected states remain visually distinct from the resting border.
3. **Debrief explanations match the survey language** (US3) — on the end-of-survey explanation
   screen, per-item explanations for both word and cluster items are now in the deployment's
   `SURVEY_LANGUAGE` (previously always English regardless of configuration).

## Verifying locally

```bash
npm run typecheck            # strict TS across client/server/shared
npm run lint                 # eslint + prettier + appkit lint
npm run test                 # vitest unit tests (extend sessionService.test.ts for US3)
npm run test:e2e             # Playwright smoke/e2e (see memory note re: WSL2 chromium download)
```

Manual checks:

- **Cluster term list (US1 / SC-001/SC-002)**: Open the cluster intrusion task (live and practice)
  and the post-completion debrief walkthrough. For an option with terms
  `["climate change", "emissions", "renewable energy", "policy"]`, confirm each term renders on its
  own row and "climate change"/"renewable energy" each stay on a single row. Confirm a
  single-term cluster still renders as a one-item list, not bare text. Confirm a long term wraps
  without breaking the tile layout, and a cluster with many terms grows the tile without clipping.
- **Always-visible border (US2 / SC-003)**: Load a task screen and, without moving the pointer,
  take a screenshot — confirm every option tile has a visible border. Hover one option — confirm its
  border is visually stronger/distinct from the resting border. Select an option — confirm it stays
  distinguishable from the other, still-bordered, unselected options. Repeat in both light and dark
  presentation.
- **Debrief language (US3 / SC-004/SC-005)**: Run the app with `SURVEY_LANGUAGE=nl`, complete a
  session through to the debrief/explanation screen, and confirm every per-item explanation (word
  and cluster items) is in Dutch. Repeat with `SURVEY_LANGUAGE=en` (or unset) and confirm
  explanations remain in English — no regression.

## What this feature intentionally does not change

- The underlying data for cluster candidates (`representativeWords` array contents/order) — US1 is
  rendering-only.
- The number or meaning of interaction states (resting, hover, selected) — US2 only changes the
  resting-state border's color token.
- The `Messages` i18n catalog or explanation templates in `shared/i18n.ts` — both locale templates
  already existed and are already correct; US3 only fixes a missing parameter forward on the server
  (`server/src/routes/debrief.ts`).
- Any wire contract (`contracts/api.md`) — no new endpoints, headers, or payload fields; only the
  *content* of `clusterValidityExplanation` changes.
- Researcher-authored, single-language practice-phase explanatory text shown immediately after a
  practice attempt (out of scope per spec Assumptions).
