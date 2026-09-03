import { createContext, useContext } from 'react';
import type { Locale, Messages } from '../../../shared/i18n';

/** The string-valued catalog keys resolved by `useTranslate()`. */
type StringMessageKey = {
  [K in keyof Messages]: Messages[K] extends string ? K : never;
}[keyof Messages];

export interface LanguageContextValue {
  language: Locale;
  messages: Messages;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

function useLanguageContext(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a <LanguageProvider>.');
  return context;
}

/** Look up a built-in UI string in the deployment language. */
export function useTranslate(): (key: StringMessageKey) => string {
  const { messages } = useLanguageContext();
  return (key) => messages[key];
}

/** Access the full message set (e.g. for the function-valued debrief explanations). */
export function useMessages(): Messages {
  return useLanguageContext().messages;
}

/** The active deployment language. */
export function useLocale(): Locale {
  return useLanguageContext().language;
}
