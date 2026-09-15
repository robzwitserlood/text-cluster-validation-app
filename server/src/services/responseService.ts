/**
 * Response service (T016, US1) — records one answer, computes correctness server-side, and writes
 * it durably and idempotently (FR-002/FR-005/FR-009/FR-011, R4/R5).
 *
 * Correctness is computed here against ground truth and stored, but is NEVER returned to the caller
 * (R5) — the route's `SubmitResult` carries only `recorded` plus the advanced state. Real answers go
 * to `responses/{participantId}/{itemId}.json`; practice attempts go to the separate
 * `practice-responses/{participantId}/{practiceId}.json` tree, marked `isPractice:true`, excluded
 * from cluster K and `progress` (FR-011).
 *
 * US1 handles the **word** task type (real items + practice) and locks the cluster segment
 * (FR-022). US2 (T027) adds cluster recording (correctness vs `intruderClusterId`) gated behind the
 * precise rule: a cluster item or practice is recordable only once every assigned word item is
 * answered; otherwise it is rejected with `409 phase_locked`.
 */

import type { Selection, StoredSelection, SubmitRequest } from '../../../shared/types';
import { practiceResponsePath, responsePath } from '../lib/paths';
import { writeOnce } from '../lib/storage';
import {
  countPracticeAnswered,
  ensureAssignment,
  listAnsweredItemIds,
  listPracticeResponseIds,
  type ServiceContext,
} from './sessionService';

/** A persisted real Response (data-model.md "Response"). */
export interface Response {
  studyId: string;
  participantId: string;
  itemId: string;
  taskType: 'word' | 'cluster';
  clusterId: string;
  /**
   * Word responses persist the bare wire selection; cluster responses nest `selectedClusterWords`
   * (the representative words of the cluster named by `selection.value`, resolved server-side from
   * `study.clusters`) under `selection` (FR-012). There is no top-level `selectedClusterWords`.
   */
  selection: StoredSelection;
  correct: boolean;
  submittedAt: string;
  timeTakenMs?: number;
  schemaVersion: 1;
}

/** A persisted PracticeResponse — retained for downstream skill assessment (data-model.md, FR-011). */
export interface PracticeResponse {
  studyId: string;
  participantId: string;
  practiceId: string;
  taskType: 'word' | 'cluster';
  selection: Selection;
  correct: boolean;
  isPractice: true;
  submittedAt: string;
  timeTakenMs?: number;
  schemaVersion: 1;
}

/** A recoverable error mapped to an HTTP status + stable code by the route (no PII, R10). */
export class ResponseError extends Error {
  constructor(
    readonly status: number,
    readonly code: 'invalid_request' | 'phase_locked'
  ) {
    super(code);
    this.name = 'ResponseError';
  }
}

export interface RecordResult {
  recorded: boolean;
  practiceAnswered?: { word: number; cluster: number };
}

/**
 * Validate and record one submission. Idempotent per `(participant, item)` — a duplicate is a
 * no-op that still reports `recorded:true` (FR-009).
 *
 * @throws {ResponseError} 422 for an unknown item or a selection that is not a displayed candidate;
 *   409 (`phase_locked`) for a cluster submission while the cluster segment is locked (FR-022, US1).
 */
export async function recordResponse(
  ctx: ServiceContext,
  params: { participantId: string; body: SubmitRequest }
): Promise<RecordResult> {
  const { study, studyId, storage } = ctx;
  const { participantId, body } = params;
  const submittedAt = new Date().toISOString();

  // 1. Real word item.
  const wordItem = study.wordItems.find((w) => w.itemId === body.itemId);
  if (wordItem) {
    if (body.taskType !== 'word') throw new ResponseError(422, 'invalid_request');
    assertDisplayedCandidate(wordItem.candidateWords, body.selection);
    const response: Response = {
      studyId,
      participantId,
      itemId: wordItem.itemId,
      taskType: 'word',
      clusterId: wordItem.clusterId,
      selection: body.selection,
      correct: body.selection.value === wordItem.intruderWord,
      submittedAt,
      ...(body.timeTakenMs !== undefined ? { timeTakenMs: body.timeTakenMs } : {}),
      schemaVersion: 1,
    };
    await writeOnce(storage, responsePath(studyId, participantId, wordItem.itemId), JSON.stringify(response));
    return { recorded: true };
  }

  // 2. Word practice attempt — recorded silently in the separate practice tree (FR-011).
  const wordPractice = study.practice.word.find((p) => p.practiceId === body.itemId);
  if (wordPractice) {
    if (body.taskType !== 'word') throw new ResponseError(422, 'invalid_request');
    assertDisplayedCandidate(wordPractice.candidateWords, body.selection);
    const practiceResponse: PracticeResponse = {
      studyId,
      participantId,
      practiceId: wordPractice.practiceId,
      taskType: 'word',
      selection: body.selection,
      correct: body.selection.value === wordPractice.intruderWord,
      isPractice: true,
      submittedAt,
      ...(body.timeTakenMs !== undefined ? { timeTakenMs: body.timeTakenMs } : {}),
      schemaVersion: 1,
    };
    await writeOnce(
      storage,
      practiceResponsePath(studyId, participantId, wordPractice.practiceId),
      JSON.stringify(practiceResponse)
    );
    const practicePresent = await listPracticeResponseIds(ctx, participantId);
    return { recorded: true, practiceAnswered: countPracticeAnswered(study, practicePresent) };
  }

  // 3. Real cluster item — recordable only once every assigned word item is answered (FR-022).
  const clusterItem = study.clusterItems.find((c) => c.itemId === body.itemId);
  if (clusterItem) {
    if (body.taskType !== 'cluster') throw new ResponseError(422, 'invalid_request');
    await assertClusterSegmentUnlocked(ctx, participantId);
    assertDisplayedCandidate(clusterItem.candidateClusterIds, body.selection);
    // FR-016/FR-012: persist the representative words of the selected cluster (resolved server-side)
    // NESTED under `selection` — never as a top-level field (greenfield, contracts/storage.md).
    const selectedCluster = study.clusters.find((c) => c.clusterId === body.selection.value);
    const response: Response = {
      studyId,
      participantId,
      itemId: clusterItem.itemId,
      taskType: 'cluster',
      // The intruder cluster is the one whose (non-)membership is being judged — it links the
      // response to a Cluster (and thence its MLFlow run) for downstream grouping (FR-018/US6).
      clusterId: clusterItem.intruderClusterId,
      selection: {
        kind: body.selection.kind,
        value: body.selection.value,
        selectedClusterWords: selectedCluster?.representativeWords ?? [],
      },
      correct: body.selection.value === clusterItem.intruderClusterId,
      submittedAt,
      ...(body.timeTakenMs !== undefined ? { timeTakenMs: body.timeTakenMs } : {}),
      schemaVersion: 1,
    };
    await writeOnce(storage, responsePath(studyId, participantId, clusterItem.itemId), JSON.stringify(response));
    return { recorded: true };
  }

  // 4. Cluster practice attempt — also gated, recorded silently in the separate practice tree.
  const clusterPractice = study.practice.cluster.find((p) => p.practiceId === body.itemId);
  if (clusterPractice) {
    if (body.taskType !== 'cluster') throw new ResponseError(422, 'invalid_request');
    await assertClusterSegmentUnlocked(ctx, participantId);
    assertDisplayedCandidate(clusterPractice.candidateClusterIds, body.selection);
    const practiceResponse: PracticeResponse = {
      studyId,
      participantId,
      practiceId: clusterPractice.practiceId,
      taskType: 'cluster',
      selection: body.selection,
      correct: body.selection.value === clusterPractice.intruderClusterId,
      isPractice: true,
      submittedAt,
      ...(body.timeTakenMs !== undefined ? { timeTakenMs: body.timeTakenMs } : {}),
      schemaVersion: 1,
    };
    await writeOnce(
      storage,
      practiceResponsePath(studyId, participantId, clusterPractice.practiceId),
      JSON.stringify(practiceResponse)
    );
    const practicePresent = await listPracticeResponseIds(ctx, participantId);
    return { recorded: true, practiceAnswered: countPracticeAnswered(study, practicePresent) };
  }

  // 5. Unknown item id.
  throw new ResponseError(422, 'invalid_request');
}

/**
 * Enforce FR-022: the cluster segment (instructions, practice, items) is unreachable until every
 * word item in the participant's assigned Session is answered. Throws `409 phase_locked` otherwise.
 */
async function assertClusterSegmentUnlocked(ctx: ServiceContext, participantId: string): Promise<void> {
  const assignment = await ensureAssignment(ctx, participantId);
  const session = ctx.study.sessions.find((s) => s.sessionId === assignment.sessionId) ?? ctx.study.sessions[0];
  const answered = await listAnsweredItemIds(ctx, participantId);
  const allWordItemsAnswered = session.wordItemIds
    .filter((id) => ctx.study.wordItems.some((w) => w.itemId === id)) // ignore withheld items (FR-016)
    .every((id) => answered.has(id));
  if (!allWordItemsAnswered) throw new ResponseError(409, 'phase_locked');
}

/** A selection MUST identify exactly one displayed candidate; otherwise nothing is recorded (FR-002). */
function assertDisplayedCandidate(candidates: string[], selection: Selection): void {
  if (selection.kind !== 'candidate' || !candidates.includes(selection.value)) {
    throw new ResponseError(422, 'invalid_request');
  }
}
