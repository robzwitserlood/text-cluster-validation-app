/**
 * In-memory {@link VolumeStorage} for unit tests (R13). Models the subset of the AppKit Files API
 * the services use: whole-file read/upload (with `overwrite:false` semantics), immediate-child
 * directory listing, and existence checks. A missing directory lists as empty.
 */

import type { StorageEntry, VolumeStorage } from '../../../server/src/lib/storage';

export class FakeStorage implements VolumeStorage {
  readonly files = new Map<string, string>();

  async read(filePath: string): Promise<string> {
    const contents = this.files.get(filePath);
    if (contents === undefined) throw new Error(`not found: ${filePath}`);
    return contents;
  }

  async list(directoryPath: string): Promise<StorageEntry[]> {
    const prefix = directoryPath.endsWith('/') ? directoryPath : `${directoryPath}/`;
    const children = new Map<string, boolean>(); // name -> is_directory
    for (const key of this.files.keys()) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      const slash = rest.indexOf('/');
      if (slash === -1) children.set(rest, false);
      else children.set(rest.slice(0, slash), true);
    }
    return [...children].map(([name, is_directory]) => ({ name, path: `${prefix}${name}`, is_directory }));
  }

  async upload(filePath: string, contents: string, options?: { overwrite?: boolean }): Promise<void> {
    if (options?.overwrite === false && this.files.has(filePath)) {
      throw new Error(`already exists: ${filePath}`);
    }
    this.files.set(filePath, contents);
  }

  async exists(filePath: string): Promise<boolean> {
    return this.files.has(filePath);
  }

  /** Seed a file directly (test convenience). */
  seed(filePath: string, contents: string): void {
    this.files.set(filePath, contents);
  }
}
