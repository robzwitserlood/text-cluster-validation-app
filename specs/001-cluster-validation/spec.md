# Feature Specification: Cluster Validation via Intrusion Tasks

**Feature Branch**: `001-cluster-validation`
**Created**: 2026-06-08
**Status**: Draft
**Input**: User description: "this app is a form for validation of automatically generated clusters of text. Validation is done by two tasks: word intrusion and cluster intrusion. Users are asked to complete these tasks by filling in the form. Their responses will be used to quantify the validity of the clusters"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Complete a word intrusion task (Priority: P1)

A participant is shown a set of N words representing a single automatically generated cluster,
with one "intruder" word deliberately mixed in from a different cluster. By default N is 6:
five representative words from the target cluster plus one intruder drawn from a different
cluster (following Chang et al.'s original word intrusion design). The participant reads the
words, selects the one that does not belong, and submits. Their answer is recorded for later
analysis. N is a configurable study parameter; individual items may define their own word
count, bounded by a minimum of 3.

**Why this priority**: Word intrusion is the simplest self-contained validation task and the
minimal viable slice of the product. On its own it produces data that quantifies cluster
coherence, so it can be shipped, demonstrated, and deliver value before any other task exists.

**Independent Test**: Load a single word intrusion item, select a word, submit, and confirm
the response (chosen word + item identifier + timestamp) is durably recorded and the
participant is shown the next item or a completion state.

**Acceptance Scenarios**:

1. **Given** a word intrusion item with several candidate words is displayed, **When** the
   participant selects one word and submits, **Then** the selection is recorded against that
   item and the participant advances to the next item.
2. **Given** a word intrusion item is displayed and no word is selected, **When** the
   participant attempts to submit, **Then** submission is prevented with a clear prompt and no
   response is recorded.
3. **Given** any word intrusion item, **When** it is presented, **Then** the position of the
   intruder among the candidate words is randomized so its placement does not reveal the
   answer.
4. **Given** the participant has not yet started word intrusion, **When** they begin the task,
   **Then** they are shown the task instructions and two practice exercises before the first
   real, recorded item.

---

### User Story 2 - Complete a cluster intrusion task (Priority: P2)

A participant completes the second validation task: cluster intrusion. They are shown one
target piece of text alongside several candidate clusters, each represented by its most
representative words. Most candidate clusters are genuinely associated with the text; exactly
one is an intruder that does not belong. The participant selects the intruding cluster and
submits. Cluster intrusion is only presented after the participant has finished all word
intrusion items, because the candidate clusters are shown by their representative words and
revealing them earlier would give away the answers to the word intrusion task.

**Why this priority**: Cluster intrusion is the second pillar of the validation methodology
and measures a different facet of validity (assignment quality) than word intrusion
(coherence). It is essential to the complete product but builds on the same submission and
recording foundation delivered in User Story 1.

**Independent Test**: Load a single cluster intrusion item, select the intruding cluster,
submit, and confirm the response is durably recorded with item identifier, selection,
correctness, and timestamp.

**Acceptance Scenarios**:

1. **Given** a cluster intrusion item showing one target text and several candidate clusters
   is displayed, **When** the participant selects one cluster and submits, **Then** the
   selection is recorded against that item and the participant advances.
2. **Given** a cluster intrusion item is displayed and no cluster is selected, **When** the
   participant attempts to submit, **Then** submission is prevented with a clear prompt.
3. **Given** any cluster intrusion item, **When** it is presented, **Then** the position of
   the intruder among the candidate clusters is randomized.
4. **Given** the participant has not yet finished all word intrusion items, **When** they are
   in the session, **Then** no cluster intrusion content (instructions, practice, or items) is
   shown.
5. **Given** the participant starts cluster intrusion, **When** they begin the task, **Then**
   they are shown the task instructions and two practice exercises before the first real,
   recorded item.

---

### User Story 3 - See feedback after completing the form (Priority: P2)

After a participant finishes all of their assigned items, they are shown a debrief so they are
not left wondering what happens to their responses. The debrief presents a few examples of the
items they just answered, what they selected, what the correct (intruder) answer was, and a
short plain-language explanation of what identifying the intruder tells us about that cluster's
validity. Correct answers are revealed only at this point — never while the participant is
still answering — so that earlier responses are not biased.

**Why this priority**: The study owner explicitly wants participants to leave understanding
how their input is used rather than wondering. Closing the loop builds trust and willingness to
participate, and it is a meaningful, independently demonstrable part of the experience. It
depends on completed responses, so it follows the two task stories.

**Independent Test**: Complete a short session, reach the completion state, and confirm the
debrief shows the participant's own selections, the correct answers for those example items,
and a plain-language explanation of what each result indicates about validity.

**Acceptance Scenarios**:

1. **Given** a participant has completed all assigned items, **When** they reach the completion
   state, **Then** they are shown a debrief containing example items with their own selection
   and the correct intruder for each.
2. **Given** the debrief is shown, **When** the participant reads an example, **Then** a
   plain-language explanation describes what correctly or incorrectly identifying the intruder
   indicates about that cluster's validity, framed around the cluster rather than judging the
   participant.
3. **Given** a participant is still answering items, **When** they view or submit an item,
   **Then** the correct answer is NOT revealed, preserving unbiased responses.

---

### User Story 4 - Work through and resume a participant run (Priority: P3)

A participant is assigned a sequence of items covering both task types, always ordered as all
word intrusion items first and then all cluster intrusion items, with each task preceded by its
instructions and two practice exercises. They can see how far along they are, pause at any
time, and later resume exactly where they left off without losing or repeating completed
responses. When all assigned items are done, they reach the completion state (and the debrief
in User Story 3).

**Why this priority**: Progress visibility and resumability raise completion rates and data
quality, but a usable single-item flow already exists in Stories 1 and 2, so this is an
enhancement rather than a prerequisite.

**Independent Test**: Start a multi-item session, complete some items, leave, return, and
confirm the session resumes at the first unanswered item with prior responses retained and a
correct progress indicator.

**Acceptance Scenarios**:

1. **Given** a session with multiple items, **When** the participant completes an item,
   **Then** a progress indicator updates to reflect items completed and remaining.
2. **Given** a partially completed session, **When** the participant leaves and returns,
   **Then** they resume at the next unanswered item with no completed item shown again.
3. **Given** all assigned items are answered, **When** the last item is submitted, **Then** the
   completion state is shown and no further items are presented.
4. **Given** a participant is about to start the session, **When** they see the opening
   instructions, **Then** they are explicitly informed that submitted answers are final and
   cannot be changed once given.

---

### User Story 5 - Retrieve responses to quantify validity (Priority: P3)

A study owner retrieves the full set of collected raw responses so cluster validity can be
quantified downstream (e.g., how reliably participants identify intruders per cluster). This
app collects and exposes the responses; it does not compute validity metrics itself.

**Why this priority**: The collected responses are the product's reason for existing, but
collection (Stories 1-4) must come first, and quantification is performed downstream.

**Independent Test**: After responses exist, retrieve the complete response set and confirm
every recorded response is present with enough detail (participant, item, cluster, selection,
correctness, timestamp) to compute a per-cluster validity measure downstream.

**Acceptance Scenarios**:

1. **Given** recorded responses exist, **When** the study owner retrieves them, **Then** the
   complete, unaltered set is available with all fields needed for analysis.
2. **Given** the study definition, **When** responses are retrieved, **Then** each cluster can
   be linked to the responses that judged it.

---

### User Story 6 - Trace validation results back to MLFlow experiments (Priority: P3)

A researcher has run several text clustering experiments, each tracked in MLFlow by experiment
and run ID. They construct a study definition in which each cluster references the MLFlow
experiment and run that produced it — one experiment produces one clustering. Because a study
is used to evaluate multiple experiments side by side, different clusters in the same study
may reference different MLFlow runs. After responses are collected, the researcher can group
human judgments by cluster and trace each result directly back to the originating experiment
run, enabling rigorous comparison of clustering approaches without manual cross-referencing.

**Why this priority**: Traceability closes the loop between the clustering pipeline and human
evaluation. Without it, a researcher cannot know which experiment configuration produced
better-validated clusters. It depends on response collection (Stories 1–5) being in place
first and adds no participant-facing changes.

**Independent Test**: Retrieve responses grouped by cluster; confirm each cluster record
carries its MLFlow experiment and run reference; confirm that two clusters in the same study
referencing different MLFlow runs are correctly distinguished in the retrieved data.

**Acceptance Scenarios**:

1. **Given** a study definition, **When** clusters are defined, **Then** each cluster carries
   a reference to the MLFlow experiment ID and run ID that produced it.
2. **Given** responses are retrieved, **When** a researcher groups them by cluster, **Then**
   each cluster's source MLFlow run is visible alongside the human judgments for that cluster.
3. **Given** a study contains clusters from more than one MLFlow experiment, **When** responses
   are retrieved, **Then** clusters from different runs are correctly distinguished, enabling
   cross-experiment comparison.

---

### Edge Cases

- An item has fewer candidate words/clusters than required, or is missing its intruder → the
  item is skipped or withheld with a clear notice rather than shown malformed.
- A participant double-clicks or resubmits the same item → only one response is recorded per
  participant per item.
- A participant abandons mid-item or mid-session → no partial/garbage response is stored;
  unanswered items remain available on resume (same browser only).
- A participant clears browser storage or switches device → they are treated as a new
  participant and assigned a new Session; prior responses under the old ID are not recoverable.
- A participant reopens a fully completed session → they see the completion state and debrief,
  not items again.
- The cluster text or candidate words happen to contain personal or sensitive information →
  the content stays within the governed data boundary and never leaks into logs, telemetry, or
  external services (see Constitution Principle II).
- A participant uses only a keyboard or assistive technology → the entire flow remains
  completable.
- The debrief must not be framed as a personal score or pass/fail; it explains cluster validity,
  not participant performance.
- A participant tries to reach cluster intrusion before finishing word intrusion → it is not
  possible; the word intrusion phase must be completed first.
- Practice exercises are recorded as distinct practice records (for downstream skill
  assessment) but are not stored as validity responses and do not count toward a cluster's
  required judgments.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST present word intrusion items, each showing a set of N candidate
  words: the representative words of one cluster plus exactly one intruder word from a
  different cluster. N defaults to 6 (five cluster words plus one intruder), following the
  original word intrusion design; the study owner may configure a different default, and
  individual items may define their own N, with a minimum of 3.
- **FR-002**: System MUST let the participant select exactly one candidate (word or cluster,
  per task) and submit it as their answer.
- **FR-003**: System MUST randomize the display position of the intruder so its placement does
  not reveal the answer.
- **FR-004**: System MUST present cluster intrusion items, each showing one target text and
  several candidate clusters (each represented by its top words) with exactly one intruder
  cluster, and let the participant select the cluster that does not belong to the text.
- **FR-005**: System MUST record each response with at least: item identifier, task type, the
  participant's selection, whether the intruder was correctly identified, and a timestamp.
- **FR-007**: System MUST present assigned items in a sequence and show the participant their
  progress (items completed and remaining).
- **FR-008**: System MUST let a participant pause and resume a session, preserving prior
  responses and resuming at the next unanswered item.
- **FR-009**: System MUST record at most one response per participant per item and ignore
  accidental duplicate or repeated submissions.
- **FR-010**: System MUST present a clear completion state once all assigned items are answered
  and stop presenting further items.
- **FR-011**: Before the participant answers the real items of a task type, the system MUST
  present that task's instructions followed by two practice exercises for that task type.
  The system MUST record each practice attempt as a distinct practice record — capturing the
  participant's selection, whether it was correct, the item identifier, the task type, and a
  timestamp — marked as practice. Practice records MUST NOT be treated as validity responses
  and MUST NOT be counted toward a cluster's required judgments, but they MUST be retained and
  made available to study owners so participant skill can be assessed downstream. The app does
  NOT compute a pass/fail result, apply a skill threshold, flag, or gate participants on
  practice performance; deciding whether to exclude an underperforming participant's data is a
  manual researcher decision made downstream. Participants are NOT informed that practice
  results are recorded or used for screening; instructions make no mention of it.
- **FR-012**: System MUST identify each participant using a randomly generated anonymous ID
  created on their first visit and persisted in their browser's local storage. No
  authentication is required to complete tasks. The participant ID MUST NOT be linked to any
  real-world identity; no login credentials, email address, or platform user ID are captured
  or stored. (Constitution Principle II) Resume is intentionally single-device and
  single-browser: participants who clear their browser storage or switch devices will be
  treated as a new participant. Session instructions MUST inform participants of this
  constraint.
- **FR-013**: Any participant who has access to the survey link MAY complete tasks without
  authentication. System MUST restrict retrieval of responses to authorized study owners
  through governed data access (Unity Catalog grants); participants have no access to response
  data. The primary delivery mechanism for study-owner retrieval is direct Unity Catalog Volume
  access via UC grants; an in-app export endpoint is an optional enhancement, not a required
  deliverable.
- **FR-014**: System MUST keep all cluster text, candidate words, participant responses, and
  the anonymous participant ID within the governed data boundary, and MUST NOT emit cluster
  text or participant ID into logs, telemetry, error messages, or any external service.
  (Constitution Principle II)
- **FR-015**: System MUST be fully completable using keyboard navigation alone and MUST meet
  accessible contrast and focus-visibility expectations. (Constitution Principle I)
- **FR-016**: System MUST handle items with missing or malformed data gracefully — skipping or
  withholding them with a clear notice rather than failing.
- **FR-017**: System MUST store responses durably so that the complete set can later be
  retrieved without loss. Responses MUST be persisted under the shared Volume root
  `/Volumes/dev/raw/landing/text_cluster_validation/`, within a per-Study subdirectory whose
  name uniquely maps to the Study, so that multiple studies (each its own deployment) coexist
  under one governed location without commingling their data.
- **FR-018**: System MUST make the complete set of raw responses available to study owners for
  downstream quantification of cluster validity; the app itself does NOT compute validity
  metrics. (Constitution Principle III) Availability is satisfied by durable storage in the UC
  Volume with appropriate UC grants; no dedicated in-app export API is required.
- **FR-019**: After a participant completes all assigned items, the system MUST present a
  debrief showing a random sample of up to `debriefSampleSize` answered items, the
  participant's own selection, and the correct intruder for each sampled item. If the
  participant answered fewer items than `debriefSampleSize`, all answered items are shown.
  The default `debriefSampleSize` is 3 when not configured by the study owner.
- **FR-020**: The debrief MUST include a plain-language explanation of what correctly or
  incorrectly identifying the intruder indicates about that cluster's validity, framed around
  the cluster rather than as a judgment of the participant.
- **FR-021**: System MUST NOT reveal the correct answer (the intruder) to a participant before
  they have completed all of their assigned items, to avoid biasing responses. (Practice
  exercises are exempt: they are training, and their teaching feedback may reveal the correct
  answer. Practice records are not validity responses.)
- **FR-022**: The system MUST present the entire word intrusion phase (instructions, practice
  exercises, and all real word intrusion items) before any cluster intrusion content
  (instructions, practice, or items) is shown, so that cluster representative words are never
  revealed while word intrusion items remain to be answered.
- **FR-023**: The study definition MUST allow a researcher to pre-define multiple named
  Sessions, each specifying a distinct subset of word intrusion and cluster intrusion items
  drawn from the Study. At the moment a participant begins, the server MUST select one
  pre-defined Session and assign it to that participant for the duration of their session.
  The selection strategy (e.g., least-utilized, round-robin) is an implementation choice aimed
  at achieving equal distribution of judgments across items. Once assigned, a participant's
  Session MUST NOT change.

### Key Entities _(include if feature involves data)_

> **Terminology note**: Capitalized **Session** always denotes the researcher-pre-defined
> item-subset entity (FR-023) that the server assigns to a participant. A participant's single
> working pass through the form is a **participant run**; its derived runtime view is the
> **Participant Session State** entity below. Where lowercase "session" appears in user stories
> or success criteria (e.g., "resume a session", "started sessions"), it refers to that
> participant run — not the Session entity.

- **Study**: The overall collection of clusters being validated — containing all clusters,
  word intrusion items, cluster intrusion items, practice content, pre-defined Sessions, and
  study-level configuration. Defined by the researcher in the study definition file. Each Study
  has a unique identifier that maps one-to-one to its storage subdirectory under the shared
  Volume root. One app deployment serves exactly one Study; running multiple concurrent studies
  means running multiple deployments, each with its own URL.
- **Session**: A researcher-pre-defined subset of items (word intrusion and cluster intrusion)
  drawn from the Study. Multiple Sessions are defined per Study, each specifying a distinct
  item subset. The researcher controls which items appear in each Session to achieve controlled
  distribution of judgments across clusters. At request time, the server selects one Session
  and assigns it to the arriving participant.
- **Cluster**: An automatically generated grouping of texts under validation; has an
  identifier, an optional human-readable label, a set of representative words, and member
  texts.
- **Word Intrusion Item**: A single word intrusion question — the representative words of one
  cluster, the inserted intruder word, and a record of which word is the true intruder.
- **Cluster Intrusion Item**: A single cluster intrusion question — a target text, the set of
  candidate clusters shown (each by its top words), and a record of which cluster is the true
  intruder.
- **Participant**: A human completing validation tasks; identified by a randomly generated
  anonymous ID created on first visit and stored in their browser. No real identity is
  captured, required, or stored at any point.
- **Response**: A participant's answer to one item — the selection made, whether it matched the
  true intruder, a timestamp, and (optionally) time taken.
- **Practice Response**: A participant's answer to one practice exercise — the selection made,
  whether it was correct, the practice item identifier, the task type, and a timestamp; marked
  as practice. It is NOT a validity response and is excluded from cluster judgments, but it is
  retained and made available to study owners for downstream assessment of participant skill.
- **Participant Session State**: The runtime view of a participant's assigned Session plus
  their progress and completion state — derived from the assigned Session and the participant's
  recorded responses; not stored independently.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A first-time participant can read the instructions and complete the two practice
  exercises for each task type without outside help (≥ 90% complete the practice exercises
  successfully).
- **SC-002**: A participant can complete a single intrusion item in under 30 seconds (median).
- **SC-003**: At least 95% of started participant runs are completed (low abandonment).
  A session is considered "started" when the participant submits their first real (non-practice)
  item response. This is derivable from the response files in the Volume without additional
  tracking.
- **SC-004**: 100% of submitted responses are durably recorded and retrievable with no data
  loss, and no item ever records more than one response per participant.
- **SC-005**: Every cluster in a study receives at least the target number of independent
  participant judgments (e.g., ≥ K responses) so a validity measure can be computed for it
  downstream. This is an outcome verified downstream from the response files; the app does
  not enforce or report K in-app.
- **SC-006**: The entire participant flow can be completed using only a keyboard.
- **SC-007**: No cluster text or participant-identifying information (including the anonymous
  participant ID) appears anywhere outside the governed data boundary (verifiable by
  inspecting logs, telemetry, and client storage).
- **SC-008**: 100% of participants who complete the form are shown the debrief (with their
  answers, the correct answers, and the validity explanation) before they leave, and correct
  answers are never shown earlier.

## Assumptions

- The automatically generated clusters, their representative words, member texts, and the
  pre-selected intruders are produced upstream and supplied to this app; the app presents them
  and collects judgments rather than generating clusters or choosing intruders itself.
- Each item has a known "true intruder" defined upstream, enabling per-response correctness to
  be recorded and shown in the debrief.
- Each task type begins with two practice exercises that are illustrative/training: they may
  show the correct answer as teaching feedback and may use demonstration content. They are not
  stored as validity responses, but each attempt is recorded as a distinct practice record
  (selection, correctness, item, task type, timestamp) so participant skill can be assessed
  downstream; exclusion of underperformers is a manual researcher decision, not enforced by
  the app.
- Task order is fixed — all word intrusion (instructions, practice, and real items) is completed
  before any cluster intrusion content — because cluster representations expose the very words
  that word intrusion asks participants to evaluate, so showing them earlier would leak answers.
- The cluster text and words may contain personal or sensitive information, so the strict PII
  handling in the project constitution applies to all displayed content and stored responses.
- Cluster intrusion task form (confirmed): one target text is shown with several candidate
  clusters represented by their top words; one is an intruder and the participant selects it.
- Participant model (confirmed): participants are anonymous — no login is required and no real
  identity is captured. Each participant is identified by a random ID generated on first visit
  and stored in their browser. Responses are stored under this random ID.
- Scope (confirmed): this app collects and exposes raw responses and provides a per-participant
  post-completion debrief; it does not compute validity metrics — statistical quantification of
  validity is performed downstream.
- The debrief is illustrative and educational (examples + explanation), not a score or a
  pass/fail result, and does not present aggregate statistics.
- Revealing ground-truth intruders in the post-completion debrief is acceptable because it
  occurs only after the participant has finished and submitted answers are final.
- The study definition contains multiple researcher-pre-defined Sessions, each specifying a
  distinct subset of items. The server assigns one Session to each arriving participant; the
  researcher controls distribution by designing which items appear in each Session. The
  number of items per Session, the number of judgments required per cluster (K), the default
  number of candidate words/clusters per item, and how many examples the debrief shows are
  configurable study parameters chosen by the study owner. Individual items may define
  their own candidate count, overriding the study-level default, so long as it meets the
  minimum of 3. K is target/informational metadata used downstream; the app does NOT
  enforce, monitor, gate, or otherwise consume per-cluster judgment counts — even
  distribution is pursued through the researcher's Session design plus the server's
  least-utilized Session assignment (Principle III).
- A study may contain clusters from more than one MLFlow experiment; each cluster references
  the specific MLFlow experiment and run ID that produced it. One experiment produces one
  clustering. The app stores this reference as part of the cluster definition but does not
  interact with MLFlow directly.

## Clarifications

### Session 2026-06-22

- Q: Is direct Unity Catalog Volume access (via UC grants) the primary delivery mechanism for FR-013/FR-018, making an in-app export endpoint optional rather than required? → A: Yes — direct UC Volume access is the primary path; an in-app export endpoint (admin.ts) is an optional enhancement.
- Q: How are items assigned to participants — does every participant see all study items, or is a subset assigned? → A: Researchers pre-define multiple Sessions in the study definition, each specifying a distinct item subset. The server selects one Session per arriving participant (e.g., least-utilized) to achieve equal distribution. Study and Session are separate entities; Session is the unit of participant assignment.
- Q: Is cross-device or cross-browser session resume in scope? → A: No — resume is intentionally single-device and single-browser. Participants who clear storage or switch devices start fresh as a new participant. Session instructions must warn participants of this.
- Q: How are debrief items selected and what is the default sample size? → A: Random sample up to `debriefSampleSize`; show all answered items if the pool is smaller than the configured size. Default `debriefSampleSize` is 3.
- Q: What event defines a session as "started" for SC-003 measurement? → A: First real (non-practice) item response submitted — derivable from existing response files in the Volume; no additional tracking needed.

### Session 2026-06-24

- Q: How should the system act on practice underperformance? → A: Record only, decide downstream — the app records and exposes practice results; whether to exclude an underperforming participant's data is a manual researcher decision made downstream. No in-app threshold, flagging, or gating.
- Q: What should be recorded for each practice attempt? → A: Full per-item record — selection, correctness, item identifier, task type, and timestamp (same shape as a real response), marked as practice and excluded from cluster judgments.
- Q: Should participants be told practice results are recorded for quality screening? → A: No disclosure — practice recording is silent; instructions say nothing about practice being used for screening.
- Q: With FR-006 removed, what happens when a participant cannot identify the intruder? → A: Forced choice — they must select one candidate to proceed; there is no opt-out. The stale "I can't tell" acceptance scenarios (former US1 #3 and US2 #3) were removed and remaining scenarios renumbered.
- Q: Can the app handle multiple concurrent studies, with each researcher sending their own URL pointing to their specific study and drawing from the same participant pool? → A: Single Study per deployment — one app instance serves exactly one Study, so each researcher runs their own deployment with its own URL; a "shared participant pool" is achieved by recruiting the same people, not shared records. However, all deployments persist responses under one shared UC Volume root, `/Volumes/dev/raw/landing/text_cluster_validation/`, with each Study writing to a distinct subdirectory whose name uniquely maps to that Study.
