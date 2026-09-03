/**
 * Self-contained e2e server for the Playwright smoke test (T045).
 *
 * It boots the SAME participant API the production server exposes — the real
 * `registerSessionRoutes`/`registerResponseRoutes`/`registerDebriefRoutes` handlers over the real
 * `studyLoader`/`sessionService`/`responseService` — but backs them with an in-memory
 * {@link FakeStorage} seeded with {@link e2eStudyDoc} instead of a Databricks Volume. This lets the
 * full flow (phase gating, idempotency, DTO stripping, debrief) run in CI with no workspace
 * credentials while still exercising the genuine server logic and the built client bundle.
 *
 * The built client (`client/dist`, produced by `npm run build:client`) is served statically with an
 * SPA fallback, so the browser drives the same React app users see. `IAppRouter` is `express.Router`
 * (AppKit), so the route registrars mount directly on a plain Express router.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { registerSessionRoutes, type RouteDeps } from '../../server/src/routes/session';
import { registerResponseRoutes } from '../../server/src/routes/responses';
import { registerDebriefRoutes } from '../../server/src/routes/debrief';
import { parseSurveyLanguage } from '../../server/src/lib/config';
import { createStudyProvider } from '../../server/src/services/studyProvider';
import { studyJsonPath } from '../../server/src/lib/paths';
import { FakeStorage } from '../unit/helpers/fakeStorage';
import { E2E_STUDY_ID, e2eStudyDoc } from './fixtures/study';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const distDir = path.resolve(projectRoot, process.env.CLIENT_DIST_DIR ?? 'client/dist');
const port = Number(process.env.PORT ?? process.env.DATABRICKS_APP_PORT ?? 8000);

// In-memory Volume seeded with the fixture study, loaded through the real provider/loader.
const storage = new FakeStorage();
storage.seed(studyJsonPath(E2E_STUDY_ID), JSON.stringify(e2eStudyDoc));

// Deployment UI language (from SURVEY_LANGUAGE; default 'en') drives server-generated default
// welcome/debrief copy. Client chrome is baked into the built bundle from the same env var.
const language = parseSurveyLanguage(process.env);
const deps: RouteDeps = {
  storage,
  studyId: E2E_STUDY_ID,
  getStudy: createStudyProvider(storage, E2E_STUDY_ID),
  language,
};

const app = express();
app.use(express.json());

const api = express.Router();
registerSessionRoutes(api, deps);
registerResponseRoutes(api, deps);
registerDebriefRoutes(api, deps);
app.use(api);

// Serve the built SPA; any non-API, non-asset path falls back to index.html (client-side routing).
app.use(express.static(distDir));
app.use((_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[e2e-harness] study "${E2E_STUDY_ID}" serving on http://localhost:${port}`);
});
