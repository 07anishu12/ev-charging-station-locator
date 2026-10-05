interface StatusBadgeProps {
  status: "Operational" | "Not Operational" | "Unknown" | "available" | "busy" | "unavailable" | "unknown";
  className?: string;
  size?: "sm" | "md";
  pulse?: boolean;
}

export function StatusBadge({ status, className = "", size = "md", pulse = false }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  let label = "Unknown";
  let bgClass = "bg-[#8A9490]/10 text-[#68756F] border-[#8A9490]/25";
  let dotClass = "bg-[#8A9490]";

  if (normalized === "operational" || normalized === "available") {
    label = normalized === "available" ? "Available now" : "Operational";
    bgClass = "bg-[var(--color-light-green)] text-[var(--color-secondary-green)] border-[var(--color-primary)]/30";
    dotClass = "bg-[var(--color-primary)]";
  } else if (normalized === "busy") {
    label = "In Use";
    bgClass = "bg-amber-50 text-amber-800 border-amber-300";
    dotClass = "bg-[var(--color-busy)]";
  } else if (normalized === "not operational" || normalized === "unavailable") {
    label = "Not Operational";
    bgClass = "bg-rose-50 text-rose-800 border-rose-300";
    dotClass = "bg-[var(--color-unavailable)]";
  }

  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs gap-1.5" : "px-2.5 py-1 text-xs sm:text-sm gap-2";
  const isOperational = normalized === "available";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClass} ${bgClass} ${className}`}
      role="status"
      aria-label={`Station status: ${label}`}
    >
      <span className="relative flex h-2 w-2 items-center justify-center shrink-0" aria-hidden="true">
        {isOperational && pulse && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-40 animate-operational-dot" />
        )}
        <span
          className={`h-2 w-2 rounded-full shrink-0 ${dotClass} ${
            isOperational && pulse ? "animate-operational-dot" : ""
          }`}
        />
      </span>
      <span>{label}</span>
    </span>
  );
}
