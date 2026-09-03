import { describe, it, expect } from 'vitest';
import { loadStudy, StudyLoadError, studyJsonPath } from '../../server/src/services/studyLoader';
import { FakeStorage } from './helpers/fakeStorage';
import { makeStudyDoc, STUDY_ID } from './helpers/study';

/** T011 (US1): study loads; malformed word items are withheld; STUDY_ID/studyId mismatch rejected (FR-001, FR-016). */
describe('loadStudy', () => {
  function storageWith(doc: unknown): FakeStorage {
    const storage = new FakeStorage();
    storage.seed(studyJsonPath(STUDY_ID), JSON.stringify(doc));
    return storage;
  }

  it('loads a valid study with no notices', async () => {
    const { study, notices } = await loadStudy(storageWith(makeStudyDoc()), STUDY_ID);
    expect(study.studyId).toBe(STUDY_ID);
    expect(study.wordItems.map((w) => w.itemId)).toEqual(['w1', 'w2', 'w3']);
    expect(notices).toHaveLength(0);
  });

  it('withholds a word item whose intruder is not among the candidates', async () => {
    const doc = makeStudyDoc();
    (doc.wordItems as Record<string, unknown>[])[0].intruderWord = 'not-a-candidate';
    const { study, notices } = await loadStudy(storageWith(doc), STUDY_ID);
    expect(study.wordItems.map((w) => w.itemId)).toEqual(['w2', 'w3']);
    expect(notices).toContainEqual({ scope: 'word-item', itemId: 'w1', reason: 'intruder not among candidates' });
  });

  it('withholds a word item with a duplicated intruder', async () => {
    const doc = makeStudyDoc();
    (doc.wordItems as Record<string, unknown>[])[0].candidateWords = ['soil', 'keyboard', 'keyboard', 'nitrogen'];
    const { study, notices } = await loadStudy(storageWith(doc), STUDY_ID);
    expect(study.wordItems.map((w) => w.itemId)).toEqual(['w2', 'w3']);
    expect(notices[0]).toMatchObject({ scope: 'word-item', itemId: 'w1' });
  });

  it('withholds a word item with too few candidates', async () => {
    const doc = makeStudyDoc();
    (doc.wordItems as Record<string, unknown>[])[0].candidateWords = ['soil', 'keyboard'];
    const { study, notices } = await loadStudy(storageWith(doc), STUDY_ID);
    expect(study.wordItems.map((w) => w.itemId)).toEqual(['w2', 'w3']);
    expect(notices[0].reason).toContain('too few candidates');
  });

  it('defaults debriefSampleSize to 3 when the study omits it (FR-019)', async () => {
    const doc = makeStudyDoc();
    delete (doc.config as Record<string, unknown>).debriefSampleSize;
    const { study, notices } = await loadStudy(storageWith(doc), STUDY_ID);
    expect(study.config.debriefSampleSize).toBe(3);
    expect(notices).toHaveLength(0);
  });

  it('rejects a study with a non-positive debriefSampleSize', async () => {
    const doc = makeStudyDoc();
    (doc.config as Record<string, unknown>).debriefSampleSize = 0;
    await expect(loadStudy(storageWith(doc), STUDY_ID)).rejects.toBeInstanceOf(StudyLoadError);
  });

  it('rejects a study whose internal studyId does not match STUDY_ID', async () => {
    // The deployment's STUDY_ID is 'study-999', but the file at that path declares 'study-001'.
    const storage = new FakeStorage();
    storage.seed(studyJsonPath('study-999'), JSON.stringify(makeStudyDoc()));
    await expect(loadStudy(storage, 'study-999')).rejects.toMatchObject({
      name: 'StudyLoadError',
      code: 'study_id_mismatch',
    });
  });

  it('throws StudyLoadError when the file is unreadable', async () => {
    await expect(loadStudy(new FakeStorage(), STUDY_ID)).rejects.toBeInstanceOf(StudyLoadError);
  });
});

/** T024a (US2): malformed CLUSTER items are withheld with a notice without aborting the load (FR-016). */
describe('loadStudy — cluster items (US2)', () => {
  function storageWith(mutate: (doc: Record<string, unknown>) => void): FakeStorage {
    const doc = makeStudyDoc();
    mutate(doc);
    const storage = new FakeStorage();
    storage.seed(studyJsonPath(STUDY_ID), JSON.stringify(doc));
    return storage;
  }

  const clusterItem = (doc: Record<string, unknown>, index: number) =>
    (doc.clusterItems as Record<string, unknown>[])[index];

  it('loads valid cluster items with no cluster notices', async () => {
    const { study, notices } = await loadStudy(
      storageWith(() => {}),
      STUDY_ID
    );
    expect(study.clusterItems.map((c) => c.itemId)).toEqual(['ci1', 'ci2']);
    expect(notices.filter((n) => n.scope === 'cluster-item')).toHaveLength(0);
  });

  it('withholds a cluster item with too few candidate clusters', async () => {
    const { study, notices } = await loadStudy(
      storageWith((doc) => {
        clusterItem(doc, 0).candidateClusterIds = ['c1', 'c2'];
        clusterItem(doc, 0).intruderClusterId = 'c1';
      }),
      STUDY_ID
    );
    expect(study.clusterItems.map((c) => c.itemId)).toEqual(['ci2']);
    expect(notices).toContainEqual(expect.objectContaining({ scope: 'cluster-item', itemId: 'ci1' }));
    expect(notices.find((n) => n.itemId === 'ci1')?.reason).toContain('too few');
  });

  it('withholds a cluster item whose intruder is not among the candidates', async () => {
    const { study, notices } = await loadStudy(
      storageWith((doc) => {
        clusterItem(doc, 0).intruderClusterId = 'c-not-a-candidate';
      }),
      STUDY_ID
    );
    expect(study.clusterItems.map((c) => c.itemId)).toEqual(['ci2']);
    expect(notices.find((n) => n.itemId === 'ci1')?.reason).toContain('intruder not among candidates');
  });

  it('withholds a cluster item that references an unknown cluster id', async () => {
    const { study, notices } = await loadStudy(
      storageWith((doc) => {
        clusterItem(doc, 0).candidateClusterIds = ['c1', 'c2', 'c-missing'];
        clusterItem(doc, 0).intruderClusterId = 'c1';
      }),
      STUDY_ID
    );
    expect(study.clusterItems.map((c) => c.itemId)).toEqual(['ci2']);
    expect(notices.find((n) => n.itemId === 'ci1')?.reason).toContain('unknown cluster');
  });

  it('does not abort the rest of the study load when one cluster item is malformed', async () => {
    const { study } = await loadStudy(
      storageWith((doc) => {
        clusterItem(doc, 0).candidateClusterIds = ['c1', 'c2'];
        clusterItem(doc, 0).intruderClusterId = 'c1';
      }),
      STUDY_ID
    );
    // The remaining cluster item, all word items, sessions, and clusters still load.
    expect(study.clusterItems.map((c) => c.itemId)).toEqual(['ci2']);
    expect(study.wordItems.map((w) => w.itemId)).toEqual(['w1', 'w2', 'w3']);
    expect(study.sessions).toHaveLength(2);
  });
});

/**
 * T011 (US1): optional top-level `study.welcome` parses when present and is left unset when absent
 * so the session service can supply the localized built-in default (FR-012, data-model.md).
 */
describe('loadStudy — welcome (US1)', () => {
  function storageWith(mutate: (doc: Record<string, unknown>) => void): FakeStorage {
    const doc = makeStudyDoc();
    mutate(doc);
    const storage = new FakeStorage();
    storage.seed(studyJsonPath(STUDY_ID), JSON.stringify(doc));
    return storage;
  }

  it('parses a researcher-authored welcome when present', async () => {
    const { study, notices } = await loadStudy(
      storageWith((doc) => {
        doc.welcome = {
          content:
            '# Welkom\n\nJe beoordeelt een korte reeks teksten.\n\nJouw oordelen helpen groeperingen te valideren.',
        };
      }),
      STUDY_ID
    );
    expect(notices).toHaveLength(0);
    expect(study.welcome).toEqual({
      content: '# Welkom\n\nJe beoordeelt een korte reeks teksten.\n\nJouw oordelen helpen groeperingen te valideren.',
    });
  });

  it('leaves welcome unset when the study omits it (default supplied downstream, FR-012)', async () => {
    const { study, notices } = await loadStudy(
      storageWith(() => {}),
      STUDY_ID
    );
    expect(notices).toHaveLength(0);
    expect(study.welcome).toBeUndefined();
  });

  it('rejects a welcome with an empty field', async () => {
    await expect(
      loadStudy(
        storageWith((doc) => {
          doc.welcome = { content: '' };
        }),
        STUDY_ID
      )
    ).rejects.toMatchObject({ name: 'StudyLoadError' });
  });
});

/**
 * T041 (US6): clusters accept optional `mlflowExperimentId`/`mlflowRunId`; two clusters that
 * reference different runs both load and remain distinguishable, so downstream grouping can trace
 * each response back to the MLFlow run that produced its cluster (US6 acceptance, data-model.md).
 */
describe('loadStudy — MLFlow traceability (US6)', () => {
  const cluster = (doc: Record<string, unknown>, index: number) => (doc.clusters as Record<string, unknown>[])[index];

  function storageWith(mutate: (doc: Record<string, unknown>) => void): FakeStorage {
    const doc = makeStudyDoc();
    mutate(doc);
    const storage = new FakeStorage();
    storage.seed(studyJsonPath(STUDY_ID), JSON.stringify(doc));
    return storage;
  }

  it('loads clusters that omit the optional MLFlow references', async () => {
    // The default fixture has no MLFlow fields — they are optional and the study still loads.
    const { study, notices } = await loadStudy(
      storageWith(() => {}),
      STUDY_ID
    );
    expect(notices).toHaveLength(0);
    expect(study.clusters.map((c) => c.clusterId)).toEqual(['c1', 'c2', 'c3']);
    expect(study.clusters[0].mlflowExperimentId).toBeUndefined();
    expect(study.clusters[0].mlflowRunId).toBeUndefined();
  });

  it('retains optional MLFlow experiment/run references on a cluster', async () => {
    const { study } = await loadStudy(
      storageWith((doc) => {
        Object.assign(cluster(doc, 0), { mlflowExperimentId: 'exp-1', mlflowRunId: 'run-1' });
      }),
      STUDY_ID
    );
    expect(study.clusters[0]).toMatchObject({
      clusterId: 'c1',
      mlflowExperimentId: 'exp-1',
      mlflowRunId: 'run-1',
    });
  });

  it('keeps two clusters referencing different runs distinguishable', async () => {
    const { study } = await loadStudy(
      storageWith((doc) => {
        Object.assign(cluster(doc, 0), { mlflowExperimentId: 'exp-A', mlflowRunId: 'run-A' });
        Object.assign(cluster(doc, 1), { mlflowExperimentId: 'exp-A', mlflowRunId: 'run-B' });
      }),
      STUDY_ID
    );
    const c1 = study.clusters.find((c) => c.clusterId === 'c1');
    const c2 = study.clusters.find((c) => c.clusterId === 'c2');
    expect(c1?.mlflowRunId).toBe('run-A');
    expect(c2?.mlflowRunId).toBe('run-B');
    // Both load, and the run references distinguish the two clusters for downstream grouping.
    expect(c1?.mlflowRunId).not.toBe(c2?.mlflowRunId);
  });
});
