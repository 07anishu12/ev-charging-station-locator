"use client";

import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  onActionClick?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  onActionClick,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-[var(--color-border)] bg-white/70 p-8 sm:p-12 text-center flex flex-col items-center justify-center ${className}`}
      role="region"
      aria-label={title}
    >
      <div className="w-14 h-14 rounded-2xl bg-[var(--color-light-green)] flex items-center justify-center mb-4 text-[var(--color-primary)]">
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
          />
        </svg>
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-[var(--color-dark-green)] mb-1">
        {title}
      </h3>
      <p className="text-sm text-[var(--color-muted)] max-w-md mb-6">{description}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[var(--color-secondary-green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          {actionLabel}
        </Link>
      )}
      {!actionHref && onActionClick && actionLabel && (
        <button
          type="button"
          onClick={onActionClick}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[var(--color-secondary-green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
