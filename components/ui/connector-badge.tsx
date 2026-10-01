interface ConnectorBadgeProps {
  type: string;
  quantity?: number;
  className?: string;
}

export function ConnectorBadge({ type, quantity, className = "" }: ConnectorBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white text-[var(--color-dark-green)] border border-[var(--color-border)] shadow-xs ${className}`}
    >
      <svg
        aria-hidden="true"
        className="w-3.5 h-3.5 text-[var(--color-secondary-green)] shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M13 10V3L4 14h7v7l9-11h-7Z"
        />
      </svg>
      <span>{type}</span>
      {quantity && quantity > 1 && (
        <span className="text-[var(--color-muted)] font-normal">×{quantity}</span>
      )}
    </span>
  );
}
