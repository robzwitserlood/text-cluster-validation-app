import { describe, it, expect } from 'vitest';
import {
  buildDebrief,
  DebriefError,
  getSessionState,
  type ServiceContext,
} from '../../server/src/services/sessionService';
import { practiceResponsePath, responsePath, sessionAssignmentPath } from '../../server/src/lib/paths';
import { FakeStorage } from './helpers/fakeStorage';
import { makeStudy, STUDY_ID } from './helpers/study';

/** T013 (US1): session assignment (stable, least-utilized) + word phase order + real-item progress (FR-007/FR-011/FR-023). */
describe('sessionService', () => {
  function makeCtx(storage: FakeStorage): ServiceContext {
    return { storage, studyId: STUDY_ID, study: makeStudy() };
  }

  function seedAssignment(storage: FakeStorage, participantId: string, sessionId: string): void {
    storage.seed(
      sessionAssignmentPath(STUDY_ID, participantId),
      JSON.stringify({
        studyId: STUDY_ID,
        participantId,
        sessionId,
        assignedAt: '2026-06-24T00:00:00Z',
        schemaVersion: 1,
      })
    );
  }

  const noAck = new Set<'welcome' | 'word' | 'cluster'>();
  const ackWelcome = new Set<'welcome' | 'word' | 'cluster'>(['welcome']);
  const ackWord = new Set<'welcome' | 'word' | 'cluster'>(['welcome', 'word']);

  it('assigns a Session on first visit, writes it once, and never changes it', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);

    const first = await getSessionState(ctx, { participantId: 'p-1', acknowledgedInstructions: noAck });
    expect(await storage.exists(sessionAssignmentPath(STUDY_ID, 'p-1'))).toBe(true);
    expect(first.phase).toBe('welcome');

    const second = await getSessionState(ctx, { participantId: 'p-1', acknowledgedInstructions: noAck });
    expect(second.sessionId).toBe(first.sessionId);
  });

  // --- T012 (US1): welcome phase gating + resume never re-shows welcome (FR-005/FR-012) --------

  it('returns the welcome phase only at the very start, carrying the built-in default copy (FR-012)', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);
    seedAssignment(storage, 'p-w', 's-A');

    const state = await getSessionState(ctx, { participantId: 'p-w', acknowledgedInstructions: noAck });
    expect(state.phase).toBe('welcome');
    // Built-in default welcome copy (the fixture study omits `study.welcome`), all non-empty.
    const current = state.current as Extract<typeof state.current, { phase: 'welcome' }>;
    expect(current.welcome.content.length).toBeGreaterThan(0);
    // Welcome never resets or duplicates recorded progress (FR-005).
    expect(state.progress).toEqual({ answered: 0, total: 3 });
  });

  it('uses researcher-authored welcome copy verbatim when the study supplies it (FR-012/FR-015)', async () => {
    const storage = new FakeStorage();
    const study = makeStudy();
    study.welcome = { content: '# Welkom\n\nWat je doet.\n\nWaarom het telt.' };
    const ctx: ServiceContext = { storage, studyId: STUDY_ID, study };
    seedAssignment(storage, 'p-wa', 's-A');

    const state = await getSessionState(ctx, { participantId: 'p-wa', acknowledgedInstructions: noAck });
    const current = state.current as Extract<typeof state.current, { phase: 'welcome' }>;
    expect(current.welcome).toEqual({ content: '# Welkom\n\nWat je doet.\n\nWaarom het telt.' });
  });

  it('advances past welcome to the word instructions once welcome is acknowledged', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);
    seedAssignment(storage, 'p-w2', 's-A');

    const state = await getSessionState(ctx, { participantId: 'p-w2', acknowledgedInstructions: ackWelcome });
    expect(state.phase).toBe('word-instructions');
  });

  it('never re-shows welcome to a returning in-progress participant, even without the welcome ack (FR-005)', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);
    seedAssignment(storage, 'p-w3', 's-A');
    // Recorded progress: one practice attempted → the participant has begun.
    storage.seed(practiceResponsePath(STUDY_ID, 'p-w3', 'wp1'), '{}');

    const state = await getSessionState(ctx, { participantId: 'p-w3', acknowledgedInstructions: noAck });
    expect(state.phase).not.toBe('welcome');
  });

  it('assigns the least-utilized Session (tie-break: definition order)', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);

    const a = await getSessionState(ctx, { participantId: 'pa', acknowledgedInstructions: noAck });
    const b = await getSessionState(ctx, { participantId: 'pb', acknowledgedInstructions: noAck });
    const c = await getSessionState(ctx, { participantId: 'pc', acknowledgedInstructions: noAck });

    expect(a.sessionId).toBe('s-A');
    expect(b.sessionId).toBe('s-B');
    expect(c.sessionId).toBe('s-A');
  });

  it('does not scan prior assignments when the study has only one Session', async () => {
    const storage = new FakeStorage();
    const study = makeStudy();
    study.sessions = [study.sessions[0]];
    const ctx: ServiceContext = { storage, studyId: STUDY_ID, study };
    seedAssignment(storage, 'prior-1', 's-A');
    seedAssignment(storage, 'prior-2', 's-A');

    let assignmentDirectoryLists = 0;
    const originalList = storage.list.bind(storage);
    storage.list = async (path) => {
      if (path.endsWith('/session-assignments')) assignmentDirectoryLists++;
      return originalList(path);
    };

    const state = await getSessionState(ctx, { participantId: 'new-participant', acknowledgedInstructions: noAck });

    expect(state.sessionId).toBe('s-A');
    expect(assignmentDirectoryLists).toBe(0);
  });

  it('orders the word phase: instructions -> 2 practice -> word items -> cluster segment', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);
    seedAssignment(storage, 'p-2', 's-A');

    // Welcome acknowledged but word instructions not yet -> word instructions.
    expect((await getSessionState(ctx, { participantId: 'p-2', acknowledgedInstructions: ackWelcome })).phase).toBe(
      'word-instructions'
    );

    // Acknowledged -> first practice.
    const practice1 = await getSessionState(ctx, { participantId: 'p-2', acknowledgedInstructions: ackWord });
    expect(practice1.phase).toBe('word-practice');
    expect(practice1.current).toMatchObject({ index: 1, of: 2 });

    storage.seed(practiceResponsePath(STUDY_ID, 'p-2', 'wp1'), '{}');
    const practice2 = await getSessionState(ctx, { participantId: 'p-2', acknowledgedInstructions: ackWord });
    expect(practice2.current).toMatchObject({ index: 2, of: 2 });

    storage.seed(practiceResponsePath(STUDY_ID, 'p-2', 'wp2'), '{}');
    const item1 = await getSessionState(ctx, { participantId: 'p-2', acknowledgedInstructions: ackWord });
    expect(item1.phase).toBe('word-items');
    expect(item1.current).toMatchObject({ phase: 'word-items', item: { itemId: 'w1' } });

    storage.seed(responsePath(STUDY_ID, 'p-2', 'w1'), '{}');
    const item2 = await getSessionState(ctx, { participantId: 'p-2', acknowledgedInstructions: ackWord });
    expect(item2.current).toMatchObject({ item: { itemId: 'w2' } });

    storage.seed(responsePath(STUDY_ID, 'p-2', 'w2'), '{}');
    // With every word item answered, the flow leaves the word phase and enters the cluster segment
    // (US2). It does not reach `complete` until the cluster items are answered too.
    const afterWords = await getSessionState(ctx, { participantId: 'p-2', acknowledgedInstructions: ackWord });
    expect(afterWords.phase).toBe('cluster-instructions');
  });

  it('counts only real items in progress, never practice (FR-007/FR-011)', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);
    seedAssignment(storage, 'p-3', 's-A'); // session s-A: 2 word + 1 cluster = 3 real items

    const fresh = await getSessionState(ctx, { participantId: 'p-3', acknowledgedInstructions: ackWord });
    expect(fresh.progress).toEqual({ answered: 0, total: 3 });

    storage.seed(practiceResponsePath(STUDY_ID, 'p-3', 'wp1'), '{}');
    const afterPractice = await getSessionState(ctx, { participantId: 'p-3', acknowledgedInstructions: ackWord });
    expect(afterPractice.progress.answered).toBe(0); // practice excluded

    storage.seed(responsePath(STUDY_ID, 'p-3', 'w1'), '{}');
    const afterItem = await getSessionState(ctx, { participantId: 'p-3', acknowledgedInstructions: ackWord });
    expect(afterItem.progress.answered).toBe(1);
  });

  it('serializes no intruder/cluster ground truth during the word phase (FR-022, R5)', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);
    seedAssignment(storage, 'p-4', 's-A');
    storage.seed(practiceResponsePath(STUDY_ID, 'p-4', 'wp1'), '{}');
    storage.seed(practiceResponsePath(STUDY_ID, 'p-4', 'wp2'), '{}');

    const state = await getSessionState(ctx, { participantId: 'p-4', acknowledgedInstructions: ackWord });
    expect(state.phase).toBe('word-items');
    expect(JSON.stringify(state)).not.toContain('intruder');
  });

  // --- T023 (US2): cluster phases gated until all word items answered, then ordered ----------

  const ackBoth = new Set<'welcome' | 'word' | 'cluster'>(['welcome', 'word', 'cluster']);

  /** Seed s-A's word segment as fully completed (2 practice + 2 word items). */
  function completeWordSegment(storage: FakeStorage, participantId: string): void {
    seedAssignment(storage, participantId, 's-A'); // s-A: w1,w2 word; ci1 cluster
    storage.seed(practiceResponsePath(STUDY_ID, participantId, 'wp1'), '{}');
    storage.seed(practiceResponsePath(STUDY_ID, participantId, 'wp2'), '{}');
    storage.seed(responsePath(STUDY_ID, participantId, 'w1'), '{}');
    storage.seed(responsePath(STUDY_ID, participantId, 'w2'), '{}');
  }

  it('keeps the cluster segment unreachable until every word item is answered (FR-022)', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);
    seedAssignment(storage, 'pc-1', 's-A');
    storage.seed(practiceResponsePath(STUDY_ID, 'pc-1', 'wp1'), '{}');
    storage.seed(practiceResponsePath(STUDY_ID, 'pc-1', 'wp2'), '{}');
    storage.seed(responsePath(STUDY_ID, 'pc-1', 'w1'), '{}'); // w2 still unanswered

    const state = await getSessionState(ctx, { participantId: 'pc-1', acknowledgedInstructions: ackBoth });
    expect(state.phase).toBe('word-items');
    expect(state.current).toMatchObject({ item: { itemId: 'w2' } });
    // No cluster content is serialized while a word item remains.
    expect(JSON.stringify(state)).not.toContain('ci1');
    expect(JSON.stringify(state)).not.toContain('cluster-');
  });

  it('orders the cluster phase: instructions -> 2 practice -> cluster items -> complete', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);
    completeWordSegment(storage, 'pc-2');

    // Cluster instructions not yet acknowledged -> cluster-instructions.
    const instr = await getSessionState(ctx, { participantId: 'pc-2', acknowledgedInstructions: ackWord });
    expect(instr.phase).toBe('cluster-instructions');
    expect(instr.current).toMatchObject({ phase: 'cluster-instructions', taskType: 'cluster' });

    // Acknowledged -> first cluster practice.
    const practice1 = await getSessionState(ctx, { participantId: 'pc-2', acknowledgedInstructions: ackBoth });
    expect(practice1.phase).toBe('cluster-practice');
    expect(practice1.current).toMatchObject({ index: 1, of: 2 });

    storage.seed(practiceResponsePath(STUDY_ID, 'pc-2', 'cp1'), '{}');
    const practice2 = await getSessionState(ctx, { participantId: 'pc-2', acknowledgedInstructions: ackBoth });
    expect(practice2.current).toMatchObject({ index: 2, of: 2 });

    storage.seed(practiceResponsePath(STUDY_ID, 'pc-2', 'cp2'), '{}');
    const item = await getSessionState(ctx, { participantId: 'pc-2', acknowledgedInstructions: ackBoth });
    expect(item.phase).toBe('cluster-items');
    // The cluster item DTO exposes sanitized `targetHtml`; plain text passes through readably (T023, FR-008).
    expect(item.current).toMatchObject({
      phase: 'cluster-items',
      item: { itemId: 'ci1', taskType: 'cluster', targetHtml: 'Soil and nitrogen deposition.' },
    });

    storage.seed(responsePath(STUDY_ID, 'pc-2', 'ci1'), '{}');
    const done = await getSessionState(ctx, { participantId: 'pc-2', acknowledgedInstructions: ackBoth });
    expect(done.phase).toBe('complete');
  });

  it('emits a cluster item DTO with all candidate clusters but no intruder ground truth (R5)', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);
    completeWordSegment(storage, 'pc-3');
    storage.seed(practiceResponsePath(STUDY_ID, 'pc-3', 'cp1'), '{}');
    storage.seed(practiceResponsePath(STUDY_ID, 'pc-3', 'cp2'), '{}');

    const state = await getSessionState(ctx, { participantId: 'pc-3', acknowledgedInstructions: ackBoth });
    expect(state.phase).toBe('cluster-items');
    const current = state.current as Extract<typeof state.current, { phase: 'cluster-items' }>;
    expect(current.item.candidates.map((c) => c.clusterId).sort()).toEqual(['c1', 'c2', 'c3']);
    expect(current.item.candidates[0].representativeWords.length).toBeGreaterThan(0);
    expect(JSON.stringify(state)).not.toContain('intruder');
  });

  // --- T023 (US2): cluster item & practice DTOs expose sanitized `targetHtml` -----------------

  it('sanitizes a formatted cluster item document to inert `targetHtml` (FR-006/FR-007)', async () => {
    const storage = new FakeStorage();
    const study = makeStudy();
    study.clusterItems[0].targetText = '<p>Soil <strong>and</strong> nitrogen.</p><script>alert(1)</script>';
    const ctx: ServiceContext = { storage, studyId: STUDY_ID, study };
    completeWordSegment(storage, 'ch-1');
    storage.seed(practiceResponsePath(STUDY_ID, 'ch-1', 'cp1'), '{}');
    storage.seed(practiceResponsePath(STUDY_ID, 'ch-1', 'cp2'), '{}');

    const state = await getSessionState(ctx, { participantId: 'ch-1', acknowledgedInstructions: ackBoth });
    const current = state.current as Extract<typeof state.current, { phase: 'cluster-items' }>;
    expect(current.item.targetHtml).toContain('<strong>and</strong>');
    expect(current.item.targetHtml).not.toContain('<script');
    expect(current.item.targetHtml).not.toContain('alert(1)');
  });

  it('degrades a malformed cluster item document to readable text with no raw markup (FR-009)', async () => {
    const storage = new FakeStorage();
    const study = makeStudy();
    study.clusterItems[0].targetText = '<p>Soil <strong>and nitrogen';
    const ctx: ServiceContext = { storage, studyId: STUDY_ID, study };
    completeWordSegment(storage, 'ch-2');
    storage.seed(practiceResponsePath(STUDY_ID, 'ch-2', 'cp1'), '{}');
    storage.seed(practiceResponsePath(STUDY_ID, 'ch-2', 'cp2'), '{}');

    const state = await getSessionState(ctx, { participantId: 'ch-2', acknowledgedInstructions: ackBoth });
    const current = state.current as Extract<typeof state.current, { phase: 'cluster-items' }>;
    expect(current.item.targetHtml).toContain('Soil');
    expect(current.item.targetHtml).toContain('and nitrogen');
    expect(current.item.targetHtml).not.toContain('<script');
  });

  it('sanitizes the cluster practice document to `targetHtml` on the practice DTO (FR-007)', async () => {
    const storage = new FakeStorage();
    const study = makeStudy();
    study.practice.cluster[0].targetText = '<p>Gardening <em>text</em></p><script>x()</script>';
    const ctx: ServiceContext = { storage, studyId: STUDY_ID, study };
    completeWordSegment(storage, 'ch-3');

    const state = await getSessionState(ctx, { participantId: 'ch-3', acknowledgedInstructions: ackBoth });
    expect(state.phase).toBe('cluster-practice');
    const current = state.current as Extract<typeof state.current, { phase: 'cluster-practice' }>;
    const practice = current.practice as Extract<typeof current.practice, { taskType: 'cluster' }>;
    expect(practice.targetHtml).toContain('<em>text</em>');
    expect(practice.targetHtml).not.toContain('<script');
    expect(practice.targetHtml).not.toContain('x()');
  });

  // --- T030 (US3): debrief reachable only after completion; ground truth exposed only here ----

  /** Seed a real Response file with the fields the debrief reads (selection + correct + taskType). */
  function seedResponse(
    storage: FakeStorage,
    participantId: string,
    itemId: string,
    taskType: 'word' | 'cluster',
    value: string,
    correct: boolean
  ): void {
    storage.seed(
      responsePath(STUDY_ID, participantId, itemId),
      JSON.stringify({
        studyId: STUDY_ID,
        participantId,
        itemId,
        taskType,
        selection: { kind: 'candidate', value },
        correct,
        submittedAt: '2026-06-24T00:00:00Z',
        schemaVersion: 1,
      })
    );
  }

  /** Complete s-A (w1, w2, ci1) with real Response files. */
  function completeSession(storage: FakeStorage, participantId: string): void {
    seedAssignment(storage, participantId, 's-A');
    seedResponse(storage, participantId, 'w1', 'word', 'keyboard', true); // correctly picked intruder
    seedResponse(storage, participantId, 'w2', 'word', 'river', false); // intruder was 'spreadsheet'
    seedResponse(storage, participantId, 'ci1', 'cluster', 'c3', true); // correctly picked intruder cluster
  }

  it('refuses the debrief before every assigned item is answered (409 not_complete, FR-021)', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);
    seedAssignment(storage, 'd-1', 's-A');
    seedResponse(storage, 'd-1', 'w1', 'word', 'keyboard', true);
    seedResponse(storage, 'd-1', 'w2', 'word', 'spreadsheet', true); // ci1 still unanswered

    await expect(buildDebrief(ctx, 'd-1')).rejects.toBeInstanceOf(DebriefError);
    await expect(buildDebrief(ctx, 'd-1')).rejects.toMatchObject({ status: 409, code: 'not_complete' });
  });

  // --- T036 (US4): buildDebrief samples up to debriefSampleSize items in session order --------

  it('returns all answered items in session order when the pool fits debriefSampleSize (FR-019, R5)', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage); // s-A: w1, w2 (word) then ci1 (cluster); debriefSampleSize 3
    completeSession(storage, 'd-2');

    const debrief = await buildDebrief(ctx, 'd-2');
    // Pool (3) does not exceed debriefSampleSize (3): every answered real item is present,
    // ordered word items first then cluster items (FR-019).
    expect(debrief.examples.map((e) => e.itemId)).toEqual(['w1', 'w2', 'ci1']);

    const byId = new Map(debrief.examples.map((e) => [e.itemId, e]));
    expect(byId.get('w1')).toMatchObject({
      taskType: 'word',
      yourSelection: { kind: 'candidate', value: 'keyboard' },
      correctIntruder: 'keyboard', // ground truth — revealed ONLY here (R5)
      correct: true,
    });
    expect(byId.get('w2')).toMatchObject({ correctIntruder: 'spreadsheet', correct: false });
    expect(byId.get('ci1')).toMatchObject({ taskType: 'cluster', correctIntruder: 'c3', correct: true });

    // Each example carries a cluster-framed, non-empty explanation (FR-020).
    for (const example of debrief.examples) {
      expect(example.clusterValidityExplanation.length).toBeGreaterThan(0);
    }
  });

  it('samples exactly debriefSampleSize items in session order when more were answered (FR-019)', async () => {
    const storage = new FakeStorage();
    const study = makeStudy();
    study.config.debriefSampleSize = 2; // pool of 3 answered items > sample size
    const ctx: ServiceContext = { storage, studyId: STUDY_ID, study };
    completeSession(storage, 'd-s');

    const debrief = await buildDebrief(ctx, 'd-s');
    const ids = debrief.examples.map((e) => e.itemId);
    expect(ids).toHaveLength(2);
    // Sampled items come from the answered pool, presented in session order (word then cluster).
    const sessionOrder = ['w1', 'w2', 'ci1'];
    expect(ids.map((id) => sessionOrder.indexOf(id))).toEqual(
      ids.map((id) => sessionOrder.indexOf(id)).sort((a, b) => a - b)
    );
    for (const id of ids) expect(sessionOrder).toContain(id);
  });

  it('returns the same sample on repeated fetches for the same participant (stable across resume)', async () => {
    const storage = new FakeStorage();
    const study = makeStudy();
    study.config.debriefSampleSize = 2;
    const ctx: ServiceContext = { storage, studyId: STUDY_ID, study };
    completeSession(storage, 'd-rf');

    const first = await buildDebrief(ctx, 'd-rf');
    const second = await buildDebrief(ctx, 'd-rf');
    expect(second.examples.map((e) => e.itemId)).toEqual(first.examples.map((e) => e.itemId));
  });

  it('draws the sample per participant (different participants can see different items)', async () => {
    const storage = new FakeStorage();
    const study = makeStudy();
    study.config.debriefSampleSize = 2;
    const ctx: ServiceContext = { storage, studyId: STUDY_ID, study };

    // With a pool of 3 choose 2, one shared sample across 12 participants is practically impossible
    // unless the draw ignores the participant.
    const samples = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const participantId = `d-v${i}`;
      completeSession(storage, participantId);
      const debrief = await buildDebrief(ctx, participantId);
      samples.add(debrief.examples.map((e) => e.itemId).join(','));
    }
    expect(samples.size).toBeGreaterThan(1);
  });

  it('carries the render fields needed to reproduce the session layout read-only (FR-019)', async () => {
    const storage = new FakeStorage();
    const study = makeStudy();
    study.clusterItems[0].targetText = '<p>Soil <strong>and</strong> nitrogen.</p><script>alert(1)</script>';
    const ctx: ServiceContext = { storage, studyId: STUDY_ID, study };
    completeSession(storage, 'd-r');

    const debrief = await buildDebrief(ctx, 'd-r');
    const byId = new Map(debrief.examples.map((e) => [e.itemId, e]));

    // Word example exposes the shown candidate words (same set the participant saw).
    const w1 = byId.get('w1') as Extract<(typeof debrief.examples)[number], { taskType: 'word' }>;
    expect([...w1.candidateWords].sort()).toEqual(['keyboard', 'nitrogen', 'soil', 'livestock'].sort());

    // Cluster example exposes the sanitized document HTML + candidate blocks; no ground truth leaks.
    const ci1 = byId.get('ci1') as Extract<(typeof debrief.examples)[number], { taskType: 'cluster' }>;
    expect(ci1.targetHtml).toContain('<strong>and</strong>');
    expect(ci1.targetHtml).not.toContain('<script');
    expect(ci1.candidates.map((c) => c.clusterId).sort()).toEqual(['c1', 'c2', 'c3']);
    expect(JSON.stringify(ci1.candidates)).not.toContain('intruder');
  });

  it('emits the correct system-generated explanation variant (match vs no-match) localized per language (FR-020)', async () => {
    const storage = new FakeStorage();
    // Dutch deployment — the debrief explanation must come from the localized catalog (FR-014/FR-020).
    const ctx: ServiceContext = { storage, studyId: STUDY_ID, study: makeStudy(), language: 'nl' };
    completeSession(storage, 'd-nl'); // w1 correct, w2 incorrect, ci1 correct

    const debrief = await buildDebrief(ctx, 'd-nl');
    const byId = new Map(debrief.examples.map((e) => [e.itemId, e]));

    // Correct word: "easy to spot" (match) variant, in Dutch.
    expect(byId.get('w1')!.clusterValidityExplanation).toContain('makkelijk te herkennen');
    // Incorrect word: "hard to spot" (no-match) variant, in Dutch.
    expect(byId.get('w2')!.clusterValidityExplanation).toContain('moeilijk te herkennen');
    // Cluster explanation is Dutch too (localized template, not researcher-authored).
    expect(byId.get('ci1')!.clusterValidityExplanation).toContain('groep');
  });

  it('defaults the debrief explanation language to English when unset (FR-014)', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage); // no `language` → defaults to 'en'
    completeSession(storage, 'd-en');

    const debrief = await buildDebrief(ctx, 'd-en');
    const byId = new Map(debrief.examples.map((e) => [e.itemId, e]));
    expect(byId.get('w1')!.clusterValidityExplanation).toContain('easy to spot');
  });

  // --- T035 (US4): resume / progress (FR-007/FR-008/FR-010) -----------------------------------

  it('resumes at the first unanswered item, skipping ones already completed (FR-008/FR-010)', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);
    seedAssignment(storage, 'r-1', 's-A'); // s-A word items: w1, w2 (in order)
    storage.seed(practiceResponsePath(STUDY_ID, 'r-1', 'wp1'), '{}');
    storage.seed(practiceResponsePath(STUDY_ID, 'r-1', 'wp2'), '{}');
    // w2 answered out of order; w1 still outstanding.
    storage.seed(responsePath(STUDY_ID, 'r-1', 'w2'), '{}');

    const state = await getSessionState(ctx, { participantId: 'r-1', acknowledgedInstructions: ackWord });
    expect(state.phase).toBe('word-items');
    // Resume lands on w1 (the first unanswered), and the completed w2 is not reshown.
    expect(state.current).toMatchObject({ phase: 'word-items', item: { itemId: 'w1' } });
    expect(state.progress).toEqual({ answered: 1, total: 3 });
  });

  it('updates progress after each submitted real item, never counting practice (FR-007)', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);
    completeWordSegment(storage, 'r-2'); // assignment + 2 practice + w1, w2 answered (s-A)

    // Both word items answered -> 2 of 3, now in the cluster segment.
    const afterWords = await getSessionState(ctx, { participantId: 'r-2', acknowledgedInstructions: ackBoth });
    expect(afterWords.progress).toEqual({ answered: 2, total: 3 });

    // Cluster practice does not move the real-item counter.
    storage.seed(practiceResponsePath(STUDY_ID, 'r-2', 'cp1'), '{}');
    storage.seed(practiceResponsePath(STUDY_ID, 'r-2', 'cp2'), '{}');
    const atClusterItem = await getSessionState(ctx, { participantId: 'r-2', acknowledgedInstructions: ackBoth });
    expect(atClusterItem.phase).toBe('cluster-items');
    expect(atClusterItem.progress).toEqual({ answered: 2, total: 3 });

    // Answering the final real item advances the counter to full.
    storage.seed(responsePath(STUDY_ID, 'r-2', 'ci1'), '{}');
    const done = await getSessionState(ctx, { participantId: 'r-2', acknowledgedInstructions: ackBoth });
    expect(done.progress).toEqual({ answered: 3, total: 3 });
  });

  it('stops presenting items once every assigned item is answered (FR-008/FR-010)', async () => {
    const storage = new FakeStorage();
    const ctx = makeCtx(storage);
    completeWordSegment(storage, 'r-3');
    storage.seed(practiceResponsePath(STUDY_ID, 'r-3', 'cp1'), '{}');
    storage.seed(practiceResponsePath(STUDY_ID, 'r-3', 'cp2'), '{}');
    storage.seed(responsePath(STUDY_ID, 'r-3', 'ci1'), '{}');

    const state = await getSessionState(ctx, { participantId: 'r-3', acknowledgedInstructions: ackBoth });
    // The completion state carries no item to present.
    expect(state.phase).toBe('complete');
    expect(state.current).toEqual({ phase: 'complete' });
    expect(state.progress).toEqual({ answered: 3, total: 3 });
  });
});
