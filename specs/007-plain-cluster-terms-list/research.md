# Phase 0 Research: Plain Cluster Term List (No Bullets)

## R1: Where the bullet marker comes from

**Decision**: Change the Tailwind list-style classes on the single `<ul>` in
`client/src/components/ClusterTermList.tsx:8` from `list-inside list-disc` to `list-none`.

**Current code** (confirmed by direct read, feature 006's shared component):

```tsx
<ul className="list-inside list-disc space-y-1 leading-relaxed">
  {terms.map((term) => (
    <li key={term}>{term}</li>
  ))}
</ul>
```

**Rationale**:

- `list-disc` is Tailwind's utility for `list-style-type: disc` — this is what renders the bullet
  glyph in front of each `<li>`. Removing it is necessary but not sufficient.
- Browsers apply a default `list-style: disc` to bare `<ul>` elements via the user-agent
  stylesheet. Simply deleting the `list-disc` class would NOT remove the bullet — the browser
  default would immediately take over and the marker would still render. `list-none` (Tailwind's
  `list-style: none` utility) must be added explicitly to actually suppress the marker, which is
  what FR-001 requires ("no bullet, dash, number, or other marker glyph").
- `list-inside` (`list-style-position: inside`) only has a visible effect when a marker is
  present (it controls whether the marker sits inside or outside the content box). With no marker
  at all, this property is a no-op, so it is dropped for clarity rather than left as dead styling
  — consistent with Constitution Simplicity (III): no unnecessary classes.
- `space-y-1` (row spacing) and `leading-relaxed` (line-height) are unrelated to the marker and
  are kept unchanged, per FR-002/spec Assumptions (no other visual property should change).

**Alternatives considered**:

- *Use a CSS pseudo-element or custom marker instead of removing it*: Rejected — the request is
  to remove the marker entirely, not replace it with a different one; introducing custom
  `::marker` CSS would also be new complexity for zero requirement benefit (Constitution III).
- *Switch the `<ul>` to a `<div>`/plain block per row*: Rejected — semantically a list of
  discrete term rows is still the correct structure (spec explicitly preserves the row-per-term
  list layout, FR-002); only the visual marker is in scope. Changing the element type would also
  touch more of the component than necessary.

## R2: Shared-component confirmation (no duplication to fix)

**Decision**: No further code changes needed beyond `ClusterTermList.tsx` itself.

**Rationale**: Feature 006 already consolidated all three display sites — the live cluster task
(`client/src/routes/cluster/task.tsx:57`), the practice cluster task
(`client/src/components/PracticeItem.tsx:37`), and the debrief review
(`client/src/components/Debrief.tsx:34`) — to import and render the same `ClusterTermList`
component rather than duplicating list markup. A one-file change therefore satisfies FR-003
("consistently everywhere cluster options are shown") automatically, with no risk of missing a
call site.

**Alternatives considered**: N/A — verified directly by reading all three call sites; no
duplication exists to search for or reconcile.
