/**
 * Deployment configuration parsing and validation.
 *
 * Reads S3-compatible bucket configuration, study identifier, survey language, and
 * server port from environment variables. Validates all required fields at startup
 * and reports clear errors for missing/invalid configuration.
 */

import { parseSurveyLanguageValue } from '../../../shared/config';

export { DEFAULT_LOCALE } from '../../../shared/config';

export interface ServerConfig {
  endpoint: string;
  region: string;
  bucket: string;
  studyId: string;
  language: 'en' | 'nl';
  port: number;
}

export function validateConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const errors: string[] = [];

  const bucket = env.SCALEWAY_BUCKET;
  if (!bucket) errors.push('Missing required configuration: SCALEWAY_BUCKET');

  const studyId = env.STUDY_ID;
  if (!studyId) errors.push('Missing required configuration: STUDY_ID');

  const endpoint = env.SCALEWAY_ENDPOINT || 'https://s3.fr-par.scw.cloud';
  const region = env.SCALEWAY_REGION || 'fr-par';
  const language = parseSurveyLanguageValue(env.SURVEY_LANGUAGE);

  const portRaw = env.PORT || '3001';
  const port = parseInt(portRaw, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push(`Invalid PORT: "${portRaw}" (must be 1–65535)`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return {
    endpoint,
    region,
    bucket: bucket as string,
    studyId: studyId as string,
    language,
    port: isNaN(port) ? 3001 : port,
  };
}

export function parseSurveyLanguage(env: NodeJS.ProcessEnv | Record<string, string | undefined>) {
  return parseSurveyLanguageValue(env.SURVEY_LANGUAGE);
}