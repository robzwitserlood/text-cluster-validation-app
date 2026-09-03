/**
 * A small, deterministic Study fixture for the Playwright smoke test (T045).
 *
 * It defines a SINGLE Session so every participant is assigned the same items regardless of arrival
 * order (the least-utilized assignment is then deterministic) — the resume/progress assertions
 * depend on a known item count. The flow is intentionally short: 2 word items + 1 cluster item, with
 * the 2 practice exercises per segment the study definition requires (FR-011).
 *
 * Shape = `Study` in data-model.md (the same envelope the real `studyLoader` validates). It carries
 * ground truth (`intruderWord`/`intruderClusterId`); the harness loads it through the real services,
 * so the smoke test exercises the genuine DTO-stripping path — the intruder must never reach the
 * browser before the debrief (R5/FR-021).
 */

export const E2E_STUDY_ID = 'study-e2e';

export const e2eStudyDoc: Record<string, unknown> = {
  studyId: E2E_STUDY_ID,
  config: {
    judgmentsPerCluster: 1,
    wordCandidatesPerItem: 4,
    clusterCandidatesPerItem: 3,
    debriefSampleSize: 3,
  },
  sessions: [{ sessionId: 's1', wordItemIds: ['w1', 'w2'], clusterItemIds: ['ci1'] }],
  clusters: [
    // c1 is represented as five n-grams in range (1,2) — unigram/bigram terms (FR-014), so smoke
    // exercises the multi-word cluster representation and its recording under selection.
    { clusterId: 'c1', representativeWords: ['soil', 'nitrogen deposition', 'crop', 'land use', 'surface runoff'] },
    { clusterId: 'c2', representativeWords: ['river', 'lake', 'stream'] },
    { clusterId: 'c3', representativeWords: ['code', 'byte', 'array'] },
  ],
  wordItems: [
    {
      itemId: 'w1',
      taskType: 'word',
      clusterId: 'c1',
      candidateWords: ['soil', 'nitrogen', 'crop', 'keyboard'],
      intruderWord: 'keyboard',
    },
    {
      itemId: 'w2',
      taskType: 'word',
      clusterId: 'c2',
      candidateWords: ['river', 'lake', 'stream', 'spreadsheet'],
      intruderWord: 'spreadsheet',
    },
  ],
  clusterItems: [
    {
      itemId: 'ci1',
      taskType: 'cluster',
      targetTextId: 't1',
      // Researcher-authored HTML (US2): formatting plus a script that MUST be stripped server-side.
      targetText:
        '<h3>Healthy crops</h3><p>Soil and <strong>nitrogen</strong> support healthy crops.</p><script>window.__xss = true;</script>',
      candidateClusterIds: ['c1', 'c2', 'c3'],
      intruderClusterId: 'c3',
    },
  ],
  practice: {
    word: [
      {
        practiceId: 'wp1',
        taskType: 'word',
        clusterId: 'c1',
        candidateWords: ['apple', 'pear', 'grape', 'wrench'],
        intruderWord: 'wrench',
        explanation: '“wrench” is a tool, not a fruit.',
      },
      {
        practiceId: 'wp2',
        taskType: 'word',
        clusterId: 'c2',
        candidateWords: ['red', 'blue', 'green', 'table'],
        intruderWord: 'table',
        explanation: '“table” is not a colour.',
      },
    ],
    cluster: [
      {
        practiceId: 'cp1',
        taskType: 'cluster',
        targetTextId: 'pt1',
        targetText: 'A short text about gardening.',
        candidateClusterIds: ['c1', 'c2', 'c3'],
        intruderClusterId: 'c3',
        explanation: 'The programming words do not belong with a gardening text.',
      },
      {
        practiceId: 'cp2',
        taskType: 'cluster',
        targetTextId: 'pt2',
        targetText: 'A short text about rivers.',
        candidateClusterIds: ['c1', 'c2', 'c3'],
        intruderClusterId: 'c1',
        explanation: 'The farming words do not belong with a text about rivers.',
      },
    ],
  },
};
