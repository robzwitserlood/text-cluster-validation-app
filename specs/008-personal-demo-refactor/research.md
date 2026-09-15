# Research: Personal Demo Refactor

**Feature**: 008-personal-demo-refactor
**Date**: 2026-09-14

## 1. S3-Compatible Object Storage Client

### Decision: `@aws-sdk/client-s3` (AWS SDK v3)

### Rationale

- Scaleway Object Storage provides an S3-compatible API. The AWS SDK v3 is the standard, well-maintained TypeScript client for S3 operations.
- Supports custom endpoints (needed for Scaleway's regional endpoints like `s3.fr-par.scw.cloud`).
- Supports unsigned (anonymous) requests via `@aws-sdk/signature-v4-crt` omission — when no credentials are provided and `forcePathStyle: true` is set along with the custom endpoint, requests are unsigned.
- Minimal API surface: `GetObjectCommand`, `PutObjectCommand`, `ListObjectsV2Command` cover all required operations (read study, write responses, list assignments).
- Only tree-shakeable client needed: `@aws-sdk/client-s3` (~500KB) plus `@aws-sdk/s3-request-presigner` if needed. No need for the full AWS SDK.

### Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| `minio` (minio-js) | Less maintained; AWS SDK v3 is the de facto standard for S3-compatible APIs |
| `@scaleway/sdk` | No official TypeScript SDK for Object Storage; their docs recommend AWS CLI/SDK for S3 compatibility |
| Direct HTTP with `fetch` + AWS SigV4 signing | Unnecessary complexity; we don't need SigV4 for public bucket access |
| `got` + manual S3 XML parsing | Higher maintenance burden; AWS SDK handles edge cases (multipart, retries, error mapping) |

### Configuration

```typescript
const client = new S3Client({
  region: process.env.SCALEWAY_REGION || 'fr-par',
  endpoint: process.env.SCALEWAY_ENDPOINT || 'https://s3.fr-par.scw.cloud',
  forcePathStyle: true,
  // No credentials — bucket is fully public
});
```

**Key operations needed:**

| Operation       | AWS SDK Command          | Notes |
|-----------------|--------------------------|-------|
| Read study JSON | `GetObjectCommand`       | Single GET, parsed as JSON |
| List assignments | `ListObjectsV2Command`  | Used by `pickLeastUtilizedSession()` |
| List responses   | `ListObjectsV2Command`  | Used by `listResponses()` for resuming |
| Write response   | `PutObjectCommand`      | With `IfNoneMatch: '*'` for idempotent writes |
| Check existence  | `HeadObjectCommand`     | Pre-check before write to enforce idempotency |

### Scaleway Public Bucket Access

Scaleway Object Storage supports **public buckets** where both reads and writes can be done without authentication. Key details:
- Public buckets are accessible via unsigned HTTP requests.
- Bucket visibility is set to `public` in the Scaleway console.
- CORS must be configured if making browser-direct requests (not applicable here — all S3 operations are server-side).
- The bucket name and endpoint/region are the only required configuration.

---

## 2. HTTP Server Framework

### Decision: Express 4.22.0

### Rationale

- Express is **already in use** as the HTTP layer beneath AppKit. The AppKit `server` plugin wraps an Express app. Removing AppKit means using Express directly.
- All route handlers (`server/src/routes/*.ts`) are already written as Express route handlers taking `(req, res, deps)`. The refactor only changes how the Express app is created and started.
- Express provides static file serving (`express.static`) which is needed to serve the built client bundle.
- No new dependency required — Express is already in `package.json`.

### Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Fastify | Would require rewriting all route handlers; Express is already in place |
| Hono | New dependency with different middleware model; no benefit over existing Express |
| Node built-in `http` | Too low-level; would require manual routing, body parsing, etc. |
| Vite dev server alone | Doesn't support the API routes; need a unified server for both static files and API |

### Architecture Changes

**Before (AppKit):**
```
appkit.server.start()
  └── appkitExpress: Express
       ├── GET /api/session
       ├── POST /api/responses
       ├── GET /api/debrief
       ├── GET /api/current-user (AppKit internal)
       └── AppKit static file serving (client bundle)

AppKit handles: port allocation, health checks, static serving, plugin orchestration
```

**After (Standalone Express):**
```
expressApp.listen(port)
  ├── GET /api/session
  ├── POST /api/responses
  ├── GET /api/debrief
  ├── GET /api/health → { status: "ok" }
  └── express.static("client/dist") (production)
       OR Vite dev proxy (development)
```

**Dev mode**: Use `server-dev.ts` that starts Express on port 3001 and creates a Vite dev server with proxy. In production, Express serves the pre-built `client/dist` directly.

---

## 3. UI Component Library

### Decision: shadcn/ui (New York style, Neutral base)

### Rationale

- **Already configured**: `client/components.json` exists, configured with new-york style, neutral base color, CSS variables enabled, lucide icons.
- **Zero-runtime CSS**: Uses Tailwind CSS 4 which is already the project's styling foundation.
- **Tree-shakeable**: Components are copied into the project, not imported from a package — no bloated dependency.
- **Accessible**: Built on Radix UI primitives (Radix is a peer dependency of shadcn).
- **Match existing patterns**: The 31 AppKit UI components needing replacement all have direct shadcn/ui equivalents.

### Migration Mapping

| AppKit UI Component     | shadcn/ui Equivalent   | Notes |
|-------------------------|------------------------|-------|
| `Button`                | `Button` (button.tsx)  | Direct equivalent; shadcn supports variants |
| `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription` | `Card` family | Direct equivalent |
| `Alert`, `AlertDescription`, `AlertTitle` | `Alert` family | Direct equivalent |
| `Badge`                 | `Badge` (badge.tsx)    | Direct equivalent |
| `Label`                 | `Label` (label.tsx)    | Direct equivalent |
| `Progress`              | `Progress` (progress.tsx) | Direct equivalent |
| `RadioGroup`, `RadioGroupItem` | `RadioGroup` (radio-group.tsx) | Direct equivalent |
| `Spinner`               | Custom (via lucide `Loader2` + animate-spin) | shadcn doesn't ship a spinner; trivial to create |
| `Avatar`, `AvatarFallback` | `Avatar` (avatar.tsx) | Direct equivalent |
| `Empty`, `EmptyTitle`, `EmptyDescription` | Custom (simple composition of existing components) | No direct shadcn equivalent; just styled divs |
| `Sidebar`, `Sidebar*`   | `Sidebar` (sidebar.tsx) | Direct equivalent |
| `Toaster`               | `Sonner` (sonner.tsx)  | shadcn uses sonner for toasts |

### Components to Install

```bash
npx shadcn@latest add button card alert badge label progress radio-group avatar sidebar sonner
```

### Components to Create (no direct shadcn equivalent)

- **`Spinner`**: Wrapper around `<Loader2 className="animate-spin" />` from lucide-react
- **`Empty` / `EmptyTitle` / `EmptyDescription`**: Simple presentational components — a centered div with icon, title text, and description text. Can be inline in the one usage site (TaskItem.tsx) or created as a simple custom component.

### Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| MUI (Material UI) | Heavy dependency (~2MB); different styling paradigm (Emotion CSS-in-JS); would conflict with existing Tailwind CSS foundation |
| Radix UI (raw primitives) | Already the foundation of shadcn/ui; using shadcn gives styled versions of Radix primitives |
| Ant Design | Heavier than MUI; less popular in React ecosystem |
| Custom from scratch | Violates FR-011 ("use a React component library"); unnecessary maintenance burden |

---

## 4. Theming & Visual Design

### Decision: Neutral CSS variable system + Tailwind v4 + system-ui font stack

### Rationale

The refactored app uses shadcn/ui's CSS variable theming (already configured in `components.json` with neutral base). The PBL-specific tokens are removed:

**Removed:**
- PBL house-style CSS custom properties (`--pbl-*`)
- `@databricks/appkit-ui/styles.css` import
- RijksoverheidSans/Serif and Fira Sans web fonts
- PBL masthead and footer components (`PblChrome.tsx`, `components/apx/`)
- Rijkshuisstijl blue (`#007bc7`), PBL green, grey tones
- `next-themes` (was used by AppKit ThemeProvider)

**Retained:**
- Tailwind CSS 4 utility classes
- shadcn/ui CSS variables (`--background`, `--foreground`, `--primary`, etc.)
- Lucide icons (already in `package.json`)
- `cn()` utility (clsx + tailwind-merge)

**New font stack:**
```css
font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

This is a zero-download system font stack that renders consistently across platforms and has no branding associations.

**Color palette**: shadcn/ui neutral base — a clean, minimal grayscale with subtle blue accent. No government-associated colors.

---

## 5. Client Bundle Serving

### Decision: Express static middleware (production) + Vite dev proxy (development)

### Rationale

The app already uses Vite for client bundling and Express for the server. The standard pattern for this stack:

**Development (`npm run dev`)**:
1. Express server starts on port 3001 (API only)
2. Vite dev server starts on port 5173 with HMR
3. Vite proxies `/api/*` requests to Express
4. Developer accesses `http://localhost:5173`

This provides hot module replacement for the client while keeping the API server running.

**Production (optional `npm run build && npm start`)**:
1. `vite build` produces `client/dist/`
2. Express serves `client/dist/` as static files
3. Express API routes take priority over static files

**Implementation approach**: Use `server-dev.ts` as the dev entry point (starts both Express and Vite in dev mode). `server/server.ts` is the production entry point (Express with static file serving).

Actually, a simpler approach that avoids the dual-server complexity:

**Single Express server with Vite middleware in dev**:
```typescript
// server-dev.ts
const app = createApp();
if (process.env.NODE_ENV !== 'production') {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true } });
  app.use(vite.middlewares);
} else {
  app.use(express.static('client/dist'));
}
app.listen(3001);
```

This is the standard Vite-in-middleware pattern. It avoids managing two processes and port coordination.

### Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Separate Vite dev server + Express (two ports) | Requires CORS configuration; two processes to manage; port coordination |
| Vite's built-in proxy only | Vite is a dev tool; production needs a real server |
| `serve` package for production | Extra dependency; Express already handles static serving |
| Vite middleware mode | ✅ Chosen — single process, standard pattern |

---

## 6. Dependency Cleanup

### Packages to REMOVE:
- `@databricks/appkit` — Backend SDK (files plugin, server plugin, auth, etc.)
- `@databricks/appkit-ui` — UI component library
- `@databricks/sdk-experimental` — Databricks SDK (service principal auth, REST API)
- `next-themes` — Was used by AppKit ThemeProvider; no longer needed
- `@ast-grep/napi` — AppKit lint dependency
- `babel-plugin-react-compiler` — AppKit React Compiler requirement
- `tsdown` — Server bundler for AppKit deployment; replaced by tsx in dev

### Packages to ADD:
- `@aws-sdk/client-s3` — S3-compatible storage client (~500KB, tree-shakeable)
- `@radix-ui/react-*` — Already peer dependencies of shadcn/ui components; some may already be installed, others will be added when `npx shadcn add` is run

### Packages to RETAIN:
- `express`, `@types/express` — HTTP server
- `react`, `react-dom`, `@types/react`, `@types/react-dom` — Frontend
- `@tanstack/react-router`, `@tanstack/router-plugin` — Routing
- `@tanstack/react-query` — Data fetching
- `tailwindcss`, `@tailwindcss/vite`, `@tailwindcss/postcss`, `@tailwindcss/typography` — Styling
- `lucide-react` — Icons
- `sanitize-html`, `@types/sanitize-html` — HTML sanitization
- `zod` — Validation
- `clsx`, `tailwind-merge`, `tailwindcss-animate`, `tw-animate-css` — UI utilities
- `react-markdown` — Markdown rendering (Welcome page)
- `react-resizable-panels` — Used in cluster task (target text + candidates layout)
- `recharts` — Charts (if used in debrief)
- `embla-carousel-react` — Carousel (if used)
- All devDependencies except removed packages

---

## 7. Environment Configuration

### Decision: `.env` file with dotenv-style loading, validated at startup

### Removed env vars:
- `DATABRICKS_HOST`
- `DATABRICKS_VOLUME_FILES`
- `DATABRICKS_APP_PORT`
- `DATABRICKS_APP_NAME`
- All `DATABRICKS_*` variables

### New env vars:
- `SCALEWAY_ENDPOINT` — S3 endpoint URL (default: `https://s3.fr-par.scw.cloud`)
- `SCALEWAY_REGION` — S3 region (default: `fr-par`)
- `SCALEWAY_BUCKET` — Bucket name (required, no default)
- `STUDY_ID` — Study identifier (unchanged, still required)
- `SURVEY_LANGUAGE` — `en` or `nl` (unchanged, default `en`)
- `PORT` — Server port (default: `3001`)

### Startup validation:
The server validates all required env vars at startup and reports clear errors (both console and browser) for missing/invalid configuration. This replaces the previous AppKit config validation.

### `.env.example`:
```bash
# Required: Scaleway Object Storage bucket name
SCALEWAY_BUCKET=my-text-cluster-demo

# Optional: Scaleway endpoint and region (defaults shown)
SCALEWAY_ENDPOINT=https://s3.fr-par.scw.cloud
SCALEWAY_REGION=fr-par

# Required: Study identifier
STUDY_ID=example-study

# Optional: Survey language (en or nl, default: en)
SURVEY_LANGUAGE=en

# Optional: Server port (default: 3001)
PORT=3001
```

---

## 8. Server Implementation Strategy

### Core changes from `server/server.ts`:

**Before (AppKit):**
```typescript
const app = createApp()
  .use(files())
  .use(server({ autoStart: false }));

const storage = createServicePrincipalStorage(...);
const getStudy = createStudyProvider(storage, studyId);
const deps = { storage, studyId, getStudy, language };

const appkitExpress = app.extend((expressApp) => {
  registerSessionRoutes(expressApp, deps);
  registerResponseRoutes(expressApp, deps);
  registerDebriefRoutes(expressApp, deps);
});

await appkit.server.start();
```

**After (Standalone Express):**
```typescript
const app = express();

// Parse JSON bodies
app.use(express.json());

// Validate config at startup
const config = validateConfig();

// Create S3 storage adapter
const storage = createScalewayStorage(config);
await storage.validateConnection(); // Health check

// Load study
const getStudy = createStudyProvider(storage, config.studyId);

// Register routes
const deps = { storage, studyId: config.studyId, getStudy, language: config.language };
registerSessionRoutes(app, deps);
registerResponseRoutes(app, deps);
registerDebriefRoutes(app, deps);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Serve client in production, Vite middleware in dev
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/dist'));
  app.get('*', (_req, res) => res.sendFile('client/dist/index.html'));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    configFile: 'client/vite.config.ts',
    server: { middlewareMode: true },
  });
  app.use(vite.middlewares);
}

app.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`);
});
```

### Startup error handling:

Per FR-007, startup errors are reported in two channels:
1. **Console**: Detailed error with actionable guidance (missing env vars, unreachable bucket, invalid study)
2. **Browser**: If the server starts but the study/bucket is invalid, a styled error page is served instead of the survey

To serve an error page before the SPA is available, the server catches startup errors, starts a minimal HTTP server on the configured port, and serves a static HTML error page for all routes.

---

## 9. S3 Storage Adapter Design

The `S3Storage` interface replaces `VolumeStorage`. The API surface is nearly identical:

```typescript
interface S3Storage {
  read(key: string): Promise<string>;
  list(prefix: string): Promise<string[]>;
  upload(key: string, body: string, options?: { overwrite?: boolean }): Promise<void>;
  exists(key: string): Promise<boolean>;
}
```

**Implementation** (`server/src/lib/scalewayStorage.ts`):
- `read(key)` → `GetObjectCommand` + stream-to-string
- `list(prefix)` → `ListObjectsV2Command`, returns array of keys under prefix
- `upload(key, body)` → `PutObjectCommand`, with `IfNoneMatch: '*'` when `overwrite: false`
- `exists(key)` → `HeadObjectCommand` (returns true/false based on success/404)

**Compatibility with existing code**:
- `writeOnce()` function in `storage.ts` already calls `exists()` + `upload()` — no change needed except the interface type
- `listSafe()` treats missing prefixes as empty — same behavior
- Path builders in `server/src/lib/paths.ts` are **unchanged** — the storage root changes from a UC Volume path to a bucket name, but the relative path structure (`text_cluster_validation/{studyId}/...`) is preserved

---

## Summary of Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | `@aws-sdk/client-s3` for S3 access | Standard, well-maintained, supports unsigned requests for public buckets |
| 2 | Express (already in use) for HTTP | Remove AppKit wrapper, use Express directly — minimal change |
| 3 | shadcn/ui (already configured) for UI | Pre-configured, Tailwind-native, provides equivalents for all 31 AppKit UI components |
| 4 | CSS variable theming + system fonts | Replace PBL tokens with neutral shadcn defaults; system-ui font stack |
| 5 | Vite middleware mode for dev serving | Single process, standard Vite-in-Express pattern |
| 6 | `.env` with startup validation | Standard Node.js pattern; validate all required config at boot |
| 7 | `S3Storage` interface matching `VolumeStorage` shape | Minimizes changes to route/service code; only adapter changes |
| 8 | No authentication for Scaleway | Feature spec requires fully public bucket; unsigned S3 requests |
| 9 | Preserve all survey logic unchanged | Phase machine, correctness, shuffle, session assignment — zero logic changes |
| 10 | Two-mode error reporting (console + browser) | Per FR-007: clear errors in both terminal and styled browser page |