# clustering-app

A Databricks App powered by [AppKit](https://databricks.github.io/appkit/), featuring React, TypeScript, and Tailwind CSS.

**Enabled plugins:**

- **Files** -- File operations against Databricks Volumes and Unity Catalog
- **Server** -- Express HTTP server with static file serving and Vite dev mode

## Prerequisites

- Node.js v22+ and pnpm
- Databricks CLI (for deployment)
- Access to a Databricks workspace

## Databricks Authentication

### Local Development

For local development, configure your environment variables by creating a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and set the environment variables you need:

```env
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_APP_PORT=8000
STUDY_ID=study-001          # one deployment = one Study; must match study.json's studyId
SURVEY_LANGUAGE=en          # built-in UI language: `nl` or `en` (default `en`)
# ... other environment variables, depending on the plugins you use
```

`SURVEY_LANGUAGE` selects the app-wide language of built-in UI strings only (buttons, prompts,
system messages, and the default welcome copy). It is not per-study or participant-selectable, and
it never translates researcher-authored content or task items. Unset or invalid values fall back to
`en`. The client reads it from `SURVEY_LANGUAGE` at client build time, so changing the value requires
rebuilding the client bundle.

### CLI Authentication

The Databricks CLI requires authentication to deploy and manage apps. Configure authentication using one of these methods:

#### OAuth U2M

Interactive browser-based authentication with short-lived tokens:

```bash
databricks auth login --host https://your-workspace.cloud.databricks.com
```

This will open your browser to complete authentication. The CLI saves credentials to `~/.databrickscfg`.

#### Configuration Profiles

Use multiple profiles for different workspaces:

```ini
[DEFAULT]
host = https://dev-workspace.cloud.databricks.com

[production]
host = https://prod-workspace.cloud.databricks.com
client_id = prod-client-id
client_secret = prod-client-secret
```

Deploy using a specific profile:

```bash
databricks bundle deploy --profile production
```

**Note:** Personal Access Tokens (PATs) are legacy authentication. OAuth is strongly recommended for better security.

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Development

Run the app in development mode with hot reload:

```bash
pnpm run dev
```

The app will be available at the URL shown in the console output.

### Build

Build both client and server for production:

```bash
pnpm run build
```

This creates:

- `dist/server.js` - Compiled server bundle
- `client/dist/` - Bundled client assets

### Production

Run the production build:

```bash
pnpm start
```

## Authoring a study

Each deployment serves one Study, authored in `study.json` inside the UC Volume (see
`STUDY_ID` above). Feature 002 adds two authoring capabilities; the
[feature-002 quickstart](specs/002-home-welcome-document-formatting/quickstart.md) has full
examples.

### Welcome copy (optional)

Add a top-level `welcome` object with one Markdown-formatted `content` field to control the home
page. When omitted, a localized default (in `SURVEY_LANGUAGE`) is shown instead. Welcome copy is
researcher-authored content and is never routed through the UI translation catalog.

### HTML target documents (cluster items)

A cluster item's `targetText` may contain presentational HTML; plain text continues to work
unchanged. The server sanitizes it in memory before it ever reaches the browser, so authored markup
is safe by construction:

- **Kept:** `p, br, span, strong, em, b, i, u, s, h1–h4, ul, ol, li, blockquote, code, pre, hr`.
- **Stripped:** scripts, styles, links, images, event handlers, all attributes, and any remote or
  protocol-relative references. Malformed markup degrades to readable text.

The browser only ever receives the inert, sanitized subset — never the raw authored HTML.

## Code Quality

There are a few commands to help you with code quality:

```bash
# Type checking
pnpm run typecheck

# Linting
pnpm run lint
pnpm run lint:fix

# Formatting
pnpm run format
pnpm run format:fix
```

## Deployment with Databricks Asset Bundles

### 1. Configure Bundle

Update `databricks.yml` with your workspace settings:

```yaml
targets:
  default:
    workspace:
      host: https://your-workspace.cloud.databricks.com
```

Make sure to replace all placeholder values in `databricks.yml` with your actual resource IDs.

### 2. Validate Bundle

```bash
databricks bundle validate
```

### 3. Deploy

Deploy to the default target:

```bash
databricks bundle deploy
```

### 4. Run

Start the deployed app:

```bash
databricks bundle run <APP_NAME> -t dev
```

### Deploy to Production

1. Configure the production target in `databricks.yml`
2. Deploy to production:

```bash
databricks bundle deploy -t prod
```

## Project Structure

```
* client/          # React frontend
  * src/           # Source code
  * public/        # Static assets
* server/          # Express backend
  * server.ts      # Server entry point
  * routes/        # Routes
* shared/          # Shared types
* databricks.yml   # Bundle configuration
* app.yaml         # App configuration
* .env.example     # Environment variables example
```

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: React.js, TypeScript, Vite, Tailwind CSS, React Router
- **UI Components**: Radix UI, shadcn/ui
- **Databricks**: AppKit SDK
