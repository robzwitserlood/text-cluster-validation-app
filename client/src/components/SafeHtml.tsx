import { cn } from '@/lib/utils';

/**
 * Renders a server-sanitized document (`targetHtml`) inertly (T027, US2 — R3, FR-010).
 *
 * The string arrives already sanitized to an inert presentational subset by the server (the single
 * trusted boundary, `server/src/lib/sanitizeHtml.ts`), so `dangerouslySetInnerHTML` is safe here —
 * isolating it in this one component documents that invariant. The block is purely presentational
 * and non-focusable, so keyboard focus flows straight past it to the candidate radio group and no
 * focus trap is possible (FR-010).
 *
 * The wrapper reuses the existing muted document container and adds readable typography for the
 * allowed structural tags (paragraphs, headings, lists, quotes, code).
 */

export interface SafeHtmlProps {
  /** Server-sanitized safe-subset HTML. */
  html: string;
  className?: string;
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed',
        // Readable structure for the sanitized presentational subset.
        '[&_p]:my-2 first:[&_p]:mt-0 last:[&_p]:mb-0',
        '[&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold',
        '[&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold',
        '[&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold',
        '[&_h4]:mb-2 [&_h4]:text-sm [&_h4]:font-semibold',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_li]:my-1',
        '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
        '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs',
        '[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-2',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
