import { describe, it, expect } from 'vitest';
import { recordResponse, ResponseError, type Response } from '../../server/src/services/responseService';
import { toClientClusterItem, toClientWordItem, type ServiceContext } from '../../server/src/services/sessionService';
import { practiceResponsePath, responsePath, sessionAssignmentPath } from '../../server/src/lib/paths';
import { FakeStorage } from './helpers/fakeStorage';
import { HTML_TARGET_UNSAFE, HTML_TARGET_WELLFORMED, NGRAM_1_2_WORDS, makeStudy, STUDY_ID } from './helpers/study';

/** The representative words nested on a persisted cluster selection (FR-012), or undefined for word responses. */
function clusterWords(r: Response): string[] | undefined {
  return 'selectedClusterWords' in r.selection ? r.selection.selectedClusterWords : undefined;
}

/** T014 (US1): server-side correctness, idempotent per-item write, DTO stripping, separate practice store (FR-005/FR-009/FR-011, R5). */
describe('responseService', () => {
  function makeCtx(storage: FakeStorage): ServiceContext {
    return { storage, studyId: STUDY_ID, study: makeStudy() };
  }

  function readResponse(storage: FakeStorage, path: string): Response {
    return JSON.parse(storage.files.get(path) as string) as Response;
  }

  it('records a word response with correctness computed server-side and no intruder field', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);

    const result = await recordResponse(ctx, {
      participantId: 'p-1',
      body: { itemId: 'w1', taskType: 'word', selection: { kind: 'candidate', value: 'keyboard' } },
    });
    expect(result.recorded).toBe(true);

    const path = responsePath(STUDY_ID, 'p-1', 'w1');
    const stored = readResponse(storage, path);
    expect(stored).toMatchObject({ itemId: 'w1', clusterId: 'c1', correct: true, taskType: 'word' });
    expect(storage.files.get(path)).not.toContain('intruder');
  });

  it('computes correct=false when the selection is not the intruder', async () => {
    const storage = new FakeStorage();
    await recordResponse(makeCtx(storage), {
      participantId: 'p-1',
      body: { itemId: 'w1', taskType: 'word', selection: { kind: 'candidate', value: 'soil' } },
    });
    expect(readResponse(storage, responsePath(STUDY_ID, 'p-1', 'w1')).correct).toBe(false);
  });

  it('is idempotent per (participant, item): a second submit never overwrites the first', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);

    await recordResponse(ctx, {
      participantId: 'p-1',
      body: { itemId: 'w1', taskType: 'word', selection: { kind: 'candidate', value: 'keyboard' } },
    });
    const second = await recordResponse(ctx, {
      participantId: 'p-1',
      body: { itemId: 'w1', taskType: 'word', selection: { kind: 'candidate', value: 'soil' } },
    });

    expect(second.recorded).toBe(true);
    expect(readResponse(storage, responsePath(STUDY_ID, 'p-1', 'w1')).selection.value).toBe('keyboard');
  });

  it('rejects a selection that is not a displayed candidate and records nothing (FR-002)', async () => {
    const storage = new FakeStorage();
    await expect(
      recordResponse(makeCtx(storage), {
        participantId: 'p-1',
        body: { itemId: 'w1', taskType: 'word', selection: { kind: 'candidate', value: 'not-a-candidate' } },
      })
    ).rejects.toBeInstanceOf(ResponseError);
    expect(await storage.exists(responsePath(STUDY_ID, 'p-1', 'w1'))).toBe(false);
  });

  it('records a practice attempt under practice-responses/ (not responses/) and marks it isPractice (FR-011)', async () => {
    const storage = new FakeStorage();
    const result = await recordResponse(makeCtx(storage), {
      participantId: 'p-1',
      body: { itemId: 'wp1', taskType: 'word', selection: { kind: 'candidate', value: 'wrench' } },
    });
    expect(result.recorded).toBe(true);

    const practicePath = practiceResponsePath(STUDY_ID, 'p-1', 'wp1');
    expect(await storage.exists(practicePath)).toBe(true);
    expect(await storage.exists(responsePath(STUDY_ID, 'p-1', 'wp1'))).toBe(false);
    const stored = JSON.parse(storage.files.get(practicePath) as string);
    expect(stored).toMatchObject({ practiceId: 'wp1', isPractice: true, correct: true });
  });

  it('locks the cluster segment in US1 (409 phase_locked, FR-022)', async () => {
    const storage = new FakeStorage();
    await expect(
      recordResponse(makeCtx(storage), {
        participantId: 'p-1',
        body: { itemId: 'ci1', taskType: 'cluster', selection: { kind: 'candidate', value: 'c3' } },
      })
    ).rejects.toMatchObject({ status: 409, code: 'phase_locked' });
  });

  it('strips the intruder from the client word item DTO (R5)', () => {
    const study = makeStudy();
    const dto = toClientWordItem(study.wordItems[0], 'p-1');
    expect(JSON.stringify(dto)).not.toContain('intruder');
    expect(dto.candidateWords.sort()).toEqual([...study.wordItems[0].candidateWords].sort());
  });

  // --- T024 (US2): cluster correctness + the precise phase gate -------------------------------

  /** Assign s-A and mark its word items (w1, w2) answered so the cluster segment is unlocked. */
  function unlockClusterSegment(storage: FakeStorage, participantId: string): void {
    storage.seed(
      sessionAssignmentPath(STUDY_ID, participantId),
      JSON.stringify({ studyId: STUDY_ID, participantId, sessionId: 's-A', assignedAt: 'x', schemaVersion: 1 })
    );
    storage.seed(responsePath(STUDY_ID, participantId, 'w1'), '{}');
    storage.seed(responsePath(STUDY_ID, participantId, 'w2'), '{}');
  }

  it('records a cluster response with correctness computed vs intruderClusterId, no intruder field', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);
    unlockClusterSegment(storage, 'p-1');

    const result = await recordResponse(ctx, {
      participantId: 'p-1',
      body: { itemId: 'ci1', taskType: 'cluster', selection: { kind: 'candidate', value: 'c3' } },
    });
    expect(result.recorded).toBe(true);

    const path = responsePath(STUDY_ID, 'p-1', 'ci1');
    const stored = readResponse(storage, path);
    // ci1's intruderClusterId is 'c3' -> correct; clusterId links the response to the judged cluster.
    expect(stored).toMatchObject({ itemId: 'ci1', taskType: 'cluster', clusterId: 'c3', correct: true });
    expect(storage.files.get(path)).not.toContain('intruder');
  });

  it('computes correct=false when the chosen cluster is not the intruder', async () => {
    const storage = new FakeStorage();
    unlockClusterSegment(storage, 'p-1');
    await recordResponse(makeCtx(storage), {
      participantId: 'p-1',
      body: { itemId: 'ci1', taskType: 'cluster', selection: { kind: 'candidate', value: 'c1' } },
    });
    expect(readResponse(storage, responsePath(STUDY_ID, 'p-1', 'ci1')).correct).toBe(false);
  });

  it('returns 409 phase_locked for a cluster submission while word items remain, recording nothing', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);
    storage.seed(
      sessionAssignmentPath(STUDY_ID, 'p-1'),
      JSON.stringify({ studyId: STUDY_ID, participantId: 'p-1', sessionId: 's-A', assignedAt: 'x', schemaVersion: 1 })
    );
    storage.seed(responsePath(STUDY_ID, 'p-1', 'w1'), '{}'); // w2 still unanswered -> locked

    await expect(
      recordResponse(ctx, {
        participantId: 'p-1',
        body: { itemId: 'ci1', taskType: 'cluster', selection: { kind: 'candidate', value: 'c3' } },
      })
    ).rejects.toMatchObject({ status: 409, code: 'phase_locked' });
    expect(await storage.exists(responsePath(STUDY_ID, 'p-1', 'ci1'))).toBe(false);
  });

  // --- T024 (FR-012): cluster responses nest the representative words UNDER `selection` ----------

  it("nests the selected cluster's representative words under selection, no top-level field (FR-012)", async () => {
    const storage = new FakeStorage();
    unlockClusterSegment(storage, 'p-1');
    await recordResponse(makeCtx(storage), {
      participantId: 'p-1',
      // c3's representativeWords in the test study are ['code', 'byte'].
      body: { itemId: 'ci1', taskType: 'cluster', selection: { kind: 'candidate', value: 'c3' } },
    });
    const path = responsePath(STUDY_ID, 'p-1', 'ci1');
    // SC-009: the words live under `selection`, and there is NO top-level `selectedClusterWords`.
    expect(clusterWords(readResponse(storage, path))).toEqual(['code', 'byte']);
    const raw = JSON.parse(storage.files.get(path) as string) as Record<string, unknown>;
    expect(raw.selectedClusterWords).toBeUndefined();
    expect((raw.selection as Record<string, unknown>).selectedClusterWords).toEqual(['code', 'byte']);
  });

  it('resolves selection.selectedClusterWords from the chosen cluster, not the intruder (FR-012)', async () => {
    const storage = new FakeStorage();
    unlockClusterSegment(storage, 'p-1');
    await recordResponse(makeCtx(storage), {
      participantId: 'p-1',
      // Wrong pick c1 -> its own words ['soil', 'nitrogen'], independent of correctness.
      body: { itemId: 'ci1', taskType: 'cluster', selection: { kind: 'candidate', value: 'c1' } },
    });
    const stored = readResponse(storage, responsePath(STUDY_ID, 'p-1', 'ci1'));
    expect(stored.correct).toBe(false);
    expect(clusterWords(stored)).toEqual(['soil', 'nitrogen']);
  });

  it('leaves word responses unchanged — bare selection, no selectedClusterWords anywhere (FR-012)', async () => {
    const storage = new FakeStorage();
    await recordResponse(makeCtx(storage), {
      participantId: 'p-1',
      body: { itemId: 'w1', taskType: 'word', selection: { kind: 'candidate', value: 'keyboard' } },
    });
    const stored = readResponse(storage, responsePath(STUDY_ID, 'p-1', 'w1'));
    expect(clusterWords(stored)).toBeUndefined();
    expect(storage.files.get(responsePath(STUDY_ID, 'p-1', 'w1'))).not.toContain('selectedClusterWords');
  });

  it('records a cluster whose representative words are five n-grams in range (1,2) under selection (FR-014)', async () => {
    const storage = new FakeStorage();
    const study = makeStudy();
    // Represent the chosen cluster (c1) as five unigram/bigram terms (FR-014).
    study.clusters.find((c) => c.clusterId === 'c1')!.representativeWords = [...NGRAM_1_2_WORDS];
    const ctx: ServiceContext = { storage, studyId: STUDY_ID, study };
    unlockClusterSegment(storage, 'p-ng');

    await recordResponse(ctx, {
      participantId: 'p-ng',
      body: { itemId: 'ci1', taskType: 'cluster', selection: { kind: 'candidate', value: 'c1' } },
    });
    const stored = readResponse(storage, responsePath(STUDY_ID, 'p-ng', 'ci1'));
    expect(clusterWords(stored)).toEqual(NGRAM_1_2_WORDS);
    expect(clusterWords(stored)).toHaveLength(5);
  });

  // --- T024 (FR-013): HTML cluster target documents flow through the 002 sanitiser to a safe subset

  it('renders a well-formed HTML cluster target document as formatted, inert markup (FR-013)', () => {
    const study = makeStudy();
    study.clusterItems[0].targetText = HTML_TARGET_WELLFORMED;
    const dto = toClientClusterItem(study.clusterItems[0], study, 'p-html');
    // Formatting is preserved (heading + emphasis) on the sanitized DTO.
    expect(dto.targetHtml).toContain('<h3>Healthy soil</h3>');
    expect(dto.targetHtml).toContain('<strong>levels</strong>');
  });

  it('strips dangerous markup from an unsafe HTML cluster target document (safe handling, FR-013)', () => {
    const study = makeStudy();
    study.clusterItems[0].targetText = HTML_TARGET_UNSAFE;
    const dto = toClientClusterItem(study.clusterItems[0], study, 'p-xss');
    // The readable text survives, but every injection vector is neutralised by the sanitiser.
    expect(dto.targetHtml).toContain('Soil notes.');
    expect(dto.targetHtml).not.toContain('<script');
    expect(dto.targetHtml).not.toContain('window.__xss');
    expect(dto.targetHtml).not.toContain('onerror');
    expect(dto.targetHtml).not.toContain('javascript:');
  });

  it('rejects a cluster selection that is not a displayed candidate once unlocked (FR-002)', async () => {
    const storage = new FakeStorage();
    unlockClusterSegment(storage, 'p-1');
    await expect(
      recordResponse(makeCtx(storage), {
        participantId: 'p-1',
        body: { itemId: 'ci1', taskType: 'cluster', selection: { kind: 'candidate', value: 'c-nope' } },
      })
    ).rejects.toMatchObject({ status: 422 });
    expect(await storage.exists(responsePath(STUDY_ID, 'p-1', 'ci1'))).toBe(false);
  });

  // --- T038 (US5): a persisted Response carries the full set needed for per-cluster validity ----

  it('persists every field needed to quantify validity per cluster downstream (FR-005/FR-018/SC-005)', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);

    // Cover both task types: a word response and a cluster response.
    await recordResponse(ctx, {
      participantId: 'p-1',
      body: { itemId: 'w1', taskType: 'word', selection: { kind: 'candidate', value: 'keyboard' }, timeTakenMs: 8231 },
    });
    unlockClusterSegment(storage, 'p-2');
    await recordResponse(ctx, {
      participantId: 'p-2',
      body: { itemId: 'ci1', taskType: 'cluster', selection: { kind: 'candidate', value: 'c3' } },
    });

    const word = readResponse(storage, responsePath(STUDY_ID, 'p-1', 'w1'));
    const cluster = readResponse(storage, responsePath(STUDY_ID, 'p-2', 'ci1'));

    for (const r of [word, cluster]) {
      // Every field a study owner needs to group by clusterId and tally correctness (FR-018, SC-005).
      expect(r.studyId).toBe(STUDY_ID);
      expect(typeof r.participantId).toBe('string');
      expect(typeof r.itemId).toBe('string');
      expect(typeof r.clusterId).toBe('string');
      expect(r.taskType === 'word' || r.taskType === 'cluster').toBe(true);
      expect(r.selection).toMatchObject({ kind: 'candidate', value: expect.any(String) });
      expect(typeof r.correct).toBe('boolean');
      expect(Number.isNaN(Date.parse(r.submittedAt))).toBe(false); // ISO 8601 timestamp (FR-005)
    }

    // clusterId links each response to the judged cluster; the optional timing field round-trips.
    expect(word).toMatchObject({
      participantId: 'p-1',
      itemId: 'w1',
      taskType: 'word',
      clusterId: 'c1',
      timeTakenMs: 8231,
    });
    expect(cluster).toMatchObject({ participantId: 'p-2', itemId: 'ci1', taskType: 'cluster', clusterId: 'c3' });
  });
});
