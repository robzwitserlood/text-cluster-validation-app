# Phase 0 Research: Welcome Home Page & Document Formatting

All Technical-Context unknowns are resolved below. Each decision is grounded in the existing
feature-001 architecture (server-driven phase machine, ground-truth secrecy at the DTO boundary,
UC-Volume-only storage) so the new work adds the minimum surface area.

## R1 — Welcome page placement (US1, FR-001–FR-005, FR-012)

**Decision**: Add a single leading phase `welcome` to the server phase machine and map it to the
existing index route `/` (`routeForPhase('welcome') === '/'`). The index route's loader loads the
session; when `phase === 'welcome'` it renders the `Welcome` component instead of redirecting, and
for every other phase it redirects to the phase route exactly as it does today. The "begin" control
reuses the established acknowledgement mechanism: it records a non-PII `welcome` flag (localStorage +
`X-Ack-Instructions` header) and calls `refreshAndNavigate()`, after which the server returns
`word-instructions` and the participant is sent into the existing flow.

`resolveSessionState` returns `welcome` only when the participant is at the very start — no real
items answered, no practice attempted, and `welcome` not yet acknowledged. Because a returning
in-progress participant has recorded progress (or the ack flag), they are redirected straight to
their current phase and never see the welcome as a fresh start (FR-005). Welcome content
(greeting/what/why) is carried on the `welcome` current variant, sourced from `study.welcome` with a
localized built-in default (FR-012).

**Rationale**: The post-refactor `/` is already the real index route that redirects via a loader, so
welcome "is" that route — no sidebar entry (the sidebar was removed) and no new navigation concept.
Reusing the `X-Ack-Instructions` flag keeps the server stateless (no welcome record written) and
mirrors how instructions are already gated, satisfying Simplicity (III). Welcome records no response
data, consistent with the spec's "informational only" assumption.

**Alternatives considered**:

- _Client-only welcome (no server phase), gated purely in the index loader by `progress.answered === 0`_
  — cannot distinguish "hasn't begun" from "began, recorded nothing yet," and scatters flow logic
  the server otherwise owns. Rejected for consistency.
- _Persist a "welcome seen" record in the Volume_ — a new store for a purely informational step;
  violates YAGNI. Rejected.
- _New sidebar entry_ — the sidebar no longer exists post-refactor. Rejected.

## R2 — Server-side HTML sanitization for target documents (US2, FR-006–FR-009, FR-011)

**Decision**: Author the cluster-intrusion target document as HTML in `study.json`
(`clusterItems[].targetText`, still a plain string). Sanitize it **server-side at the DTO boundary**
(`toClientClusterItem` / `toClientClusterPractice` in `sessionService`) into a safe `targetHtml`
string, and ship that to the client, which renders it inertly via a small `SafeHtml` component
(`dangerouslySetInnerHTML`). Use the `sanitize-html` library with a strict allowlist:

- **Allowed tags**: `p, br, span, strong, em, b, i, u, s, h1, h2, h3, h4, ul, ol, li, blockquote,
code, pre, hr`.
- **Allowed attributes**: none (strip `class`, `style`, `id`, `href`, `src`, event handlers, data-\*).
- **Disallowed (dropped, contents preserved as text where sensible)**: `script, style, iframe,
object, embed, link, form, input, button, a, img, svg, math`, all `on*` handlers, and any remote
  or `url()` reference.
- `allowedSchemes: []`, `allowProtocolRelative: false`, no external/remote content.

Plain text with no tags sanitizes to the same readable text (FR-008); malformed markup is parsed by
`sanitize-html` and the readable text content is preserved with tags dropped, never leaking raw
markup (FR-009). The empty/missing target document is already withheld with a notice by the loader
(FR-016 in feature 001) — that behaviour is unchanged.

**Rationale**: Sanitizing on the server keeps the **single trusted boundary** on the server
(Principle II): the browser never receives unsanitized markup and never has to be trusted to strip
it. `sanitize-html` is DOM-free (htmlparser2-based), so it runs in Node without jsdom. Sanitizing
inside the existing DTO mapping means both the real cluster item and the cluster practice item get
the same treatment through one code path, and the memoized study provider means the raw HTML is read
once. The document text never enters logs or telemetry (FR-011) — it flows study → sanitizer → DTO →
client only.

**Alternatives considered**:

- _Client-side DOMPurify_ — ships a sanitizer to every browser and moves the trust boundary to the
  client; also requires the browser DOM. Rejected under Principle II + Simplicity.
- _Server-side DOMPurify + jsdom_ — heavier dependency (full DOM emulation) for the same result.
  Rejected.
- _Hand-rolled allowlist regex/parser_ — security-critical code that is notoriously easy to get
  wrong (mutation XSS, malformed nesting). Rejected; a vetted library is the simpler safe choice.

## R3 — Rendering sanitized HTML in React (US2, FR-010)

**Decision**: A dedicated `SafeHtml` component renders the server-sanitized `targetHtml` via
`dangerouslySetInnerHTML`, wrapped in the existing muted document container with readable typography
(`prose`-like spacing via Tailwind utilities, preserving paragraph/heading/list structure). The
document block stays before the radio group and is not focusable/interactive, so keyboard focus flows
straight to the candidate selection controls (FR-010); no focus trap is possible because the content
is inert. `TaskItem`'s prop changes from `targetText?: string` to `targetHtml?: string`.

**Rationale**: `dangerouslySetInnerHTML` is safe here precisely because the string is
server-sanitized to an inert subset; isolating it in `SafeHtml` documents that invariant in one
place. Reusing the current `rounded-lg border bg-muted/30` container preserves the existing look and
keeps the change localized to the render seam the user flagged.

**Alternatives considered**:

- _Parse to a React tree (e.g. `html-react-parser`)_ — extra dependency and no safety benefit over
  rendering an already-sanitized string. Rejected.

## R4 — Deployment language configuration (US3, FR-013–FR-015)

**Decision**: A single app-wide `SURVEY_LANGUAGE` environment variable (`nl` | `en`, default `en`)
is validated through the shared parser in `shared/config.ts`. `server.ts` reads it for
server-generated strings, and Vite bakes the same value into the client bundle for built-in chrome.
Built-in strings live in a shared typed catalog `shared/i18n.ts` (`type Locale = 'nl' | 'en'`; a
`messages[locale]` dictionary with typed keys). A small `client/src/lib/i18n.tsx` provides a
`t(key)` hook over the shared catalog. All hardcoded English UI strings (task prompts like "Which
group does not belong?", button labels, system/notice/error copy, the built-in default welcome) move
into the catalog and are looked up by the deployment language.

The language switch touches **only** built-in strings. Researcher-authored content (welcome copy,
practice/debrief explanations) and task items (word lists, candidate clusters, target documents) are
passed through verbatim and are never keyed through the catalog (FR-015). The app functions when the
configured language differs from the item language, since items are never translated.

**Rationale**: A plain typed dictionary meets the two-language need without an i18n framework
(Simplicity III), and TypeScript enforces key completeness across locales. The catalog is shared so
the server can select the localized **default** welcome copy (FR-012). The language must be available
to pre-session chrome (loading/error/buttons), so baking the safe language flag into the client
bundle avoids an extra network request.

**Alternatives considered**:

- _Language only in `SessionState`_ — leaves loading/error chrome unlocalized before/if the session
  resolves. Rejected.
- _An i18n library (i18next/react-intl)_ — speculative complexity for two flat string sets. Rejected.

## R5 — Cluster response enrichment (FR-016)

**Decision**: When recording a **cluster** response, `responseService` resolves the selected
cluster's `representativeWords` from `study.clusters` and stores them on the `Response` as
`selectedClusterWords: string[]`, in addition to the existing study-defined `selection.value`
(clusterId) and the `clusterId` (intruder) linkage. Word responses are unchanged. This is additive;
no existing field changes, and correctness computation is untouched.

**Rationale**: FR-016 wants responses interpretable without cross-referencing the study definition.
The representative words are exactly what the participant saw for the chosen candidate and are
already resolvable server-side from `study.clusters`. Data stays in the Volume (Principle II).

**Alternatives considered**:

- _Store the whole candidate set_ — more than FR-016 asks for; the selected cluster's words suffice.
  Rejected.
- _Have the client send the words_ — the client already sends only `clusterId`; resolving
  server-side avoids trusting client-supplied display text and needs no request-shape change.
  Rejected.

## R6 — Practice-reveal fix + debrief walkthrough (US4, FR-017–FR-022)

**Decision (FR-017)**: Remount `PracticeItem` per practice item by giving it
`key={current.practice.itemId}` in both `word/practice.tsx` and `cluster/practice.tsx`, so its
`value`/`revealed` state resets for every item and the explanation stays hidden until that specific
item's answer is submitted. (Today the component instance is reused across practice items on the same
route, which is the seam where a stale `revealed` can surface the second item's explanation early.)

**Decision (FR-018–FR-022)**: Keep the terminal phase `complete` and turn the `/complete` route into
a client-side stepper with three states: (1) **thank-you** — states the survey is complete and offers
both "close this window" guidance and a "continue to explanation" control; (2) **walkthrough** — one
answered item at a time, re-rendered in the session layout (read-only `TaskItem`: `hideSubmit`,
disabled radio group, the participant's selection marked, correct/incorrect indicated) with the
system-generated, cluster-framed explanation below and a Next control; (3) **closing** — a final
thank-you indicating the window may be closed. The walkthrough is driven by the **existing**
`GET /api/debrief` payload.

`buildDebrief` changes to return **all** answered items in session order (word items then cluster
items, in `Session` order) rather than a random capped sample, because FR-019 covers "each item they
responded to." `DebriefExample` is extended with the fields needed to re-render the session layout:
for cluster examples the sanitized `targetHtml` and the candidate `{ clusterId, representativeWords }`
blocks (same DTO mapping as the live item, ground truth still dropped except the already-present
`correctIntruder`); for word examples the `candidateWords`. The debrief remains the only place
ground truth crosses to the client, and only after completion (R5/feature 001). The debrief flow
writes nothing and reads only recorded responses, so closing at any step leaves data intact (FR-022).

**Rationale**: The walkthrough is presentation over data the server already computes, so it belongs
on the client — no new endpoint or server flow (Simplicity III). Re-using `TaskItem` in a read-only
mode reproduces the session layout exactly (FR-019) with the components already built for it. The
per-item `key` is the minimal, robust fix for the reveal bug and also guards the resume path.

**Alternatives considered**:

- _A new server-driven `debrief` phase that paginates items_ — the `debrief` phase value exists but
  is unused; paginating server-side adds round-trips and flow state for a read-only recap. Rejected;
  keep it client-side.
- _Keep the random sample_ — contradicts FR-019 ("each item they responded to"). Rejected;
  `debriefSampleSize` becomes unused for the walkthrough (left in config, not removed, to avoid an
  unrelated study-schema change).

> **Superseded (2026-07-16)**: the sampled debrief from feature 001 was reinstated. `buildDebrief`
> again returns a random (participant-seeded, stable across fetches) sample of up to
> `config.debriefSampleSize` answered items — all of them when fewer were answered — presented in
> session order. `debriefSampleSize` is optional in `study.json` and defaults to 3
> (001 spec, "How are debrief items selected"). The client walkthrough itself is unchanged.
