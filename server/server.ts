import { createApp, files, getExecutionContext, server } from '@databricks/appkit';
import express from 'express';
import { createServicePrincipalStorage } from './src/lib/servicePrincipalStorage';
import { parseSurveyLanguage } from './src/lib/config';
import { createStudyProvider } from './src/services/studyProvider';
import { registerSessionRoutes, type RouteDeps } from './src/routes/session';
import { registerResponseRoutes } from './src/routes/responses';
import { registerDebriefRoutes } from './src/routes/debrief';

const appkit = await createApp({
  plugins: [files(), server({ autoStart: false })],
});

// One deployment serves exactly one Study, named by STUDY_ID (FR-017). All storage paths are
// server-built under text_cluster_validation/${STUDY_ID}/ — never from a client path segment.
const studyId = process.env.STUDY_ID;
if (!studyId) {
  throw new Error("STUDY_ID is not configured. Set STUDY_ID to this deployment's Study id (FR-017).");
}

// Service-principal Volume access with server-enforced path isolation (R9). The AppKit Files
// *plugin* enforces OBO (`asUser(req)`) and throws when called as the service principal, so this
// deployment talks to the Volume directly as its service principal via this adapter instead.
const storage = createServicePrincipalStorage(process.env.DATABRICKS_VOLUME_FILES);
const getStudy = createStudyProvider(storage, studyId);

// App-wide UI language for built-in strings (built-in chrome only, never task items; FR-013–FR-015).
// Unset/invalid values fall back to 'en'. Passed to the session service for the default welcome copy.
const language = parseSurveyLanguage(process.env);

const routeDeps: RouteDeps = { storage, studyId, getStudy, language };

appkit.server.extend((app) => {
  app.use(express.json());

  registerSessionRoutes(app, routeDeps);
  registerResponseRoutes(app, routeDeps);
  registerDebriefRoutes(app, routeDeps);

  // Optional study-owner identity endpoint (not used by the participant flow; FR-013).
  app.get('/api/current-user', (req, res) => {
    const forwardedUser = req.header('x-forwarded-user') ?? null;
    const forwardedEmail = req.header('x-forwarded-email') ?? null;
    const forwardedName = req.header('x-forwarded-user-name') ?? req.header('x-forwarded-preferred-username') ?? null;
    const context = getExecutionContext();
    const fallbackId = 'serviceUserId' in context ? context.serviceUserId : context.userId;

    res.json({
      id: forwardedUser ?? fallbackId,
      email: forwardedEmail,
      name: forwardedName ?? forwardedEmail ?? forwardedUser ?? fallbackId,
      isUserContext: forwardedUser !== null,
    });
  });
});

await appkit.server.start();
