/**
 * Deployment configuration parsing (T005, R4, storage.md).
 *
 * The app-wide UI language is a deployment setting (`SURVEY_LANGUAGE`). This reads and validates
 * it server-side for server-generated strings, defaulting to `'en'` for any unset or invalid value
 * so a misconfigured deployment always renders in a supported language rather than failing.
 */

import { parseSurveyLanguageValue } from '../../../shared/config';

export { DEFAULT_LOCALE } from '../../../shared/config';

/**
 * Resolve the deployment UI language from an environment bag (typically `process.env`).
 *
 * Returns the configured `SURVEY_LANGUAGE` when it is exactly a supported locale (`nl`/`en`);
 * otherwise falls back to {@link DEFAULT_LOCALE}. The comparison is exact — no trimming or
 * case-folding — so only the documented values are honoured.
 */
export function parseSurveyLanguage(env: NodeJS.ProcessEnv | Record<string, string | undefined>) {
  return parseSurveyLanguageValue(env.SURVEY_LANGUAGE);
}
