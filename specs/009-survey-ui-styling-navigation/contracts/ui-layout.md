# UI Layout Contract

**Feature**: 009-survey-ui-styling-navigation
**Date**: 2026-09-15

## Container Layout

All survey pages share a consistent container layout applied via the `FlowRouteFrame` component:

```css
/* Applied to all survey pages */
.mx-auto          /* Centers content horizontally */
.max-w-screen-md  /* Max width 768px (reading-optimized) */
.px-4             /* Horizontal padding: 1rem (16px) minimum */
.py-6             /* Vertical padding: 1.5rem (24px) */
.space-y-6        /* Vertical spacing between children: 1.5rem (24px) */
```

**Exception**: Cluster task pages use `max-w-screen-lg` (1024px) to accommodate the horizontal split layout with `react-resizable-panels`.

## Page-Type Contracts

### 1. Welcome Page (`/`)

```
┌────────────────────────────────────────┐
│  mx-auto max-w-screen-md px-4 py-6    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Card                            │  │
│  │  ├─ CardHeader                   │  │
│  │  │   CardTitle (Study title)     │  │
│  │  │   CardDescription (optional)  │  │
│  │  ├─ CardContent                  │  │
│  │  │   <div class="prose survey-prose">│
│  │  │     {/* react-markdown */}    │  │
│  │  │   </div>                      │  │
│  │  └─ CardFooter                  │  │
│  │      Button "Begin" (default)    │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

### 2. Instructions Pages (`/word/instructions`, `/cluster/instructions`)

```
┌────────────────────────────────────────┐
│  mx-auto max-w-screen-md px-4 py-6    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Card                            │  │
│  │  ├─ CardHeader                   │  │
│  │  │   CardTitle (Instruction title)│  │
│  │  ├─ CardContent                  │  │
│  │  │   <div class="prose survey-prose">│
│  │  │     {/* Instruction text */}  │  │
│  │  │   </div>                      │  │
│  │  └─ CardFooter                  │  │
│  │      Button "Begin" (default)    │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

### 3. Practice Pages (`/word/practice`, `/cluster/practice`)

```
┌────────────────────────────────────────┐
│  mx-auto max-w-screen-md px-4 py-6    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Practice label: "Example X of 2" │  │
│  │       (X = index from session)   │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Task description (text)         │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌─ RadioGroup ────────────────────┐  │
│  │  ┌────────────────────────────┐  │  │
│  │  │  Option tile 1     [radio] │  │  │
│  │  └────────────────────────────┘  │  │
│  │  ┌────────────────────────────┐  │  │
│  │  │  Option tile 2     [radio] │  │  │
│  │  └────────────────────────────┘  │  │
│  │  ...                             │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Button "Check Answer" (default)│  │
│  └──────────────────────────────────┘  │
│                                        │
│  [After check, if revealed:]          │
│  ┌──────────────────────────────────┐  │
│  │  Alert (explanation text)        │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  Button "Continue" (default)     │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

### 4. Task Pages (`/word/task`, `/cluster/task`)

```
┌────────────────────────────────────────┐
│  mx-auto max-w-screen-lg px-4 py-6    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  ProgressBar (phase + counter)   │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Word task:                            │
│  ┌─ RadioGroup ────────────────────┐  │
│  │  ┌────────────────────────────┐  │  │
│  │  │  Word tile 1      [radio]  │  │  │
│  │  └────────────────────────────┘  │  │
│  │  ┌────────────────────────────┐  │  │
│  │  │  Word tile 2      [radio]  │  │  │
│  │  └────────────────────────────┘  │  │
│  │  ...                             │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Cluster task:                         │
│  ┌─ Resizable Panel Group ─────────┐  │
│  │  ┌──────────┐ ┌──────────────┐  │  │
│  │  │ Target   │ │ Candidate    │  │  │
│  │  │ Text     │ │ Clusters     │  │  │
│  │  │  (60%)   │ │  (40%)       │  │  │
│  │  └──────────┘ └──────────────┘  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Button "Submit" (default)       │  │
│  └──────────────────────────────────┘  │
│  [disabled until option selected]      │
│                                        │
└────────────────────────────────────────┘
```

### 5. Debrief / Complete Pages (`/complete`)

```
┌────────────────────────────────────────┐
│  mx-auto max-w-screen-md px-4 py-6    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Card (debrief example)          │  │
│  │  ├─ CardHeader                   │  │
│  │  │   CardTitle (item text)       │  │
│  │  ├─ CardContent                  │  │
│  │  │   Candidate list              │  │
│  │  │   Your answer: [Badge]        │  │
│  │  │   Correct answer: [Badge]    │  │
│  │  └─ CardFooter                  │  │
│  │      [if not last:]              │  │
│  │      Button "Next" (default)     │  │
│  │      [if last:]                  │  │
│  │      Button "Finish" (default)   │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [On last screen:]                    │
│  ┌──────────────────────────────────┐  │
│  │  Thank-you message (centered)    │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

### 6. Error States

```
┌────────────────────────────────────────┐
│  mx-auto max-w-screen-md px-4 py-6    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Alert variant="destructive"     │  │
│  │  ├─ AlertTitle (error heading)   │  │
│  │  └─ AlertDescription (message)   │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [If retryable — LoadError.tsx:]      │
│  ┌──────────────────────────────────┐  │
│  │  Button "Try Again" (outline)    │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

## Option Tile Contract

Each candidate option in both practice and task pages follows this structure:

```html
<div class="flex items-center space-x-3 border rounded-lg p-4
            cursor-pointer transition-colors duration-100
            border-border
            hover:border-primary/50 hover:bg-accent/50
            data-[state=checked]:border-primary data-[state=checked]:bg-accent
            focus-within:ring-2 focus-within:ring-ring">
  <RadioGroupItem value="..." id="..." />
  <Label htmlFor="..." class="flex-1 cursor-pointer">
    {candidate text}
  </Label>
</div>
```

**States**:
- **Default**: `border-border bg-transparent` — neutral appearance
- **Hover**: `border-primary/50 bg-accent/50` — subtle highlight (<100ms transition)
- **Focus**: `ring-2 ring-ring` — visible focus ring for keyboard users
- **Checked**: `border-primary bg-accent` — clear selection indicator

## Progress Bar Display Rules

| Phase | Show Bar? | Phase Label | Item Counter |
|-------|-----------|-------------|--------------|
| welcome | No | — | — |
| word-instructions | No | — | — |
| word-practice | No | — | — |
| word-items | Yes | "Step 4 of 9" | "Question {N} of {total}" |
| cluster-instructions | No | — | — |
| cluster-practice | No | — | — |
| cluster-items | Yes | "Step 7 of 9" | "Question {N} of {total}" |
| debrief | No | — | — |
| complete | No | — | — |

## Button Usage Contract

| Context | Button Text | Variant | Disabled Logic |
|---------|------------|---------|---------------|
| Welcome | "Begin" | default | — |
| Instructions | "Begin" | default | disabled during loading |
| Practice (before check) | "Check Answer" | default | disabled when no selection or submitting |
| Practice (after check) | "Continue" | default | disabled when pendingNext not ready |
| Task | "Submit" | default | disabled when no selection or submitting |
| Debrief | "Next" | default | — |
| Debrief (last) | "Finish" | default | — |
| Error retry | "Try Again" | outline | — |