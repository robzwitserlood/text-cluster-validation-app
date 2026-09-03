import { useMemo, type ReactNode } from 'react';
import { messages, type Locale } from '../../../shared/i18n';
import { LanguageContext, type LanguageContextValue } from './i18n-context';

/**
 * Client language provider + `t()` hook (T008, R4, FR-013–FR-015).
 *
 * The deployment language is baked into the client bundle from `SURVEY_LANGUAGE` and passed in as
 * `language`. `t(key)` looks the built-in string up in the shared `shared/i18n.ts` catalog. Only
 * built-in chrome is localized here; researcher-authored content and task items are rendered
 * verbatim and never routed through `t` (FR-015).
 */

export interface LanguageProviderProps {
  language: Locale;
  children: ReactNode;
}

export function LanguageProvider({ language, children }: LanguageProviderProps) {
  const value = useMemo<LanguageContextValue>(() => ({ language, messages: messages[language] }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
