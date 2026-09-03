/**
 * Server-side HTML sanitizer (T024, US2 — R2, FR-007/FR-008/FR-009, contracts/api.md).
 *
 * This is the **single trusted boundary** (Principle II) for researcher-authored document HTML: the
 * raw `study.json` `targetText` is sanitized here — server-side, at the DTO seam — before it ever
 * reaches the browser. The client renders the result inertly and never has to be trusted to strip
 * anything.
 *
 * The allowlist is intentionally strict: only inert presentational tags, **no attributes**, and no
 * schemes/protocol-relative URLs, so no scripts, event handlers, styles, form controls, embedded
 * objects, links, media, or remote/external references can survive. Plain text passes through as its
 * own readable text (FR-008); malformed markup is parsed and reduced to readable text with tags
 * dropped, never leaking raw markup (FR-009).
 */

import sanitizeHtmlLib from 'sanitize-html';

/** The inert presentational subset researchers may use in a target document (FR-007). */
const ALLOWED_TAGS = [
  'p',
  'br',
  'span',
  'strong',
  'em',
  'b',
  'i',
  'u',
  's',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'hr',
];

const OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: ALLOWED_TAGS,
  // No attributes on any tag — strips class/style/id/href/src/data-*/on* handlers wholesale.
  allowedAttributes: {},
  // No URL schemes and no protocol-relative refs: nothing remote can be referenced.
  allowedSchemes: [],
  allowProtocolRelative: false,
  // Disallowed tags are dropped but their text content is preserved as readable text (FR-009),
  // except for tags whose contents are never display text (script/style), which are removed whole.
  disallowedTagsMode: 'discard',
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript'],
};

/**
 * Sanitize researcher-authored document HTML to the inert presentational subset above.
 *
 * @param raw The raw `targetText` from `study.json` (researcher-authored HTML or plain text).
 * @returns Safe HTML the client can render inertly via `dangerouslySetInnerHTML`.
 */
export function sanitizeHtml(raw: string): string {
  return sanitizeHtmlLib(raw, OPTIONS);
}
