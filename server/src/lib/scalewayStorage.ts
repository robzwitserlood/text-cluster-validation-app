/**
 * S3-compatible storage adapter for Scaleway Object Storage.
 *
 * Implements the {@link S3Storage} interface using `@aws-sdk/client-s3`. All requests are
 * unsigned (public bucket); the bucket name, endpoint, and region come from the config.
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import type { S3Storage } from './storage';

const DEFAULT_MAX_READ_SIZE = 10 * 1024 * 1024;

export function createScalewayStorage(config: {
  endpoint: string;
  region: string;
  bucket: string;
}): S3Storage {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: '', secretAccessKey: '' },
  });

  // Strip the signature headers: the bucket is public and Scaleway rejects a signature computed
  // from the empty credentials the SDK requires us to supply. `args.request` is untyped at this
  // step of the middleware stack, so the header bag is narrowed locally.
  client.middlewareStack.add(
    (next) => (args) => {
      const request = args.request as { headers?: Record<string, string> } | undefined;
      if (request?.headers) {
        delete request.headers['authorization'];
        delete request.headers['x-amz-content-sha256'];
      }
      return next(args);
    },
    { step: 'finalizeRequest', name: 'removeAuth', priority: 'high' }
  );

  const { bucket } = config;

  return {
    async read(key: string, options?: { maxSize?: number }) {
      const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
      const response = await client.send(cmd);
      if (!response.Body) return '';

      const text = await response.Body.transformToString();
      const maxSize = options?.maxSize ?? DEFAULT_MAX_READ_SIZE;
      if (text.length > maxSize) {
        throw new Error(`File exceeds maximum read size (${maxSize} bytes).`);
      }
      return text;
    },

    async list(prefix) {
      // The prefix is a *directory*, so it must end in `/`: `paths.ts` builds directory paths
      // without a trailing slash, and a bare prefix would also match sibling directories that
      // merely start with the same string (e.g. `session-assignments-archive/`).
      const normalized = prefix.endsWith('/') ? prefix : `${prefix}/`;

      // No `Delimiter` — callers want the object keys under the prefix, not the folder rollup.
      // With `Delimiter: '/'` S3 returns every nested key in `CommonPrefixes` and leaves
      // `Contents` empty, which silently reads back as "nothing recorded".
      const keys: string[] = [];
      let continuationToken: string | undefined;
      do {
        const response = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: normalized,
            ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
          })
        );
        for (const obj of response.Contents ?? []) {
          if (obj.Key) keys.push(obj.Key);
        }
        // Follow pagination; a single page caps at 1000 keys and would otherwise truncate.
        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
      } while (continuationToken);
      return keys;
    },

    async upload(key, body, options) {
      const overwrite = options?.overwrite ?? true;
      const cmd = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: 'application/json',
        ...(overwrite ? {} : { IfNoneMatch: '*' }),
      });
      await client.send(cmd);
    },

    async exists(key) {
      try {
        const cmd = new HeadObjectCommand({ Bucket: bucket, Key: key });
        await client.send(cmd);
        return true;
      } catch (error: unknown) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'name' in error &&
          (error as { name?: string }).name === 'NotFound'
        ) {
          return false;
        }
        throw error;
      }
    },
  };
}