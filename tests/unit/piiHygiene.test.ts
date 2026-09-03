/**
 * PII-hygiene guard (R10, FR-011, FR-014, Principle II).
 *
 * Locks in the invariants that the manual hygiene pass over `server/src/routes/` and
 * `server/src/services/` confirmed, so a later change cannot silently start leaking PII:
 *
 *  1. Client error bodies are generic — exactly `{ error: { code, message } }` with a static
 *     message, never echoing a participant id, cluster text, a selection value, or the language flag.
 *  2. Telemetry carries no PII — the only server log (the withheld-item notice in `studyProvider`)
 *     emits counts only, never cluster text, candidate words, item ids, or participant ids.
 *  3. Feature-002 additions stay out of logs and error bodies too (FR-011): the sanitized
 *     `targetHtml`, the persisted `selectedClusterWords`, and the deployment language flag.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import { sendError, type ApiErrorCode } from '../../server/src/lib/http';
import { studyJsonPath } from '../../server/src/lib/paths';
import { createStudyProvider } from '../../server/src/services/studyProvider';
import { toClientClusterItem } from '../../server/src/services/sessionService';
import type { ClusterIntrusionItem } from '../../server/src/services/studyLoader';
import { FakeStorage } from './helpers/fakeStorage';
import { makeStudy, makeStudyDoc, STUDY_ID } from './helpers/study';

const ALL_CODES: ApiErrorCode[] = [
  'invalid_participant',
  'invalid_request',
  'phase_locked',
  'not_complete',
  'server_error',
];

/** Capture the status + JSON body that {@link sendError} writes to a minimal fake Express response. */
function captureError(status: number, code: ApiErrorCode): { status: number; body: unknown } {
  let capturedStatus = 0;
  let capturedBody: unknown;
  const res = {
    status(s: number) {
      capturedStatus = s;
      return this;
    },
    json(b: unknown) {
      capturedBody = b;
      return this;
    },
  };
  sendError(res as Response, status, code);
  return { status: capturedStatus, body: capturedBody };
}

describe('PII hygiene (R10, FR-014)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('error bodies are exactly { error: { code, message } } with a static, non-interpolated message', () => {
    for (const code of ALL_CODES) {
      const { body } = captureError(400, code);

      // Shape is exactly one `error` key holding only `code` + `message` — no place to attach context.
      expect(Object.keys(body as object)).toEqual(['error']);
      const error = (body as { error: Record<string, unknown> }).error;
      expect(Object.keys(error).sort()).toEqual(['code', 'message']);
      expect(error.code).toBe(code);
      expect(typeof error.message).toBe('string');
      expect((error.message as string).length).toBeGreaterThan(0);
      // A static message has no unresolved template markers (would signal echoed input).
      expect(error.message as string).not.toMatch(/[$%{}]|\bundefined\b|\[object/);
    }
  });

  it('error bodies never echo a participant id, cluster text, or a selection value', () => {
    // Tokens that MUST NOT appear in any client-facing error body. `sendError` takes no dynamic
    // input today; this fails loudly if someone later starts threading request context into it.
    const forbidden = [
      'a3f1c2d4-0000-4000-8000-000000000000', // a participant UUID
      'keyboard', // a candidate word / selection value (fixture)
      'Soil and nitrogen deposition.', // cluster target text (fixture)
      'c3', // a selection value / cluster id
      'SURVEY_LANGUAGE', // the deployment language env var name (FR-011)
    ];
    for (const code of ALL_CODES) {
      const serialized = JSON.stringify(captureError(400, code).body);
      for (const token of forbidden) {
        expect(serialized).not.toContain(token);
      }
    }
  });

  it('the withheld-item telemetry logs counts only — no cluster text, item ids, or participant ids', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // A study with one malformed word item (intruder not among candidates) → one withheld notice.
    const doc = makeStudyDoc() as ReturnType<typeof makeStudyDoc> & {
      wordItems: { itemId: string; intruderWord: string }[];
    };
    doc.wordItems[0].intruderWord = 'not-a-listed-candidate';

    const storage = new FakeStorage();
    storage.seed(studyJsonPath(STUDY_ID), JSON.stringify(doc));

    await createStudyProvider(storage, STUDY_ID)();

    // Something was logged (the withheld-item notice), and it states the count.
    expect(warnSpy).toHaveBeenCalled();
    const logged = [...logSpy.mock.calls, ...warnSpy.mock.calls, ...errorSpy.mock.calls].flat().join(' ');
    expect(logged).toContain('1'); // the withheld-item count

    // Every candidate word / target text from the study must stay out of the logs (R10).
    const clusterText = [
      ...doc.clusters.flatMap((c) => c.representativeWords),
      ...doc.wordItems.flatMap((w) => w.candidateWords),
      ...doc.clusterItems.map((c) => c.targetText),
      'not-a-listed-candidate', // the malformed value we injected
    ];
    for (const token of clusterText) {
      expect(logged).not.toContain(token);
    }
  });
});

describe('PII hygiene — feature-002 additions (FR-011)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Spy every console channel; return a joiner over whatever was written across all of them. */
  function spyConsole(): () => string {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    return () =>
      [...log.mock.calls, ...warn.mock.calls, ...error.mock.calls, ...info.mock.calls, ...debug.mock.calls]
        .flat()
        .join(' ');
  }

  it('mapping a formatted cluster document to its DTO never logs the target text or selectedClusterWords', () => {
    const study = makeStudy();
    const readAll = spyConsole();

    // A distinctive researcher-authored HTML document whose visible text must not reach any log.
    const item: ClusterIntrusionItem = {
      itemId: 'ci1',
      taskType: 'cluster',
      targetTextId: 't1',
      targetText: '<h3>Confidential deposition notes</h3><p>Soil <strong>nitrogen</strong> levels.</p>',
      candidateClusterIds: ['c1', 'c2', 'c3'],
      intruderClusterId: 'c3',
    };

    const dto = toClientClusterItem(item, study, 'a3f1c2d4-0000-4000-8000-000000000000');
    // Sanity: the seam produced formatted, inert HTML (so the assertion below is meaningful).
    expect(dto.targetHtml).toContain('<h3>');

    const logged = readAll();
    // Neither the authored document text nor the persisted representative words leaked to a log.
    const forbidden = [
      'Confidential deposition notes',
      'nitrogen',
      dto.targetHtml,
      ...study.clusters.flatMap((c) => c.representativeWords), // becomes selectedClusterWords on record
    ];
    for (const token of forbidden) {
      expect(logged).not.toContain(token);
    }
  });

  it('the deployment language flag never appears in telemetry', async () => {
    const readAll = spyConsole();

    // Exercise the one server log path (withheld-item notice) with the language env var set.
    const prev = process.env.SURVEY_LANGUAGE;
    process.env.SURVEY_LANGUAGE = 'nl';
    try {
      const doc = makeStudyDoc() as ReturnType<typeof makeStudyDoc> & {
        wordItems: { itemId: string; intruderWord: string }[];
      };
      doc.wordItems[0].intruderWord = 'not-a-listed-candidate';
      const storage = new FakeStorage();
      storage.seed(studyJsonPath(STUDY_ID), JSON.stringify(doc));
      await createStudyProvider(storage, STUDY_ID)();
    } finally {
      if (prev === undefined) delete process.env.SURVEY_LANGUAGE;
      else process.env.SURVEY_LANGUAGE = prev;
    }

    const logged = readAll();
    // Neither the env var name nor its value should ever be echoed into telemetry (FR-011).
    for (const token of ['SURVEY_LANGUAGE', 'nl', 'language']) {
      expect(logged).not.toContain(token);
    }
  });
});
