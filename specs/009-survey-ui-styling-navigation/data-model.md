# Data Model: Survey UI Styling & Complete Flow Navigation

**Feature**: 009-survey-ui-styling-navigation
**Date**: 2026-09-15

## Overview

This feature does **not** introduce new server-side entities, storage artifacts, or database schemas. All entities remain unchanged from spec 008. This document records the client-side state and UI model changes introduced by the navigation fix and progress bar enhancement.

---

## Client-Side State Changes

### 1. Query Client Cache Management

**Change**: The `advanceToSession` function in `flow-route-state.ts` is modified for same-route transitions (practice items within the same phase).

**Before**:
```typescript
const advanceToSession = async (next: SessionState) => {
  queryClient.setQueryData(['session'], next);
  await navigate({ to: routeForPhase(next.phase), replace: true });
};
```

**After** (for same-route transitions):
```typescript
const advancePracticeToSession = async (next: SessionState) => {
  queryClient.invalidateQueries({ queryKey: ['session'] });
  const fetched = await queryClient.fetchQuery({
    queryKey: ['session'],
    queryFn: fetchSessionState,
  });
  queryClient.setQueryData(['session'], fetched);
  // Navigate triggers the router to re-validate the loader, which uses the fresh cache
  await navigate({ to: routeForPhase(next.phase), replace: true });
};
```

**For cross-route transitions** (practice → items, items → next item, items → debrief), the existing pattern is retained since the URL change triggers a clean route transition.

**State transition flow**:

```
User clicks "Check Answer" on practice-1
  → POST /api/responses { itemId: 'wp1', ... }
  → Server writes practice response, computes practiceAnswered in-memory
  → Server returns { recorded: true, next: SessionState (practice-2) }
  → Client stores pendingNext = next
  → Client shows explanation + "Continue" button

User clicks "Continue"
  → Client calls advanceToSession(pendingNext)
  → queryClient.invalidateQueries(['session'])
  → queryClient.fetchQuery(['session']) → GET /api/session
  → Server resolves phase = 'word-practice' with practice.itemId = 'wp2'
  → queryClient.setQueryData(['session'], fetched)
  → navigate('/word/practice', { replace: true })
  → Route loader sees cached data (staleTime: Infinity)
  → WordPracticePage re-renders with new practice item
```

---

### 2. Progress Bar UI Model

**New state**: The `ProgressBar` component now receives additional context beyond `answered` and `total`.

**Before**:
```typescript
interface ProgressBarProps {
  answered: number;
  total: number;
}
```

**After**:
```typescript
interface ProgressBarProps {
  answered: number;
  total: number;
  phase: Phase;                 // Current phase for label lookup
  phaseLabels: Record<Phase, string>;  // From i18n
}
```

**Phase order** (for `"Step X of Y"` computation):
```
1. welcome
2. word-instructions
3. word-practice
4. word-items
5. cluster-instructions
6. cluster-practice
7. cluster-items
8. debrief
9. complete
```

Phases 8 and 9 (debrief, complete) do not show progress. The bar is only visible during `isItemPhase(phase)` (phases 4 and 7).

**Display format**:
```
╔═══════════════════════════════════════╗
║  Step 4 of 9                         ║  ← Phase label (always visible)
║  [████████████░░░░░░] 7 of 12        ║  ← Progress bar + item counter
║  Question 7 of 12                    ║  ← Item counter (redundant, for clarity)
╔═══════════════════════════════════════╝
```

**Simplified display**:
```
Step 4 of 9 — Question 7 of 12
[████████████░░░░░░]
```

---

### 3. Option Tile Selection Model

**New**: Candidate option tiles (within RadioGroup) track hover and selected state visually.

**States**:

| State | Class | Visual |
|-------|-------|--------|
| Default | `border-border bg-transparent` | Neutral border, transparent background |
| Hover | `hover:border-primary/50 hover:bg-accent/50` | Tinted border, subtle background |
| Focus | `focus-visible:ring-2 focus-visible:ring-ring` | Focus ring (keyboard accessibility) |
| Checked | `border-primary bg-accent data-[state=checked]:border-primary data-[state=checked]:bg-accent` | Primary border, tinted background |
| Disabled | `opacity-50 cursor-not-allowed` | Dimmed, no interaction |

Applied via a wrapper `<div>` around each `RadioGroupItem` + `<Label>` pair.

---

## Server-Side Changes

### 4. Response Service Return Type

**Change**: `recordResponse` returns practice count alongside the recorded status.

**Before**:
```typescript
interface RecordResult {
  recorded: boolean;
}

async function recordResponse(...): Promise<RecordResult>
```

**After**:
```typescript
interface RecordResult {
  recorded: boolean;
  practiceAnswered?: { word: number; cluster: number };
}

async function recordResponse(...): Promise<RecordResult>
```

The `practiceAnswered` field is populated only when the response targets a practice item. It contains the in-memory count of how many practice items within each segment have been answered (including the just-recorded response).

This avoids the S3 listing propagation race documented in research.md.

### 5. Session State Resolution

**Change**: `getSessionState` accepts pre-computed practice counts.

**Before**:
```typescript
async function getSessionState(
  ctx: SessionContext,
  participant: { participantId: string; acknowledgedInstructions: string[] },
  session: { assignment: SessionAssignment | null }
): Promise<SessionState>
```

**After**:
```typescript
async function getSessionState(
  ctx: SessionContext,
  participant: { participantId: string; acknowledgedInstructions: string[] },
  session: { assignment: SessionAssignment | null },
  practiceAnswered?: { word: number; cluster: number }
): Promise<SessionState>
```

When `practiceAnswered` is provided (from a `recordResponse` call), the function uses these counts directly instead of re-listing practice response files. When not provided (standalone `GET /api/session`), it falls back to the existing list-based counting.

---

## i18n String Additions

New translation keys added to `shared/i18n.ts`:

```typescript
// Progress bar labels
progress: {
  step: (current: number, total: number) => string;   // EN: "Step {current} of {total}"
  question: (current: number, total: number) => string; // EN: "Question {current} of {total}"
  phase: Record<Phase, string>;  // Phase display labels
}
```

Example values:
- EN: `{ step: (c, t) => `Step ${c} of ${t}`, question: (c, t) => `Question ${c} of ${t}`, phase: { welcome: 'Welcome', 'word-instructions': 'Word Instructions', ... } }`
- NL: `{ step: (c, t) => `Stap ${c} van ${t}`, question: (c, t) => `Vraag ${c} van ${t}`, phase: { welcome: 'Welkom', 'word-instructions': 'Woord Instructies', ... } }`

---

## Entity Relationships (unchanged)

```
Study (1) ───has many──→ Session (N)
Study (1) ───has many──→ Cluster (N)
Study (1) ───has many──→ WordIntrusionItem (N)
Study (1) ───has many──→ ClusterIntrusionItem (N)
Study (1) ───has many──→ PracticeWordItem (N)
Study (1) ───has many──→ PracticeClusterItem (N)

Participant (1) ───assigned to──→ Session (1)
Participant (1) ───has many──→ Response (N) [per real item]
Participant (1) ───has many──→ PracticeResponse (N) [per practice item]
```

No new entities, no schema changes, no storage path changes.

---

## Validation Rules (unchanged)

All existing validation rules from spec 008 data-model remain in effect:
- `writeOnce` idempotency for responses and assignments via `IfNoneMatch: *`
- Selection validation against displayed candidates
- `correct` computed server-side from ground truth
- Practice responses excluded from real-item progress counting