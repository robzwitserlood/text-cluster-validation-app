/**
 * Development entry point — wraps the Express server.ts with Vite dev middleware
 * for single-process HMR development serving.
 *
 * Usage: `NODE_ENV=development tsx ./server/server-dev.ts`
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createScalewayStorage } from './src/lib/scalewayStorage';
import { validateConfig } from './src/lib/config';
import { createStudyProvider } from './src/services/studyProvider';
import { registerSessionRoutes, type RouteDeps } from './src/routes/session';
import { registerResponseRoutes } from './src/routes/responses';
import { registerDebriefRoutes } from './src/routes/debrief';

const startTime = Date.now();

try {
  const config = validateConfig();
  const storage = createScalewayStorage({
    endpoint: config.endpoint,
    region: config.region,
    bucket: config.bucket,
  });

  const app = express();
  app.use(express.json());

  let studyLoaded = false;
  try {
    const getStudy = createStudyProvider(storage, config.studyId);
    await getStudy();
    studyLoaded = true;

    const routeDeps: RouteDeps = { storage, studyId: config.studyId, getStudy, language: config.language };
    registerSessionRoutes(app, routeDeps);
    registerResponseRoutes(app, routeDeps);
    registerDebriefRoutes(app, routeDeps);
  } catch (err) {
    console.error('[server] Study load failed:', err instanceof Error ? err.message : err);
    console.error('[server] Starting in degraded mode — serving error page for all routes.');
  }

  app.get('/api/health', (_req, res) => {
    res.json({
      status: studyLoaded ? 'ok' : 'degraded',
      studyId: config.studyId,
      uptime: Date.now() - startTime,
    });
  });

  if (!studyLoaded) {
    app.use((_req, res) => {
      res.status(503).type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Survey Unavailable</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fafafa; color: #333; }
    .box { max-width: 520px; padding: 2rem; text-align: center; }
    h1 { font-size: 1.5rem; margin-bottom: 0.75rem; }
    p { color: #555; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Survey Unavailable</h1>
    <p>The study could not be loaded. Please check that the study file exists in the configured Scaleway bucket and that the bucket is publicly accessible.</p>
    <p style="font-size:0.875rem;color:#888;">Study ID: ${config.studyId}</p>
  </div>
</body>
</html>`);
    });
  } else {
    const vite = await createViteServer({
      configFile: 'client/vite.config.ts',
      server: { middlewareMode: true },
    });
    app.use(vite.middlewares);
  }

  app.listen(config.port, () => {
    console.log(`[server] Running at http://localhost:${config.port}`);
    console.log(`[server] Study: ${config.studyId} | Language: ${config.language}`);
    console.log(`[server] Vite dev server active — HMR enabled`);
  });
} catch (err) {
  console.error('[server] Fatal startup error:', err instanceof Error ? err.message : err);
  process.exit(1);
}