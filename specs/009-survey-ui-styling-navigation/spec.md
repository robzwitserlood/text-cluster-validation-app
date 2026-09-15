# Feature Specification: Survey UI Styling & Complete Flow Navigation

**Feature Branch**: `009-survey-ui-styling-navigation`  
**Created**: 2026-09-15  
**Status**: Draft  
**Input**: User description: "create visually appealing but neutral UI and make sure the user can complete the entire survey via the UI. Currently there is no styling at all which is not what i want. And I could only go from the home screen to the first practice question but couldnt go to the next one"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Complete Survey From Start to Finish (Priority: P1)

A participant opens the survey, sees a visually polished welcome page, reads the instructions, completes all practice exercises, answers all real questions for word and cluster tasks, and reaches the debrief/thank-you page — all without getting stuck or seeing broken UI.

**Why this priority**: The core purpose of the application is to let participants complete the full survey. If participants cannot advance past the first practice question, the survey is unusable.

**Independent Test**: Can be fully tested by running through the entire survey flow end-to-end (welcome → word instructions → word practice 1 → word practice 2 → word items → cluster instructions → cluster practice 1 → cluster practice 2 → cluster items → debrief → closing) and verifying every transition occurs correctly.

**Acceptance Scenarios**:

1. **Given** a first-time participant on the welcome page, **When** they click "Begin", **Then** they advance to the word instructions page.
2. **Given** a participant on word instructions, **When** they click "Begin", **Then** they advance to the first word practice exercise.
3. **Given** a participant on the first word practice exercise, **When** they select an answer and click "Check answer", **Then** the explanation is revealed and a "Continue" button appears, and clicking "Continue" advances to the second practice exercise.
4. **Given** a participant on the last word practice exercise, **When** they click "Continue", **Then** they advance to the first real word item.
5. **Given** a participant has completed all word items, **When** the last item is submitted, **Then** they automatically advance to the cluster instructions and can continue through the cluster task to completion.
6. **Given** a participant has completed all items, **When** they reach the debrief page, **Then** they can step through the thank-you, walkthrough, and closing screens.

---

### User Story 2 - Visually Polished and Consistent UI (Priority: P2)

Every screen in the survey (welcome, instructions, practice, task items, debrief) renders with proper typography, spacing, card styling, button styling, and color theming — presenting a professional, neutral appearance consistent with the shadcn/ui design system already configured in the project.

**Why this priority**: The survey must be presentable for research participants. Without working styling, the experience appears broken, reducing trust and potentially affecting the quality of responses.

**Independent Test**: Visually inspect every page in the survey flow and verify that all components (cards, buttons, radio groups, alerts, progress bar, badges, typography) render with proper styling from the shadcn/ui + Tailwind CSS system.

**Acceptance Scenarios**:

1. **Given** the application is loaded, **When** viewing any page, **Then** all components render with proper spacing, fonts, border radii, and color values from the CSS variable theme.
2. **Given** a participant is on a page with a selectable option (practice or task), **When** they hover over a candidate option tile, **Then** the tile shows a hover effect (border color shift and subtle background tint).
3. **Given** a participant selects a candidate, **When** the radio option is selected, **Then** the selected tile is visually distinct with a primary-colored border and background highlight.
4. **Given** any page, **When** buttons (Begin, Check answer, Continue, Submit, Next) are interacted with, **Then** they render with proper button styling including hover, focus, and disabled states.
5. **Given** the welcome page, **When** viewed, **Then** the Markdown content is rendered with proper prose typography styling (headings, lists, paragraphs).

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Tailwind CSS utility framework MUST be properly loaded and applied so all Tailwind utility classes in components produce their intended visual effects.
- **FR-002**: All shadcn/ui components (Card, Button, RadioGroup, Alert, Badge, Progress, Label) MUST render with their intended visual styling from the project's CSS variable theme.
- **FR-003**: The practice submit flow MUST correctly advance the participant from the first practice item to the second practice item when "Continue" is clicked.
- **FR-004**: The participant MUST be able to navigate through the entire survey flow from welcome through to the closing screen without encountering a dead end or unresponsive UI.
- **FR-005**: Every interactive control (buttons, radio options) MUST be reachable and operable by both mouse and keyboard.
- **FR-006**: The UI MUST present a neutral color palette (grayscale tones) without brand-specific colors, consistent with the already-configured shadcn/ui neutral theme.
- **FR-007**: All pages MUST render with appropriate layout constraints (max-width container, horizontal padding, vertical spacing between sections).
- **FR-008**: Error states (network failures, submission errors) MUST display user-visible feedback (inline error alerts) so the participant knows something went wrong.
- **FR-009**: The "Continue" button on practice items MUST only be clickable when the next session state is available and navigation is ready.

### Key Entities

- **Session State**: The server-driven phase machine that determines which screen to show. The client navigates by reading and advancing this state after each response submission.
- **Practice Item**: A teaching exercise with candidate options, a "Check answer" button, an explanation reveal, and a "Continue" button. The participant must complete exactly two practice items per task type before reaching real items.
- **Task Item**: A real survey question with candidate options and a "Submit" button. The participant navigates to the next item automatically upon successful submission.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A participant can complete the entire survey flow (welcome through closing) without technical intervention in a single session.
- **SC-002**: All 9 distinct page types in the survey flow (welcome, word/cluster instructions, word/cluster practice, word/cluster task, complete) render with visibly styled components — no unstyled/broken layouts.
- **SC-003**: The survey renders correctly on a standard desktop viewport (1280px+ wide) and remains readable on narrower screens down to 768px.
- **SC-004**: All interactive elements (buttons, radio options) respond visually on hover and focus within 100ms.
- **SC-005**: Navigation from one survey phase to the next completes within 500ms under normal network conditions.
- **SC-006**: 100% of error states (network failure, server error) display a visible error message to the user.

## Assumptions

- The shadcn/ui component library and Tailwind CSS v4 are already installed and configured in the project's dependencies (spec 008).
- The server-side session management and response recording logic is correct and functioning — navigation issues are client-side rendering or state management bugs.
- The survey content (study data, translations) is loaded and accessible from the configured storage backend.
- The deployment uses the Vite dev server or production build, which includes the `@tailwindcss/vite` plugin for CSS processing.
- Desktop browser usage is the primary target; mobile responsiveness is a secondary concern.