# Feature Specification: Deployment Configuration Cleanup

**Feature Branch**: `004-deployment-config`
**Created**: 2026-07-20
**Status**: Draft
**Input**: User description: "Update the Databricks bundle deployment configuration in databricks.yml: rename the app resource to human-val-text-analysis, set a human-readable label in the description, replace the placeholder description with a more descriptive one, rename the default bundle target to dev, and parameterize files_path/files_id by target name instead of hardcoding them."

## User Scenarios & Testing _(mandatory)_

<!--
  The "user" of this feature is the person deploying and operating the app
  (the project maintainer), not an end participant of the validation survey.
-->

### User Story 1 - Environment-scoped storage paths (Priority: P1)

The maintainer deploys the bundle to a named environment (e.g. `dev`). The volume path and
Unity Catalog securable the app writes to are derived automatically from that environment's
name, instead of being hardcoded to `dev` inside a target nominally called `default`. When a
new environment target (e.g. `stage` or `production`) is added later, its storage location is
correct by construction — there is no separate value to remember to update.

**Why this priority**: This is the change with real operational risk today — the `default`
target's variables are hardcoded to `dev` values. Adding a second target without also
remembering to override both variables would silently point the new environment at the dev
volume. Removing that hazard is the most valuable and most urgent part of this feature.

**Independent Test**: Deploy the bundle to the `dev` target and confirm (via `databricks bundle
summary`) that `files_path` resolves to `/Volumes/dev/raw/landing` and `files_id` resolves to
`dev.raw.landing`, with neither value hardcoded outside the target's name.

**Acceptance Scenarios**:

1. **Given** the bundle's default target is named `dev`, **When** the bundle is validated or
   deployed with no target override, **Then** `files_path` resolves to `/Volumes/dev/raw/landing`
   and `files_id` resolves to `dev.raw.landing`.
2. **Given** a maintainer reads `databricks.yml`, **When** they look at the `dev` target's
   variable overrides, **Then** the values are expressed in terms of the target's own name
   rather than the literal string `dev` repeated by hand.

---

### User Story 2 - Recognizable app identity (Priority: P2)

The maintainer (or a colleague) browsing the Databricks Apps list in the workspace can tell at
a glance which app this is, because its technical name reads as `human-val-text-analysis`
rather than the generic, unrelated `clustering-app`.

**Why this priority**: Naming clarity matters for day-to-day operation (finding the app,
distinguishing it from others in a shared workspace) but carries no functional or data-safety
risk, so it ranks below the storage-path fix.

**Independent Test**: Run `databricks apps get human-val-text-analysis` (or view the workspace
Apps list) and confirm the app is listed under that name.

**Acceptance Scenarios**:

1. **Given** the bundle has been deployed, **When** the maintainer lists apps in the workspace,
   **Then** the app appears as `human-val-text-analysis`.

---

### User Story 3 - Descriptive app description (Priority: P3)

The maintainer, or anyone else with access to the workspace Apps list, can read the app's
description and understand what the app is for without opening the source code.

**Why this priority**: Improves discoverability/documentation only; no operational risk if
deferred.

**Independent Test**: Run `databricks apps get human-val-text-analysis` and confirm the
`description` field opens with the human-readable label "Human validation text analysis"
followed by a sentence explaining the app's purpose.

**Acceptance Scenarios**:

1. **Given** the bundle has been deployed, **When** the maintainer reads the app's description
   in the workspace, **Then** it opens with "Human validation text analysis" and explains that
   the app collects human validation (word- and cluster-intrusion judgments) of automatically
   generated text clusters, and stores submitted responses in Unity Catalog Volumes.

---

### Edge Cases

- What happens to an already-deployed app previously created under the name `clustering-app`
  when the bundle is redeployed with the new name `human-val-text-analysis`? Databricks Apps
  bundle deploys are keyed by name, so this produces a **new** app in the workspace; the old
  `clustering-app` app and its deployment history are not renamed or removed automatically and
  become orphaned unless separately deleted.
- What happens if a maintainer adds a new target (e.g. `stage`) whose name does not match an
  existing Unity Catalog catalog (e.g. no `stage` catalog/volume exists yet)? Deployment of
  that target's app succeeds, but the app fails at runtime when it cannot write to the
  nonexistent `/Volumes/stage/raw/landing` path — provisioning the matching catalog/schema/
  volume is a prerequisite, not something this configuration change can enforce.
- What happens to the `STAGE` and `PRODUCTION` CLI profiles already present in the maintainer's
  `databrickscfg` — do they need matching bundle targets? Not in scope for this change; only
  the existing single target is renamed and parameterized. Adding further targets is a future
  change.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The bundle's app resource MUST be named `human-val-text-analysis`.
- **FR-002**: The app's description MUST begin with the human-readable label "Human validation
  text analysis" followed by a sentence describing the app's purpose (collecting human
  validation of automatically generated text clusters via word- and cluster-intrusion tasks,
  and storing responses in Unity Catalog Volumes).
- **FR-003**: The bundle's sole deployment target MUST be renamed from `default` to `dev`,
  and MUST remain the bundle's default target (selected when no `-t` flag is given).
- **FR-004**: The `files_path` variable's value for the `dev` target MUST be derived from the
  target's own name (e.g. via `${bundle.target}`) rather than containing the literal string
  `dev` as a hardcoded value, while still resolving to `/Volumes/dev/raw/landing` for the `dev`
  target.
- **FR-005**: The `files_id` variable's value for the `dev` target MUST be derived from the
  target's own name in the same way, while still resolving to `dev.raw.landing` for the `dev`
  target.
- **FR-006**: Renaming the target and app resource MUST NOT change the app's functional
  behavior (permissions, resources, `source_code_path` resolution, or `user_api_scopes`).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A maintainer can identify the app by name in the workspace Apps list without
  consulting source code or documentation.
- **SC-002**: Adding a new deployment target that follows the same naming convention requires
  zero manual edits to `files_path` or `files_id` beyond specifying the target's own name and
  the corresponding catalog/volume existing in Unity Catalog.
- **SC-003**: `databricks bundle validate` and `databricks bundle deploy` succeed against the
  renamed `dev` target with no manual `-t` argument needed to reach the intended environment.

## Assumptions

- The Unity Catalog catalog name for each environment matches that environment's bundle target
  name (already true today: target `dev` ↔ catalog `dev`), so deriving `files_path`/`files_id`
  from the target name is a valid and forward-compatible substitution for the hardcoded values.
- Only the existing single environment is renamed in this change; no new `stage` or
  `production` targets are added, even though matching CLI profiles already exist.
- The previously deployed `clustering-app` app (if any) is left in place; cleaning it up from
  the workspace is a manual, out-of-band operation and not part of this change.
- `human-val-text-analysis` (23 characters) satisfies the Databricks Apps platform's app-name
  constraints (≤26 characters, lowercase letters/numbers/hyphens only).
