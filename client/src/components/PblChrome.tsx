import type { ReactNode } from 'react';
import { useTranslate } from '@/lib/i18n-context';

/**
 * PBL branded page chrome (US4, FR-010/FR-010a).
 *
 * A persistent, presentation-only shell that wraps every participant-facing screen: a top masthead
 * carrying the bundled PBL brand mark and a bottom PBL footer band, with the existing content in
 * between. This is branding only — it is deliberately NOT a navigation region:
 *
 *  - the masthead logo is a plain `<img>`, never a `<Link>` / `to` (no task navigation);
 *  - the footer carries branding/attribution text with NO clickable outbound links;
 *  - the masthead and footer are in-flow (static, not `fixed`/`sticky`), so they never obstruct the
 *    interactive content on short viewports and never alter the task controls' focus order.
 *
 * Colours, typography, and spacing come from the PBL house-style tokens on the AppKit `:root` layer
 * (client/src/index.css). Where a shadcn/AppKit default conflicts with the PBL chrome, PBL wins
 * (research.md R8) — a presentation override that leaves component behaviour/accessibility intact.
 */
export function PblChrome({ children }: { children: ReactNode }) {
  const t = useTranslate();

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="bg-card">
        {/*
         * Mirrors the reference site's `block-sitebranding__publisher` (https://startanalyse.pbl.nl/):
         * the Rijksoverheid ribbon logo hangs from the top edge of the page, horizontally centred on
         * the viewport, with the publisher name in the house serif to its right. Branding-only mark:
         * a plain image, never a link (no task navigation, FR-010a) — the reference wraps it in a
         * home link, which we deliberately omit.
         */}
        <div className="pbl-masthead__publisher">
          <img
            src="/pbl-logo.svg"
            width={50}
            height={100}
            alt={t('chromeLogoAlt')}
            className="pbl-masthead__publisher-logo"
          />
          <span className="pbl-masthead__publisher-name">{t('chromePublisherName')}</span>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-card">
        {/* Branding/attribution only — no clickable outbound links (FR-010a). */}
        <div className="mx-auto flex w-full max-w-5xl items-center px-4 py-4 text-sm text-muted-foreground">
          {t('chromeFooterAttribution')}
        </div>
      </footer>
    </div>
  );
}

export default PblChrome;
