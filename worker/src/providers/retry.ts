/**
 * FastCharger Resilient HTTP & Transient Operation Retry Helper
 *
 * Implements bounded exponential backoff with jitter for transient failures:
 * - HTTP 429 (Rate limited)
 * - HTTP 5xx (500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout)
 * - Network timeouts (AbortError, ETIMEDOUT, ECONNRESET, fetch failed)
 *
 * Permanent errors (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, Malformed payload)
 * fail fast immediately without wasteful retries.
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitter?: boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  isTransient?: (error: unknown) => boolean;
}

export class PermanentError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "PermanentError";
  }
}

export function isTransientError(error: unknown): boolean {
  if (error instanceof PermanentError) {
    return false;
  }

  if (error && typeof error === "object") {
    // Check status or statusCode property
    const status = (error as { status?: number; statusCode?: number }).status ??
      (error as { status?: number; statusCode?: number }).statusCode;

    if (typeof status === "number") {
      // 429 Too Many Requests
      if (status === 429) return true;
      // 5xx Server Errors
      if (status >= 500 && status <= 599) return true;
      // Client errors (400, 401, 403, 404, etc.) are permanent
      if (status >= 400 && status < 500) return false;
    }

    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const code = (error as { code?: string }).code;

    // Network / timeout signatures
    if (
      code === "ECONNRESET" ||
      code === "ETIMEDOUT" ||
      code === "ECONNREFUSED" ||
      code === "EAI_AGAIN" ||
      code === "UND_ERR_CONNECT_TIMEOUT"
    ) {
      return true;
    }

    if (
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("econnreset") ||
      message.includes("etimedout") ||
      message.includes("rate limit") ||
      message.includes("too many requests") ||
      message.includes("429") ||
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("fetch failed") ||
      message.includes("network error")
    ) {
      return true;
    }
  }

  return false;
}

export async function retryWithBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 100;
  const maxDelayMs = options.maxDelayMs ?? 3000;
  const backoffFactor = options.backoffFactor ?? 2;
  const jitter = options.jitter ?? true;
  const checkTransient = options.isTransient ?? isTransientError;

  let attempt = 0;

  while (true) {
    try {
      return await operation(attempt);
    } catch (error) {
      attempt++;

      if (attempt > maxRetries || !checkTransient(error)) {
        throw error;
      }

      // Calculate exponential backoff delay
      let delay = initialDelayMs * Math.pow(backoffFactor, attempt - 1);
      if (jitter) {
        // Add full jitter: random value between 0 and calculated delay
        delay = Math.min(maxDelayMs, delay * (0.5 + Math.random() * 0.5));
      } else {
        delay = Math.min(maxDelayMs, delay);
      }

      if (options.onRetry) {
        options.onRetry(error, attempt, delay);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
