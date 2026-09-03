# Quickstart: Welcome Home Page & Document Formatting (Feature 002)

Builds on the feature-001 setup. Assumes the app already runs (`npm run dev`) against a Study in the
UC Volume. This covers only what feature 002 adds.

## 1. Install the new dependency

```bash
npm install sanitize-html
npm install -D @types/sanitize-html
```

Server-side HTML sanitization for cluster target documents (FR-007). Runs in Node (no DOM needed).

## 2. Configure the deployment language

Set the app-wide UI language (built-in strings only — never task items):

```bash
# .env (or Databricks App config)
SURVEY_LANGUAGE=nl   # 'nl' or 'en'; defaults to 'en' when unset/invalid
STUDY_ID=my-study    # unchanged, from feature 001
```

Verify: build/run the client with `SURVEY_LANGUAGE=nl`; built-in chrome such as **Welkom** and
**Beginnen** should render in Dutch. The value is baked into the client bundle, so rebuild after
changing it.

## 3. Author welcome copy (optional) and HTML documents in `study.json`

Welcome copy (optional — a localized default is shown when omitted):

```json
{
  "studyId": "my-study",
  "welcome": {
    "greeting": "Welcome",
    "whatText": "You'll complete a short set of text-judgment tasks.",
    "whyText": "Your judgments help validate automatically-generated groupings of text."
  }
}
```

Cluster target documents are now authored as HTML (plain text still works unchanged):

```json
{
  "clusterItems": [
    {
      "itemId": "c-001",
      "taskType": "cluster",
      "targetTextId": "t-001",
      "targetText": "<h3>River deltas</h3><p>A delta forms where a river <strong>slows</strong> and deposits sediment.</p><ul><li>silt</li><li>sand</li></ul>",
      "candidateClusterIds": ["k12", "k44", "k91"],
      "intruderClusterId": "k91"
    }
  ]
}
```

Only presentational tags survive sanitization (`p, br, span, strong, em, b, i, u, s, h1–h4, ul, ol,
li, blockquote, code, pre, hr`); scripts, styles, links, images, event handlers, and remote
references are stripped. Malformed HTML degrades to readable text.

## 4. Walk the flows

- **Welcome (US1)**: open the app as a first-time visitor → the welcome page shows at `/` before any
  task, with greeting/what/why and a single **Begin** control (keyboard-reachable). Begin → word
  instructions. Reopen mid-session → you land on your current phase, not the welcome page.
- **Formatted document (US2)**: reach a cluster item → the target document renders with its
  formatting (paragraphs/headings/lists/emphasis), not a single plain block, and no raw markup or
  script runs. Candidate selection is unchanged and keyboard-reachable.
- **Language (US3)**: with `SURVEY_LANGUAGE=nl`, all chrome (welcome default, buttons, prompts,
  system messages) is Dutch while supplied task items display exactly as authored.
- **Practice reveal (FR-017)**: in each practice item the explanation stays hidden until you submit
  that item's answer — including the second practice item.
- **Completion + walkthrough (US4)**: finish all items → a thank-you page offers **close** or
  **continue**. Continue → each answered item is re-shown in the session layout with your selection
  marked and a correct/incorrect, grouping-focused explanation → a closing thank-you page.

## 5. Verify quality gates

```bash
npm run typecheck
npm run lint
npm run format
npm test            # vitest unit + smoke
```

New unit tests: `sanitizeHtml.test.ts` (allowlist strips script/handlers/style/remote refs, keeps
presentational tags), plus session/response/studyLoader additions (welcome gating, `targetHtml`
mapping, `selectedClusterWords`, welcome default fallback, debrief covers all answered items). Smoke
test covers welcome→begin, formatted-doc render (no markup/script leak), Dutch chrome with unchanged
item, practice reveal timing, and the completion walkthrough.

## Data-flow / PII note

Researcher HTML and the selected cluster's representative words stay inside the UC Volume boundary.
Sanitization happens server-side in memory; the browser only ever receives the inert, sanitized
subset. No document text, cluster words, participant id, or language flag is written to logs,
telemetry, error messages, or client persistent storage (Principle II).
