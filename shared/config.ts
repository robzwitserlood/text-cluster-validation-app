import { LOCALES, type Locale } from './i18n';

/** The default UI language when `SURVEY_LANGUAGE` is unset or invalid. */
export const DEFAULT_LOCALE: Locale = 'en';

/** Resolve a raw `SURVEY_LANGUAGE` value to a supported locale. */
export function parseSurveyLanguageValue(raw: string | undefined): Locale {
  return LOCALES.includes(raw as Locale) ? (raw as Locale) : DEFAULT_LOCALE;
}
