<!-- SPECKIT START -->

For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan at
`specs/007-plain-cluster-terms-list/plan.md` (and its research.md,
data-model.md, and quickstart.md). For the features it builds on, see
`specs/006-cluster-terms-list-display/plan.md`,
`specs/005-responsive-loading/plan.md`,
`specs/003-survey-copy-house-style/plan.md`,
`specs/002-home-welcome-document-formatting/plan.md`, and the foundational
flow in `specs/001-cluster-validation/plan.md`.

<!-- SPECKIT END -->

<!-- appkit-instructions-start -->

## Databricks AppKit

This project uses Databricks AppKit packages. For AI assistant guidance on using these packages, refer to:

- **@databricks/appkit** (Backend SDK): [./node_modules/@databricks/appkit/CLAUDE.md](./node_modules/@databricks/appkit/CLAUDE.md)
- **@databricks/appkit-ui** (UI Integration, Charts, Tables, SSE, and more.): [./node_modules/@databricks/appkit-ui/CLAUDE.md](./node_modules/@databricks/appkit-ui/CLAUDE.md)

### Databricks Skills

For enhanced AI assistance with Databricks CLI operations, authentication, data exploration, and app development, install the Databricks skills:

```bash
databricks experimental aitools install
```

<!-- appkit-instructions-end -->
