# Phase 1 Data Model: Deployment Configuration Cleanup

This feature changes deployment configuration only — there is no application data model. The
"entities" below are the Databricks Asset Bundle configuration objects affected, included for
traceability against the functional requirements in [spec.md](spec.md).

## App Resource (`resources.apps.app` in `databricks.yml`)

| Field               | Before                          | After                                                                                  | Requirement |
| ------------------- | -------------------------------- | --------------------------------------------------------------------------------------- | ----------- |
| `name`              | `clustering-app`                 | `human-val-text-analysis`                                                               | FR-001      |
| `description`       | `A Databricks App powered by AppKit` | `Human validation text analysis. Collects human validation (word- and cluster-intrusion judgments) of automatically generated text clusters and stores submitted responses in Unity Catalog Volumes.` | FR-002 |
| `source_code_path`, `resources`, `user_api_scopes` | unchanged | unchanged | FR-006 |

Validation: `name` MUST be ≤26 characters, lowercase letters/numbers/hyphens only (platform
constraint). `human-val-text-analysis` = 23 characters — valid.

## Bundle Target (`targets` in `databricks.yml`)

| Field                | Before                            | After                              | Requirement |
| -------------------- | ---------------------------------- | ------------------------------------ | ----------- |
| Target key            | `default`                          | `dev`                                | FR-003      |
| `default: true`       | set on `default`                   | set on `dev` (unchanged behavior — still the implicit target) | FR-003 |
| `workspace.host`      | unchanged                          | unchanged                            | —           |

## Target Variables (`targets.dev.variables` in `databricks.yml`)

| Variable     | Before (hardcoded)         | After (target-derived)                     | Requirement |
| ------------ | --------------------------- | --------------------------------------------- | ----------- |
| `files_path` | `/Volumes/dev/raw/landing`  | `/Volumes/${bundle.target}/raw/landing`       | FR-004      |
| `files_id`   | `dev.raw.landing`           | `${bundle.target}.raw.landing`                | FR-005      |

Both resolve to their original literal values for the `dev` target (since the target is named
`dev`), so this is a representation change, not a behavior change — satisfying FR-006.

## Out of scope (explicitly not modified)

- `bundle.name` (top-level, currently `clustering-app`) — controls the bundle's own identity
  and workspace deployment path prefix; not requested, and changing it would move the
  deployment path for every target (see research.md §4).
- `package.json` `name` field and `README.md` top-level heading (both currently
  `clustering-app`) — unrelated to the Databricks App resource identity; not part of
  `databricks.yml` and not requested.
