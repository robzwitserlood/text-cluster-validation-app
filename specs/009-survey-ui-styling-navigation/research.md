# Research: Survey UI Styling & Complete Flow Navigation

**Feature**: 009-survey-ui-styling-navigation
**Date**: 2026-09-15

## 1. Practice Item Navigation Bug

### Decision: Fix same-route navigation by using `queryClient.invalidateQueries` + `ensureQueryData` before navigating

### Rationale

The investigation revealed that the practice item flow breaks when advancing from the first practice item to the second. Both items share phase `'word-practice'` (or `'cluster-practice'`), which maps to the same route (`/word/practice`).

The current code in `flow-route-state.ts`:

```typescript
const advanceToSession = async (next: SessionState) => {
  queryClient.setQueryData(sessionQueryKey, next);
  await navigate({ to: routeForPhase(next.phase), replace: true });
};
```

When navigating from practice-1 to practice-2, `routeForPhase('word-practice')` returns `/word/practice` — the same route the user is already on. Two problems occur:

1. **TanStack Router may treat same-route `navigate` as a no-op**, meaning no route transition event fires, no loader re-runs, and no component remounts. The entire transition depends on `queryClient.setQueryData` triggering a React Query observer notification. If this notification doesn't reliably cause a re-render, the UI stays on practice-1.

2. **Server-side storage consistency**: After `recordResponse` writes a practice response file to S3, `getSessionState` immediately lists practice responses via `listPracticeResponseIds`. If the S3-compatible backend has any propagation delay between `PutObject` and `ListObjectsV2`, `countAnsweredPractice` returns 0 and the server sends practice-1 again.

**Fix approach**:

For same-route transitions (practice items), replace `setQueryData` + `navigate` with:
1. `queryClient.invalidateQueries(['session'])` — forces React Query to discard cached data
2. `queryClient.fetchQuery(['session'], fetchSession)` — re-fetches fresh state from server
3. `queryClient.setQueryData(['session'], next)` — places the new state after verification

For cross-route transitions (practice → items, items → debrief), keep the existing pattern since it works correctly when the URL changes.

On the server side, ensure `recordResponse` returns the practice count directly (computed in-memory without relying on S3 listing), which avoids the storage consistency issue entirely.

### Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Per-slot routes (e.g., `/word/practice/1`, `/word/practice/2`) | Adds route complexity, conflicts with file-based routing, and the server doesn't distinguish slots — it's always the same `word-practice` phase |
| URL query parameter for practice index | TanStack Router doesn't naturally support per-phase query params; adds unnecessary URL state |
| Full re-mount via key change on parent | Fragile implementation detail; relies on React internals |
| Server-side retry with delay | Adds latency; the in-memory count approach is simpler and deterministic |

### Server-Side Fix Detail

In `responseService.ts::recordResponse`, after successfully writing a practice response, compute `practiceAnswered` by:
1. Listing existing practice responses for the participant (like current `listPracticeResponseIds`)
2. Adding the newly recorded `body.itemId` to the set
3. Returning `practiceAnswered` alongside `recorded`

Then in `sessionService.ts::getSessionState`, accept the pre-computed `practiceAnswered` count instead of re-listing, avoiding the S3 propagation race.

---

## 2. Tailwind CSS v4 Loading

### Decision: No changes needed — Tailwind CSS v4 is already correctly configured

### Rationale

Investigation confirmed:
- `client/vite.config.ts` registers `@tailwindcss/vite` plugin correctly
- `client/src/main.tsx` imports `./index.css` at the entry point
- `client/src/index.css` uses Tailwind v4 CSS-based config with `@plugin '@tailwindcss/typography'`, `@theme inline`, and `@layer base`
- `client/postcss.config.js` uses `@tailwindcss/postcss` for build-time processing
- `tailwind.config.ts` (v3 format) exists for IDE integration, not runtime

All Tailwind utility classes used in components (`space-y-4`, `flex`, `gap-2`, `text-sm`, `font-medium`, etc.) resolve correctly. The `@tailwindcss/typography` plugin is loaded via `@plugin` in `index.css` and works for the existing `.welcome-prose` class.

### What needs to happen

- Extend the prose styling beyond the `.welcome-prose` class to also cover the instructions page content
- Ensure `prose` class wraps all rendered Markdown HTML (Welcome page and instructions)
- The existing `.welcome-prose` class can serve as a reusable pattern — rename to a general `.survey-prose` class applied on both welcome and instructions

### Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Rewrite to use `@import "tailwindcss"` syntax | Current `@layer base` + `@theme inline` approach works; no benefit to rewriting |
| Add `tailwindcss/utilities` directives | Tailwind v4 auto-generates utilities from `@theme` — the v3-style directives are unnecessary |
| Use `@apply` in component CSS | Anti-pattern; use utility classes directly in JSX |

---

## 3. Container & Layout Contract

### Decision: `mx-auto max-w-screen-md px-4` on all survey pages, with `space-y-6` for vertical rhythm

### Rationale

The spec requires (FR-007):
- Centered container, max-width ~1024px
- Consistent horizontal padding (minimum 1rem/16px)
- Consistent vertical spacing (minimum 1.5rem/24px)

Implementation:
- `max-w-screen-md` = 768px in Tailwind v4 default config, which is a comfortable reading width. For wider content (cluster task with horizontal layout), use `max-w-screen-lg` = 1024px.
- `px-4` = 1rem (16px) horizontal padding — meets the minimum requirement
- `space-y-6` = 1.5rem (24px) vertical spacing between sibling elements — meets the minimum requirement
- Applied via `FlowRouteFrame` component (already wraps all route pages) so all pages get consistent layout

The pattern:
```tsx
// flow-pages.tsx — shared wrapper
<div className="mx-auto max-w-screen-md px-4 py-6 space-y-6">
  {children}
</div>
```

For the cluster task page (which uses horizontal split with `react-resizable-panels`), use `max-w-screen-lg` (1024px) to accommodate the side-by-side layout.

---

## 4. shadcn/ui Component Styling

### Decision: Use existing shadcn/ui components with consistent variant usage

### Rationale

shadcn/ui components are already installed and configured (spec 008). The following components need styling review:

| Component | Current State | Required Change |
|-----------|--------------|-----------------|
| `Button` | Has variants (default, destructive, outline, secondary, ghost, link) | Ensure consistent use: primary actions = `default`, secondary = `outline`, danger = `destructive` |
| `Card` | Has Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter | Apply to welcome, instructions, debrief pages. Not needed on item pages (items themselves are the content). |
| `RadioGroup` + `RadioGroupItem` | Basic rendering | Add candidate tile wrapper with hover/selected states (border tint, background highlight) per FR SC-002.3 |
| `Alert` + `AlertDescription` | Destructive variant for errors | Verified for InlineErrorAlert. No changes needed. |
| `Badge` | Outline variant | Used in ClusterTermList for candidate terms. Style with consistent spacing. |
| `Progress` | Basic bar | Enhance ProgressBar to show phase label + item counter per FR-010 |
| `Label` | Basic form label | No changes needed |

### Candidate Option Tile Hover/Selected States

The spec requires (SC-002.2, SC-002.3):
- Hover: border color shift + subtle background tint
- Selected: primary-colored border + background highlight

Implementation with Tailwind:
```css
/* Candidate option wrapper */
.option-tile {
  @apply border rounded-lg p-4 cursor-pointer transition-colors duration-100;
  @apply border-border hover:border-primary/50 hover:bg-accent/50;
}
/* Selected state — via RadioGroupItem's data-state */
[data-state="checked"] .option-tile {
  @apply border-primary bg-accent;
}
```

This mirrors the RadioGroup's `data-state` attribute for selected styling and uses Tailwind's `transition-colors duration-100` for the <100ms hover response.

---

## 5. Progress Bar Enhancement

### Decision: Show phase number + label and per-task item counter

### Rationale

Per FR-010: "The progress indicator MUST display both the overall phase progress (e.g., 'Phase 3 of 10') and the per-task item counter (e.g., 'Question 5 of 12')."

Current implementation (`ProgressBar.tsx`) only shows an `answered/total` message on item phases. Need to add:

1. **Phase mapping**: Define the survey phases as an ordered list with labels
2. **Current phase indicator**: e.g., "Step 3 of 3" for word items (out of word-instructions, word-practice, word-items)
3. **Item counter**: e.g., "Question 5 of 12" for the current item within the item phase

Implementation:
```tsx
// Phase labels from i18n
const PHASE_ORDER = ['welcome', 'word-instructions', 'word-practice', 'word-items',
                     'cluster-instructions', 'cluster-practice', 'cluster-items',
                     'debrief', 'complete'];
const phaseIndex = PHASE_ORDER.indexOf(phase);
// Show: "Phase {phaseIndex + 1} of {PHASE_ORDER.length}" (omit terminal phases)
// Show: "Question {answered + 1} of {total}" (only on item phases)
```

The visual layout: phase indicator above progress bar, item counter below, all centered in a single row or stacked pair.

### Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Stepper component with all 9 phases visible | Too much visual noise; the full phase list is overwhelming |
| Separate component for phase vs item progress | Unnecessary split; combining them in one component is simpler |
| Show phase progress as step dots | Adds a new component pattern for minimal benefit |

---

## 6. Markdown/Prose Styling

### Decision: Apply `prose` class via `@tailwindcss/typography` to all Markdown-rendered content

### Rationale

The spec (FR-002a) requires Markdown content styled with the `prose` class from `@tailwindcss/typography`. The plugin is already loaded in `index.css` and a custom `.welcome-prose` class exists that overrides typography CSS variables.

**Current usage**:
- `Welcome.tsx`: renders `welcome.content` (Markdown) via `react-markdown` with `SafeHtml` — uses `.welcome-prose` class
- `Instructions.tsx`: renders i18n instruction text (not Markdown, but plain text with HTML in some cases)

**Required changes**:
1. Rename `.welcome-prose` to `.survey-prose` in `index.css` (same overrides)
2. Apply `className="prose survey-prose"` to the Markdown container in `Welcome.tsx`
3. For `Instructions.tsx`, if content is Markdown, wrap in `prose survey-prose`. If plain text, standard Tailwind typography classes suffice.
4. Ensure the typography plugin's base `prose` class provides automatic styling for headings, lists, and paragraphs

The `@tailwindcss/typography` v0.5.20 works with Tailwind CSS v4 via the `@plugin '@tailwindcss/typography'` directive already in `index.css`.

### Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Manual typography classes (`text-2xl font-bold`, etc.) | Requires styling every heading, list, paragraph manually; `prose` handles this automatically |
| Custom `.prose` theme config in `tailwind.config.ts` | Config is v4 CSS-based; the `.survey-prose` CSS variable overrides in `index.css` is the v4-native approach |
| `remark` / `rehype` plugins for custom rendering | Over-engineering; `react-markdown` + `prose` handles the requirements |

---

## 7. Forward-Only Navigation Enforcement

### Decision: No changes needed — already enforced by server phase machine and router redirects

### Rationale

FR-012 requires forward-only navigation with no back button. The current architecture enforces this at three levels:

1. **Router loader** (`loadSessionForPhases`): If the session phase doesn't match the allowed phases for the current route, the loader redirects to the correct phase's route. This prevents direct URL navigation to completed phases.

2. **Server phase machine** (`resolveSessionState`): The server derives the current phase from recorded responses. A participant who has answered word-item-3 cannot get `word-items` with item-1 again.

3. **No back button in UI**: No navigation components render a back/previous button. The `__root.tsx` layout has no chrome/sidebar that could facilitate navigation.

4. **Browser back button**: While technically the browser back button can navigate to a previous URL, the route loader will detect the phase mismatch and redirect forward. This is the standard SPA behavior and sufficient for the research context.

No changes needed for this requirement.

---

## 8. Error State Visibility

### Decision: Verify and ensure `InlineErrorAlert` is used consistently across all pages

### Rationale

FR-008 requires user-visible feedback for error states. The existing `InlineErrorAlert` component (shadcn/ui `Alert` with `destructive` variant) already handles this.

Must verify that:
- Every route component that calls `useFlowSession()` renders `InlineErrorAlert` on error
- Every component that calls `useFlowResponseMutation()` renders `InlineErrorAlert` on mutation error
- `LoadError.tsx` (full-page error with retry) is used when the session query itself fails

The `FlowRouteFrame` wrapper already provides error display for session-level errors. Need to verify practice and task pages show mutation errors inline.

### Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Toast notifications for errors | Less visible than inline; `InlineErrorAlert` is already implemented |
| Global error boundary catch-all | Too generic; loses context about what failed |

---

## Summary of Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Fix practice navigation with `invalidateQueries` + `fetchQuery` for same-route transitions | Reliably triggers UI update; avoids S3 listing propagation race |
| 2 | Compute practice count in-memory on server side | Eliminates storage consistency dependency |
| 3 | Keep existing Tailwind v4 CSS configuration | Already correctly configured; no changes needed |
| 4 | Apply `max-w-screen-md px-4 py-6 space-y-6` via `FlowRouteFrame` | Meets FR-007 container/layout requirements |
| 5 | Add candidate option tile wrapper with hover/selected states | Meets SC-002 visual feedback requirements |
| 6 | Enhanced ProgressBar with phase label + item counter | Meets FR-010 dual-progress requirement |
| 7 | Apply `prose survey-prose` to all Markdown content | Meets FR-002a prose typography requirement |
| 8 | Forward-only navigation enforced by existing architecture | No changes needed per FR-012 |
| 9 | Verify `InlineErrorAlert` coverage across all pages | Meets FR-008 error feedback requirement |