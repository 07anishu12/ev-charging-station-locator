interface PowerBadgeProps {
  powerKw: number;
  className?: string;
  isFast?: boolean;
}

export function PowerBadge({ powerKw, className = "", isFast }: PowerBadgeProps) {
  const isDcFast = isFast ?? powerKw >= 50;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        isDcFast
          ? "bg-[var(--color-primary)] text-white shadow-xs"
          : "bg-emerald-50 text-[var(--color-secondary-green)] border border-[var(--color-border)]"
      } ${className}`}
    >
      <svg
        aria-hidden="true"
        className="w-3.5 h-3.5 shrink-0 fill-current"
        viewBox="0 0 20 20"
      >
        <path d="M11.3 1.05a1 1 0 0 0-1.07.13l-7 6A1 1 0 0 0 4 9h5v9a1 1 0 0 0 1.77.65l7-8A1 1 0 0 0 17 9h-5V2a1 1 0 0 0-.7-.95Z" />
      </svg>
      <span>{powerKw} kW{isDcFast ? " DC" : " AC"}</span>
    </span>
  );
}
