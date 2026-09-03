# Feature Specification: Responsive Survey Loading & Submission

**Feature Branch**: `005-responsive-loading`
**Created**: 2026-07-27
**Status**: Draft
**Input**: User description: "more responsiveness when loading the home page, submitting answers and loading new questions"

## Clarifications

### Session 2026-07-28

- Q: For US3 (next question loading), should a loading indicator ever appear between items? → A: No — the next item must load with no perceptible wait, so a loading indicator is not required between questions.
- Q: Is FR-001 (visible loading indicator whenever content is being prepared) a hard requirement in all cases? → A: No — the priority is minimizing load time itself; a loading indicator is only shown when waiting is truly unavoidable, and showing it must never add to the wait time.
- Q: For FR-008 (home page reaching a fully interactive state as a single transition), can the begin control be non-interactive while the greeting/description are already visible? → A: Yes — the greeting and description may appear first while the begin control is still non-interactive (participants need time to read them anyway); a loading indicator may appear inside the begin control during this window, and the control becomes interactive once ready.
- Q: What is the target for SC-001 (home page becomes visible and interactive)? → A: Within 1 second (revised down from 2 seconds).
- Q: What is the target for SC-002 (visual acknowledgment of submission)? → A: Within 150 milliseconds (revised down from 200 milliseconds).
- Q: What is the target for SC-003 (next item or completion screen becomes visible)? → A: Within 1.0 seconds (revised down from 1.5 seconds).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Home page appears quickly (Priority: P1)

A participant opens the survey link. Today the welcome home page can take a
noticeable moment to appear, leaving the participant looking at a blank or
frozen screen. Instead, the participant should see meaningful content (a
loading indicator, then the welcome greeting and begin control) almost
immediately, so the survey feels responsive from the first moment.

**Why this priority**: The home page is the first thing every participant
sees. A slow or blank-feeling entry undermines trust in the survey and risks
participants abandoning before they even start.

**Independent Test**: Open the survey link on a typical connection and
confirm the participant sees either the welcome content or a visible loading
indicator within a short, consistent time — never a blank, unresponsive
screen.

**Acceptance Scenarios**:

1. **Given** a participant opens the survey link, **When** the app is
   fetching what it needs to render the home page, **Then** the participant
   sees a visible loading indicator rather than a blank page.
2. **Given** the home page content has loaded, **When** it is displayed,
   **Then** the greeting and description appear and are readable immediately;
   the begin control may be briefly non-interactive (optionally showing a
   loading indicator inside it) while the participant reads, and then becomes
   usable without any partially-rendered or flickering state.
3. **Given** a participant reopens the survey link after already starting a
   session, **When** the app determines where to resume, **Then** that
   determination happens with the same responsive loading treatment (no
   longer wait or blank screen than a first-time visit).

---

### User Story 2 - Submitting an answer feels immediate (Priority: P1)

A participant selects an answer to a word- or cluster-intrusion item and
submits it. Today there can be a lag between clicking submit and seeing any
acknowledgment, leaving the participant unsure whether their click registered
and tempted to click again. Instead, the participant should see immediate
acknowledgment that their submission was received, with the interaction
protected against accidental double submission.

**Why this priority**: Uncertainty about whether a submission registered is
the most disruptive moment in the task flow — it directly risks duplicate
submissions or participants giving up mid-task, harming data quality.

**Independent Test**: Submit an answer to a single item and confirm visible
acknowledgment (e.g., the submit control changing state) appears
near-instantly, well before the next item is ready, and that a second click
during this window has no additional effect.

**Acceptance Scenarios**:

1. **Given** a participant has selected an answer, **When** they activate
   submit, **Then** the interface immediately acknowledges the action (e.g.,
   the control becomes disabled/shows a submitted state) without waiting for
   the next item to be ready.
2. **Given** a submission is being acknowledged, **When** the participant
   clicks submit again or otherwise repeats the action, **Then** no duplicate
   response is recorded and no error is shown.
3. **Given** a submission fails to save (e.g., network problem), **When** the
   failure occurs, **Then** the participant is clearly informed and is able
   to retry, rather than being left in an ambiguous "acknowledged but nothing
   happens" state.

---

### User Story 3 - The next question loads without a noticeable gap (Priority: P2)

After a participant submits an answer, the next word- or cluster-intrusion
item (or the completion/debrief screen, if it was the last item) should
appear quickly, without a long pause or blank screen between items. There
must be no perceptible wait between items, so no loading indicator is
required for this transition.

**Why this priority**: Repeated short delays between items, multiplied across
many items in a session, is what participants experience as the survey
feeling "slow" overall — even if each individual delay is brief.

**Independent Test**: Submit several items in sequence and confirm each
subsequent item (or the completion state) appears with no perceptible wait,
consistently across the session.

**Acceptance Scenarios**:

1. **Given** a participant's answer has been acknowledged, **When** the
   system prepares the next item, **Then** the next item appears with
   minimal, consistent delay across the session (not progressively slower as
   more items are completed).
2. **Given** the next item is being prepared, **When** the transition occurs,
   **Then** there is no perceptible wait and therefore no loading indicator is
   required between items.
3. **Given** the participant just submitted the last assigned item, **When**
   the system determines there are no more items, **Then** the
   completion/debrief screen appears with the same responsive treatment as
   loading a new item.

---

### Edge Cases

- What happens when the participant's connection is slow or briefly drops
  mid-submission or mid-load? The participant must always see either content
  or a clear loading/retry state — never an indefinite blank screen with no
  feedback.
- What happens if the participant rapidly submits and navigates before a
  prior request has finished? Only one response per item may ever be
  recorded, and the interface must not present a stale or partially-loaded
  item as current.
- What happens on the very first item of a session (no prior item to
  transition from) versus a resumed session? Both must meet the same home
  page and item-load responsiveness expectations.
- What happens if loading takes longer than the visible loading indicator
  threshold (e.g., a slow backend response)? The participant must still see
  the loading indicator continuously (not disappear and leave a blank state)
  until content is ready or a retry option is shown.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST prioritize minimizing load time for the home
  page, a new item, and the completion/debrief screen over showing a loading
  indicator. A visible loading indicator is only required when waiting is
  genuinely unavoidable, and displaying it MUST NOT itself add to the wait
  time.
- **FR-002**: The system MUST NOT present a blank or unresponsive screen at
  any point during home page load, answer submission, or next-item load; the
  participant must always see either content or a loading indicator.
- **FR-003**: Upon the participant activating submit, the system MUST
  immediately acknowledge the action in the interface (independent of how
  long the underlying save takes to complete).
- **FR-004**: The system MUST prevent a second response from being recorded
  for the same item if the participant repeats the submit action while the
  first submission is still being acknowledged or processed.
- **FR-005**: The system MUST inform the participant clearly and MUST offer
  a way to retry if a submission or item load fails, rather than leaving the
  interface in an ambiguous state.
- **FR-006**: The responsiveness improvements MUST NOT change any existing
  survey behavior guaranteed elsewhere, including that answers are recorded
  exactly once, that the correct answer is never revealed before submission,
  and that participants resume at their next unanswered item.
- **FR-007**: The time between a participant submitting an item and the next
  item (or completion screen) becoming visible MUST remain consistent
  regardless of how many items the participant has already completed in the
  session.
- **FR-008**: The home page MUST show the greeting and description as soon as
  they are ready, even if the begin control is not yet interactive; the begin
  control MAY show a loading indicator while it becomes interactive, since
  participants need time to read the greeting and description regardless.
  Once the begin control becomes interactive, that transition MUST be
  immediate (not a partial or flickering state).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The home page becomes visible and interactive within 1 second
  of opening the survey link on a typical broadband connection, for at least
  95% of visits.
- **SC-002**: Visual acknowledgment of an answer submission appears within
  150 milliseconds of the participant's action, regardless of backend save
  time, for 100% of submissions.
- **SC-003**: The next item or completion screen becomes visible within 1.0
  seconds of a successful submission, for at least 95% of item transitions.
- **SC-004**: Zero increase in lost, duplicated, or incorrectly recorded
  responses is observed as a result of these responsiveness changes, compared
  to current behavior.
- **SC-005**: In usability review, participants report no instances of the
  survey appearing "frozen," blank, or unresponsive during home page load,
  submission, or item transitions.
- **SC-006**: Perceived wait time between items does not noticeably increase
  as the number of completed items in a session grows.

## Assumptions

- This feature improves the responsiveness of existing survey flows (home
  page, item submission, item loading) established by the cluster-validation
  and welcome-page features; it does not add new participant-facing
  functionality or change what data is collected.
- All existing correctness guarantees — exactly-once response recording, no
  early answer reveal, resumable sessions — continue to apply unchanged and
  take precedence over responsiveness if the two ever conflict.
- "Typical broadband connection" reflects standard web application
  expectations; participants on severely constrained or offline connections
  are out of scope for the specific numeric targets, though the no-blank-
  screen and clear-feedback requirements still apply.
- The definition of "immediate acknowledgment" for submissions is a purely
  client-side, in-interface response (e.g., button/state change) and does not
  require the underlying save to have completed.
