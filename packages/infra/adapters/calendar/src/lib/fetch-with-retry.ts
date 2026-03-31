import { CalendarAdapterError } from "./calendar-adapter-error";

interface FetchWithRetryOptions {
  provider: string;
  maxRetries?: number;
  baseDelayMs?: number;
}

/**
 * Fetch with exponential backoff retry for transient failures (5xx, 429).
 * Non-transient errors (4xx) are thrown immediately.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: FetchWithRetryOptions
): Promise<Response> {
  const maxRetries = opts.maxRetries ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 500;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);

      if (response.ok) return response;

      const isTransient = response.status === 429 || response.status >= 500;

      if (!isTransient || attempt === maxRetries) {
        const body = await response.text().catch(() => "");
        throw new CalendarAdapterError({
          provider: opts.provider,
          message: `${init.method ?? "GET"} ${url} failed (${response.status}): ${body}`,
          status: response.status,
          transient: isTransient,
        });
      }

      const delay = parseRetryAfterOrBackoff(response, baseDelayMs, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      if (error instanceof CalendarAdapterError) throw error;

      lastError = error;

      if (attempt === maxRetries) {
        throw new CalendarAdapterError({
          provider: opts.provider,
          message: `${init.method ?? "GET"} ${url} network error after ${maxRetries + 1} attempts`,
          transient: true,
          cause: lastError,
        });
      }

      const delay = baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new CalendarAdapterError({
    provider: opts.provider,
    message: `${init.method ?? "GET"} ${url} failed after all retries`,
    transient: true,
    cause: lastError,
  });
}

/**
 * Parse the Retry-After header from a response. Falls back to exponential
 * backoff with jitter when the header is missing or unparseable.
 *
 * Retry-After can be either:
 *  - An integer (seconds to wait)
 *  - An HTTP-date (e.g. "Fri, 31 Dec 1999 23:59:59 GMT")
 */
function parseRetryAfterOrBackoff(response: Response, baseDelayMs: number, attempt: number): number {
  const retryAfter = response.headers.get("Retry-After");

  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds) && seconds >= 0) {
      return seconds * 1000;
    }

    const date = new Date(retryAfter);
    if (!Number.isNaN(date.getTime())) {
      const delayMs = date.getTime() - Date.now();
      if (delayMs > 0) return delayMs;
    }
  }

  return baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs;
}
