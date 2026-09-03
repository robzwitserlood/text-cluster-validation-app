/**
 * `GET /api/session` (T017, contracts/api.md).
 *
 * Validates the `X-Participant-Id` header, then returns the participant's current `SessionState`
 * (first-visit Session assignment handled transparently by {@link getSessionState}). While in a
 * word phase the response carries no cluster content (FR-022) — the resolver simply never produces
 * it. Errors are generic and PII-free (R10).
 */

import type { IAppRouter } from '@databricks/appkit';
import { isValidParticipantId } from '../../../shared/schemas';
import type { Locale } from '../../../shared/i18n';
import { parseAcknowledgedInstructions, sendError } from '../lib/http';
import { getSessionState } from '../services/sessionService';
import type { VolumeStorage } from '../lib/storage';
import type { StudyProvider } from '../services/studyProvider';

export interface RouteDeps {
  storage: VolumeStorage;
  studyId: string;
  getStudy: StudyProvider;
  /** Deployment UI language, used only for the server-supplied default welcome copy (US1, FR-012). */
  language?: Locale;
}

export function registerSessionRoutes(app: IAppRouter, deps: RouteDeps): void {
  app.get('/api/session', async (req, res) => {
    const participantId = req.header('X-Participant-Id');
    if (!isValidParticipantId(participantId)) return sendError(res, 400, 'invalid_participant');

    try {
      const study = await deps.getStudy();
      const state = await getSessionState(
        { storage: deps.storage, studyId: deps.studyId, study, language: deps.language },
        {
          participantId,
          acknowledgedInstructions: parseAcknowledgedInstructions(req.header('X-Ack-Instructions')),
        }
      );
      res.json(state);
    } catch {
      sendError(res, 500, 'server_error');
    }
  });
}
