export interface ClusterTermListProps {
  terms: string[];
}

/** Renders a cluster candidate's representative terms as a vertical list (US1, FR-001/FR-002/FR-003). */
export function ClusterTermList({ terms }: ClusterTermListProps) {
  return (
    <ul className="list-none space-y-1 leading-relaxed">
      {terms.map((term) => (
        <li key={term}>{term}</li>
      ))}
    </ul>
  );
}
