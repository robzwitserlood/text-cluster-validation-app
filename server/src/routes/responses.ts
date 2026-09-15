/**
 * `POST /api/responses` (T018, contracts/api.md).
 *
 * Validates the participant header and request body, records the answer (or practice attempt) via
 * {@link recordResponse}, then returns `SubmitResult { recorded, next }` — `next` is the advanced
 * `SessionState`, identical in shape to `GET /api/session`. `correct` is never returned (R5).
 *
 * Error mapping: 400 invalid header; 422 invalid/unknown selection; 409 `phase_locked` for a
 * cluster submission while the cluster segment is locked (FR-022).
 */

import type { Express } from 'express';
import { isValidParticipantId, SubmitRequestSchema } from '../../../shared/schemas';
import type { SubmitResult } from '../../../shared/types';
import { parseAcknowledgedInstructions, sendError } from '../lib/http';
import { ensureAssignment, getSessionState, type ServiceContext } from '../services/sessionService';
import { recordResponse, ResponseError } from '../services/responseService';
import type { RouteDeps } from './session';

export function registerResponseRoutes(app: Express, deps: RouteDeps): void {
  app.post('/api/responses', async (req, res) => {
    const participantId = req.header('X-Participant-Id');
    if (!isValidParticipantId(participantId)) return sendError(res, 400, 'invalid_participant');

    const parsed = SubmitRequestSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 422, 'invalid_request');

    try {
      const study = await deps.getStudy();
      const ctx: ServiceContext = { storage: deps.storage, studyId: deps.studyId, study };

      const acknowledgedInstructions = parseAcknowledgedInstructions(req.header('X-Ack-Instructions'));
      const assignmentPromise = ensureAssignment(ctx, participantId);
      const result = await recordResponse(ctx, { participantId, body: parsed.data });
      const assignment = await assignmentPromise;
      const next = await getSessionState(ctx, { participantId, acknowledgedInstructions }, { assignment, practiceAnswered: result.practiceAnswered });

      const body: SubmitResult = { recorded: result.recorded, next };
      res.json(body);
    } catch (err) {
      if (err instanceof ResponseError) return sendError(res, err.status, err.code);
      sendError(res, 500, 'server_error');
    }
  });
}
