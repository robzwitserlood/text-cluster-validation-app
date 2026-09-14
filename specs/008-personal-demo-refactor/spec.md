# Feature Specification: Personal Demo Refactor

**Feature Branch**: `008-personal-demo-refactor`  
**Created**: 2026-09-03  
**Status**: Draft  
**Input**: User description: "refactor the app so i can use it as a personal demo project. Get rid of Databricks so that can only be deployed locally. Make sure the study gets loaded and responses are written to/from a public bucket on my personal Scaleway account (which I still have to create). Replace the Dutch government / Planbureau layout with a neutral one. Make sure the functionality remains the same"

## Clarifications

### Session 2026-09-14

- Q: How should the Scaleway bucket be secured? → A: Fully public — no keys needed for reads or writes.
- Q: Should backend ML/computation (word embeddings, clustering) be preserved or pre-computed? → A: Pre-computed only — the study JSON already contains all cluster/word assignments and item data; no ML runs in the refactored app.
- Q: Where should startup errors be displayed? → A: Both terminal (server console) and browser (styled error page).
- Q: How should replacement UI components be built? → A: Use a React component library (e.g., MUI, Radix, shadcn/ui) for pre-built accessible components.
- Q: What should the startup command(s) be? → A: Two commands: `npm install` (once) then `npm run dev` to start (standard Node.js convention).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Run Locally Without Databricks (Priority: P1)

As a developer, I want to start the application locally with a simple command without any Databricks infrastructure, so that I can demonstrate the text cluster validation survey to others on my own machine.

**Why this priority**: This is the foundational change — without it, none of the other refactoring goals matter. The app must run as a standalone local process with no external Databricks services.

**Independent Test**: Can be fully tested by running the app's start command on a developer machine and verifying the welcome page loads in a browser, without any Databricks workspace, authentication, or API access.

**Acceptance Scenarios**:

1. **Given** a clean checkout of the project with Node.js installed, **When** the developer runs the start command, **Then** the application server starts and serves the survey on localhost without requiring Databricks credentials or workspace connectivity.
2. **Given** the server is running locally, **When** a browser navigates to the survey URL, **Then** the welcome page renders with the study content loaded from the configured object storage bucket.
3. **Given** the server is running locally, **When** the server starts and the object storage bucket is unreachable or the study file is missing, **Then** a clear error message is displayed in the server console and a styled error page is served in the browser indicating the connection or file issue.

---

### User Story 2 - Load Study and Store Responses via Scaleway Object Storage (Priority: P2)

As a developer, I want the application to load its study definition from a public Scaleway Object Storage bucket and write participant responses back to the same bucket, so that study data and responses are persisted outside the local machine and can be shared.

**Why this priority**: Data persistence is essential for the survey to function — the study must be loadable and responses must be saveable. This replaces the Databricks Volume storage with an equivalent S3-compatible mechanism.

**Independent Test**: Can be tested by configuring a Scaleway bucket, placing a valid study.json in it, running the app locally, completing a survey, and verifying response JSON files appear in the bucket.

**Acceptance Scenarios**:

1. **Given** a Scaleway Object Storage bucket contains a valid study JSON file at the expected path, **When** the application starts, **Then** the study is loaded and the survey content is available to participants.
2. **Given** a participant completes a word-intrusion item and submits their answer, **When** the server processes the response, **Then** a JSON file is written to the configured bucket under the responses path with the participant's selection and server-computed correctness.
3. **Given** a participant already has a response recorded for a specific item, **When** the participant resubmits the same item, **Then** the duplicate submission is idempotently ignored (no overwrite).
4. **Given** a new participant visits the survey, **When** the server assigns a session, **Then** a session assignment file is written to the bucket.
5. **Given** the bucket endpoint, region, or name is missing or invalid, **When** the application attempts to access the bucket, **Then** the server reports a clear startup error.

---

### User Story 3 - Neutral, Non-Government Theming (Priority: P3)

As a developer, I want the application to use a clean, neutral visual design without any Dutch government or Planbureau branding, so that the demo is appropriate for any audience and context.

**Why this priority**: The survey remains functional with government branding, but replacing it with a neutral theme is essential for presenting the project as a personal, non-governmental demo.

**Independent Test**: Can be tested by visually inspecting every page of the survey and confirming no PBL logos, Rijksoverheid ribbon, government color schemes, or PBL attribution text appear.

**Acceptance Scenarios**:

1. **Given** the application is loaded, **When** any page is rendered, **Then** no Rijksoverheid ribbon logo, PBL name, or government attribution text is visible in the header or footer areas.
2. **Given** the application is loaded, **When** any page is rendered, **Then** the color scheme uses neutral, non-government-associated colors and no PBL house-style tokens (Rijkshuisstijl blue, etc.).
3. **Given** the application uses a header or masthead area, **When** the page is rendered, **Then** it displays a generic title (e.g., the study title or application name) instead of a government publisher name.
4. **Given** the application is rendered, **When** viewing any page, **Then** all text content remains in the selected language (English or Dutch) with no government-specific references in UI chrome.

---

### User Story 4 - Preserved Survey Functionality (Priority: P1)

As a participant, I want the full survey experience to work exactly as before — word intrusion tasks, cluster intrusion tasks, practice exercises, progress tracking, debrief, and pause/resume — so that the demo demonstrates the complete functionality.

**Why this priority**: The refactoring must not regress any existing user-facing functionality. All survey features must continue to work identically.

**Independent Test**: Can be tested by running through the complete survey flow (welcome → word instructions → word practice → word task → cluster instructions → cluster practice → cluster task → completion/debrief) and verifying every step behaves identically to the pre-refactored version.

**Acceptance Scenarios**:

1. **Given** a participant starts the survey, **When** they complete the word-intrusion instructions and practice exercises, **Then** they proceed to the word-intrusion task and can submit answers as before.
2. **Given** a participant completes all word-intrusion items, **When** they navigate forward, **Then** the cluster-intrusion phase becomes available (gated behind word completion).
3. **Given** a participant completes all items, **When** they reach the completion page, **Then** the debrief walkthrough shows their selections and correct answers as before.
4. **Given** a participant closes the browser mid-survey, **When** they return with the same browser, **Then** their progress is restored and they continue from where they left off.
5. **Given** a participant navigates the survey, **When** they use only keyboard input, **Then** all interactions remain accessible (focus rings, radio-group semantics).
6. **Given** a survey route transition occurs, **When** data is loading, **Then** a loading indicator is shown (no blank screen).

---

### Edge Cases

- What happens when the Scaleway bucket is publicly accessible but the study JSON is malformed or fails validation? The server should report validation errors at startup and refuse to serve the survey.
- What happens when the Scaleway bucket is configured but the network connection to Scaleway is lost mid-session? The server should handle read/write failures gracefully, returning appropriate error responses without crashing.
- What happens when multiple participants submit responses simultaneously? Concurrent writes to different file paths in the bucket should not conflict; same-path writes should respect idempotency.
- What happens when the developer runs the app without configuring the bucket endpoint/region/name? The app should detect missing configuration at startup and provide actionable error guidance.
- How does the application behave when the study contains HTML-formatted documents? The server must continue to sanitize document HTML before serving it to the client, preserving the same allowlist of inert presentational tags.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The application MUST run as a standalone local process without requiring any Databricks workspace, service principal, or OAuth credentials.
- **FR-002**: The application MUST load its study definition (study.json) from a configured Scaleway Object Storage bucket at startup.
- **FR-003**: The application MUST support S3-compatible object storage operations (GET, PUT with overwrite=false, LIST) via the Scaleway Object Storage API.
- **FR-004**: The application MUST store all participant responses, practice responses, and session assignments as JSON files in the configured Scaleway bucket, preserving the same directory structure used previously (responses/{participantId}/, practice-responses/{participantId}/, session-assignments/).
- **FR-005**: The application MUST enforce idempotent writes — if a response file already exists at a given path, the upload must be rejected (no overwrite).
- **FR-006**: The application MUST accept Scaleway Object Storage configuration (endpoint, region, bucket name) via environment variables or a local configuration file. No access keys or authentication credentials are required — the bucket is fully public for both reads and writes.
- **FR-007**: The application MUST report clear, actionable error messages both in the server console (terminal) and as a styled browser error page if the Scaleway configuration is missing, invalid, or the bucket/study file is unreachable at startup.
- **FR-008**: The application MUST NOT import, reference, or depend on any `@databricks/*` packages.
- **FR-009**: The application MUST NOT contain any Databricks-specific configuration files (databricks.yml, app.yaml, appkit.plugins.json) or Databricks-specific deployment scripts.
- **FR-010**: The application MUST replace the existing Databricks AppKit server with an equivalent standalone HTTP server that serves the client bundle and API routes.
- **FR-011**: The application MUST replace Databricks AppKit UI components with functionally equivalent components built using a React component library (e.g., MUI, Radix, shadcn/ui) that does not depend on `@databricks/appkit-ui`.
- **FR-012**: The application MUST NOT display any PBL (Planbureau voor de Leefomgeving) branding, including the Rijksoverheid ribbon logo, PBL publisher name, and PBL footer attribution.
- **FR-013**: The application MUST NOT use the Rijkshuisstijl color scheme (link-blue #007bc7, etc.) or reference Rijksoverheid design tokens.
- **FR-014**: The application MUST replace the PBL-branded masthead and footer with a neutral header/footer or remove them entirely.
- **FR-015**: The application MUST replace PBL-specific fonts (RijksoverheidSans/Serif, Fira Sans) with a neutral, freely-available web font stack.
- **FR-016**: The application MUST preserve all existing survey functionality: word intrusion tasks, cluster intrusion tasks, practice exercises, progress tracking, debrief walkthrough, pause/resume, keyboard accessibility, and responsive loading states.
- **FR-017**: The application MUST continue to support bilingual content (English and Dutch) via the existing `SURVEY_LANGUAGE` mechanism, with all built-in UI strings localized appropriately.
- **FR-018**: The application MUST continue to sanitize HTML content in cluster-intrusion documents before serving to the client, using the same allowlist of inert presentational tags.
- **FR-019**: The application MUST continue to gate cluster-intrusion tasks behind completion of all word-intrusion items (phase locking).
- **FR-020**: The application MUST continue to generate anonymous participant IDs on the client side and store them in browser localStorage for pause/resume.
- **FR-021**: The application MUST NOT perform any server-side word embedding, clustering, or ML inference computation. All cluster assignments, word lists, embeddings (if any), and item data are expected to be pre-computed and embedded in the study JSON file.

### Key Entities

- **Study**: The complete survey definition (sessions, word items, cluster items, practice items, configuration, welcome content) loaded once at startup. Read-only, static per deployment.
- **Participant Response**: A recorded answer to a single survey item, stored as a JSON file in the bucket. Contains participant ID, item ID, selection, and server-computed correctness. Immutable after first write.
- **Practice Response**: A recorded answer to a practice exercise, stored separately from real responses. Contains participant ID, practice ID, and selection. Immutable after first write.
- **Session Assignment**: A mapping from participant ID to a pre-defined item subset (Session). Written once per participant on first visit. Immutable.
- **Scaleway Object Storage Bucket**: The S3-compatible storage location for all study data and responses. Configured via environment variables at startup.
- **Participant Identity**: A randomly-generated UUIDv4 string created client-side on first visit, stored in localStorage, used as the anonymous identifier in all server interactions.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: After a one-time `npm install`, a developer can run `npm run dev` and access the survey at localhost within 30 seconds of a clean checkout.
- **SC-002**: The application starts up successfully without any Databricks workspace, authentication token, or network access to Databricks infrastructure.
- **SC-003**: 100% of existing survey user flows (welcome, word intrusion instructions/practice/task, cluster intrusion instructions/practice/task, completion, debrief, pause/resume) function identically to the pre-refactored version.
- **SC-004**: No PBL branding elements (logos, colors, fonts, attribution text) remain visible in any page of the application.
- **SC-005**: Study data loads from the Scaleway bucket within 5 seconds of application startup.
- **SC-006**: Participant responses are written to the Scaleway bucket within 2 seconds of submission.
- **SC-007**: The application reports clear errors at startup when Scaleway configuration is missing or invalid, rather than crashing silently or with cryptic messages.

## Assumptions

- The developer has Node.js 22+ installed and has access to create and configure a Scaleway Object Storage bucket.
- The Scaleway Object Storage bucket will be configured for full public access (unauthenticated reads and writes), and the application will use unauthenticated S3-compatible API calls.
- The study JSON file structure and format remain unchanged from the existing application — only the storage mechanism changes from Unity Catalog Volume to S3-compatible object storage.
- The existing survey logic (phase machine, session assignment, correctness computation, idempotent writes) is sound and should be preserved as-is — refactoring focuses on the infrastructure and presentation layers, not the survey flow logic. Any original word-embedding, clustering, or ML computation code is explicitly excluded from preservation.
- The application does not need multi-user concurrency beyond what the existing file-based storage model already handles (distinct file paths per participant + item).
- The developer is comfortable configuring environment variables or a local config file for the bucket endpoint, region, and name.
- The application will use a lightweight HTTP framework (e.g., Express or equivalent) to replace the AppKit server, serving both the API routes and the built client static files.
- The neutral theme will use a clean, minimal design with a standard web-safe font stack (e.g., system-ui, sans-serif) and a simple color palette, without introducing a new branding identity.
