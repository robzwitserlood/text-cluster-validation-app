/**
 * A valid Study fixture (data-model.md) used across the service tests. `makeStudyDoc()` returns a
 * plain object suitable for `JSON.stringify` into a `study.json`; `makeStudy()` returns the same
 * object typed as the server-only {@link Study} graph for the session/response services.
 */

import type { Study } from '../../../server/src/services/studyLoader';

export const STUDY_ID = 'study-001';

// --- FR-013 / FR-014 coverage fixtures (003) --------------------------------------------------
// Standalone fixtures for the HTML target-document and 5-n-gram(1,2) cluster cases. Kept separate
// from `makeStudyDoc()` so the canonical loaded lists (wordItems/clusterItems/clusters/sessions)
// stay unchanged for the loader/session tests; tests opt in by patching a `makeStudy()` copy.

/** A well-formed HTML cluster target document (FR-013): structural markup the sanitiser preserves. */
export const HTML_TARGET_WELLFORMED =
  '<h3>Healthy soil</h3><p>Nitrogen <strong>levels</strong> shape crop yield across the region.</p>';

/**
 * An unsafe HTML cluster target document (FR-013): exercises the 002 sanitiser's safe-handling path.
 * The `<script>`, `onerror`, and `javascript:` vectors MUST be stripped/neutralised on the DTO.
 */
export const HTML_TARGET_UNSAFE =
  '<p>Soil notes.<script>window.__xss = true</script>' +
  '<img src="x" onerror="window.__xss = true" />' +
  '<a href="javascript:alert(1)">more</a></p>';

/**
 * Five representative words as n-grams in range (1,2) — a mix of unigram and bigram terms (FR-014).
 * Used to assert both display and the recorded `selection.selectedClusterWords` shape.
 */
export const NGRAM_1_2_WORDS = ['soil', 'nitrogen deposition', 'crop', 'land use', 'surface runoff'];

function makeStudyFixture(): Study {
  return {
    studyId: STUDY_ID,
    config: {
      judgmentsPerCluster: 3,
      wordCandidatesPerItem: 4,
      clusterCandidatesPerItem: 3,
      debriefSampleSize: 3,
    },
    sessions: [
      { sessionId: 's-A', wordItemIds: ['w1', 'w2'], clusterItemIds: ['ci1'] },
      { sessionId: 's-B', wordItemIds: ['w3'], clusterItemIds: ['ci2'] },
    ],
    clusters: [
      { clusterId: 'c1', representativeWords: ['soil', 'nitrogen'] },
      { clusterId: 'c2', representativeWords: ['river', 'lake'] },
      { clusterId: 'c3', representativeWords: ['code', 'byte'] },
    ],
    wordItems: [
      {
        itemId: 'w1',
        taskType: 'word',
        clusterId: 'c1',
        candidateWords: ['soil', 'nitrogen', 'livestock', 'keyboard'],
        intruderWord: 'keyboard',
      },
      {
        itemId: 'w2',
        taskType: 'word',
        clusterId: 'c2',
        candidateWords: ['river', 'lake', 'ocean', 'spreadsheet'],
        intruderWord: 'spreadsheet',
      },
      {
        itemId: 'w3',
        taskType: 'word',
        clusterId: 'c3',
        candidateWords: ['code', 'byte', 'array', 'banana'],
        intruderWord: 'banana',
      },
    ],
    clusterItems: [
      {
        itemId: 'ci1',
        taskType: 'cluster',
        targetTextId: 't1',
        targetText: 'Soil and nitrogen deposition.',
        candidateClusterIds: ['c1', 'c2', 'c3'],
        intruderClusterId: 'c3',
      },
      {
        itemId: 'ci2',
        taskType: 'cluster',
        targetTextId: 't2',
        targetText: 'Rivers, lakes and streams.',
        candidateClusterIds: ['c1', 'c2', 'c3'],
        intruderClusterId: 'c1',
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
          explanation: "'wrench' is a tool, not a fruit.",
        },
        {
          practiceId: 'wp2',
          taskType: 'word',
          clusterId: 'c2',
          candidateWords: ['red', 'blue', 'green', 'table'],
          intruderWord: 'table',
          explanation: "'table' is not a colour.",
        },
      ],
      cluster: [
        {
          practiceId: 'cp1',
          taskType: 'cluster',
          targetTextId: 'pt1',
          targetText: 'A short demo text.',
          candidateClusterIds: ['c1', 'c2', 'c3'],
          intruderClusterId: 'c2',
          explanation: 'demo',
        },
        {
          practiceId: 'cp2',
          taskType: 'cluster',
          targetTextId: 'pt2',
          targetText: 'Another demo text.',
          candidateClusterIds: ['c1', 'c2', 'c3'],
          intruderClusterId: 'c3',
          explanation: 'demo',
        },
      ],
    },
  };
}

export function makeStudyDoc(): Record<string, unknown> {
  return { ...makeStudyFixture() };
}

export function makeStudy(): Study {
  return makeStudyFixture();
}
