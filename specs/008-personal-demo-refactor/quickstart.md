# Quickstart: Personal Demo Refactor

**Feature**: 008-personal-demo-refactor
**Date**: 2026-09-14

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

### 4. Start the application

```bash
npm run dev
```

Open `http://localhost:3001` in your browser.

## What Happens at Startup

1. The server validates all required environment variables
2. It connects to the Scaleway bucket and verifies the study file exists
3. The study JSON is loaded, validated, and cached in memory
4. The client bundle is served (via Vite dev server in development)
5. The server begins listening on the configured port

If anything fails (missing config, unreachable bucket, invalid study), a clear error is shown in both the terminal and the browser.

## Running Tests

```bash
# Unit tests
npm run test

# Type checking
npm run typecheck

# Linting
npm run lint

# E2E/smoke tests
npm run test:e2e
```

## Project Structure

```
server/           # Express API server
client/           # React SPA (shadcn/ui + TanStack Router)
shared/           # Shared types, schemas, i18n
tests/            # Unit and e2e tests
specs/            # Feature specifications and plans
```

## How It Works

1. **Participant visits** the app → gets anonymous UUID (stored in browser localStorage)
2. **Server assigns** them to the least-utilized pre-defined item session
3. **Survey flow**: Welcome → Word Instructions → Word Practice → Word Items → Cluster Instructions → Cluster Practice → Cluster Items → Debrief → Complete
4. **All responses** are written as JSON files to the Scaleway bucket at `text_cluster_validation/{studyId}/responses/{participantId}/{itemId}.json`
5. **Ground truth** (correct answers) is never sent to the browser until the participant completes all items
6. **Progress persists** via browser localStorage — closing and reopening the browser on the same device resumes where they left off

## Differences from the Original Databricks App

| Before | After |
|--------|-------|
| Requires Databricks workspace + auth | Runs entirely locally |
| `databricks app run` | `npm run dev` |
| Unity Catalog Volumes storage | Scaleway Object Storage (S3-compatible) |
| PBL government branding | Neutral, clean theme |
| `@databricks/appkit` + `@databricks/appkit-ui` | Express + shadcn/ui |
| Service principal auth | Public bucket (no auth) |
| Deployed to Databricks Apps | Localhost only |

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "Missing required configuration" at startup | `.env` file not set up or missing vars | Copy `.env.example` to `.env` and fill in all required values |
| "Study file not found" at startup | study.json missing from bucket | Upload study.json to `text_cluster_validation/{STUDY_ID}/study/study.json` in your bucket |
| "Bucket unreachable" at startup | Wrong endpoint/region, or bucket not public | Verify Scaleway bucket exists and visibility is set to public |
| White screen in browser | Vite dev server not started | Check console for errors; ensure `npm run dev` started successfully |
| Responses not saving | Bucket not writable (not public) | Set bucket visibility to public in Scaleway console |