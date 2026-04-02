/**
 * Standardized error for all domain adapter operations.
 *
 * Provides consistent context: an error code, whether the error is
 * transient (retryable), and the original cause for debugging.
 */
export class DomainAdapterError extends Error {
  readonly code: string;
  readonly transient: boolean;
  readonly originalCause?: unknown;

  constructor(opts: { code: string; message: string; transient?: boolean; cause?: unknown }) {
    super(opts.message);
    this.name = "DomainAdapterError";
    this.code = opts.code;
    this.transient = opts.transient ?? false;
    this.originalCause = opts.cause;
  }
}
