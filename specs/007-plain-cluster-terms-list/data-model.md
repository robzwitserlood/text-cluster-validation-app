# Phase 1 Data Model: Plain Cluster Term List (No Bullets)

No new or changed entities, fields, or persisted/wire shapes.

This feature is a CSS-class-only change to how an already-existing list of strings
(`ClusterCandidate.representativeWords: string[]`, defined in `shared/types.ts`) is styled in
`client/src/components/ClusterTermList.tsx`. The data flowing into the component — which terms
belong to a cluster, their order, and their text — is unchanged; only the marker glyph in front
of each rendered row is removed (see [research.md](./research.md) R1).
