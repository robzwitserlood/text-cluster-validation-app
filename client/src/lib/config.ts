import { parseSurveyLanguageValue } from '../../../shared/config';

/** App-wide UI language baked into the client bundle from `SURVEY_LANGUAGE`. */
export const surveyLanguage = parseSurveyLanguageValue(import.meta.env.SURVEY_LANGUAGE);
