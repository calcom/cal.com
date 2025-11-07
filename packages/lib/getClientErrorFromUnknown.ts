import { HttpError } from "./http-error";

export function getClientErrorFromUnknown(cause: unknown): Error {
  if (cause instanceof HttpError) {
    const message = `${cause.statusCode}: ${cause.message}`;
    return new Error(message);
  }
  if (cause instanceof Error) {
    return new Error(cause.message);
  }
  if (typeof cause === "string") {
    return new Error(cause);
  }

  return new Error(`Unhandled error of type '${typeof cause}'. Please reach out for our customer support.`);
}

export const withErrorFromUnknown = (a: (b: Error) => void) => (b: unknown) =>
  a(getClientErrorFromUnknown(b));
