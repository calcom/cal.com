export function getErrorFromUnknown(cause: unknown): Error & { statusCode?: number } {
  if (cause instanceof Error) {
    return cause;
  }
  if (typeof cause === "string") {
    // @ts-expect-error https://github.com/tc39/proposal-error-cause
    return new Error(cause, { cause });
  }

  return new Error(`Unhandled error of type '${typeof cause}''`);
}
