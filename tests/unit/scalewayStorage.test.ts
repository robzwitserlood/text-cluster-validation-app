/**
 * Contract tests for the real Scaleway/S3 adapter, exercised against a local fake S3 endpoint
 * that implements actual `ListObjectsV2` semantics (prefix, delimiter rollup, pagination).
 *
 * These cover the gap that let a listing bug reach production: `list()` used to send
 * `Delimiter: '/'` with a directory prefix that had no trailing slash, so S3 returned every
 * nested key under `CommonPrefixes` and left `Contents` empty. `listSafe` then read that as
 * "nothing recorded", which pinned participants on "Practice 2 of 2" forever. The in-memory
 * `FakeStorage` used by the service and e2e tests cannot catch this — only the adapter can.
 */

import { afterEach, beforeAll, afterAll, describe, it, expect } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createScalewayStorage } from '../../server/src/lib/scalewayStorage';
import type { S3Storage } from '../../server/src/lib/storage';

/** One recorded inbound request to the fake S3 endpoint. */
interface RecordedRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  body: string;
}

const requests: RecordedRequest[] = [];

/** The objects the fake bucket holds. */
let bucketKeys: string[] = [];
/** Page size the fake endpoint enforces, to exercise pagination. */
let pageSize = 1000;
/** When set, every request fails with this status (permission/network fault simulation). */
let failWith: number | null = null;

let server: http.Server;
let storage: S3Storage;

/**
 * Faithful-enough `ListObjectsV2`: filters by prefix, rolls keys with a delimiter in the
 * remainder into `CommonPrefixes` (leaving them OUT of `Contents`, as real S3 does), and
 * paginates with an opaque continuation token.
 */
function handleList(query: URLSearchParams): string {
  const prefix = query.get('prefix') ?? '';
  const delimiter = query.get('delimiter');
  const token = query.get('continuation-token');

  const matched = bucketKeys.filter((key) => key.startsWith(prefix)).sort();

  const contents: string[] = [];
  const commonPrefixes = new Set<string>();
  for (const key of matched) {
    const remainder = key.slice(prefix.length);
    const cut = delimiter ? remainder.indexOf(delimiter) : -1;
    if (cut >= 0) {
      commonPrefixes.add(prefix + remainder.slice(0, cut + delimiter!.length));
    } else {
      contents.push(key);
    }
  }

  const start = token ? Number(token) : 0;
  const page = contents.slice(start, start + pageSize);
  const nextStart = start + page.length;
  const truncated = nextStart < contents.length;

  return `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>test-bucket</Name>
  <Prefix>${prefix}</Prefix>
  <KeyCount>${page.length + commonPrefixes.size}</KeyCount>
  <IsTruncated>${truncated}</IsTruncated>
  ${truncated ? `<NextContinuationToken>${nextStart}</NextContinuationToken>` : ''}
  ${page.map((key) => `<Contents><Key>${key}</Key><Size>1</Size></Contents>`).join('\n  ')}
  ${[...commonPrefixes].map((p) => `<CommonPrefixes><Prefix>${p}</Prefix></CommonPrefixes>`).join('\n  ')}
</ListBucketResult>`;
}

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      requests.push({ method: req.method ?? '', path: url.pathname, query: url.searchParams, body });

      if (failWith !== null) {
        res.writeHead(failWith, { 'Content-Type': 'application/xml' });
        res.end('<Error><Code>AccessDenied</Code></Error>');
        return;
      }

      if (req.method === 'GET' && url.searchParams.get('list-type') === '2') {
        res.writeHead(200, { 'Content-Type': 'application/xml' });
        res.end(handleList(url.searchParams));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end('');
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  storage = createScalewayStorage({
    endpoint: `http://127.0.0.1:${port}`,
    region: 'nl-ams',
    bucket: 'test-bucket',
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

afterEach(() => {
  requests.length = 0;
  bucketKeys = [];
  pageSize = 1000;
  failWith = null;
});

describe('createScalewayStorage().list', () => {
  const dir = 'text_cluster_validation/study-001/practice-responses/p-1';

  it('returns keys nested under a directory prefix (the "Practice 2 of 2" regression)', async () => {
    bucketKeys = [`${dir}/wp1.json`, `${dir}/wp2.json`];

    // A delimiter would hide both of these in CommonPrefixes and report an empty directory,
    // which the session service reads as "no practice answered yet".
    await expect(storage.list(dir)).resolves.toEqual([`${dir}/wp1.json`, `${dir}/wp2.json`]);
  });

  it('never sends a delimiter, which would roll nested keys into CommonPrefixes', async () => {
    await storage.list(dir);

    expect(requests).toHaveLength(1);
    expect(requests[0].query.get('delimiter')).toBeNull();
  });

  it('normalizes a directory prefix to end with "/" so sibling directories cannot match', async () => {
    bucketKeys = [
      'text_cluster_validation/study-001/session-assignments/p-1.json',
      'text_cluster_validation/study-001/session-assignments-archive/p-9.json',
    ];

    await expect(storage.list('text_cluster_validation/study-001/session-assignments')).resolves.toEqual([
      'text_cluster_validation/study-001/session-assignments/p-1.json',
    ]);
    expect(requests[0].query.get('prefix')).toBe('text_cluster_validation/study-001/session-assignments/');
  });

  it('leaves an already-normalized prefix untouched', async () => {
    await storage.list(`${dir}/`);

    expect(requests[0].query.get('prefix')).toBe(`${dir}/`);
  });

  it('follows pagination so a directory over one page is not silently truncated', async () => {
    bucketKeys = [`${dir}/a.json`, `${dir}/b.json`, `${dir}/c.json`];
    pageSize = 1;

    await expect(storage.list(dir)).resolves.toEqual([`${dir}/a.json`, `${dir}/b.json`, `${dir}/c.json`]);

    expect(requests).toHaveLength(3);
    expect(requests[0].query.get('continuation-token')).toBeNull();
    expect(requests[1].query.get('continuation-token')).not.toBeNull();
  });

  it('treats a directory with no objects as no keys rather than failing', async () => {
    await expect(storage.list(dir)).resolves.toEqual([]);
  });

  it('propagates a listing failure so `listSafe` can report it instead of reading as empty', async () => {
    failWith = 403;
    await expect(storage.list(dir)).rejects.toThrow();
  });
});

describe('createScalewayStorage() requests', () => {
  it('sends unsigned, path-style requests (public bucket, no credentials)', async () => {
    await storage.list('text_cluster_validation/study-001/responses/p-1');

    expect(requests[0].path).toBe('/test-bucket/');
    expect(requests[0].query.get('list-type')).toBe('2');
  });

  it('PUTs the body verbatim for a write-once record', async () => {
    await storage.upload('text_cluster_validation/study-001/responses/p-1/w1.json', '{"a":1}', {
      overwrite: false,
    });

    expect(requests[0].method).toBe('PUT');
    expect(requests[0].body).toBe('{"a":1}');
  });
});
