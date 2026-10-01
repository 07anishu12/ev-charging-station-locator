"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SearchBarProps {
  initialQuery?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
  autoFocus?: boolean;
  className?: string;
}

export function SearchBar({
  initialQuery = "",
  placeholder = "Search city, PIN code or charging station",
  onSearch,
  autoFocus = false,
  className = "",
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (onSearch) {
      onSearch(trimmed);
    } else if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/search");
    }
  };

  const handleClear = () => {
    setQuery("");
    onSearch?.("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`group relative flex items-center w-full transition-all duration-200 ${className}`}
    >
      <div className="absolute left-3.5 text-[var(--color-muted)] pointer-events-none flex items-center justify-center transition-transform duration-200 group-focus-within:scale-110 group-focus-within:text-[var(--color-primary)]">
        <svg
          className="w-5 h-5 transition-colors duration-200 text-[var(--color-primary)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onSearch?.(e.target.value);
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full min-h-12 rounded-2xl border border-[var(--color-border)] bg-white pl-11 pr-10 text-sm sm:text-base text-[var(--color-dark-green)] placeholder-[var(--color-muted)] shadow-xs transition-all duration-250 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:shadow-[0_0_12px_rgba(22,199,132,0.18)] focus:outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search input"
          className="absolute right-3 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-150 active:scale-90 focus-visible:outline-none cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </form>
  );
}
