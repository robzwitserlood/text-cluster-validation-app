# Phase 0 Research: Deployment Configuration Cleanup

All unknowns below were resolved directly against the live Databricks CLI/bundle schema and
this repository's own state, in conversation with the user, before this document was written.
No unresolved `NEEDS CLARIFICATION` markers remain.

## 1. Does the Databricks Apps bundle resource support a separate "display name"?

- **Decision**: No. Only `resources.apps.<key>.name` (technical, URL-safe identifier) and
  `resources.apps.<key>.description` (free text) exist.
- **Rationale**: Confirmed via `databricks bundle schema`, inspecting
  `$defs.github.com.databricks.cli.bundle.config.resources.App`. Its full property list is
  `budget_policy_id`, `compute_size`, `description`, `lifecycle`, `name`, `permissions`,
  `resources`, `source_code_path`, `user_api_scopes` — no `display_name`. This was cross-checked
  against `databricks bundle summary -o json` output for the currently deployed app, which
  likewise has only `description`, `id`, `name`, `resources`, `source_code_path`,
  `user_api_scopes`.
- **Alternatives considered**: Encoding "Human validation text analysis" as a separate field —
  rejected, no such field exists on the platform. User decided (see spec Assumptions) to fold
  the human-readable label into the start of `description` instead.

## 2. Does `human-val-text-analysis` satisfy the Databricks Apps name constraint?

- **Decision**: Yes — 23 characters, lowercase letters and hyphens only.
- **Rationale**: The platform limit is ≤26 characters (documented in the `databricks-apps`
  skill's platform guide, consistent with the schema's
  `name` description: "must contain only lowercase alphanumeric characters and hyphens").
  The originally requested `human-validation-text-analysis` is 30 characters and would be
  rejected; the user chose the abbreviated `human-val-text-analysis` as the replacement.
- **Alternatives considered**: `human-validation-text` (21 chars, drops "analysis");
  `hva-text-analysis` (18 chars, acronym). User selected `human-val-text-analysis` as the best
  balance of readability and staying under the limit.

## 3. How to derive `files_path`/`files_id` from the active target name?

- **Decision**: Use the bundle's built-in `${bundle.target}` variable inside the target's
  `variables:` overrides: `files_path: /Volumes/${bundle.target}/raw/landing` and
  `files_id: ${bundle.target}.raw.landing`.
- **Rationale**: `${bundle.target}` is a documented built-in bundle variable that resolves to
  the active target's name at validate/deploy time. This repo's own `databricks-bundles` skill
  already documents the identical pattern for app naming
  (`name: my-app-${bundle.target}`), confirming it is a supported, idiomatic construct for
  Databricks Asset Bundles, not something bespoke to this change.
- **Alternatives considered**: A bundle-level `variables.target_name` fed by
  `${bundle.target}` and referenced everywhere — rejected as an unnecessary indirection
  (Simplicity principle); direct use of `${bundle.target}` inline is simpler and equally clear.

## 4. Is the `bundle: name: clustering-app` top-level field in scope?

- **Decision**: No. Out of scope.
- **Rationale**: The user's request said "resource name" and "display name," which map to
  `resources.apps.app.name`/`description` — the App *resource* — not the top-level
  `bundle.name` field, which is a separate concept controlling the bundle's own identity and
  workspace deployment path prefix (`.bundle/clustering-app/<target>/...`). Renaming it was not
  requested and is not required for any of the five requested changes; changing it would also
  move every future deployment's workspace path, which is an unrequested, unrelated side
  effect. Left unchanged.
- **Alternatives considered**: Renaming `bundle.name` to match, for full consistency —
  rejected as out of the requested scope and a larger, unrequested blast radius (moves the
  workspace deploy path for every target).

## 5. Does renaming the app resource orphan the previously deployed `clustering-app` app?

- **Decision**: Yes, and this is accepted as out of scope for this change (documented as an
  edge case and assumption in spec.md).
- **Rationale**: Databricks Apps bundle deploys are keyed by the app's `name`; changing `name`
  causes the next `databricks bundle deploy`/`bundle run` to create a **new** app
  (`human-val-text-analysis`) rather than rename the existing `clustering-app` app in place.
  Manually deleting the old app in the workspace, if desired, is a separate, one-off
  operational action the user can take after this change ships — not a config change.
- **Alternatives considered**: None — this is an inherent platform behavior, not a design
  choice.

## 6. Is a stale documentation reference affected by this change?

- **Decision**: Yes — `specs/001-cluster-validation/quickstart.md:131` contains
  `databricks bundle run clustering-app`, which is already using the app's display name
  instead of its bundle resource key (`app`), and will become doubly wrong once the app is
  renamed. Per the constitution's Documentation principle (quickstart must stay current), this
  reference is corrected to `databricks bundle run app` as part of this feature's Phase 1/2
  work, alongside adding this feature's own `quickstart.md`.
- **Rationale**: Directly discovered via repo-wide grep for `clustering-app` while validating
  the change's blast radius; leaving it would ship a config rename alongside a doc that
  demonstrates the pre-rename, already-incorrect command.
- **Alternatives considered**: Leave it and file a separate follow-up — rejected; the fix is a
  one-line doc edit with no design cost, so deferring it serves no purpose.
