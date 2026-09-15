/**
 * Session service (T015, US1) — the server-driven phase machine (R7, FR-007/FR-022/FR-023).
 *
 * Derives the participant's current `SessionState` per request from three sources, none of which is
 * a session store (R1): the loaded {@link Study}, the participant's immutable {@link SessionAssignment},
 * and the set of recorded responses/practice attempts in the Volume. On first visit it assigns the
 * least-utilized pre-defined Session and writes the assignment exactly once (FR-023, R14).
 *
 * Client DTOs are produced here by dropping ground truth and seeded-shuffling candidate order
 * (R5/R6); the intruder never leaves this boundary before the debrief.
 *
 * US1 implements the **word** segment (instructions → 2 practice → word items). US2 (T026) appends
 * the **cluster** segment (instructions → 2 practice → cluster items), reachable only once every
 * assigned word item is answered (FR-022/R7). US3 (T031) adds {@link buildDebrief}, which assembles
 * the post-completion debrief (the only place ground truth is revealed, R5) — the terminal phase
 * stays `complete`; the debrief is delivered by the dedicated `GET /api/debrief` endpoint.
 */

import type {
  ClientClusterItem,
  ClientPracticeItem,
  ClientWordItem,
  DebriefExample,
  DebriefState,
  SessionState,
  Selection,
  WelcomeContent,
} from '../../../shared/types';
import { getSurveySections, messages, type Locale } from '../../../shared/i18n';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import { makeSeed, seededShuffle } from '../lib/shuffle';
import {
  responsePath,
  responsesDir,
  practiceResponsesDir,
  sessionAssignmentPath,
  sessionAssignmentsDir,
} from '../lib/paths';
import { listSafe, writeOnce, type S3Storage } from '../lib/storage';
import type { AckSegment } from '../lib/http';
import type {
  ClusterIntrusionItem,
  PracticeClusterItem,
  PracticeWordItem,
  Session,
  Study,
  WordIntrusionItem,
} from './studyLoader';

/** Number of practice exercises shown per task segment (FR-011, "exactly 2 used"). */
export const PRACTICE_PER_SEGMENT = 2;

/** Persisted, immutable session assignment (data-model.md "SessionAssignment"). */
export interface SessionAssignment {
  studyId: string;
  participantId: string;
  sessionId: string;
  assignedAt: string;
  schemaVersion: 1;
}

/** Dependencies shared by the session/response services. */
export interface ServiceContext {
  storage: S3Storage;
  studyId: string;
  study: Study;
  /**
   * Deployment UI language for server-supplied built-in copy (the default welcome, US1). Optional;
   * defaults to `'en'` when unset. Researcher-authored copy is never routed through this (FR-015).
   */
  language?: Locale;
}

export interface GetSessionParams {
  participantId: string;
  /** Segments whose instructions/welcome the client has acknowledged (via `X-Ack-Instructions`). */
  acknowledgedInstructions: Set<AckSegment>;
}

// --- Welcome (US1, FR-012) --------------------------------------------------------------------

/**
 * Resolve the welcome copy for the welcome home page: the researcher-authored `study.welcome` when
 * present (verbatim, never translated — FR-015), otherwise the localized built-in default from the
 * shared catalog in the deployment `language` (FR-012).
 */
function resolveWelcome(study: Study, language: Locale): WelcomeContent {
  if (study.welcome) return study.welcome;
  const m = messages[language];
  return {
    content: `${m.welcomeDefaultContent}\n\n${getSurveySections(language)
      .map((section, index) => `${index + 1}. ${section.label}`)
      .join('\n')}`,
  };
}

// --- DTO mapping (R5/R6) ----------------------------------------------------------------------

/** Map a server word item to its client DTO — drops `intruderWord`, seeded-shuffles order. */
export function toClientWordItem(item: WordIntrusionItem, participantId: string): ClientWordItem {
  return {
    itemId: item.itemId,
    taskType: 'word',
    candidateWords: seededShuffle(item.candidateWords, makeSeed(participantId, item.itemId)),
  };
}

/** Map a server word practice item to its client DTO — keeps `explanation`, drops the intruder. */
export function toClientWordPractice(practice: PracticeWordItem, participantId: string): ClientPracticeItem {
  return {
    itemId: practice.practiceId,
    taskType: 'word',
    candidateWords: seededShuffle(practice.candidateWords, makeSeed(participantId, practice.practiceId)),
    explanation: practice.explanation,
  };
}

/**
 * Resolve the candidate cluster ids to `{ clusterId, representativeWords }` blocks and seeded-shuffle
 * them by `seedKey` (the item/practice id). The intruder is NOT marked — its identity is dropped by
 * not carrying `intruderClusterId` (R5). Item loading (T025) guarantees every id resolves.
 */
function toClusterCandidates(
  candidateClusterIds: string[],
  study: Study,
  participantId: string,
  seedKey: string
): ClientClusterItem['candidates'] {
  const byId = new Map(study.clusters.map((c) => [c.clusterId, c]));
  const candidates = candidateClusterIds.map((clusterId) => ({
    clusterId,
    representativeWords: byId.get(clusterId)?.representativeWords ?? [],
  }));
  return seededShuffle(candidates, makeSeed(participantId, seedKey));
}

/** Map a server cluster item to its client DTO — drops `intruderClusterId`, seeded-shuffles order. */
export function toClientClusterItem(
  item: ClusterIntrusionItem,
  study: Study,
  participantId: string
): ClientClusterItem {
  return {
    itemId: item.itemId,
    taskType: 'cluster',
    // Sanitize the researcher-authored HTML here — the single trusted boundary (US2, R2/FR-007).
    targetHtml: sanitizeHtml(item.targetText),
    candidates: toClusterCandidates(item.candidateClusterIds, study, participantId, item.itemId),
  };
}

/** Map a server cluster practice item to its client DTO — keeps `explanation`, drops the intruder. */
export function toClientClusterPractice(
  practice: PracticeClusterItem,
  study: Study,
  participantId: string
): ClientPracticeItem {
  return {
    itemId: practice.practiceId,
    taskType: 'cluster',
    // Same trusted-boundary sanitization as the live cluster item (US2, R2/FR-007).
    targetHtml: sanitizeHtml(practice.targetText),
    candidates: toClusterCandidates(practice.candidateClusterIds, study, participantId, practice.practiceId),
    explanation: practice.explanation,
  };
}

// --- Assignment (FR-023, R14) -----------------------------------------------------------------

/** Resolve the assigned Session for a participant, assigning the least-utilized one on first visit. */
export async function ensureAssignment(ctx: ServiceContext, participantId: string): Promise<SessionAssignment> {
  const { storage, studyId } = ctx;
  const path = sessionAssignmentPath(studyId, participantId);

  const existing = await readAssignment(storage, path);
  if (existing) return existing;

  const sessionId = await pickLeastUtilizedSession(ctx);
  const assignment: SessionAssignment = {
    studyId,
    participantId,
    sessionId,
    assignedAt: new Date().toISOString(),
    schemaVersion: 1,
  };
  // Idempotent: a concurrent first-visit race writes one file; both callers then read the winner.
  await writeOnce(storage, path, JSON.stringify(assignment));
  return (await readAssignment(storage, path)) ?? assignment;
}

async function readAssignment(storage: S3Storage, path: string): Promise<SessionAssignment | null> {
  try {
    return JSON.parse(await storage.read(path)) as SessionAssignment;
  } catch {
    return null;
  }
}

/** Tally assignments per session and return the least-utilized sessionId (tie-break: definition order). */
async function pickLeastUtilizedSession(ctx: ServiceContext): Promise<string> {
  const { storage, studyId, study } = ctx;

  // A single-session study has nothing to balance. Avoid listing and downloading the entire
  // assignment directory, which otherwise makes a new participant's first request increasingly
  // expensive as the study grows.
  if (study.sessions.length === 1) return study.sessions[0].sessionId;

  const counts = new Map<string, number>();
  for (const session of study.sessions) counts.set(session.sessionId, 0);

  const keys = await listSafe(storage, sessionAssignmentsDir(studyId));
  const assignmentPaths = keys;

  // Volume reads are remote requests. Process them concurrently in bounded batches instead of
  // serially; the cap prevents a large study from flooding the Files API.
  const assignments = await mapWithConcurrency(assignmentPaths, 16, (path) => readAssignment(storage, path));
  for (const assignment of assignments) {
    if (assignment && counts.has(assignment.sessionId)) {
      counts.set(assignment.sessionId, (counts.get(assignment.sessionId) ?? 0) + 1);
    }
  }

  // First session (definition order) with the minimum count.
  let chosen = study.sessions[0].sessionId;
  let min = Infinity;
  for (const session of study.sessions) {
    const count = counts.get(session.sessionId) ?? 0;
    if (count < min) {
      min = count;
      chosen = session.sessionId;
    }
  }
  return chosen;
}

async function mapWithConcurrency<T, U>(
  values: T[],
  concurrency: number,
  map: (value: T) => Promise<U>
): Promise<U[]> {
  const results = new Array<U>(values.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = nextIndex++;
      if (index >= values.length) return;
      results[index] = await map(values[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
  return results;
}

// --- Recorded-progress reads ------------------------------------------------------------------

/** The set of real item ids the participant has already answered. */
export async function listAnsweredItemIds(ctx: ServiceContext, participantId: string): Promise<Set<string>> {
  const keys = await listSafe(ctx.storage, responsesDir(ctx.studyId, participantId));
  const answered = new Set<string>();
  for (const key of keys) {
    const id = keyFileId(key);
    if (id) answered.add(id);
  }
  return answered;
}

/** The set of practice ids the participant has already attempted. */
export async function listPracticeResponseIds(ctx: ServiceContext, participantId: string): Promise<Set<string>> {
  const keys = await listSafe(ctx.storage, practiceResponsesDir(ctx.studyId, participantId));
  const present = new Set<string>();
  for (const key of keys) {
    const id = keyFileId(key);
    if (id) present.add(id);
  }
  return present;
}

/** Count, in order, how many of the segment's practice slots the participant has attempted. */
function countAnsweredPractice(practiceIds: string[], present: Set<string>): number {
  let count = 0;
  for (const practiceId of practiceIds.slice(0, PRACTICE_PER_SEGMENT)) {
    if (present.has(practiceId)) count++;
  }
  return count;
}

/** Extract the file id (basename without `.json`) from a directory entry. */
function keyFileId(key: string): string | null {
  const parts = key.split('/');
  const name = parts[parts.length - 1];
  if (!name) return null;
  return name.endsWith('.json') ? name.slice(0, -'.json'.length) : name;
}

// --- Phase resolution -------------------------------------------------------------------------

export interface GetSessionOptions {
  /** When the caller already resolved the assignment, skip a redundant read. */
  assignment?: SessionAssignment;
}

/** Resolve the full `SessionState` for a participant (first-visit assignment included). */
export async function getSessionState(
  ctx: ServiceContext,
  params: GetSessionParams,
  options: GetSessionOptions = {}
): Promise<SessionState> {
  const wordPracticeIds = ctx.study.practice.word.map((p) => p.practiceId);
  const clusterPracticeIds = ctx.study.practice.cluster.map((p) => p.practiceId);

  const [assignment, answered, practicePresent] = await Promise.all([
    options.assignment ?? ensureAssignment(ctx, params.participantId),
    listAnsweredItemIds(ctx, params.participantId),
    listPracticeResponseIds(ctx, params.participantId),
  ]);
  const session = findSession(ctx.study, assignment.sessionId);

  return resolveSessionState({
    study: ctx.study,
    session,
    participantId: params.participantId,
    welcome: resolveWelcome(ctx.study, ctx.language ?? 'en'),
    answered,
    wordPracticeAnswered: countAnsweredPractice(wordPracticeIds, practicePresent),
    clusterPracticeAnswered: countAnsweredPractice(clusterPracticeIds, practicePresent),
    acknowledgedInstructions: params.acknowledgedInstructions,
  });
}

interface ResolveParams {
  study: Study;
  session: Session;
  participantId: string;
  /** The resolved welcome copy (researcher-authored or localized default) for the welcome phase. */
  welcome: WelcomeContent;
  answered: Set<string>;
  wordPracticeAnswered: number;
  clusterPracticeAnswered: number;
  acknowledgedInstructions: Set<AckSegment>;
}

/**
 * Pure phase resolver — exported for unit testing (T013). Advances strictly in flow order; only
 * items from the assigned Session are considered. Withheld items (FR-016) are skipped because the
 * Session's id lists are intersected with the loaded item pools.
 */
export function resolveSessionState(params: ResolveParams): SessionState {
  const {
    study,
    session,
    participantId,
    welcome,
    answered,
    wordPracticeAnswered,
    clusterPracticeAnswered,
    acknowledgedInstructions,
  } = params;

  const wordIds = orderedExisting(session.wordItemIds, study.wordItems);
  const clusterIds = orderedExisting(session.clusterItemIds, study.clusterItems);

  const answeredWord = wordIds.filter((id) => answered.has(id)).length;
  const answeredCluster = clusterIds.filter((id) => answered.has(id)).length;

  const progress = { answered: answeredWord + answeredCluster, total: wordIds.length + clusterIds.length };
  const base = { studyId: study.studyId, sessionId: session.sessionId, progress };

  // --- WELCOME (US1, FR-001–FR-005/FR-012) ----------------------------------------------------
  // Shown only at the very start: nothing recorded (no real item answered, no practice attempted)
  // and `welcome` not yet acknowledged. A returning in-progress participant has recorded progress
  // (or the ack flag), so they are never reset to the welcome page (FR-005). Showing welcome does
  // not reset or duplicate recorded progress — `progress` is carried through unchanged.
  const hasBegun = progress.answered > 0 || wordPracticeAnswered > 0 || clusterPracticeAnswered > 0;
  if (!hasBegun && !acknowledgedInstructions.has('welcome')) {
    return { ...base, phase: 'welcome', current: { phase: 'welcome', welcome } };
  }

  // --- WORD segment ---------------------------------------------------------------------------
  if (answeredWord < wordIds.length) {
    if (wordPracticeAnswered < PRACTICE_PER_SEGMENT) {
      // The instructions screen precedes the first practice and is shown until acknowledged.
      if (wordPracticeAnswered === 0 && !acknowledgedInstructions.has('word')) {
        return { ...base, phase: 'word-instructions', current: { phase: 'word-instructions', taskType: 'word' } };
      }
      const practice = study.practice.word[wordPracticeAnswered];
      return {
        ...base,
        phase: 'word-practice',
        current: {
          phase: 'word-practice',
          practice: toClientWordPractice(practice, participantId),
          index: wordPracticeAnswered + 1,
          of: PRACTICE_PER_SEGMENT,
        },
      };
    }

    const nextWordId = wordIds.find((id) => !answered.has(id));
    const item = study.wordItems.find((w) => w.itemId === nextWordId);
    // `nextWordId` came from `wordIds` (already intersected with the pool), so `item` is defined.
    return {
      ...base,
      phase: 'word-items',
      current: { phase: 'word-items', item: toClientWordItem(item as WordIntrusionItem, participantId) },
    };
  }

  // --- CLUSTER segment (reachable only once every assigned word item is answered, FR-022/R7) --
  if (answeredCluster < clusterIds.length) {
    if (clusterPracticeAnswered < PRACTICE_PER_SEGMENT) {
      // The cluster instructions precede the first cluster practice, shown until acknowledged.
      if (clusterPracticeAnswered === 0 && !acknowledgedInstructions.has('cluster')) {
        return {
          ...base,
          phase: 'cluster-instructions',
          current: { phase: 'cluster-instructions', taskType: 'cluster' },
        };
      }
      const practice = study.practice.cluster[clusterPracticeAnswered];
      return {
        ...base,
        phase: 'cluster-practice',
        current: {
          phase: 'cluster-practice',
          practice: toClientClusterPractice(practice, study, participantId),
          index: clusterPracticeAnswered + 1,
          of: PRACTICE_PER_SEGMENT,
        },
      };
    }

    const nextClusterId = clusterIds.find((id) => !answered.has(id));
    const item = study.clusterItems.find((c) => c.itemId === nextClusterId);
    // `nextClusterId` came from `clusterIds` (already intersected with the pool), so `item` is defined.
    return {
      ...base,
      phase: 'cluster-items',
      current: {
        phase: 'cluster-items',
        item: toClientClusterItem(item as ClusterIntrusionItem, study, participantId),
      },
    };
  }

  // --- All assigned items answered ------------------------------------------------------------
  // Terminal phase. The client fetches `GET /api/debrief` ({@link buildDebrief}) on `complete`/
  // `debrief` to reveal the post-completion debrief (US3); ground truth is exposed only there (R5).
  return { ...base, phase: 'complete', current: { phase: 'complete' } };
}

/** Items from `ids`, in order, that still exist in the loaded `pool` (withheld items dropped). */
function orderedExisting(ids: string[], pool: { itemId: string }[]): string[] {
  const present = new Set(pool.map((p) => p.itemId));
  return ids.filter((id) => present.has(id));
}

/** Resolve the assigned Session, falling back to the first defined Session if it is unknown. */
function findSession(study: Study, sessionId: string): Session {
  return study.sessions.find((s) => s.sessionId === sessionId) ?? study.sessions[0];
}

// --- Debrief (T031, US3 — FR-019/FR-020/FR-021, R5) -------------------------------------------

/** Thrown when the debrief is requested before all assigned items are answered (FR-021). */
export class DebriefError extends Error {
  constructor(
    readonly status: number,
    readonly code: 'not_complete'
  ) {
    super(code);
    this.name = 'DebriefError';
  }
}

/** The subset of a persisted Response the debrief reads back (matches responseService `Response`). */
interface StoredResponse {
  selection: Selection;
  correct: boolean;
}

/**
 * Build the post-completion debrief (FR-019/FR-020). This is the **only** place ground truth
 * (`correctIntruder`) crosses to the client (R5): it is reachable only once every assigned item is
 * answered, otherwise it throws `DebriefError(409, 'not_complete')` (FR-021).
 *
 * Returns a random sample of up to `config.debriefSampleSize` answered real items (FR-019; all of
 * them when the participant answered fewer), presented in session order (word items then cluster
 * items, R6/US4). The sample is drawn with the same seeded PRNG as candidate ordering, keyed on the
 * participant, so repeated fetches (reload/resume mid-walkthrough) return the same set without
 * persisting anything. Each example carries the render fields the walkthrough needs to reproduce
 * the session layout read-only — the word `candidateWords`, or the cluster `targetHtml` + candidate
 * blocks (same DTO mapping as the live item). It carries no score, pass/fail, or aggregate
 * statistics — only per-example facts and a system-generated, cluster-framed explanation (localized
 * by the deployment `language`) that judges the cluster's validity, never the participant (FR-020).
 *
 * @throws {DebriefError} 409 (`not_complete`) before completion.
 */
export async function buildDebrief(ctx: ServiceContext, participantId: string): Promise<DebriefState> {
  const assignment = await ensureAssignment(ctx, participantId);
  const session = findSession(ctx.study, assignment.sessionId);
  const answered = await listAnsweredItemIds(ctx, participantId);

  const itemIds = [
    ...orderedExisting(session.wordItemIds, ctx.study.wordItems),
    ...orderedExisting(session.clusterItemIds, ctx.study.clusterItems),
  ];

  if (itemIds.length === 0 || !itemIds.every((id) => answered.has(id))) {
    throw new DebriefError(409, 'not_complete');
  }

  // 'debrief' is not an item id, so this seed never collides with the per-item ordering seeds.
  const sampled = new Set(
    seededShuffle(itemIds, makeSeed(participantId, 'debrief')).slice(0, ctx.study.config.debriefSampleSize)
  );
  const sampledInSessionOrder = itemIds.filter((id) => sampled.has(id));

  const examples: DebriefExample[] = [];
  for (const itemId of sampledInSessionOrder) {
    const example = await toDebriefExample(ctx, participantId, itemId);
    if (example) examples.push(example);
  }
  return { examples };
}

/** Assemble one {@link DebriefExample} from the stored response + the server-only ground truth. */
async function toDebriefExample(
  ctx: ServiceContext,
  participantId: string,
  itemId: string
): Promise<DebriefExample | null> {
  const stored = await readStoredResponse(ctx, participantId, itemId);
  if (!stored?.selection) return null;

  // Normalize to the bare wire Selection: the persisted cluster selection now nests
  // `selectedClusterWords` (FR-012), which must not ride along into the debrief payload (api.md).
  const yourSelection: Selection = { kind: stored.selection.kind, value: stored.selection.value };

  const m = messages[ctx.language ?? 'en'];

  const wordItem = ctx.study.wordItems.find((w) => w.itemId === itemId);
  if (wordItem) {
    return {
      itemId,
      taskType: 'word',
      // Same seeded shuffle as the live item so the walkthrough reproduces the order shown (FR-019).
      candidateWords: seededShuffle(wordItem.candidateWords, makeSeed(participantId, wordItem.itemId)),
      yourSelection,
      correctIntruder: wordItem.intruderWord, // ground truth — revealed ONLY here (R5)
      correct: stored.correct,
      clusterValidityExplanation: m.debriefExplainWord(stored.correct, wordItem.intruderWord),
    };
  }

  const clusterItem = ctx.study.clusterItems.find((c) => c.itemId === itemId);
  if (clusterItem) {
    const intruderWords =
      ctx.study.clusters.find((c) => c.clusterId === clusterItem.intruderClusterId)?.representativeWords ?? [];
    return {
      itemId,
      taskType: 'cluster',
      // Same trusted-boundary sanitization + candidate mapping as the live cluster item (US2, R2).
      targetHtml: sanitizeHtml(clusterItem.targetText),
      candidates: toClusterCandidates(clusterItem.candidateClusterIds, ctx.study, participantId, clusterItem.itemId),
      yourSelection,
      correctIntruder: clusterItem.intruderClusterId, // ground truth — revealed ONLY here (R5)
      correct: stored.correct,
      clusterValidityExplanation: m.debriefExplainCluster(stored.correct, intruderWords),
    };
  }

  return null;
}

/** Read a participant's stored Response for one item, or `null` if missing/unreadable. */
async function readStoredResponse(
  ctx: ServiceContext,
  participantId: string,
  itemId: string
): Promise<StoredResponse | null> {
  const path = responsePath(ctx.studyId, participantId, itemId);
  if (!(await ctx.storage.exists(path))) return null;
  try {
    return JSON.parse(await ctx.storage.read(path)) as StoredResponse;
  } catch {
    return null;
  }
}
