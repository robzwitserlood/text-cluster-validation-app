# Contract: Canonical Survey-Section Enumeration (FR-001)

The single canonical, ordered, task-type-grouped list of survey sections. This is the shared
vocabulary that the welcome copy, per-task instructions, and completion copy MUST refer back to
(SC-005). Labels are localized in both `nl` and `en` (FR-011). Defined as a typed constant in
`shared/i18n.ts` (research.md R1); introduces no stored data.

## Canonical order

| # | `id` | `optional` | English label (illustrative) | Dutch label (illustrative) |
| --- | --- | --- | --- | --- |
| 1 | `welcome` | no | Welcome & introduction | Welkom & introductie |
| 2 | `word-intrusion` | no | Word-intrusion part (practice, then real questions) | Woordindringer-deel (oefening, dan echte vragen) |
| 3 | `cluster-intrusion` | no | Cluster-intrusion part (practice, then real questions) | Groepindringer-deel (oefening, dan echte vragen) |
| 4 | `completion` | no | Completion | Afronding |
| 5 | `explanation` | **yes** | Optional explanation of how your answers are used | Optionele uitleg over hoe je antwoorden worden gebruikt |

- Grouped by task type: each intrusion part bundles its practice-then-real stages into one section
  rather than listing them separately (clarification 2026-07-13).
- Order is fixed by the existing 001/002 flow (`Phase` in `shared/types.ts`): `welcome` →
  word instructions/practice/items → cluster instructions/practice/items → `debrief`/`complete`.
  The `explanation` section corresponds to the optional post-completion debrief walkthrough (002),
  which the completion page frames as optional (FR-009).
- Final label wording is finalized during implementation; the `id` keys and the order are fixed.

## Consumers

- **Default welcome copy (FR-002)**: names sections 1–5 in order.
- **Per-task instructions (FR-005)**: the practice-first reminder refers to the practice→real
  structure of the current intrusion part.
- **Completion page (FR-008/FR-009)**: frames section 5 (`explanation`) as optional.
