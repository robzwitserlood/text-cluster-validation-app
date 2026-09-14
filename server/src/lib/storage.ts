/**
 * Storage abstraction for S3-compatible object storage (Scaleway Object Storage).
 *
 * Services depend on this minimal interface rather than the concrete S3 implementation so they
 * can be unit-tested with an in-memory fake. All access is via unsigned requests to a public
 * S3-compatible bucket.
 */

/** The S3-compatible operations the services use. */
export interface S3Storage {
  read(key: string, options?: { maxSize?: number }): Promise<string>;
  list(prefix: string): Promise<string[]>;
  upload(key: string, body: string, options?: { overwrite?: boolean }): Promise<void>;
  exists(key: string): Promise<boolean>;
}

/**
 * List a prefix, treating a missing prefix as empty.
 *
 * On a participant's first visit the `responses/`, `practice-responses/`, and
 * `session-assignments/` prefixes may not have any objects yet; the S3 API returns an
 * empty result set for prefixes with no objects. Resume and assignment logic treat
 * "nothing found" as "nothing recorded".
 */
export async function listSafe(storage: S3Storage, prefix: string): Promise<string[]> {
  try {
    return await storage.list(prefix);
  } catch {
    return [];
  }
}

/**
 * Write a file exactly once (idempotent). Uses `overwrite: false`; if the file
 * already exists the write is a no-op and the existing record is preserved.
 */
export async function writeOnce(storage: S3Storage, key: string, body: string): Promise<void> {
  try {
    await storage.upload(key, body, { overwrite: false });
  } catch (err) {
    if (await storage.exists(key)) return;
    throw err;
  }
}