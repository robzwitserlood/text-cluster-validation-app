/**
 * Self-contained e2e server for the Playwright smoke test (T045).
 *
 * It boots the SAME participant API the production server exposes — the real
 * `registerSessionRoutes`/`registerResponseRoutes`/`registerDebriefRoutes` handlers over the real
 * `studyLoader`/`sessionService`/`responseService` — but backs them with an in-memory
 * {@link FakeStorage} seeded with {@link e2eStudyDoc} instead of a real storage backend. This lets the
 * full flow (phase gating, idempotency, DTO stripping, debrief) run in CI with no external
 * credentials while still exercising the genuine server logic and the built client bundle.
 *
 * The built client (`client/dist`, produced by `npm run build:client`) is served statically with an
 * SPA fallback, so the browser drives the same React app users see.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Server } from 'node:http';
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
const port = Number(process.env.PORT ?? 8000);

export interface HarnessOptions {
  port?: number;
  distDir?: string;
}

export function createApp(options: HarnessOptions = {}) {
  const distDir =
    options.distDir ??
    path.resolve(projectRoot, process.env.CLIENT_DIST_DIR ?? 'client/dist');

  const storage = new FakeStorage();
  storage.seed(studyJsonPath(E2E_STUDY_ID), JSON.stringify(e2eStudyDoc));

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

  app.use(express.static(distDir));
  app.use((_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });

  return { app, storage };
}

export function startServer(options: HarnessOptions = {}): Promise<Server> {
  return new Promise((resolve) => {
    const p = options.port ?? port;
    const { app } = createApp(options);
    const server = app.listen(p, () => {
      // eslint-disable-next-line no-console
      console.log(`[e2e-harness] study "${E2E_STUDY_ID}" serving on http://localhost:${p}`);
      resolve(server);
    });
  });
}

export function stopServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  startServer().catch((err) => {
    console.error('[e2e-harness] Failed to start:', err);
    process.exit(1);
  });
}