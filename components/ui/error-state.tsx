"use client";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center flex flex-col items-center justify-center ${className}`}
      role="alert"
    >
      <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center mb-3 text-rose-600">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-rose-950 mb-1">{title}</h3>
      <p className="text-sm text-rose-700 max-w-md mb-4">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-rose-800 border border-rose-300 shadow-xs hover:bg-rose-100 transition-colors focus-visible:outline-2 focus-visible:outline-rose-500"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
