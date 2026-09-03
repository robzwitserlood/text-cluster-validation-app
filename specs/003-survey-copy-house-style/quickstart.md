# Quickstart: Survey Copy Refinements & PBL Branded Page Chrome

This feature refines copy, layout, and presentation of the existing flow (001/002) and relocates one
recorded field. There is no new setup, config, route, or dependency. Existing 001/002 quickstart
setup (env, study.json, `SURVEY_LANGUAGE`) still applies.

## What changed for a participant

1. **Welcome** — when the researcher supplies no `study.welcome`, the built-in default now walks
   through the survey's sections in order (welcome → word-intrusion [practice then real] →
   cluster-intrusion [practice then real] → completion → optional explanation). Researcher-supplied
   welcome is shown exactly as authored (unchanged).
2. **Per-task instructions** — one subtitle (carrying the former "how it works" text) and at most
   one box of reminders. No "progress saved to this browser" line; instead: recommended in one
   sitting, pausing and resuming is possible. A practice-first reminder is shown.
3. **Last practice item** — additionally tells you the real questions start on the next page (only
   the last practice, not earlier ones).
4. **No stop-survey button** — the control is removed everywhere.
5. **Completion** — clearly states the survey is complete and the tab may be closed; continuing to
   the explanation is optional via a clearly-labelled control.
6. **PBL branded page chrome** — every screen (welcome, instructions, task, completion, and the
   optional explanation walkthrough) is wrapped by a persistent top masthead carrying the PBL logo
   and a bottom PBL footer band. The chrome is branding-only: the masthead adds no task navigation
   and the footer has no clickable outbound links; both are in-flow (not fixed/sticky).
7. **PBL house style** — within that shell, colours, typography, and spacing follow the PBL reference
   tokens (`design-tokens.md`); behaviour, accessibility, and recorded data are unchanged.

## Verifying locally

```bash
npm run typecheck            # strict TS across client/server/shared
npm run lint                 # eslint + prettier + appkit lint
npm run test                 # vitest unit tests
npm run test:e2e             # Playwright smoke/e2e (see memory note re: WSL2 chromium download)
```

Manual checks (both `SURVEY_LANGUAGE=nl` and `=en`):

- Open `/` with **no** `study.welcome` → default welcome names all sections in order (FR-002/SC-005).
- Word and cluster instructions each show **one** subtitle + **at most one** box; no "saved to this
  browser" text; practice-first reminder present; **no** stop-survey control (FR-003/4/5/7).
- Walk to the **last** practice item → "real questions start on the next page" appears; earlier
  practice items do **not** show it (FR-006/SC-003).
- Finish a session → completion page states done + close-tab + optional explanation with a control
  (FR-008/FR-009/SC-006).
- **Branded chrome**: on welcome, instructions, task, completion, and the explanation walkthrough,
  confirm the same top masthead with the PBL logo and the same bottom PBL footer band wrap the
  content. The masthead logo is the bundled `/pbl-logo.svg` (not the external hotlink) and adds no
  task navigation; the footer is branding-only with **no** clickable outbound links; both are
  in-flow (not fixed/sticky) and do not obstruct interactive controls on a short viewport; keyboard
  focus order through the task controls is unchanged (FR-010/FR-010a/SC-007).
- Compare welcome/instructions/task/completion against <https://startanalyse.pbl.nl/> and
  `design-tokens.md`; verify contrast (`#242424` on `#fbfbfb`; white on `#007bc7`) and visible focus
  (FR-010/SC-007).

## Verifying the data shape (FR-012)

After answering a cluster item, the recorded response JSON (in the UC Volume under
`responses/{participantId}/{itemId}.json`) carries the representative words under
`selection.selectedClusterWords` and has **no** top-level `selectedClusterWords`:

```jsonc
"selection": { "kind": "candidate", "value": "c3", "selectedClusterWords": ["soil", "nitrogen"] }
```

Unit coverage: `tests/unit/responseService.test.ts` asserts the nested shape and includes an
HTML-formatted cluster target document (FR-013) and a cluster represented as five n-grams in range
(1,2) (FR-014).

## Font note (house style)

RO Sans / RO Serif are official Rijkshuisstijl fonts. **Do not commit the font binaries.** Either
load them from the PBL-hosted path the live site uses or rely on the `Verdana, sans-serif` / `serif`
fallback stack. See `design-tokens.md`.
