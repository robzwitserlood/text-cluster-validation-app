# Text Cluster Validation Survey

A standalone local survey application for text cluster intrusion validation.
Runs entirely on your machine with no cloud infrastructure required.

## Prerequisites

- **Node.js 22+** installed
- A **Scaleway account** with an Object Storage bucket created
- The bucket must be set to **public visibility** (both reads and writes, no authentication)

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd text-cluster-validation-app
npm install
```

### 2. Configure environment

Copy the example environment file and fill in your Scaleway bucket details:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Required: Your Scaleway Object Storage bucket name
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

### 3. Upload your study file

Place your `study.json` in the Scaleway bucket at:

```
text_cluster_validation/{STUDY_ID}/study/study.json
```

For example, if `STUDY_ID=example-study`:

```
text_cluster_validation/example-study/study/study.json
```

You can upload this via the Scaleway console, the AWS CLI (configured for Scaleway), or any S3-compatible tool.

## Usage

### Start the application

```bash
npm run dev
```

Open `http://localhost:3001` in your browser.

### Production build

```bash
npm run build
npm start
```

## How It Works

1. **Participant visits** the app → gets anonymous UUID (stored in browser localStorage)
2. **Server assigns** them to the least-utilized pre-defined item session
3. **Survey flow**: Welcome → Word Instructions → Word Practice → Word Items → Cluster Instructions → Cluster Practice → Cluster Items → Debrief → Complete
4. **All responses** are written as JSON files to the Scaleway bucket at `text_cluster_validation/{studyId}/responses/{participantId}/{itemId}.json`
5. **Ground truth** (correct answers) is never sent to the browser until the participant completes all items
6. **Progress persists** via browser localStorage — closing and reopening the browser on the same device resumes where they left off

### What Happens at Startup

1. The server validates all required environment variables
2. It connects to the Scaleway bucket and verifies the study file exists
3. The study JSON is loaded, validated, and cached in memory
4. The client bundle is served (via Vite dev server in development)
5. The server begins listening on the configured port

If anything fails (missing config, unreachable bucket, invalid study), a clear error is shown in both the terminal and the browser.

## Authoring a study

Each deployment serves one Study, authored in `study.json` in the Scaleway bucket (see `STUDY_ID` above). Feature 002 adds two authoring capabilities; the [feature-002 quickstart](specs/002-home-welcome-document-formatting/quickstart.md) has full examples.

### Welcome copy (optional)

Add a top-level `welcome` object with one Markdown-formatted `content` field to control the home page. When omitted, a localized default (in `SURVEY_LANGUAGE`) is shown instead. Welcome copy is researcher-authored content and is never routed through the UI translation catalog.

### HTML target documents (cluster items)

A cluster item's `targetText` may contain presentational HTML; plain text continues to work unchanged. The server sanitizes it in memory before it ever reaches the browser, so authored markup is safe by construction:

- **Kept:** `p, br, span, strong, em, b, i, u, s, h1–h4, ul, ol, li, blockquote, code, pre, hr`.
- **Stripped:** scripts, styles, links, images, event handlers, all attributes, and any remote or protocol-relative references. Malformed markup degrades to readable text.

The browser only ever receives the inert, sanitized subset — never the raw authored HTML.

## Project Structure

```
server/           # Express API server
client/           # React SPA (shadcn/ui + TanStack Router)
shared/           # Shared types, schemas, i18n
tests/            # Unit and e2e tests
specs/            # Feature specifications and plans
```

## Tech Stack

- **Backend**: Node.js, Express, `@aws-sdk/client-s3`
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, TanStack Router
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Storage**: Scaleway Object Storage (S3-compatible public bucket)

## Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Unit tests
npm run test

# E2E/smoke tests
npm run test:e2e
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "Missing required configuration" at startup | `.env` file not set up or missing vars | Copy `.env.example` to `.env` and fill in all required values |
| "Study file not found" at startup | study.json missing from bucket | Upload study.json to `text_cluster_validation/{STUDY_ID}/study/study.json` in your bucket |
| "Bucket unreachable" at startup | Wrong endpoint/region, or bucket not public | Verify Scaleway bucket exists and visibility is set to public |
| White screen in browser | Vite dev server not started | Check console for errors; ensure `npm run dev` started successfully |
| Responses not saving | Bucket not writable (not public) | Set bucket visibility to public in Scaleway console |