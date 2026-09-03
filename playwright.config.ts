import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the smoke / e2e flow (tests/smoke.spec.ts, T045/T031).
 *
 * Two harness instances back the specs so the deployment-language slice (US3) can be exercised
 * end-to-end. Each `webServer` boots the self-contained e2e harness (tests/e2e/harness.ts) — it
 * builds the client once, then serves the built SPA plus the real participant API over an in-memory
 * study, so the navigation specs run with no Databricks workspace:
 *
 *  - `chromium` (English, `SURVEY_LANGUAGE=en`) runs the whole flow but skips the `@nl` test;
 *  - `chromium-nl` (Dutch, `SURVEY_LANGUAGE=nl`) runs only the `@nl` deployment-language test.
 *
 * Set `BASE_URL` to point at an already-running deployment instead (then both harnesses are
 * skipped); in that mode only the default-language project runs.
 */
const EN_PORT = Number(process.env.DATABRICKS_APP_PORT ?? 8000);
const NL_PORT = EN_PORT + 1;

const usingExternalBaseUrl = Boolean(process.env.BASE_URL);

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], baseURL: process.env.BASE_URL ?? `http://localhost:${EN_PORT}` },
      // The @nl test needs a Dutch deployment; it runs under chromium-nl instead.
      grepInvert: /@nl/,
    },
    // Skip the Dutch project when pointing at an external deployment (its language is fixed).
    ...(usingExternalBaseUrl
      ? []
      : [
          {
            name: 'chromium-nl',
            use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${NL_PORT}` },
            grep: /@nl/,
          },
        ]),
  ],
  webServer: usingExternalBaseUrl
    ? undefined
    : [
        {
          command:
            'npm run build:client && SURVEY_LANGUAGE=nl CLIENT_DIST_DIR=client/dist-nl npm run build:client && npx tsx tests/e2e/harness.ts',
          url: `http://localhost:${EN_PORT}`,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          env: {
            STUDY_ID: 'study-e2e',
            SURVEY_LANGUAGE: 'en',
            CLIENT_DIST_DIR: 'client/dist-en',
            PORT: String(EN_PORT),
          },
        },
        {
          command: 'npx tsx tests/e2e/harness.ts',
          url: `http://localhost:${NL_PORT}`,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          env: {
            STUDY_ID: 'study-e2e',
            SURVEY_LANGUAGE: 'nl',
            CLIENT_DIST_DIR: 'client/dist-nl',
            PORT: String(NL_PORT),
          },
        },
      ],
});
