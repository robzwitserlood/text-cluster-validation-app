import { test, expect, type Page } from '@playwright/test';
import { messages, type Locale } from '../shared/i18n';

declare global {
  interface Window {
    __xss?: boolean;
  }
}

/**
 * Smoke / e2e flow (T045, Phase 9 — R13, SC-006/SC-008, FR-021).
 *
 * Drives the real React client against the e2e harness (tests/e2e/harness.ts), which serves the
 * genuine participant API over an in-memory Volume seeded with a fixed study. Covers:
 *
 *  - the full guided flow: word instructions → 2 practice → 2 word items → cluster instructions →
 *    2 practice → 1 cluster item → completion + debrief;
 *  - keyboard-only operation (SC-006): every choice is made with the radio group + Space, every
 *    button activated with Enter — no mouse clicks;
 *  - mid-session resume (FR-008): after answering one item and reloading, the flow resumes at the
 *    next unanswered item, never reshowing instructions/practice/answered items;
 *  - debrief gating (SC-008): `GET /api/debrief` is 409 `not_complete` before completion;
 *  - the no-leak network trace (FR-021/R5): no `/api/session` or `/api/responses` payload carries
 *    an intruder or correctness field at any depth before the debrief.
 */

/** Recursively check whether any object key (at any depth) is in `keys`. */
function hasKeyDeep(value: unknown, keys: Set<string>): boolean {
  if (Array.isArray(value)) return value.some((v) => hasKeyDeep(v, keys));
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (keys.has(k)) return true;
      if (hasKeyDeep(v, keys)) return true;
    }
  }
  return false;
}

/** Select the first candidate with the keyboard (focus + Space) and submit (focus + Enter). */
async function answerByKeyboard(page: Page, submitName: string): Promise<void> {
  const firstRadio = page.getByRole('radio').first();
  await expect(firstRadio).toBeVisible();
  await firstRadio.focus();
  await page.keyboard.press('Space');

  const submit = page.getByRole('button', { name: submitName });
  await expect(submit).toBeEnabled();
  await submit.focus();
  await page.keyboard.press('Enter');
}

/** Activate a button by accessible name using the keyboard only. */
async function pressButton(page: Page, name: string): Promise<void> {
  const button = page.getByRole('button', { name });
  await expect(button).toBeVisible();
  await button.focus();
  await page.keyboard.press('Enter');
}

/** Complete one practice exercise (answer, read the explanation, continue) by keyboard. */
async function completePractice(page: Page, badge: string): Promise<void> {
  await expect(page.getByText(badge)).toBeVisible();
  // The explanation stays hidden until THIS item's answer is submitted (US4, FR-017).
  await expect(page.getByText('Explanation')).toHaveCount(0);
  await answerByKeyboard(page, 'Check answer');
  await expect(page.getByText('Explanation')).toBeVisible();
  await pressButton(page, 'Continue');
}

/**
 * Assert the persistent PBL branded page chrome wraps the current screen (US4, FR-010/FR-010a):
 * a masthead carrying the BUNDLED (not hotlinked) PBL logo and a branding-only footer band with
 * NO clickable outbound links. Presentation only — it adds no task navigation.
 */
async function expectPblChrome(page: Page): Promise<void> {
  await expect(page.locator('header img[src="/pbl-logo.svg"]')).toBeVisible();
  const footer = page.locator('footer');
  await expect(footer).toBeVisible();
  await expect(footer.locator('a')).toHaveCount(0);
}

const INTRUDER_OR_CORRECTNESS = new Set([
  'intruderWord',
  'intruderClusterId',
  'intruderClusterIds',
  'correct',
  'correctIntruder',
]);

// Ground truth for the e2e fixture (tests/e2e/fixtures/study.ts) — cluster item ci1's intruder is
// c3, whose representative words feed the debrief's cluster explanation (US3).
const CI1_INTRUDER_CLUSTER_TERMS = ['code', 'byte', 'array'];

/**
 * Assert a cluster candidate's representative terms render as separate list rows, not a single
 * comma-joined text node (US1, FR-001/FR-002/FR-003) — the fixture's multi-word term "nitrogen
 * deposition" (cluster c1) must stay intact as one row — and that no bullet, dash, number, or
 * other marker glyph precedes any row (007, FR-001/SC-001).
 */
async function expectClusterTermRows(page: Page): Promise<void> {
  const term = page.locator('li', { hasText: 'nitrogen deposition' });
  await expect(term).toBeVisible();
  await expect(term).toHaveText('nitrogen deposition');
  await expect(page.getByText('soil, nitrogen deposition', { exact: false })).toHaveCount(0);

  const list = term.locator('xpath=..');
  const listStyleType = await list.evaluate((el) => getComputedStyle(el).listStyleType);
  expect(listStyleType).toBe('none');
}

/**
 * Assert an unselected, non-hovered answer-option tile shows a visible resting-state border — its
 * computed border-color must be visually distinct from its background-color (US2, FR-004/FR-005).
 */
async function expectVisibleRestingBorder(page: Page): Promise<void> {
  const optionLabel = page.getByRole('radiogroup').locator('label').first();
  const { border, background } = await optionLabel.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { border: cs.borderColor, background: cs.backgroundColor };
  });
  expect(border).not.toBe(background);
}

/** Whether the debrief walkthrough's currently-shown item is marked correct, per its locale badge. */
async function debriefShowsCorrect(page: Page, locale: Locale): Promise<boolean> {
  return page.getByText(messages[locale].debriefCorrect, { exact: true }).isVisible();
}

/** Assert the debrief walkthrough's per-item word explanation matches the locale catalog (US3). */
async function expectDebriefWordExplanation(page: Page, locale: Locale, intruderWord: string): Promise<void> {
  const correct = await debriefShowsCorrect(page, locale);
  await expect(page.getByText(messages[locale].debriefExplainWord(correct, intruderWord), { exact: true })).toBeVisible();
}

/** Assert the debrief walkthrough's per-item cluster explanation matches the locale catalog (US3). */
async function expectDebriefClusterExplanation(page: Page, locale: Locale, intruderWords: string[]): Promise<void> {
  const correct = await debriefShowsCorrect(page, locale);
  await expect(
    page.getByText(messages[locale].debriefExplainCluster(correct, intruderWords), { exact: true })
  ).toBeVisible();
}

test('completes word→cluster→debrief by keyboard and never leaks the intruder before debrief', async ({ page }) => {
  // Capture every /api/session and /api/responses payload to assert the no-leak invariant (R5).
  const captured: Promise<{ url: string; body: unknown }>[] = [];
  page.on('response', (resp) => {
    const url = resp.url();
    if (url.includes('/api/session') || url.includes('/api/responses')) {
      captured.push(
        resp
          .json()
          .then((body) => ({ url, body }))
          .catch(() => ({ url, body: null }))
      );
    }
  });

  // Count GET /api/session requests (US3, FR-007/SC-003/SC-006, research.md R6): advanceToSession
  // writes the server-resolved next SessionState straight into the query cache
  // (client/src/lib/flow-route-state.ts:18-24), so no item/completion transition below should ever
  // trigger a second session fetch — only the very first navigation to '/' should.
  let sessionRequestCount = 0;
  page.on('request', (req) => {
    if (req.method() === 'GET' && req.url().includes('/api/session')) sessionRequestCount++;
  });

  await page.goto('/');

  // --- Welcome home page (US1) ------------------------------------------------------------------
  await expect(page.getByText('Welcome', { exact: true })).toBeVisible();
  // The PBL branded chrome (masthead + footer) wraps the welcome screen (US4, FR-010/FR-010a).
  await expectPblChrome(page);
  await pressButton(page, 'Begin');

  // --- Word segment -----------------------------------------------------------------------------
  await expect(page.getByText('Word intrusion')).toBeVisible();
  await expectPblChrome(page); // …the instructions screen too
  // Instructions: exactly one reminders box (single alert), a practice-first reminder, no
  // stop-survey control, and no "saved to this browser/device" line (US1, SC-001/SC-002/SC-004).
  await expect(page.getByText('practice questions before the real ones')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByText(/stop survey/i)).toHaveCount(0);
  await expect(page.getByText(/saved to this (device|browser)/i)).toHaveCount(0);
  await pressButton(page, 'Begin');

  // The last-practice "real questions next" note appears ONLY on the final practice item (FR-006/SC-003).
  await expect(page.getByText('start on the next page')).toHaveCount(0); // Practice 1 — absent
  await completePractice(page, 'Practice 1 of 2');
  await expect(page.getByText('start on the next page')).toBeVisible(); // Practice 2 — present
  await completePractice(page, 'Practice 2 of 2');

  await expect(page.getByText('0 of 3 answered').first()).toBeVisible();
  await expectPblChrome(page); // …and the task screen
  // Every answer-option tile shows a visible resting-state border, not only on hover/selection (US2).
  await expectVisibleRestingBorder(page);
  // A submit-driven transition (US3, FR-007/SC-003/SC-006, research.md R6) resolves from the cache
  // advanceToSession wrote — never a second GET /api/session between the POST and the next screen.
  let sessionRequestsBeforeSubmit = sessionRequestCount;
  await answerByKeyboard(page, 'Submit');
  await expect(page.getByText('1 of 3 answered').first()).toBeVisible();
  expect(sessionRequestCount).toBe(sessionRequestsBeforeSubmit); // word item 1 → item 2

  sessionRequestsBeforeSubmit = sessionRequestCount;
  await answerByKeyboard(page, 'Submit');

  // --- Cluster segment (reachable only after every word item is answered, FR-022) ---------------
  await expect(page.getByText('Cluster intrusion')).toBeVisible();
  expect(sessionRequestCount).toBe(sessionRequestsBeforeSubmit); // word item 2 → cluster instructions
  await pressButton(page, 'Begin');

  // Cluster practice candidate terms render as separate list rows, not comma-joined (US1) — cp1's
  // candidates include cluster c1, whose "nitrogen deposition" term must stay intact as one row.
  await expectClusterTermRows(page);
  await completePractice(page, 'Practice 1 of 2');
  await completePractice(page, 'Practice 2 of 2');

  await expect(page.getByText('2 of 3 answered').first()).toBeVisible();
  // The live cluster item's candidate terms also render as separate list rows (US1).
  await expectClusterTermRows(page);
  // The cluster task's answer-option tiles also show a visible resting-state border (US2).
  await expectVisibleRestingBorder(page);
  sessionRequestsBeforeSubmit = sessionRequestCount;
  await answerByKeyboard(page, 'Submit');

  // --- Completion stepper: thank-you → walkthrough → closing (US3/US4, FR-008/FR-009) -----------
  await expect(page.getByText('All done')).toBeVisible();
  expect(sessionRequestCount).toBe(sessionRequestsBeforeSubmit); // final item → completion
  // The completion page states the survey is done + the tab may be closed, and frames the
  // explanation as optional via a clearly-labelled control (US3, SC-006).
  await expect(page.getByText('the survey is complete')).toBeVisible();
  await expect(page.getByText('close this tab')).toBeVisible();
  await expectPblChrome(page); // …and the completion screen
  await expect(page.getByText('What your answers tell us')).toHaveCount(0); // not shown yet — behind the control
  await pressButton(page, 'View the optional explanation');

  // Walkthrough: each answered item (w1, w2 word + ci1 cluster = 3) re-shown read-only, then Next.
  await expect(page.getByText('What your answers tell us')).toBeVisible();
  await expectPblChrome(page); // …and the optional explanation walkthrough
  // A read-only recap marks the participant's selection and shows a correct/incorrect indicator.
  await expect(page.getByText(/Correct|Not the intruder/).first()).toBeVisible();
  // The per-item explanation matches the English catalog (US3, SC-005 — no regression for English).
  await expectDebriefWordExplanation(page, 'en', 'keyboard');
  await pressButton(page, 'Next'); // w1 → w2
  await expectDebriefWordExplanation(page, 'en', 'spreadsheet');
  await pressButton(page, 'Next'); // w2 → ci1
  // The cluster recap re-renders the formatted document read-only (no raw markup).
  await expect(page.getByRole('heading', { name: 'Healthy crops' })).toBeVisible();
  // The cluster recap's candidate terms render as separate list rows too (US1).
  await expectClusterTermRows(page);
  await expectDebriefClusterExplanation(page, 'en', CI1_INTRUDER_CLUSTER_TERMS);
  await pressButton(page, 'Next'); // ci1 → closing

  // Closing thank-you: the window may be closed.
  await expect(page.getByText('Thank you', { exact: true })).toBeVisible();

  // --- No-leak network trace (FR-021/R5) --------------------------------------------------------
  const payloads = await Promise.all(captured);
  expect(payloads.length).toBeGreaterThan(0);
  for (const { url, body } of payloads) {
    expect(hasKeyDeep(body, INTRUDER_OR_CORRECTNESS), `intruder/correctness leaked in ${url}`).toBe(false);
  }
});

test('shows the welcome home page first, then Begin advances into the word instructions (US1)', async ({ page }) => {
  // Capture session payloads to assert the welcome page reveals no task answers/ground truth (FR-004).
  const sessionBodies: Promise<unknown>[] = [];
  page.on('response', (resp) => {
    if (resp.url().includes('/api/session')) sessionBodies.push(resp.json().catch(() => null));
  });

  await page.goto('/');

  // First-time visitor lands on the welcome page (default copy), not any task.
  await expect(page.getByText('Welcome', { exact: true })).toBeVisible();
  await expect(page.getByText('Word intrusion')).toHaveCount(0);
  await expect(page.getByRole('radio')).toHaveCount(0);

  await pressButton(page, 'Begin');
  await expect(page.getByText('Word intrusion')).toBeVisible();

  // The welcome session payload carries no intruder/correctness field at any depth (FR-004/R5).
  const bodies = await Promise.all(sessionBodies);
  for (const body of bodies) {
    expect(hasKeyDeep(body, INTRUDER_OR_CORRECTNESS)).toBe(false);
  }
});

test('shows a loading indicator, never a blank frame, before the welcome content loads (US1, FR-001/FR-002, SC-001)', async ({
  page,
}) => {
  // Delay the blocking GET /api/session the home route's loader awaits, so the router-level
  // pendingComponent (client/src/main.tsx) is what's on screen first, not a blank content area.
  await page.route('**/api/session', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.continue();
  });

  await page.goto('/');

  await expect(page.getByText('Loading…', { exact: true })).toBeVisible();
  await expect(page.getByText('Welcome', { exact: true })).toBeVisible();
});

test('resumes mid-session at the next unanswered item after a reload (FR-008)', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Welcome', { exact: true })).toBeVisible();
  await pressButton(page, 'Begin');

  await expect(page.getByText('Word intrusion')).toBeVisible();
  await pressButton(page, 'Begin');
  await completePractice(page, 'Practice 1 of 2');
  await completePractice(page, 'Practice 2 of 2');

  await expect(page.getByText('0 of 3 answered').first()).toBeVisible();
  await answerByKeyboard(page, 'Submit');
  await expect(page.getByText('1 of 3 answered').first()).toBeVisible();

  // Same browser/localStorage → resume at the next unanswered item, no instructions/practice replay.
  await page.reload();

  await expect(page.getByText('1 of 3 answered').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  await expect(page.getByText('Welcome', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Word intrusion')).toHaveCount(0);
  await expect(page.getByText('Practice 1 of 2')).toHaveCount(0);
});

test('shows a loading indicator, never a blank frame, when a resumed session reloads slowly (US1, FR-002, SC-001)', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByText('Welcome', { exact: true })).toBeVisible();
  await pressButton(page, 'Begin');

  await expect(page.getByText('Word intrusion')).toBeVisible();
  await pressButton(page, 'Begin');
  await completePractice(page, 'Practice 1 of 2');
  await completePractice(page, 'Practice 2 of 2');

  await expect(page.getByText('0 of 3 answered').first()).toBeVisible();
  await answerByKeyboard(page, 'Submit');
  await expect(page.getByText('1 of 3 answered').first()).toBeVisible();

  // Delay the reload's GET /api/session (the client's cache is gone after a real reload) so the
  // router-level pendingComponent is what's on screen first — never blank, never the welcome page.
  await page.route('**/api/session', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.continue();
  });
  await page.reload();

  await expect(page.getByText('Loading…', { exact: true })).toBeVisible();
  await expect(page.getByText('1 of 3 answered').first()).toBeVisible();
  await expect(page.getByText('Welcome', { exact: true })).toHaveCount(0);
});

test('renders a formatted cluster document safely — structure, no raw markup, no script (US2)', async ({ page }) => {
  await page.goto('/');

  // Advance through the welcome + word segment into the cluster item.
  await expect(page.getByText('Welcome', { exact: true })).toBeVisible();
  await pressButton(page, 'Begin');
  await expect(page.getByText('Word intrusion')).toBeVisible();
  await pressButton(page, 'Begin');
  await completePractice(page, 'Practice 1 of 2');
  await completePractice(page, 'Practice 2 of 2');
  await answerByKeyboard(page, 'Submit');
  await answerByKeyboard(page, 'Submit');

  await expect(page.getByText('Cluster intrusion')).toBeVisible();
  await pressButton(page, 'Begin');
  await completePractice(page, 'Practice 1 of 2');
  await completePractice(page, 'Practice 2 of 2');

  // The cluster item document renders with structure (heading + emphasis), not one plain block.
  await expect(page.getByText('2 of 3 answered').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Healthy crops' })).toBeVisible();
  await expect(page.locator('strong', { hasText: 'nitrogen' })).toBeVisible();

  // No raw markup leaks as text and the researcher's <script> never executed (FR-007/FR-011).
  await expect(page.getByText('<script>')).toHaveCount(0);
  await expect(page.getByText('window.__xss')).toHaveCount(0);
  expect(await page.evaluate(() => window.__xss ?? false)).toBe(false);

  // Candidate selection is unchanged and keyboard-reachable (FR-010).
  const firstRadio = page.getByRole('radio').first();
  await firstRadio.focus();
  await expect(firstRadio).toBeFocused();
  await answerByKeyboard(page, 'Submit');
  await expect(page.getByText('All done')).toBeVisible();
});

test('acknowledges a submit near-instantly, while the save is still pending (US2, FR-003, SC-002)', async ({ page }) => {
  await page.goto('/');
  await pressButton(page, 'Begin');
  await pressButton(page, 'Begin');
  await completePractice(page, 'Practice 1 of 2');
  await completePractice(page, 'Practice 2 of 2');
  await expect(page.getByText('0 of 3 answered').first()).toBeVisible();

  // Hold POST /api/responses open until we've asserted the submitting state, so the acknowledgment
  // assertion below is guaranteed to run while the save is still in flight.
  let releaseResponse: () => void = () => {};
  const responseDelay = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route('**/api/responses', async (route) => {
    await responseDelay;
    await route.continue();
  });

  const firstRadio = page.getByRole('radio').first();
  await firstRadio.focus();
  await page.keyboard.press('Space');
  const submit = page.getByRole('button', { name: 'Submit' });
  await submit.focus();
  await page.keyboard.press('Enter');

  const submitting = page.getByRole('button', { name: 'Submitting…' });
  await expect(submitting).toBeVisible();
  await expect(submitting).toBeDisabled();

  releaseResponse();
  await expect(page.getByText('1 of 3 answered').first()).toBeVisible();
});

test('a rapid double-submit advances progress by exactly one item, with no error shown (US2, FR-004)', async ({
  page,
}) => {
  await page.goto('/');
  await pressButton(page, 'Begin');
  await pressButton(page, 'Begin');
  await completePractice(page, 'Practice 1 of 2');
  await completePractice(page, 'Practice 2 of 2');
  await expect(page.getByText('0 of 3 answered').first()).toBeVisible();

  let releaseResponse: () => void = () => {};
  const responseDelay = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route('**/api/responses', async (route) => {
    await responseDelay;
    await route.continue();
  });

  const firstRadio = page.getByRole('radio').first();
  await firstRadio.focus();
  await page.keyboard.press('Space');
  const submit = page.getByRole('button', { name: 'Submit' });
  await submit.focus();
  // Fire both activations back to back, before the first re-render can disable the control — the
  // client's `disabled={!value || submitting}` guard (TaskItem.tsx) should make the second inert.
  await Promise.all([page.keyboard.press('Enter'), page.keyboard.press('Enter')]);

  releaseResponse();
  await expect(page.getByText('1 of 3 answered').first()).toBeVisible();
  await expect(page.getByText('2 of 3 answered').first()).toHaveCount(0);
  await expect(page.getByText('Something went wrong. Please try again.')).toHaveCount(0);
});

test('shows a retryable error on a failed submit, then succeeds on retry (US2, FR-005)', async ({ page }) => {
  await page.goto('/');
  await pressButton(page, 'Begin');
  await pressButton(page, 'Begin');
  await completePractice(page, 'Practice 1 of 2');
  await completePractice(page, 'Practice 2 of 2');
  await expect(page.getByText('0 of 3 answered').first()).toBeVisible();

  // Fail exactly the first POST /api/responses call; let any subsequent one through unintercepted.
  let failedOnce = false;
  await page.route('**/api/responses', async (route) => {
    if (!failedOnce) {
      failedOnce = true;
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'internal_error' } }) });
      return;
    }
    await route.continue();
  });

  const firstRadio = page.getByRole('radio').first();
  await firstRadio.focus();
  await page.keyboard.press('Space');
  const submit = page.getByRole('button', { name: 'Submit' });
  await submit.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByText('Something went wrong. Please try again.')).toBeVisible();
  // The selection and Submit control remain usable — the failed submission is not a dead end.
  await expect(firstRadio).toBeChecked();
  const retrySubmit = page.getByRole('button', { name: 'Submit' });
  await expect(retrySubmit).toBeEnabled();

  // Native `disabled` during the failed attempt dropped DOM focus from the button; re-focus before
  // retrying by keyboard, same as the original submit.
  await retrySubmit.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('1 of 3 answered').first()).toBeVisible();
});

test('@nl localizes app chrome to the deployment language while task items stay verbatim (US3, FR-014/FR-015)', async ({
  page,
}) => {
  // This test runs only under the chromium-nl project, whose harness serves SURVEY_LANGUAGE=nl.
  await page.goto('/');

  // --- Welcome home page: built-in default copy is Dutch (FR-012/FR-014) -------------------------
  await expect(page.getByText('Welkom', { exact: true })).toBeVisible();
  // The English default welcome must NOT appear — chrome flipped to Dutch.
  await expect(page.getByText('Welcome', { exact: true })).toHaveCount(0);
  await pressButton(page, 'Beginnen');

  // --- Word segment: instructions chrome is Dutch -----------------------------------------------
  await expect(page.getByText('Woordindringer')).toBeVisible();
  await expect(page.getByText('Voordat je begint')).toBeVisible();
  await pressButton(page, 'Beginnen');

  // --- Practice: badge, explanation heading, and controls are Dutch -----------------------------
  await expect(page.getByText('Oefening 1 van 2')).toBeVisible();
  await answerByKeyboard(page, 'Controleer antwoord');
  await expect(page.getByText('Uitleg')).toBeVisible();
  await pressButton(page, 'Doorgaan');

  // Second practice, then advance into the real word items.
  await expect(page.getByText('Oefening 2 van 2')).toBeVisible();
  await answerByKeyboard(page, 'Controleer antwoord');
  await expect(page.getByText('Uitleg')).toBeVisible();
  await pressButton(page, 'Doorgaan');

  // --- Real word item: prompt + progress are Dutch; the supplied words are verbatim -------------
  await expect(page.getByText('Welk woord is de indringer?')).toBeVisible();
  await expect(page.getByText('0 van 3 beantwoord').first()).toBeVisible();
  // The researcher-authored candidate words are English and must render exactly as authored (FR-015).
  await expect(page.getByRole('radio', { name: 'keyboard' })).toBeVisible();
  // The stop-survey control is removed everywhere (FR-007) — not present in any locale.
  await expect(page.getByRole('button', { name: 'Enquête stoppen' })).toHaveCount(0);

  await answerByKeyboard(page, 'Versturen');
  await expect(page.getByText('1 van 3 beantwoord').first()).toBeVisible();

  // --- Second real word item, then into the cluster segment (chrome stays Dutch) -----------------
  await answerByKeyboard(page, 'Versturen');

  await expect(page.getByText('Groepindringer')).toBeVisible();
  await pressButton(page, 'Beginnen');

  await answerByKeyboard(page, 'Controleer antwoord');
  await pressButton(page, 'Doorgaan');
  await answerByKeyboard(page, 'Controleer antwoord');
  await pressButton(page, 'Doorgaan');

  await expect(page.getByText('2 van 3 beantwoord').first()).toBeVisible();
  await answerByKeyboard(page, 'Versturen');

  // --- Completion → debrief walkthrough: per-item explanations are Dutch (US3, FR-006/FR-007) ----
  await expect(page.getByText('Klaar', { exact: true })).toBeVisible();
  await pressButton(page, 'Bekijk de optionele uitleg');

  await expect(page.getByText('Wat jouw antwoorden ons vertellen')).toBeVisible();
  await expectDebriefWordExplanation(page, 'nl', 'keyboard');
  await pressButton(page, 'Volgende'); // w1 → w2
  await expectDebriefWordExplanation(page, 'nl', 'spreadsheet');
  await pressButton(page, 'Volgende'); // w2 → ci1
  await expectDebriefClusterExplanation(page, 'nl', CI1_INTRUDER_CLUSTER_TERMS);
  await pressButton(page, 'Volgende'); // ci1 → closing

  await expect(page.getByText('Bedankt', { exact: true })).toBeVisible();
});

test('blocks the debrief until completion with 409 not_complete (SC-008, FR-021)', async ({ request }) => {
  const participantId = crypto.randomUUID();
  const res = await request.get('/api/debrief', { headers: { 'X-Participant-Id': participantId } });

  expect(res.status()).toBe(409);
  const body = (await res.json()) as { error?: { code?: string } };
  expect(body.error?.code).toBe('not_complete');
});
