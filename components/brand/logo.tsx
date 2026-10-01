interface LogoProps {
  compact?: boolean;
  className?: string;
}

export function Logo({ compact = false, className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        aria-hidden="true"
        className="h-8 w-8 shrink-0 text-[var(--color-primary)]"
        viewBox="0 0 32 32"
        fill="none"
      >
        <path
          d="M18.4 2.5 8.8 17.1h7.3l-2.5 12.4 9.6-14.6h-7.3l2.5-12.4Z"
          fill="currentColor"
          stroke="currentColor"
          strokeLinejoin="round"
        />
        <path
          d="M24.4 8.5c2.4 1.7 4 4.5 4 7.7a9.8 9.8 0 0 1-9.8 9.8"
          stroke="var(--color-secondary-green)"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
      {!compact && (
        <span className="text-lg font-semibold tracking-tight text-[var(--color-dark-green)]">
          FastCharger
        </span>
      )}
    </span>
  );
}
