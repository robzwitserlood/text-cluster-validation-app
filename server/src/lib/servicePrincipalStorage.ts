/**
 * Service-principal {@link VolumeStorage} (R9, FR-017).
 *
 * The AppKit Files *plugin* (`app.files('files')`) enforces OBO and throws when any operation is
 * called without a user context. This deployment deliberately accesses the Volume as the app's
 * *service principal* with server-built, path-isolated paths (R9, storage.md "Access model"):
 * participants are anonymous (FR-012) and never carry a Databricks identity, so OBO does not apply.
 *
 * This adapter implements the storage surface the services need directly against the
 * service-principal {@link WorkspaceClient} taken from the AppKit execution context — mirroring
 * AppKit's own `FilesConnector` (read/list/upload/exists) but without the OBO guard. `resolvePath`
 * rejects traversal so a server-side path bug cannot escape the configured Volume.
 *
 * The client type is taken from {@link getExecutionContext} rather than imported from
 * `@databricks/sdk-experimental` directly: AppKit pins its own SDK copy, and importing a second
 * copy's types here would both fail to type-check and break cross-copy `instanceof` checks.
 */

import { getExecutionContext } from '@databricks/appkit';
import type { StorageEntry, VolumeStorage } from './storage';

/** Service-principal `WorkspaceClient`, typed via AppKit so it matches AppKit's bundled SDK copy. */
type WorkspaceClient = ReturnType<typeof getExecutionContext>['client'];

/** Default read cap, mirroring AppKit's `FILES_MAX_READ_SIZE` (10 MiB). Callers may raise it. */
const DEFAULT_MAX_READ_SIZE = 10 * 1024 * 1024;

/** True for a Databricks "not found" error, checked structurally to survive multiple SDK copies. */
function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as { statusCode?: unknown }).statusCode === 404
  );
}

/**
 * Build a service-principal-backed {@link VolumeStorage} rooted at `volumeBasePath`
 * (this deployment's `DATABRICKS_VOLUME_FILES`). Relative paths are resolved under the root;
 * absolute paths must stay within `/Volumes/`.
 */
export function createServicePrincipalStorage(volumeBasePath: string | undefined): VolumeStorage {
  if (!volumeBasePath) {
    throw new Error('DATABRICKS_VOLUME_FILES is not configured; cannot access the study Volume.');
  }
  const base = volumeBasePath.replace(/\/+$/, '');

  /** The service-principal client for the current (non-user) execution context, resolved per call. */
  function client(): WorkspaceClient {
    return getExecutionContext().client;
  }

  /** Resolve a path under the Volume, rejecting traversal/escape (storage.md "Access model"). */
  function resolvePath(filePath: string): string {
    if (filePath.length > 4096) throw new Error('Path exceeds maximum length of 4096 characters.');
    if (filePath.includes('\0')) throw new Error('Path must not contain null bytes.');
    if (filePath.split('/').some((segment) => segment === '..')) {
      throw new Error('Path traversal ("../") is not allowed.');
    }
    if (filePath.startsWith('/')) {
      if (!filePath.startsWith('/Volumes/')) throw new Error('Absolute paths must start with "/Volumes/".');
      return filePath;
    }
    return `${base}/${filePath}`;
  }

  return {
    async read(filePath, options) {
      const file_path = resolvePath(filePath);
      const maxSize = options?.maxSize ?? DEFAULT_MAX_READ_SIZE;
      const response = await client().files.download({ file_path });
      if (!response.contents) return '';

      const reader = response.contents.getReader();
      const decoder = new TextDecoder();
      let result = '';
      let bytesRead = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesRead += value.byteLength;
        if (bytesRead > maxSize) {
          await reader.cancel();
          throw new Error(`File exceeds maximum read size (${maxSize} bytes).`);
        }
        result += decoder.decode(value, { stream: true });
      }
      result += decoder.decode();
      return result;
    },

    async list(directoryPath) {
      const directory_path = directoryPath ? resolvePath(directoryPath) : base;
      const entries: StorageEntry[] = [];
      for await (const entry of client().files.listDirectoryContents({ directory_path })) {
        entries.push({ name: entry.name, path: entry.path, is_directory: entry.is_directory });
      }
      return entries;
    },

    async upload(filePath, contents, options) {
      const resolvedPath = resolvePath(filePath);
      const overwrite = options?.overwrite ?? true;

      // Raw PUT to the Files API (the path AppKit's connector uses): the UC Volumes endpoint
      // auto-creates parent directories and honours `overwrite=false` for once-only writes (FR-009).
      const config = client().config;
      const hostValue = config.host;
      if (!hostValue) throw new Error('Databricks host is not configured (set DATABRICKS_HOST).');
      const host = hostValue.startsWith('http') ? hostValue : `https://${hostValue}`;
      const url = new URL(`/api/2.0/fs/files${resolvedPath}`, host);
      url.searchParams.set('overwrite', String(overwrite));

      const headers = new Headers({
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(Buffer.byteLength(contents)),
      });
      await config.authenticate(headers);

      const res = await fetch(url.toString(), { method: 'PUT', headers, body: contents });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Volume upload failed (${res.status}): ${text.length > 200 ? `${text.slice(0, 200)}…` : text}`);
      }
    },

    async exists(filePath) {
      const file_path = resolvePath(filePath);
      try {
        await client().files.getMetadata({ file_path });
        return true;
      } catch (error) {
        if (isNotFound(error)) return false;
        throw error;
      }
    },
  };
}
