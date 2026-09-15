<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 2.0.0
Rationale: MAJOR — removed all Databricks-specific platform references and replaced with
standalone-local equivalents. Platform constraint rewrite materially redefines the
governance boundary (Principle II) and the technology foundation the constitution
depends on.

Modified principles:
- Principle I (UX First): "shared @databricks/appkit-ui component set" → "shadcn/ui components"
- Principle II (PII Control): "Databricks governance boundary (Unity Catalog / Volumes)" → "S3-compatible public bucket (Scaleway)"
- Principle III (Simplicity): "AppKit built-in capabilities" → "Express + @aws-sdk/client-s3"
- Principle IV (Documentation): unchanged in spirit

Modified sections:
- Technology & Platform Constraints: complete rewrite for standalone local app
- Development Workflow & Quality Gates: removed AppKit lint reference

Templates requiring updates:
- ✅ .specify/templates/plan-template.md — Constitution Check gate updated with revised principle text
- ✅ .specify/templates/spec-template.md — reviewed; no Databricks references present
- ✅ .specify/templates/tasks-template.md — reviewed; no Databricks references present
- ✅ README.md — rewritten for standalone local app (no Databricks references)
- ✅ AGENTS.md — reviewed; Databricks skills remain as optional references only

Follow-up TODOs: none.
-->

# Human Validation for Text Analysis Constitution

## Core Principles

### I. User Experience First

The product exists to let a human validate machine text-analysis output, so the validator's
experience is the primary measure of quality.

- Every user-facing flow MUST be complete: explicit loading, empty, and error states — no
  dead ends and no silent failures.
- Interactive views MUST be usable by keyboard and meet accessible-contrast and
  focus-visibility expectations.
- UI MUST be built from shadcn/ui components and Tailwind conventions for visual and
  behavioral consistency; bespoke UI requires justification.
- A feature is not "done" until a validator can complete the intended journey without
  reading the source code.

**Rationale**: Validation throughput and accuracy depend entirely on how clearly the tool
presents data and choices; poor UX directly degrades the product's only output.

### II. Full Control Over PII

Text under validation may contain personal or sensitive data. The data owner MUST retain
full, provable control over it at all times.

- PII MUST stay inside the S3-compatible public bucket (Scaleway Object Storage). It MUST
  NOT be sent to third-party services or external models without explicit, documented owner
  consent.
- PII MUST NOT appear in logs, telemetry, error messages, analytics, or any client-side
  persistent storage (e.g. `localStorage`, caches that survive the session).
- Access MUST be enforced through bucket-level visibility controls and the principle of
  least privilege.
- Data minimization is required: load only the fields and rows a task needs; provide
  masking/redaction controls where sensitive fields are surfaced.
- Every data flow that touches potentially-personal text MUST be documented and auditable.

**Rationale**: Trust and regulatory compliance for sensitive text require that control be
demonstrable, not assumed; a leak through logs or an external call is irreversible.

### III. Simplicity (YAGNI)

Build the simplest thing that satisfies a real, present need.

- Complexity (new abstractions, layers, frameworks, dependencies) MUST be justified by a
  concrete current requirement; speculative or "we might need it" additions are rejected.
- Prefer built-in Express and `@aws-sdk/client-s3` capabilities over custom infrastructure.
- There SHOULD be one obvious way to perform a common task; avoid parallel mechanisms that
  do the same job.
- Any justified deviation MUST be recorded in the plan's Complexity Tracking section.

**Rationale**: Less code and fewer moving parts mean fewer defects, easier maintenance, and
a smaller surface area for PII to escape through.

### IV. Documentation as a Deliverable

Documentation ships with the feature, not after it.

- Every feature MUST include user-facing usage documentation and, where it touches data,
  notes describing the data flow and PII handling.
- README and quickstart MUST stay current: a new contributor MUST be able to set up and run
  the app from the docs alone.
- Non-obvious decisions and public module/function contracts MUST be documented with the
  "why", not only the "what".
- Spec Kit artifacts (spec, plan, tasks) are the source of truth and MUST be kept in sync
  with the shipped behavior.

**Rationale**: This tool is used by domain experts and maintained over time; undocumented
behavior silently undermines both the UX and PII-control guarantees above.

## Technology & Platform Constraints

- The application is a standalone local app with an Express server (`server/`) and a React
  SPA (`client/`); all code is TypeScript with strict type-checking (`npm run typecheck`
  MUST pass).
- Data access MUST go through `@aws-sdk/client-s3` to Scaleway Object Storage — the
  data boundary that Principle II depends on.
- The UI is React 19 with shadcn/ui components and Tailwind CSS.
- Linting and formatting (`eslint`, `prettier`) MUST pass before merge.
- Secrets and connection details MUST come from `.env` / environment variables and MUST
  NOT be committed to the repository.

## Development Workflow & Quality Gates

- Work follows Spec-Driven Development via Spec Kit: constitution → spec → plan → tasks →
  implement.
- Every plan MUST pass the Constitution Check gate (see `plan-template.md`) before research
  and again after design.
- Before merge, the following MUST be green: typecheck, lint, format, and the test suite
  (`vitest` plus the smoke/e2e checks).
- Any change that introduces or alters a data flow involving potentially-personal text MUST
  receive an explicit PII review against Principle II.
- Pull requests MUST be reviewed for compliance with these principles; violations block
  merge until justified or resolved.

## Governance

- This constitution supersedes other practices; where guidance conflicts, the constitution
  wins.
- Amendments MUST be documented, versioned, and propagated to dependent templates and
  guidance files in the same change.
- Versioning follows semantic versioning: MAJOR for backward-incompatible governance or
  principle removals/redefinitions, MINOR for a new principle or materially expanded section,
  PATCH for clarifications and non-semantic refinements.
- Compliance is verified at the Constitution Check gate of every plan; unavoidable complexity
  MUST be justified in the plan's Complexity Tracking section.
- Agent and contributor runtime guidance lives in `AGENTS.md` and `CLAUDE.md`; these MUST not
  contradict the constitution.

**Version**: 2.0.0 | **Ratified**: 2026-06-08 | **Last Amended**: 2026-09-14