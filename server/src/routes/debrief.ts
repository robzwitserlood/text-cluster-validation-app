/**
 * `GET /api/debrief` (T032, contracts/api.md).
 *
 * Validates the `X-Participant-Id` header, then returns the post-completion `DebriefState` via
 * {@link buildDebrief}. This is the ONLY endpoint that reveals ground truth (`correctIntruder`),
 * and only after completion (R5): requested early it returns `409 Conflict` (`code: not_complete`)
 * so the correct answer is never disclosed before the participant finishes (FR-021). Errors are
 * generic and PII-free (R10).
 */

import type { IAppRouter } from '@databricks/appkit';
import { isValidParticipantId } from '../../../shared/schemas';
import { sendError } from '../lib/http';
import { buildDebrief, DebriefError } from '../services/sessionService';
import type { RouteDeps } from './session';

export function registerDebriefRoutes(app: IAppRouter, deps: RouteDeps): void {
  app.get('/api/debrief', async (req, res) => {
    const participantId = req.header('X-Participant-Id');
    if (!isValidParticipantId(participantId)) return sendError(res, 400, 'invalid_participant');

    try {
      const study = await deps.getStudy();
      const debrief = await buildDebrief(
        { storage: deps.storage, studyId: deps.studyId, study, language: deps.language },
        participantId
      );
      res.json(debrief);
    } catch (err) {
      if (err instanceof DebriefError) return sendError(res, err.status, err.code);
      sendError(res, 500, 'server_error');
    }
  });
}
