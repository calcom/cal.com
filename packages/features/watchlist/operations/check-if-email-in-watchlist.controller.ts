import { startSpan } from "@sentry/nextjs";

import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";

import type { EmailBlockedCheckResponseDTO } from "../lib/dto";
import { normalizeEmail as defaultNormalizeEmail } from "../lib/utils/normalization";

type WatchlistFeature = {
  globalBlocking: {
    isBlocked: (email: string, orgId?: number) => Promise<{ isBlocked: boolean }>;
  };
  orgBlocking: {
    isEmailBlocked: (email: string, orgId: number) => Promise<{ isBlocked: boolean }>;
  };
};

type SpanOptions = { name: string; op?: string };

type SpanFn = <T>(options: SpanOptions, fn: () => T | Promise<T>) => T | Promise<T>;

// Sentry span object (minimal interface we need)
interface SentrySpan {
  setTag?: (key: string, value: string) => void;
  setData?: (key: string, value: unknown) => void;
  finish?: () => void;
}

// Sentry's startSpan signature (from @sentry/nextjs)
type SentrySpanFn = <T>(options: SpanOptions, fn: (span?: SentrySpan) => T | Promise<T>) => T | Promise<T>;

type Deps = {
  watchlist?: WatchlistFeature;
  span?: SpanFn;
  normalizeEmail?: (email: string) => string;
};

// Default span wraps Sentry, but is overrideable in tests
const defaultSpan: SpanFn = <T>(options: SpanOptions, fn: () => T | Promise<T>): T | Promise<T> => {
  if (typeof startSpan === "function") {
    // Sentry's startSpan expects a function that can receive a span parameter,
    // but our SpanFn doesn't use it, so we adapt the signature
    return (startSpan as SentrySpanFn)(options, () => fn());
  }
  return fn();
};

function presenter(isBlocked: boolean, span: SpanFn): EmailBlockedCheckResponseDTO {
  return span({ name: "checkIfEmailInWatchlist Presenter", op: "serialize" }, () => {
    return { isBlocked };
  });
}

/**
 * Controllers perform auth/validation and orchestrate use-cases.
 * NOTE: Optional `deps` enables strict-DI in tests without changing prod call sites.
 */
export async function checkIfEmailIsBlockedInWatchlistController(
  email: string,
  organizationId?: number,
  { watchlist = getWatchlistFeature(), span = defaultSpan, normalizeEmail = defaultNormalizeEmail }: Deps = {}
): Promise<EmailBlockedCheckResponseDTO> {
  return span({ name: "checkIfEmailInWatchlist Controller" }, async () => {
    const normalizedEmail = normalizeEmail(email);

    // Global first
    const globalResult = await watchlist.globalBlocking.isBlocked(normalizedEmail, organizationId);
    if (globalResult.isBlocked) {
      return presenter(true, span);
    }

    // Then org
    if (organizationId) {
      const orgResult = await watchlist.orgBlocking.isEmailBlocked(normalizedEmail, organizationId);
      if (orgResult.isBlocked) {
        return presenter(true, span);
      }
    }

    return presenter(false, span);
  });
}
