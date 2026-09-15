/**
 * Memoized study provider. The study definition is read-only and static per deployment (one
 * deployment = one Study, FR-017), so it is loaded from the Volume once and cached. Withheld-item
 * notices (FR-016) are logged once with counts only — no cluster text or PII (R10).
 *
 * On a load failure the cache is cleared so a later request can retry (e.g. the file is uploaded
 * after the server starts); the route surfaces a generic 500.
 */

import { loadStudy, type Study } from './studyLoader';
import type { S3Storage } from '../lib/storage';

export type StudyProvider = () => Promise<Study>;

export function createStudyProvider(storage: S3Storage, studyId: string): StudyProvider {
  let cached: Promise<Study> | null = null;

  return function getStudy(): Promise<Study> {
    if (!cached) {
      cached = loadStudy(storage, studyId)
        .then(({ study, notices }) => {
          if (notices.length > 0) {
            // Count only — itemIds/reasons are not PII but we keep logs minimal (R10).
            console.warn(`[studyLoader] withheld ${notices.length} malformed item(s) for study "${studyId}" (FR-016)`);
          }
          return study;
        })
        .catch((err) => {
          cached = null;
          throw err;
        });
    }
    return cached;
  };
}
