/**
 * Standardized error for all calendar adapter operations.
 *
 * Provides consistent context: which provider failed, HTTP status (if
 * applicable), and whether the error is transient (retryable).
 */
export class CalendarAdapterError extends Error {
  readonly provider: string;
  readonly status?: number;
  readonly transient: boolean;
  readonly originalCause?: unknown;

  constructor(opts: { provider: string; message: string; status?: number; transient?: boolean; cause?: unknown }) {
    super(`[${opts.provider}] ${opts.message}`);
    this.name = "CalendarAdapterError";
    this.provider = opts.provider;
    this.status = opts.status;
    this.transient = opts.transient ?? isTransientStatus(opts.status);
    this.originalCause = opts.cause;
  }
}

function isTransientStatus(status?: number): boolean {
  if (!status) return false;
  return status === 429 || status === 502 || status === 503 || status === 504;
}
