/**
 * Storage abstraction over the AppKit Files plugin Volume API (R1, R9).
 *
 * Services depend on this minimal interface rather than the concrete `VolumeHandle` so they can be
 * unit-tested with an in-memory fake (R13). The real AppKit `app.files("files")` handle is
 * structurally assignable to `VolumeStorage`. All access is as the app's service principal with
 * server-enforced path isolation (R9, storage.md "Access model").
 */

/** Subset of the Files plugin's `DirectoryEntry` we rely on. */
export interface StorageEntry {
  name?: string;
  path?: string;
  is_directory?: boolean;
}

/** The Volume operations the services use. Implemented by AppKit's `VolumeHandle`. */
export interface VolumeStorage {
  read(filePath: string, options?: { maxSize?: number }): Promise<string>;
  list(directoryPath?: string): Promise<StorageEntry[]>;
  upload(filePath: string, contents: string, options?: { overwrite?: boolean }): Promise<void>;
  exists(filePath: string): Promise<boolean>;
}

/**
 * List a directory, treating a missing directory as empty.
 *
 * On a participant's first visit the `responses/`, `practice-responses/`, and
 * `session-assignments/` directories may not exist yet; the Volume API throws for a missing path.
 * Resume and assignment logic treat "not found" as "nothing recorded".
 */
export async function listSafe(storage: VolumeStorage, directoryPath: string): Promise<StorageEntry[]> {
  try {
    return await storage.list(directoryPath);
  } catch {
    return [];
  }
}

/**
 * Write a file exactly once (idempotent, R4/FR-009/FR-023). Uses `overwrite:false`; if the file
 * already exists (including after losing a concurrent first-write race) the write is a no-op and
 * the existing record is preserved. Re-throws only on a genuine storage failure.
 */
export async function writeOnce(storage: VolumeStorage, filePath: string, contents: string): Promise<void> {
  try {
    await storage.upload(filePath, contents, { overwrite: false });
  } catch (err) {
    if (await storage.exists(filePath)) return;
    throw err;
  }
}
