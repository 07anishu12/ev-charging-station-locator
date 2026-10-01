export interface SearchBoundaryProps {
  label?: string;
}

/** Search component boundary; query behavior lands after the foundation phase. */
export function SearchBoundary({ label = "Search boundary" }: SearchBoundaryProps) {
  return <div aria-label={label} data-search-boundary="true" />;
}
