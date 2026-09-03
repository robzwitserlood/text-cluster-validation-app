/**
 * Client-facing contract types shared between the client and server.
 *
 * CRITICAL INVARIANT (R5, data-model.md): nothing in this file carries ground truth.
 * The server's `Server*Item` shapes (which hold `intruderWord` / `intruderClusterId`) live
 * only in `server/src/services/studyLoader.ts` and MUST NOT be imported by the client. The
 * mapping `Server*Item -> Client*Item` drops the intruder; the correct answer is revealed
 * only by the debrief endpoint, after completion.
 *
 * Source: specs/001-cluster-validation/data-model.md ("Client-facing item DTOs", "Debrief DTOs",
 * "ValidationSession") and contracts/api.md.
 */

/**
 * Researcher-authored welcome copy shown on the welcome home page (US1, FR-002/FR-012). Sourced from
 * `study.welcome`; when the study omits it the server supplies the localized built-in default from
 * `shared/i18n.ts`. Carries no task answers or ground truth; researcher-authored copy is displayed
 * exactly as authored and never translated by `SURVEY_LANGUAGE` (FR-015).
 */
export interface WelcomeContent {
  /** Researcher-authored introduction, formatted as Markdown. */
  content: string;
}

/**
 * A named, ordered stage of the survey (FR-001). The canonical list is the shared vocabulary the
 * welcome walk-through, per-task instructions, and completion copy all refer back to (SC-005).
 * Grouped by task type (each intrusion part bundles its practice-then-real stages), not by stage.
 * Descriptive only — introduces no recorded data. The canonical order/labels live in `shared/i18n.ts`
 * (`SURVEY_SECTIONS` + localized labels); see `contracts/sections.md`.
 */
export interface SurveySection {
  /** Stable key. */
  id: 'welcome' | 'word-intrusion' | 'cluster-intrusion' | 'completion' | 'explanation';
  /** Localized display label from the `nl`/`en` catalog (FR-011). */
  label: string;
  /** Fixed by the existing 001/002 flow order. */
  order: number;
  /** `true` for `explanation` only. */
  optional: boolean;
}

/** The fixed flow phases, advanced strictly in this order (FR-022, R7). */
export type Phase =
  | 'welcome'
  | 'word-instructions'
  | 'word-practice'
  | 'word-items'
  | 'cluster-instructions'
  | 'cluster-practice'
  | 'cluster-items'
  | 'debrief'
  | 'complete';

/** Which task type a phase belongs to. */
export type TaskType = 'word' | 'cluster';

/**
 * A selection is exactly one chosen candidate — a chosen word, or a chosen clusterId.
 * (The "I can't tell" variant was removed with FR-006.)
 */
export interface Selection {
  kind: 'candidate';
  value: string;
}

/**
 * The persisted form of a Response's `selection` (FR-012). Word responses store the bare wire
 * {@link Selection}; cluster responses additionally nest `selectedClusterWords` — the representative
 * words of the chosen cluster, resolved server-side from `study.clusters` and never sent on the wire
 * (the submitted {@link Selection} is unchanged). Greenfield: this replaces the former top-level
 * `Response.selectedClusterWords` (no migration, no backward-read). See `contracts/storage.md`.
 */
export type StoredSelection =
  | { kind: 'candidate'; value: string }
  | { kind: 'candidate'; value: string; selectedClusterWords: string[] };

/** Word-intrusion item as sent to the client — intruder NOT marked (R5). */
export interface ClientWordItem {
  itemId: string;
  taskType: 'word';
  /** Seeded-shuffled order (R6, seed = participantId + itemId); intruder NOT marked. */
  candidateWords: string[];
}

/** Cluster-intrusion item as sent to the client — intruder NOT marked (R5). */
export interface ClientClusterItem {
  itemId: string;
  taskType: 'cluster';
  /**
   * The target document as server-sanitized safe-subset HTML (US2, FR-006/FR-007). Rendered inertly
   * on the client; plain text passes through as readable text and malformed markup degrades safely.
   */
  targetHtml: string;
  /** Seeded-shuffled candidates; the intruding cluster is NOT marked. */
  candidates: { clusterId: string; representativeWords: string[] }[];
}

/**
 * A practice item reuses a client item DTO and adds the teaching `explanation`.
 * Practice may reveal the answer as feedback (FR-011, exempt from FR-021). For practice,
 * `itemId` carries the `practiceId` of the exercise.
 */
export type ClientPracticeItem =
  | (ClientWordItem & { explanation: string })
  | (ClientClusterItem & { explanation: string });

/**
 * Current session state returned by `GET /api/session` (and as `next` from POST /api/responses).
 * Derived per request from the Study + the participant's SessionAssignment + recorded responses;
 * never stored (data-model.md "ValidationSession").
 */
export interface SessionState {
  studyId: string;
  /** The assigned pre-defined Session (FR-023); stable across all calls for this participant. */
  sessionId: string;
  phase: Phase;
  /** Real items in the assigned Session only — practice excluded (FR-007/FR-011). */
  progress: { answered: number; total: number };
  current:
    | { phase: 'welcome'; welcome: WelcomeContent }
    | { phase: 'word-instructions' | 'cluster-instructions'; taskType: TaskType }
    | {
        phase: 'word-practice' | 'cluster-practice';
        practice: ClientPracticeItem;
        index: number;
        of: number;
      }
    | { phase: 'word-items'; item: ClientWordItem }
    | { phase: 'cluster-items'; item: ClientClusterItem }
    | { phase: 'debrief' | 'complete' };
}

/** Request body for `POST /api/responses` (contracts/api.md). */
export interface SubmitRequest {
  /** A real itemId, OR a practiceId for a practice attempt. */
  itemId: string;
  taskType: TaskType;
  selection: Selection;
  /** Optional client-measured time on the item. */
  timeTakenMs?: number;
}

/**
 * Result of `POST /api/responses`. Never carries `correct` (R5) — the client is told only that
 * the response was recorded, plus the advanced session state.
 */
export interface SubmitResult {
  /** `true` also when the response was already recorded (idempotent, FR-009). */
  recorded: boolean;
  next: SessionState;
}

/**
 * One debrief example — revealed ONLY after completion (FR-019/FR-020, US4). This is the only
 * place `correctIntruder`/`correct` are exposed to the client (R5).
 *
 * The walkthrough re-renders each answered item read-only in the session layout (US4, FR-019), so
 * the example carries the same render fields the live item had: for word items the shown
 * `candidateWords`; for cluster items the server-sanitized `targetHtml` and the candidate blocks.
 * Ground truth is still dropped except `correctIntruder` (R5).
 */
export type DebriefExample =
  | {
      itemId: string;
      taskType: 'word';
      /** The words shown for this item (session order), so the walkthrough reproduces the layout. */
      candidateWords: string[];
      /** The participant's own selection. */
      yourSelection: Selection;
      /** The correct intruder word — revealed ONLY here. */
      correctIntruder: string;
      correct: boolean;
      /** System-generated, cluster-framed explanation, never judging the participant (FR-020). */
      clusterValidityExplanation: string;
    }
  | {
      itemId: string;
      taskType: 'cluster';
      /** The server-sanitized target document HTML — same as the live item (US2, R2). */
      targetHtml: string;
      /** The candidate cluster blocks shown for this item, in the order the participant saw. */
      candidates: { clusterId: string; representativeWords: string[] }[];
      /** The participant's own selection. */
      yourSelection: Selection;
      /** The correct intruder clusterId — revealed ONLY here. */
      correctIntruder: string;
      correct: boolean;
      /** System-generated, cluster-framed explanation, never judging the participant (FR-020). */
      clusterValidityExplanation: string;
    };

/** Post-completion debrief payload. No score, pass/fail, or aggregate stats (Edge Cases). */
export interface DebriefState {
  /**
   * Random sample of up to `config.debriefSampleSize` answered real items (all of them when fewer
   * were answered), in session order (word items then cluster items), FR-019. Stable per
   * participant across fetches.
   */
  examples: DebriefExample[];
}
