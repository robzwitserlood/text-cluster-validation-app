# Text Cluster Validation Survey

A standalone local survey application for text cluster intrusion validation.

## Architecture

- **Server**: Express API with S3-compatible object storage (Scaleway)
- **Client**: React SPA with shadcn/ui components, TanStack Router, Tailwind CSS
- **Shared**: TypeScript types, Zod schemas, and i18n strings

## Getting Started

```bash
npm install
cp .env.example .env  # Configure your Scaleway bucket
npm run dev            # Open http://localhost:3001
```

## Skills

For enhanced AI assistance with Databricks CLI operations, authentication, data exploration, and app development, install the Databricks skills:

```bash
databricks experimental aitools install
```