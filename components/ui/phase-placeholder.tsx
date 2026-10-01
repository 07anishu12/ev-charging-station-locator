import Link from "next/link";

import { Logo } from "@/components/brand/logo";

interface PhasePlaceholderProps {
  eyebrow?: string;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
}

export function PhasePlaceholder({
  eyebrow = "Phase 1 foundation",
  title,
  description,
  href,
  linkLabel,
}: PhasePlaceholderProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <Logo className="mb-8" />
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-secondary-green)]">
        {eyebrow}
      </p>
      <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-[var(--color-dark-green)] sm:text-5xl">
        {title}
      </h1>
      <p className="mt-5 max-w-xl text-base leading-7 text-[var(--color-muted)]">{description}</p>
      {href && linkLabel && (
        <Link
          href={href}
          className="mt-8 inline-flex min-h-12 w-fit items-center rounded-xl bg-[var(--color-primary)] px-5 font-semibold text-white transition-colors hover:bg-[var(--color-secondary-green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          {linkLabel}
        </Link>
      )}
    </main>
  );
}
