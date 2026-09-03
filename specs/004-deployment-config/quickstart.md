# Quickstart: Deployment Configuration Cleanup

## What changed

`databricks.yml`:

- App resource `name`: `clustering-app` → `human-val-text-analysis`
- App resource `description`: now opens with "Human validation text analysis" plus a
  purpose sentence
- Bundle target: `default` → `dev` (still the implicit default target)
- `files_path`/`files_id` under the `dev` target: now derived from `${bundle.target}` instead
  of hardcoded literals

## Validate

```bash
databricks bundle validate --profile DEFAULT
```

Expect `Target: dev` in the output (no `-t` flag needed — `dev` is still `default: true`).

```bash
databricks bundle summary --profile DEFAULT -o json
```

Confirm:

- `resources.apps.app.name` == `human-val-text-analysis`
- `resources.apps.app.description` starts with `Human validation text analysis`
- `variables.files_path.value` == `/Volumes/dev/raw/landing`
- `variables.files_id.value` == `dev.raw.landing`

## Deploy and run

```bash
databricks bundle deploy --profile DEFAULT   # creates human-val-text-analysis in the workspace
databricks bundle run app --profile DEFAULT  # deploys the synced source and starts the app
```

Note: because the app `name` changed, this creates a **new** app
(`human-val-text-analysis`) in the workspace. The previously deployed `clustering-app` app is
left in place and is not renamed or removed — delete it manually in the workspace if it's no
longer needed.

## Verify

```bash
databricks apps get human-val-text-analysis --profile DEFAULT -o json   # app_status.state == RUNNING
databricks apps logs human-val-text-analysis --follow --profile DEFAULT # requires OAuth, not PAT
```
