/**
 * Server-built storage paths (storage.md, FR-017).
 *
 * Every read/write path is constructed here from this deployment's server-side `STUDY_ID` and the
 * validated participant UUID — NEVER from a client-supplied path segment. The constant prefix
 * `text_cluster_validation/{studyId}/` confines each deployment to its own Study subtree, so
 * concurrent studies sharing the governed root cannot touch each other's data (storage.md
 * "Per-Study isolation").
 */

/** Shared root subtree for this Study; all of its data lives under here. */
function studyRoot(studyId: string): string {
  return `text_cluster_validation/${studyId}`;
}

/** The read-only study definition. */
export function studyJsonPath(studyId: string): string {
  return `${studyRoot(studyId)}/study/study.json`;
}

/** Directory holding one `{participantId}.json` SessionAssignment per participant. */
export function sessionAssignmentsDir(studyId: string): string {
  return `${studyRoot(studyId)}/session-assignments`;
}

/** A single participant's immutable SessionAssignment file. */
export function sessionAssignmentPath(studyId: string, participantId: string): string {
  return `${sessionAssignmentsDir(studyId)}/${participantId}.json`;
}

/** A participant's responses directory (one `{itemId}.json` per answered real item). */
export function responsesDir(studyId: string, participantId: string): string {
  return `${studyRoot(studyId)}/responses/${participantId}`;
}

/** A single real Response file — the path encodes one-response-per-item uniqueness (FR-009). */
export function responsePath(studyId: string, participantId: string, itemId: string): string {
  return `${responsesDir(studyId, participantId)}/${itemId}.json`;
}

/** A participant's practice-responses directory — kept separate from `responses/` (FR-011). */
export function practiceResponsesDir(studyId: string, participantId: string): string {
  return `${studyRoot(studyId)}/practice-responses/${participantId}`;
}

/** A single PracticeResponse file (idempotent per attempt slot, FR-011). */
export function practiceResponsePath(studyId: string, participantId: string, practiceId: string): string {
  return `${practiceResponsesDir(studyId, participantId)}/${practiceId}.json`;
}
