# Quickstart: Survey UI Styling & Complete Flow Navigation

**Feature**: 009-survey-ui-styling-navigation
**Date**: 2026-09-15

## Overview

This feature applies visual styling to all survey pages using Tailwind CSS v4 and shadcn/ui, and fixes the practice item navigation so participants can complete the full survey from welcome to completion without getting stuck.

No new dependencies, configuration changes, or environment variables are introduced.

## Prerequisites

Same as spec 008 — see `specs/008-personal-demo-refactor/quickstart.md` for setup instructions.

- Node.js 22+
- Scaleway Object Storage bucket (public)
- `.env` configured with `SCALEWAY_BUCKET`, `STUDY_ID`, `SURVEY_LANGUAGE`
- `study.json` uploaded to bucket

## Running with the New Changes

```bash
npm run dev
```

Open `http://localhost:5173` (Vite dev server with HMR).

## What Changed

### Navigation Fix
The main bug was that participants could not advance from the first practice question to the second. The fix ensures:
1. After submitting a practice answer, the server computes the practice count in-memory (no S3 listing delay)
2. On the client, `advanceToSession` for same-route transitions now uses `invalidateQueries` + `fetchQuery` to guarantee the UI updates with the new practice item

### Visual Styling
- **Welcome page**: Card wrapper with prose-typed Markdown content, styled "Begin" button
- **Instructions pages**: Card layout with prose-typed instruction text
- **Practice pages**: Candidate tiles with hover/selected visual states, explanation alert
- **Task pages**: Candidate tiles with hover/selected visual states, progress bar with phase + item counter
- **Debrief pages**: Card layout per example, styled "Next"/"Finish" buttons
- **Layout**: Centered container (max-w-screen-md), consistent padding and vertical spacing
- **Progress bar**: Now shows "Step X of 9 — Question Y of Z" with a visual bar

### No Changes To
- API endpoints
- Storage paths or schemas
- Session state structure
- Participant identity management
- Server phase machine logic (only response count plumbing)

## Verification

### Test the Full Survey Flow

1. Open `http://localhost:5173`
2. Click **Begin** on the welcome page
3. Read instructions, click **Begin**
4. Complete practice-1: select an answer, click **Check Answer**, review explanation, click **Continue**
5. Complete practice-2: same as above — click **Continue** should advance to real items
6. Answer all word items (click **Submit** for each)
7. Complete cluster instructions, practice-1, practice-2, items
8. View debrief results, click through to the thank-you screen

### Verify Styling

- All pages show card-based layout with proper typography
- Candidate option tiles respond to hover (border + background change within 100ms)
- Selected candidate tile has distinctive border + background
- Buttons show hover, focus, and disabled states
- Progress bar shows phase number and question counter
- Markdown content (welcome) renders with proper heading, list, and paragraph styling
- Error messages display in red destructive alerts

### Run Automated Tests

```bash
npm run typecheck    # TypeScript strict mode
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright e2e tests
```

## Key Files Changed

| File | Change |
|------|--------|
| `client/src/lib/flow-route-state.ts` | Fix same-route navigation for practice items |
| `client/src/components/ProgressBar.tsx` | Add phase label + item counter |
| `client/src/components/PracticeItem.tsx` | Option tile hover/selected states, card styling |
| `client/src/components/TaskItem.tsx` | Option tile hover/selected states |
| `client/src/components/Welcome.tsx` | Card layout, prose styling |
| `client/src/components/Instructions.tsx` | Card layout, prose styling |
| `client/src/components/Debrief.tsx` | Card layout |
| `client/src/components/ClusterTermList.tsx` | Badge/card styling |
| `client/src/lib/flow-pages.tsx` | Max-width container, phase labels |
| `client/src/index.css` | Rename `.welcome-prose` → `.survey-prose` |
| `server/src/services/responseService.ts` | Return practice counts |
| `server/src/routes/responses.ts` | Pass practice counts to session resolution |
| `server/src/services/sessionService.ts` | Accept pre-computed practice counts |
| `shared/i18n.ts` | Progress bar label strings |