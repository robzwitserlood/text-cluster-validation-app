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

  client.middlewareStack.add(
    (next) => (args) => {
      if (args.request?.headers) {
        delete args.request.headers['authorization'];
        delete args.request.headers['x-amz-content-sha256'];
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
      const cmd = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        Delimiter: '/',
      });
      const response = await client.send(cmd);
      const keys: string[] = [];
      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key) keys.push(obj.Key);
        }
      }
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