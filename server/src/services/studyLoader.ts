/**
 * Study loader (T007, FR-001/FR-016, R5).
 *
 * Loads and validates the study definition from the Unity Catalog Volume and exposes the
 * **server-only** Study graph. These shapes carry GROUND TRUTH (`intruderWord`,
 * `intruderClusterId`) and MUST NEVER be sent to the client — the client only ever receives the
 * stripped DTOs in `shared/types.ts`. Mapping server items -> client DTOs happens in
 * `sessionService` (added in US1); this module is the single place ground truth is read.
 *
 * Storage path (storage.md): `text_cluster_validation/{studyId}/study/study.json`, where
 * `{studyId}` is this deployment's server-side `STUDY_ID` config (FR-017). The file's internal
 * `studyId` MUST equal that config or the load is rejected.
 *
 * Malformed items are **withheld with a notice** rather than failing the whole load (FR-016):
 * WORD items with a missing/duplicate intruder or too few candidates, and (US2, T025) CLUSTER
 * items with too few candidate clusters, an intruder that is not among the candidates, or a
 * candidate that does not resolve to a known `Cluster`. A withheld item is skipped; the rest of
 * the study still loads.
 */

import { z } from 'zod';
import { WelcomeContentSchema } from '../../../shared/schemas';
import type { WelcomeContent } from '../../../shared/types';
import { studyJsonPath } from '../lib/paths';

export { studyJsonPath };

// --- Server-only Study graph types (data-model.md) -------------------------------------------

export interface StudyConfig {
  /** K target (SC-005) — informational metadata only; not enforced by in-app assignment (R14). */
  judgmentsPerCluster: number;
  wordCandidatesPerItem: number;
  clusterCandidatesPerItem: number;
  /** Max answered items the debrief walkthrough samples (FR-019). Optional in study.json; defaults to 3. */
  debriefSampleSize: number;
}

export interface Session {
  sessionId: string;
  wordItemIds: string[];
  clusterItemIds: string[];
}

export interface Cluster {
  clusterId: string;
  label?: string;
  representativeWords: string[];
  memberTextIds?: string[];
  mlflowExperimentId?: string;
  mlflowRunId?: string;
}

export interface WordIntrusionItem {
  itemId: string;
  taskType: 'word';
  clusterId: string;
  candidateWords: string[];
  /** GROUND TRUTH — must be present exactly once in `candidateWords`. */
  intruderWord: string;
  /** Per-item override of `config.wordCandidatesPerItem` (FR-001; min 3). */
  wordCount?: number;
}

export interface ClusterIntrusionItem {
  itemId: string;
  taskType: 'cluster';
  targetTextId: string;
  targetText: string;
  candidateClusterIds: string[];
  /** GROUND TRUTH — the cluster that does NOT belong; must be in `candidateClusterIds`. */
  intruderClusterId: string;
}

export type PracticeWordItem = Omit<WordIntrusionItem, 'itemId'> & {
  practiceId: string;
  explanation: string;
};
export type PracticeClusterItem = Omit<ClusterIntrusionItem, 'itemId'> & {
  practiceId: string;
  explanation: string;
};

export interface Study {
  studyId: string;
  /**
   * Optional researcher-authored welcome copy (US1, FR-012). Left unset when `study.json` omits it,
   * so the session service supplies the localized built-in default.
   */
  welcome?: WelcomeContent;
  config: StudyConfig;
  sessions: Session[];
  clusters: Cluster[];
  wordItems: WordIntrusionItem[];
  clusterItems: ClusterIntrusionItem[];
  practice: {
    word: PracticeWordItem[];
    cluster: PracticeClusterItem[];
  };
}

// --- Notices & result ------------------------------------------------------------------------

/** Why a single item was withheld from the loaded Study (FR-016). Carries no cluster text. */
export interface StudyNotice {
  scope: 'word-item' | 'cluster-item';
  itemId: string;
  reason: string;
}

export interface LoadStudyResult {
  /** Valid study with malformed items withheld. */
  study: Study;
  /** One entry per withheld item (FR-016). */
  notices: StudyNotice[];
}

export type StudyLoadErrorCode = 'unreadable' | 'invalid_json' | 'invalid_study' | 'study_id_mismatch';

/** Thrown when the study definition is missing, unparseable, structurally invalid, or mismatched. */
export class StudyLoadError extends Error {
  constructor(
    message: string,
    readonly code: StudyLoadErrorCode = 'invalid_study'
  ) {
    super(message);
    this.name = 'StudyLoadError';
  }
}

/** Minimal storage dependency (a subset of the Files plugin `VolumeAPI`) — injectable for tests. */
export interface StudyStorage {
  read(filePath: string, options?: { maxSize?: number }): Promise<string>;
}

// --- Zod schemas -----------------------------------------------------------------------------

const StudyConfigSchema = z.object({
  judgmentsPerCluster: z.number().int().min(1),
  wordCandidatesPerItem: z.number().int().min(3),
  clusterCandidatesPerItem: z.number().int().min(3),
  debriefSampleSize: z.number().int().min(1).default(3),
});

const SessionSchema = z.object({
  sessionId: z.string().min(1),
  wordItemIds: z.array(z.string().min(1)).min(1),
  clusterItemIds: z.array(z.string().min(1)).min(1),
});

const ClusterSchema = z.object({
  clusterId: z.string().min(1),
  label: z.string().optional(),
  representativeWords: z.array(z.string()).min(1),
  memberTextIds: z.array(z.string()).optional(),
  mlflowExperimentId: z.string().optional(),
  mlflowRunId: z.string().optional(),
});

const WordItemSchema = z.object({
  itemId: z.string().min(1),
  taskType: z.literal('word'),
  clusterId: z.string().min(1),
  candidateWords: z.array(z.string().min(1)).min(1),
  intruderWord: z.string().min(1),
  wordCount: z.number().int().min(3).optional(),
});

const ClusterItemSchema = z.object({
  itemId: z.string().min(1),
  taskType: z.literal('cluster'),
  targetTextId: z.string().min(1),
  targetText: z.string().min(1),
  candidateClusterIds: z.array(z.string().min(1)).min(1),
  intruderClusterId: z.string().min(1),
});

const PracticeWordSchema = WordItemSchema.omit({ itemId: true }).extend({
  practiceId: z.string().min(1),
  explanation: z.string().min(1),
});
const PracticeClusterSchema = ClusterItemSchema.omit({ itemId: true }).extend({
  practiceId: z.string().min(1),
  explanation: z.string().min(1),
});

/**
 * Study-level envelope. Everything except the real word/cluster item pools is validated strictly
 * here (a broken envelope is a 500-worthy study misconfiguration); the item pools are taken
 * leniently so individual malformed items can be withheld rather than aborting the load (FR-016).
 */
const StudyEnvelopeSchema = z.object({
  studyId: z.string().min(1),
  welcome: WelcomeContentSchema.optional(),
  config: StudyConfigSchema,
  sessions: z.array(SessionSchema).min(1),
  clusters: z.array(ClusterSchema),
  wordItems: z.array(z.unknown()),
  clusterItems: z.array(z.unknown()),
  practice: z.object({
    word: z.array(PracticeWordSchema).min(2),
    cluster: z.array(PracticeClusterSchema).min(2),
  }),
});

// --- Loader ----------------------------------------------------------------------------------

/** Effective minimum candidate count for a word item (FR-001). */
function effectiveWordCandidateCount(item: WordIntrusionItem, config: StudyConfig): number {
  return Math.max(3, item.wordCount ?? config.wordCandidatesPerItem);
}

/**
 * Load and validate the Study for `studyId` (this deployment's `STUDY_ID`).
 *
 * @throws {StudyLoadError} if the file is unreadable, not JSON, structurally invalid, or its
 *   internal `studyId` does not equal `studyId`.
 */
export async function loadStudy(storage: StudyStorage, studyId: string): Promise<LoadStudyResult> {
  let raw: string;
  try {
    raw = await storage.read(studyJsonPath(studyId), { maxSize: 50 * 1024 * 1024 });
  } catch {
    throw new StudyLoadError(`Unable to read study definition for "${studyId}"`, 'unreadable');
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new StudyLoadError('Study definition is not valid JSON', 'invalid_json');
  }

  const envelope = StudyEnvelopeSchema.safeParse(parsedJson);
  if (!envelope.success) {
    throw new StudyLoadError('Study definition failed validation', 'invalid_study');
  }

  // FR-017 / storage.md: the file's studyId MUST equal this deployment's STUDY_ID.
  if (envelope.data.studyId !== studyId) {
    throw new StudyLoadError(`Study definition studyId does not match STUDY_ID ("${studyId}")`, 'study_id_mismatch');
  }

  const config = envelope.data.config;
  const notices: StudyNotice[] = [];

  // Withhold malformed WORD items rather than failing the load (FR-016).
  const wordItems: WordIntrusionItem[] = [];
  const seenWordIds = new Set<string>();
  for (const candidate of envelope.data.wordItems) {
    const parsed = WordItemSchema.safeParse(candidate);
    if (!parsed.success) {
      const itemId = readItemId(candidate);
      notices.push({ scope: 'word-item', itemId, reason: 'structurally invalid' });
      continue;
    }
    const item = parsed.data;
    if (seenWordIds.has(item.itemId)) {
      notices.push({ scope: 'word-item', itemId: item.itemId, reason: 'duplicate itemId' });
      continue;
    }
    const occurrences = item.candidateWords.filter((w) => w === item.intruderWord).length;
    if (occurrences !== 1) {
      notices.push({
        scope: 'word-item',
        itemId: item.itemId,
        reason:
          occurrences === 0 ? 'intruder not among candidates' : 'intruder appears more than once among candidates',
      });
      continue;
    }
    const required = effectiveWordCandidateCount(item, config);
    if (item.candidateWords.length < required) {
      notices.push({
        scope: 'word-item',
        itemId: item.itemId,
        reason: `too few candidates (need >= ${required})`,
      });
      continue;
    }
    seenWordIds.add(item.itemId);
    wordItems.push(item);
  }

  // Withhold malformed CLUSTER items rather than failing the load (FR-016, T025): structural
  // parse, then semantic checks — candidate count, intruder membership, and id resolution. The
  // ground-truth `intruderClusterId` is validated here but never leaves the server (R5).
  const clusterIdSet = new Set(envelope.data.clusters.map((c) => c.clusterId));
  const clusterItems: ClusterIntrusionItem[] = [];
  const seenClusterItemIds = new Set<string>();
  for (const candidate of envelope.data.clusterItems) {
    const parsed = ClusterItemSchema.safeParse(candidate);
    if (!parsed.success) {
      const itemId = readItemId(candidate);
      notices.push({ scope: 'cluster-item', itemId, reason: 'structurally invalid' });
      continue;
    }
    const item = parsed.data;
    if (seenClusterItemIds.has(item.itemId)) {
      notices.push({ scope: 'cluster-item', itemId: item.itemId, reason: 'duplicate itemId' });
      continue;
    }
    if (item.candidateClusterIds.length < config.clusterCandidatesPerItem) {
      notices.push({
        scope: 'cluster-item',
        itemId: item.itemId,
        reason: `too few candidate clusters (need >= ${config.clusterCandidatesPerItem})`,
      });
      continue;
    }
    if (!item.candidateClusterIds.includes(item.intruderClusterId)) {
      notices.push({ scope: 'cluster-item', itemId: item.itemId, reason: 'intruder not among candidates' });
      continue;
    }
    const unknownClusterId = item.candidateClusterIds.find((id) => !clusterIdSet.has(id));
    if (unknownClusterId !== undefined) {
      notices.push({ scope: 'cluster-item', itemId: item.itemId, reason: 'references an unknown cluster id' });
      continue;
    }
    seenClusterItemIds.add(item.itemId);
    clusterItems.push(item);
  }

  const study: Study = {
    studyId: envelope.data.studyId,
    welcome: envelope.data.welcome,
    config,
    sessions: envelope.data.sessions,
    clusters: envelope.data.clusters,
    wordItems,
    clusterItems,
    practice: envelope.data.practice,
  };

  return { study, notices };
}

/** Best-effort id extraction for a notice when an item failed structural parsing (no PII). */
function readItemId(candidate: unknown): string {
  if (candidate && typeof candidate === 'object' && 'itemId' in candidate) {
    const id = (candidate as { itemId: unknown }).itemId;
    if (typeof id === 'string' && id.length > 0) return id;
  }
  return '(unknown)';
}
