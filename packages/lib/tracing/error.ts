import type { TraceContext } from "./index";

export class TracedError extends Error {
  public readonly traceId: string;
  public readonly data?: Record<string, unknown>;
  public readonly originalError: unknown;

  constructor(error: unknown, traceContext: TraceContext, additionalData?: Record<string, unknown>) {
    const message = error instanceof Error ? error.message : String(error);
    super(message);

    this.name = error instanceof Error ? error.name : "TracedError";
    this.traceId = traceContext.traceId;
    this.originalError = error;

    if (error instanceof Error && error.stack) {
      this.stack = error.stack;
    }

    if (error && typeof error === "object" && "data" in error) {
      const errorWithData = error as { data: Record<string, unknown> };
      this.data = {
        ...(errorWithData.data && typeof errorWithData.data === "object"
          ? (errorWithData.data as Record<string, unknown>)
          : {}),
        ...additionalData,
      };
    } else if (additionalData) {
      this.data = additionalData;
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      traceId: this.traceId,
      data: this.data,
      stack: this.stack,
    };
  }

  static createFromError(
    error: unknown,
    traceContext: TraceContext,
    additionalData?: Record<string, unknown>
  ): TracedError {
    if (error instanceof TracedError) {
      return error;
    }
    return new TracedError(error, traceContext, additionalData);
  }
}
