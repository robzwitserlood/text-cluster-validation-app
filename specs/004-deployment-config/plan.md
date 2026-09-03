# Implementation Plan: Deployment Configuration Cleanup

**Branch**: `004-deployment-config` | **Date**: 2026-07-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-deployment-config/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Rename the bundle's App resource (`resources.apps.app`) from `clustering-app` to
`human-val-text-analysis` with a descriptive `description`, rename the bundle's sole target
from `default` to `dev` (remaining the implicit default), and derive `files_path`/`files_id`
from the active target's name via the built-in `${bundle.target}` variable instead of
hardcoding `dev` in two places. This is a `databricks.yml`-only configuration change (plus one
stale documentation fix); no application code changes.

## Technical Context

**Language/Version**: N/A — declarative Databricks Asset Bundle YAML (`databricks.yml`), no
application code touched; Databricks CLI ≥ v0.292.0 (already installed, per prerequisites)  
**Primary Dependencies**: Databricks CLI bundle engine — `resources.App` schema,
`targets.<name>.variables`, built-in `${bundle.target}` variable  
**Storage**: Unity Catalog Volume, unchanged location `/Volumes/dev/raw/landing` /
securable `dev.raw.landing` — now expressed via `${bundle.target}` instead of a literal  
**Testing**: `databricks bundle validate` and `databricks bundle summary -o json` to assert
resolved resource/variable values (see [quickstart.md](quickstart.md)); no unit-test framework
applies to a config-only change  
**Target Platform**: Databricks workspace (Azure), `DEFAULT` CLI profile  
**Project Type**: single — config-only change, no frontend/backend split  
**Performance Goals**: N/A  
**Constraints**: App `name` MUST be ≤26 characters, lowercase/numbers/hyphens only
(`human-val-text-analysis` = 23, valid); rename MUST NOT alter `source_code_path` resolution,
`resources`, or `user_api_scopes`; `dev` MUST remain the bundle's default target  
**Scale/Scope**: One file (`databricks.yml`) plus one stale doc reference
(`specs/001-cluster-validation/quickstart.md:131`)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Confirm this plan upholds the project constitution (`.specify/memory/constitution.md`):

- [x] **UX First (I)**: N/A — no user-facing UI or flow is touched; this is a deployment
      config rename with no client/server code change.
- [x] **PII Control (II)**: Pass — the Unity Catalog Volume governance boundary and
      `WRITE_VOLUME` grant on `dev.raw.landing` are unchanged; only the _expression_ of the
      path/securable name changes (interpolated via `${bundle.target}` vs. a hardcoded
      literal), not where data lands or who can access it.
- [x] **Simplicity (III)**: Pass — removes duplicated hardcoded `dev` literals in favor of one
      source of truth (the target name); adds no new dependency, abstraction, or file.
- [x] **Documentation (IV)**: Action planned — correct the stale
      `databricks bundle run clustering-app` command in
      `specs/001-cluster-validation/quickstart.md` (already wrong today — see
      [research.md](research.md) §6) and ship this feature's own `quickstart.md` documenting
      the new deploy/verify commands.

No violations — Complexity Tracking is not needed for this plan.

## Project Structure

### Documentation (this feature)

```text
specs/004-deployment-config/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command) — config objects, not app data
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

`contracts/` is omitted: this feature exposes no API, CLI surface, or interface to other
systems — it only changes deployment configuration values, so there is no contract to document.

### Source Code (repository root)

```text
databricks.yml                              # Only file changed: app resource name/description,
                                              # target rename, variable parameterization

specs/001-cluster-validation/quickstart.md   # One stale command corrected (see research.md §6)
```

**Structure Decision**: No `src/`, `backend/`, or `frontend/` changes — this feature is scoped
entirely to the bundle's deployment configuration (`databricks.yml`) plus a documentation
correction. The existing single-project AppKit application structure (`client/`, `server/`,
`config/`) is untouched.

## Complexity Tracking

No Constitution Check violations — this section is not applicable.
