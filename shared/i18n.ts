/**
 * Deployment-language message catalog shared by the client and server (T003, R4, FR-013–FR-015).
 *
 * A single app-wide `SURVEY_LANGUAGE` (`nl` | `en`) selects one of these flat message sets for ALL
 * built-in UI chrome: button/navigation labels, task prompts, system/notice/error copy, the built-in
 * default Markdown welcome content, and the two system-generated debrief explanation templates
 * (match vs no-match, grouping-framed — FR-020/FR-014).
 *
 * This catalog covers ONLY built-in strings. Researcher-authored content (a supplied `study.welcome`,
 * task items, candidate words, target documents) is passed through verbatim and is NEVER routed
 * through here (FR-015).
 *
 * Key completeness is enforced by typing every locale as {@link Messages}: adding a key to the
 * interface forces both `nl` and `en` to supply it, so the two locales can never drift (R4).
 */

import type { Phase, SurveySection } from './types';

/** The supported deployment languages. */
export type Locale = 'nl' | 'en';

/** All deployment languages, for validation and iteration. */
export const LOCALES: readonly Locale[] = ['nl', 'en'] as const;

/**
 * The complete set of built-in UI strings. String-valued keys are looked up directly; the two
 * debrief explanations are functions because they interpolate the (non-ground-truth-leaking)
 * revealed intruder — chosen at debrief time by the `correct` (match/no-match) flag.
 */
export interface Messages {
  // Canonical survey-section labels (FR-001), localized. The shared vocabulary the default welcome
  // walk-through, instructions, and completion copy all refer back to (SC-005); ordered by
  // `SURVEY_SECTIONS`. See contracts/sections.md.
  sectionWelcome: string;
  sectionWordIntrusion: string;
  sectionClusterIntrusion: string;
  sectionCompletion: string;
  sectionExplanation: string;

  // Built-in default welcome (used only when `study.welcome` is absent — FR-012). The default now
  welcomeDefaultContent: string;
  welcomeBegin: string;

  // Instructions chrome (word + cluster). The former informational "how it works" box is folded into
  // the single subtitle (`*InstructionsLede`); there is no separate "how" key (FR-003).
  wordInstructionsTitle: string;
  wordInstructionsLede: string;
  clusterInstructionsTitle: string;
  clusterInstructionsLede: string;
  instructionsBeforeYouBegin: string;
  instructionsAnswersFinal: string;
  instructionsOneSitting: string;
  instructionsPracticeFirst: string;
  instructionsBegin: string;

  // Task / practice prompts and labels.
  wordTaskPrompt: string;
  wordTaskDescription: string;
  clusterTaskPrompt: string;
  clusterTaskDescription: string;
  practiceLabel: (index: number, of: number) => string;
  practiceExplanationHeading: string;
  practiceContinue: string;
  practiceDescription: string;
  practiceCheckAnswer: string;
  /** Shown only on the LAST practice item (`index === of`), never earlier ones (FR-006). */
  practiceRealNext: string;
  taskSubmit: string;
  taskSubmitting: string;
  taskNothingToShowTitle: string;
  taskNothingToShowDescription: string;

  // Progress.
  progressLabel: string;
  progressAnswered: (answered: number, total: number) => string;
  progress: {
    step: (current: number, total: number) => string;
    question: (current: number, total: number) => string;
    phase: Record<Phase, string>;
  };

  // Loading / error / notice chrome.
  loading: string;
  loadErrorTitle: string;
  loadErrorDescription: string;
  loadErrorRetry: string;

  // Completion / debrief walkthrough chrome.
  completeTitle: string;
  completeThankYou: string;
  completeCloseHint: string;
  completeContinue: string;
  debriefTitle: string;
  debriefNext: string;
  debriefFinish: string;
  debriefYourAnswer: string;
  debriefCorrect: string;
  debriefIncorrect: string;
  debriefPreparing: string;
  closingTitle: string;
  closingBody: string;

  appTitle: string;

  /**
   * System-generated, cluster-framed explanation for a WORD item, chosen by `correct`
   * (match = easy to spot, no-match = hard to spot). Frames the CLUSTER's coherence, never the
   * participant (FR-020). `intruderWord` is the revealed intruder (only crosses to the client in
   * the post-completion debrief).
   */
  debriefExplainWord: (correct: boolean, intruderWord: string) => string;

  /**
   * System-generated, cluster-framed explanation for a CLUSTER item, chosen by `correct`. Frames
   * the clusters' validity, never the participant (FR-020). `intruderWords` are the representative
   * words of the intruding group (empty when unavailable).
   */
  debriefExplainCluster: (correct: boolean, intruderWords: string[]) => string;
}

const en: Messages = {
  sectionWelcome: 'Welcome & introduction',
  sectionWordIntrusion: 'Word-intrusion questions (a short practice first, then the real questions)',
  sectionClusterIntrusion: 'Cluster-intrusion questions (a short practice first, then the real questions)',
  sectionCompletion: 'Completion',
  sectionExplanation: 'An optional explanation of how your answers are used',

  welcomeDefaultContent:
    '# Welcome\n\nYou’ll complete a short set of text-judgment tasks.\n\nYour judgments help validate automatically-generated groupings of text.\n\nThe survey has a few parts, which you’ll go through in this order:',
  welcomeBegin: 'Begin',

  wordInstructionsTitle: 'Word intrusion',
  wordInstructionsLede:
    'In each question you will see a small group of words. One word does not belong with the others — select that intruder, then submit.',
  clusterInstructionsTitle: 'Cluster intrusion',
  clusterInstructionsLede:
    'In each question you will read a short text and see several groups of words. One group does not belong with the text — select that intruding group, then submit.',
  instructionsBeforeYouBegin: 'Before you begin',
  instructionsAnswersFinal: 'Your answers are final — once you submit a question you cannot change it.',
  instructionsOneSitting:
    'We recommend completing the survey in one sitting. You can pause and resume later in the same browser, but there is no separate save step.',
  instructionsPracticeFirst: 'You’ll start with a couple of practice questions before the real ones begin.',
  instructionsBegin: 'Begin',

  wordTaskPrompt: 'Which word is the intruder?',
  wordTaskDescription: 'Select the word that does not belong with the others.',
  clusterTaskPrompt: 'Which group does not belong?',
  clusterTaskDescription: 'Select the group of words that does not belong with the text above.',
  practiceLabel: (index, of) => `Practice ${index} of ${of}`,
  practiceExplanationHeading: 'Explanation',
  practiceContinue: 'Continue',
  practiceDescription: 'This is a practice question to help you get the idea.',
  practiceCheckAnswer: 'Check answer',
  practiceRealNext: 'That was the last practice question — the real questions start on the next page.',
  taskSubmit: 'Submit',
  taskSubmitting: 'Submitting…',
  taskNothingToShowTitle: 'Nothing to show',
  taskNothingToShowDescription: 'There are no options to display right now.',

  progressLabel: 'Progress',
  progressAnswered: (answered, total) => `${answered} of ${total} answered`,
  progress: {
    step: (current, total) => `Step ${current} of ${total}`,
    question: (current, total) => `Question ${current} of ${total}`,
    phase: {
      welcome: 'Welcome',
      'word-instructions': 'Word Instructions',
      'word-practice': 'Word Practice',
      'word-items': 'Word Questions',
      'cluster-instructions': 'Cluster Instructions',
      'cluster-practice': 'Cluster Practice',
      'cluster-items': 'Cluster Questions',
      debrief: 'Debrief',
      complete: 'Complete',
    },
  },

  loading: 'Loading…',
  loadErrorTitle: 'Couldn’t load the form',
  loadErrorDescription: 'Please check your connection and try again.',
  loadErrorRetry: 'Retry',

  completeTitle: 'All done',
  completeThankYou: 'Thank you — the survey is complete and your answers have been saved.',
  completeCloseHint:
    'You can close this tab now. If you’d like, you can optionally read a short explanation of how your answers are used.',
  completeContinue: 'View the optional explanation',
  debriefTitle: 'What your answers tell us',
  debriefNext: 'Next',
  debriefFinish: 'Finish',
  debriefYourAnswer: 'Your answer',
  debriefCorrect: 'Correct',
  debriefIncorrect: 'Not the intruder',
  debriefPreparing: 'Preparing your summary…',
closingTitle: 'Thank you',
  closingBody: 'That\'s everything — you can close this tab now.',

  appTitle: 'Text Cluster Validation',

  debriefExplainWord: (correct, intruderWord) =>
    correct
      ? `The word that didn’t belong was “${intruderWord}”. When the intruder is easy to spot, it’s a sign the remaining words form a coherent group — evidence that this cluster holds together.`
      : `The word that didn’t belong was “${intruderWord}”. When the intruder is hard to spot, it can mean the words are less clearly related — a useful signal that this cluster may be less coherent.`,

  debriefExplainCluster: (correct, intruderWords) => {
    const group =
      intruderWords.length > 0 ? `the group “${intruderWords.join(', ')}”` : 'the group that did not belong';
    return correct
      ? `The group that didn’t fit the text was ${group}. When the odd group stands out, it suggests the other groups genuinely relate to the text — supporting how these clusters were formed.`
      : `The group that didn’t fit the text was ${group}. When the odd group is hard to spot, it can mean the clusters overlap or are less distinct — a useful signal about their validity.`;
  },
};

const nl: Messages = {
  sectionWelcome: 'Welkom & introductie',
  sectionWordIntrusion: 'Woordindringer-vragen (eerst een korte oefening, daarna de echte vragen)',
  sectionClusterIntrusion: 'Groepindringer-vragen (eerst een korte oefening, daarna de echte vragen)',
  sectionCompletion: 'Afronding',
  sectionExplanation: 'Een optionele uitleg over hoe je antwoorden worden gebruikt',

  welcomeDefaultContent:
    '# Welkom\n\nJe beoordeelt een korte reeks teksten.\n\nJouw oordelen helpen automatisch gevormde groeperingen van tekst te valideren.\n\nDe vragenlijst bestaat uit een aantal onderdelen, die je in deze volgorde doorloopt:',
  welcomeBegin: 'Beginnen',

  wordInstructionsTitle: 'Woordindringer',
  wordInstructionsLede:
    'Bij elke vraag zie je een klein groepje woorden. Eén woord hoort niet bij de rest — selecteer die indringer en verstuur.',
  clusterInstructionsTitle: 'Groepindringer',
  clusterInstructionsLede:
    'Bij elke vraag lees je een korte tekst en zie je meerdere groepen woorden. Eén groep hoort niet bij de tekst — selecteer die indringende groep en verstuur.',
  instructionsBeforeYouBegin: 'Voordat je begint',
  instructionsAnswersFinal:
    'Je antwoorden zijn definitief — als je een vraag hebt verstuurd, kun je die niet meer wijzigen.',
  instructionsOneSitting:
    'We raden aan de vragenlijst in één keer af te ronden. Je kunt later pauzeren en hervatten in dezelfde browser, maar er is geen aparte opslagstap.',
  instructionsPracticeFirst: 'Je begint met een paar oefenvragen voordat de echte vragen beginnen.',
  instructionsBegin: 'Beginnen',

  wordTaskPrompt: 'Welk woord is de indringer?',
  wordTaskDescription: 'Selecteer het woord dat niet bij de andere hoort.',
  clusterTaskPrompt: 'Welke groep hoort er niet bij?',
  clusterTaskDescription: 'Selecteer de groep woorden die niet bij de bovenstaande tekst hoort.',
  practiceLabel: (index, of) => `Oefening ${index} van ${of}`,
  practiceExplanationHeading: 'Uitleg',
  practiceContinue: 'Doorgaan',
  practiceDescription: 'Dit is een oefenvraag om je een idee te geven.',
  practiceCheckAnswer: 'Controleer antwoord',
  practiceRealNext: 'Dit was de laatste oefenvraag — de echte vragen beginnen op de volgende pagina.',
  taskSubmit: 'Versturen',
  taskSubmitting: 'Bezig met versturen…',
  taskNothingToShowTitle: 'Niets om te tonen',
  taskNothingToShowDescription: 'Er zijn op dit moment geen opties om te tonen.',

  progressLabel: 'Voortgang',
  progressAnswered: (answered, total) => `${answered} van ${total} beantwoord`,
  progress: {
    step: (current, total) => `Stap ${current} van ${total}`,
    question: (current, total) => `Vraag ${current} van ${total}`,
    phase: {
      welcome: 'Welkom',
      'word-instructions': 'Woord Instructies',
      'word-practice': 'Woord Oefening',
      'word-items': 'Woord Vragen',
      'cluster-instructions': 'Groep Instructies',
      'cluster-practice': 'Groep Oefening',
      'cluster-items': 'Groep Vragen',
      debrief: 'Nabespreking',
      complete: 'Voltooid',
    },
  },

  loading: 'Laden…',
  loadErrorTitle: 'Kon het formulier niet laden',
  loadErrorDescription: 'Controleer je verbinding en probeer het opnieuw.',
  loadErrorRetry: 'Opnieuw proberen',

  completeTitle: 'Klaar',
  completeThankYou: 'Bedankt — de vragenlijst is voltooid en je antwoorden zijn opgeslagen.',
  completeCloseHint:
    'Je kunt dit tabblad nu sluiten. Als je wilt, kun je optioneel een korte uitleg lezen over hoe je antwoorden worden gebruikt.',
  completeContinue: 'Bekijk de optionele uitleg',
  debriefTitle: 'Wat jouw antwoorden ons vertellen',
  debriefNext: 'Volgende',
  debriefFinish: 'Afronden',
  debriefYourAnswer: 'Jouw antwoord',
  debriefCorrect: 'Correct',
  debriefIncorrect: 'Niet de indringer',
  debriefPreparing: 'Je samenvatting wordt voorbereid…',
  closingTitle: 'Bedankt',
  closingBody: 'Dat was alles — je kunt dit tabblad nu sluiten.',

  appTitle: 'Tekstcluster Validatie',

  debriefExplainWord: (correct, intruderWord) =>
    correct
      ? `Het woord dat er niet bij hoorde was “${intruderWord}”. Als de indringer makkelijk te herkennen is, is dat een teken dat de overige woorden een samenhangende groep vormen — bewijs dat deze groepering standhoudt.`
      : `Het woord dat er niet bij hoorde was “${intruderWord}”. Als de indringer moeilijk te herkennen is, kan dat betekenen dat de woorden minder duidelijk verwant zijn — een nuttig signaal dat deze groepering minder samenhangend kan zijn.`,

  debriefExplainCluster: (correct, intruderWords) => {
    const group =
      intruderWords.length > 0 ? `de groep “${intruderWords.join(', ')}”` : 'de groep die er niet bij hoorde';
    return correct
      ? `De groep die niet bij de tekst paste was ${group}. Als de afwijkende groep opvalt, wijst dat erop dat de andere groepen echt bij de tekst horen — dat ondersteunt de manier waarop deze groeperingen zijn gevormd.`
      : `De groep die niet bij de tekst paste was ${group}. Als de afwijkende groep moeilijk te herkennen is, kan dat betekenen dat de groepen overlappen of minder duidelijk zijn — een nuttig signaal over hun validiteit.`;
  },
};

/** The full catalog, keyed by locale. Typed so every locale must supply every {@link Messages} key. */
export const messages: Record<Locale, Messages> = { nl, en };

// --- Canonical survey sections (FR-001) -------------------------------------------------------

/** The `Messages` key holding each section's localized label, in canonical order. */
const SECTION_LABEL_KEYS: Record<SurveySection['id'], keyof Messages> = {
  welcome: 'sectionWelcome',
  'word-intrusion': 'sectionWordIntrusion',
  'cluster-intrusion': 'sectionClusterIntrusion',
  completion: 'sectionCompletion',
  explanation: 'sectionExplanation',
};

/**
 * The single canonical, ordered, task-type-grouped survey-section enumeration (FR-001). The shared
 * vocabulary the default welcome walk-through, per-task instructions, and completion copy refer back
 * to (SC-005). Labels are resolved per-locale via {@link getSurveySections}; only `explanation` is
 * optional. See `contracts/sections.md`.
 */
export const SURVEY_SECTIONS: readonly Omit<SurveySection, 'label'>[] = [
  { id: 'welcome', order: 1, optional: false },
  { id: 'word-intrusion', order: 2, optional: false },
  { id: 'cluster-intrusion', order: 3, optional: false },
  { id: 'completion', order: 4, optional: false },
  { id: 'explanation', order: 5, optional: true },
] as const;

/** Resolve the canonical sections with their localized labels, in canonical order (FR-001/FR-011). */
export function getSurveySections(locale: Locale): SurveySection[] {
  const m = messages[locale];
  return SURVEY_SECTIONS.map((section) => ({
    ...section,
    label: m[SECTION_LABEL_KEYS[section.id]] as string,
  }));
}
