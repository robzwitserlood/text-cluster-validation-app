# Quickstart: Responsive Survey Loading & Submission

This feature changes loading-state UX and confirms (without rewriting) timing-sensitive server
logic in the existing 001–003 flow. There is no new setup, config, route, or dependency. Existing
quickstart setup (env, `study.json`, `SURVEY_LANGUAGE`) still applies.

## What changed for a participant

1. **No more blank screen on navigation** — opening the survey link, reloading mid-session, or
   moving between phases now always shows either content or a spinner (`LoadingMessage`), never an
   empty content area, even on a slow connection (FR-001/FR-002).
2. **Submission acknowledgment, retry, and next-item transitions are unchanged in behavior** — they
   were already correct (research.md R3–R6); this feature documents and locks in that behavior with
   test coverage rather than changing it.
3. **No participant-visible change** to copy, task mechanics, keyboard behavior, or recorded data.

## Verifying locally

```bash
npm run typecheck            # strict TS across client/server/shared
npm run lint                 # eslint + prettier + appkit lint
npm run test                 # vitest unit tests
npm run test:e2e             # Playwright smoke/e2e (see memory note re: WSL2 chromium download)
```

Manual checks (Chrome DevTools → Network → throttle to "Slow 3G" or add artificial latency to
`GET /api/session` in dev to make the gap observable):

- **Home page (US1 / SC-001)**: Open `/` on a throttled connection. Confirm a spinner appears
  immediately (no blank frame), then the greeting/description/Begin control appear together, with
  Begin usable without any flicker or partial state.
- **Resumed session (US1, edge case)**: With an in-progress participant id (localStorage), reload
  `/word/task` (or wherever they left off) on a throttled connection. Confirm the same
  spinner-then-content treatment — never blank — and that they land back on their actual phase, not
  the welcome page.
- **Submission acknowledgment (US2 / SC-002)**: On an item page, select a candidate and click
  Submit. Confirm the button disables and shows the submitting spinner/label immediately (well
  before the network call could complete) — this should be visually instantaneous even without
  throttling.
- **Double-submit guard (US2 / FR-004)**: Rapidly click Submit twice. Confirm only one response is
  recorded (check the participant's response directory in the configured Volume, or the returned
  `progress.answered` count) and no error is shown for the second click.
- **Submission failure/retry (US2 / FR-005)**: Simulate a network failure (DevTools → offline) during
  submit. Confirm a clear error message appears, the selection is preserved, and clicking Submit
  again (once back online) succeeds.
- **Next-item transition (US3 / SC-003/SC-006)**: Submit several items in a row. Confirm no loading
  indicator appears between items (per the clarified requirement) and that the visible delay does
  not grow as more items are completed in the session.
- **Completion screen (US3, edge case)**: Submit the last assigned item. Confirm the
  completion/debrief screen appears with the same responsive treatment as a mid-session item.

## What this feature intentionally does not change

- `server/src/services/sessionService.ts`'s `ensureAssignment`/`pickLeastUtilizedSession` (commit
  `ecb9362`) — preserved as-is (research.md R7).
- Any wire contract (`contracts/api.md`) — no new endpoints, headers, or payload fields.
- Any recorded data, task mechanics, or copy.
