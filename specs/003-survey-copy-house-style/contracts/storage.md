# Contract: Storage Deltas (FR-012)

Only the persisted cluster `Response` shape changes. No new files, paths, or stores. Path layout is
unchanged from 001/002: real responses at `responses/{participantId}/{itemId}.json`, practice at
`practice-responses/{participantId}/{practiceId}.json`, under
`text_cluster_validation/{STUDY_ID}/` in the UC Volume.

## Cluster `Response` — `selectedClusterWords` relocation

**Before (002):** top-level field.

```jsonc
{
  "studyId": "study-003",
  "participantId": "…",
  "itemId": "ci1",
  "taskType": "cluster",
  "clusterId": "c3",
  "selection": { "kind": "candidate", "value": "c3" },
  "selectedClusterWords": ["soil", "nitrogen"],   // ← top-level (removed)
  "correct": true,
  "submittedAt": "2026-07-13T…Z",
  "schemaVersion": 1
}
```

**After (003, FR-012):** nested under `selection`.

```jsonc
{
  "studyId": "study-003",
  "participantId": "…",
  "itemId": "ci1",
  "taskType": "cluster",
  "clusterId": "c3",
  "selection": {
    "kind": "candidate",
    "value": "c3",
    "selectedClusterWords": ["soil", "nitrogen"]   // ← nested (new home)
  },
  "correct": true,
  "submittedAt": "2026-07-13T…Z",
  "schemaVersion": 1
}
```

### Rules

- Greenfield: write ONLY the nested shape. Do NOT write a top-level `selectedClusterWords` and do
  NOT add a backward-read path or migration (clarification 2026-07-13). SC-009: 100% of recorded
  cluster responses carry the words under `selection.selectedClusterWords`, 0% top-level.
- Word responses keep the bare `selection` (`{ kind, value }`) with no `selectedClusterWords`.
- `selectedClusterWords` = representative words of the cluster named by `selection.value`, resolved
  server-side from `study.clusters` (unchanged from 002 FR-016). For a 5-n-gram(1,2) cluster these
  are five unigram/bigram terms (FR-014).
- `schemaVersion` remains `1` (no prior production records to distinguish).

## Study definition — no schema change

- Researcher `study.json` is unchanged. HTML target documents (FR-013) already use the 002
  `clusterItems[].targetText` raw-HTML field and the server-side sanitiser. A cluster with five
  n-gram(1,2) representative words (FR-014) uses the existing `clusters[].representativeWords`
  array — no new field.
