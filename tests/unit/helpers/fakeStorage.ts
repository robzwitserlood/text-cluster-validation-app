/**
 * In-memory {@link S3Storage} for unit tests. Models the subset of the S3 API
 * the services use: whole-file read/upload (with `overwrite:false` semantics),
 * key listing by prefix, and existence checks.
 */

import type { S3Storage } from '../../../server/src/lib/storage';

export class FakeStorage implements S3Storage {
  readonly files = new Map<string, string>();

  async read(key: string, _options?: { maxSize?: number }): Promise<string> {
    const contents = this.files.get(key);
    if (contents === undefined) throw new Error(`not found: ${key}`);
    return contents;
  }

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    for (const key of this.files.keys()) {
      if (key.startsWith(prefix) && !key.endsWith('/')) {
        keys.push(key);
      }
    }
    return keys;
  }

  async upload(key: string, body: string, options?: { overwrite?: boolean }): Promise<void> {
    if (options?.overwrite === false && this.files.has(key)) {
      throw new Error(`already exists: ${key}`);
    }
    this.files.set(key, body);
  }

  async exists(key: string): Promise<boolean> {
    return this.files.has(key);
  }

  /** Seed a key directly (test convenience). */
  seed(key: string, contents: string): void {
    this.files.set(key, contents);
  }
}