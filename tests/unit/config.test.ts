import { describe, it, expect } from 'vitest';
import { parseSurveyLanguage, DEFAULT_LOCALE } from '../../server/src/lib/config';
import { parseSurveyLanguageValue } from '../../shared/config';

/** T010: `parseSurveyLanguage` honours valid `SURVEY_LANGUAGE` values and defaults to `en` otherwise (R4). */
describe('parseSurveyLanguage', () => {
  it('returns the configured locale for valid values', () => {
    expect(parseSurveyLanguage({ SURVEY_LANGUAGE: 'nl' })).toBe('nl');
    expect(parseSurveyLanguage({ SURVEY_LANGUAGE: 'en' })).toBe('en');
  });

  it('defaults to en when unset', () => {
    expect(parseSurveyLanguage({})).toBe('en');
    expect(parseSurveyLanguage({ SURVEY_LANGUAGE: undefined })).toBe('en');
  });

  it('defaults to en for invalid or non-exact values', () => {
    expect(parseSurveyLanguage({ SURVEY_LANGUAGE: 'fr' })).toBe('en');
    expect(parseSurveyLanguage({ SURVEY_LANGUAGE: 'EN' })).toBe('en');
    expect(parseSurveyLanguage({ SURVEY_LANGUAGE: ' nl ' })).toBe('en');
    expect(parseSurveyLanguage({ SURVEY_LANGUAGE: '' })).toBe('en');
  });

  it('DEFAULT_LOCALE is en', () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('uses the same parser for client-side build env values', () => {
    expect(parseSurveyLanguageValue('nl')).toBe('nl');
    expect(parseSurveyLanguageValue('en')).toBe('en');
    expect(parseSurveyLanguageValue('EN')).toBe('en');
    expect(parseSurveyLanguageValue(undefined)).toBe('en');
  });
});
