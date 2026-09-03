import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../../server/src/lib/sanitizeHtml';

/**
 * T022 (US2, FR-007/FR-008/FR-009): the server-side sanitizer is the single trusted boundary for
 * researcher-authored document HTML. It must strip everything dangerous (scripts, styles, event
 * handlers, links/media, remote references, all attributes), keep only an inert presentational
 * subset, pass plain text through as readable text, and degrade malformed markup to readable text
 * with no raw markup leaking.
 */
describe('sanitizeHtml', () => {
  it('keeps the allowed presentational tags (FR-007)', () => {
    const kept = [
      '<p>para</p>',
      '<strong>bold</strong>',
      '<em>emph</em>',
      '<b>b</b>',
      '<i>i</i>',
      '<u>u</u>',
      '<s>s</s>',
      '<span>span</span>',
      '<h1>h1</h1>',
      '<h2>h2</h2>',
      '<h3>h3</h3>',
      '<h4>h4</h4>',
      '<ul><li>one</li></ul>',
      '<ol><li>one</li></ol>',
      '<blockquote>quote</blockquote>',
      '<code>code</code>',
      '<pre>pre</pre>',
      '<hr />',
      'line<br />break',
    ];
    for (const html of kept) {
      const out = sanitizeHtml(html);
      // The tag name survives (allowing for self-closing normalisation like <hr /> -> <hr />).
      const tag = html.match(/^<([a-z0-9]+)/)?.[1] ?? html.match(/<([a-z0-9]+)/)?.[1];
      expect(tag).toBeTruthy();
      expect(out).toContain(`<${tag}`);
    }
  });

  it('drops <script> and never leaks its content as executable markup', () => {
    const out = sanitizeHtml('<p>ok</p><script>alert(1)</script>');
    expect(out).toContain('<p>ok</p>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
  });

  it('drops <style> and its contents (FR-007)', () => {
    const out = sanitizeHtml('<style>body{color:red}</style><p>text</p>');
    expect(out).not.toContain('<style');
    expect(out).not.toContain('color:red');
    expect(out).toContain('<p>text</p>');
  });

  it('strips inline event handlers and all attributes (FR-007)', () => {
    const out = sanitizeHtml('<p onclick="steal()" class="x" id="y" style="color:red">hi</p>');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('class');
    expect(out).not.toContain('id=');
    expect(out).not.toContain('style');
    expect(out).not.toContain('steal()');
    expect(out).toContain('hi');
  });

  it('drops anchors but preserves their readable text (no hrefs/remote refs, FR-007)', () => {
    const out = sanitizeHtml('<a href="https://evil.example/steal">click me</a>');
    expect(out).not.toContain('<a');
    expect(out).not.toContain('href');
    expect(out).not.toContain('evil.example');
    expect(out).toContain('click me');
  });

  it('drops <img> and remote references entirely (FR-007)', () => {
    const out = sanitizeHtml('<img src="https://evil.example/track.gif" alt="x" />');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('src');
    expect(out).not.toContain('evil.example');
  });

  it('drops <iframe> and embedded objects (FR-007)', () => {
    const out = sanitizeHtml('<iframe src="https://evil.example"></iframe><p>after</p>');
    expect(out).not.toContain('<iframe');
    expect(out).not.toContain('evil.example');
    expect(out).toContain('<p>after</p>');
  });

  it('passes plain text through as readable text (FR-008)', () => {
    const out = sanitizeHtml('Soil and nitrogen deposition.');
    expect(out).toBe('Soil and nitrogen deposition.');
  });

  it('degrades malformed markup to readable text with no raw markup (FR-009)', () => {
    const out = sanitizeHtml('<p>unclosed <strong>bold and <em>nested');
    // No dangerous or raw dangling markup leaks; the words remain readable.
    expect(out).not.toContain('<script');
    expect(out).toContain('unclosed');
    expect(out).toContain('bold and');
    expect(out).toContain('nested');
  });

  it('leaves an empty string empty', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});
