import { PrismaClientKnownRequestError, NotFoundError } from "@prisma/client/runtime/library";
import type { ZodIssue } from "zod";
import { ZodError } from "zod";

import { HttpError, httpError } from "../http-error";
import { redactError } from "../redactError";

function hasName(cause: unknown): cause is { name: string } {
  return !!cause && typeof cause === "object" && "name" in cause;
}

function isZodError(cause: unknown): cause is ZodError {
  return cause instanceof ZodError || (hasName(cause) && cause.name === "ZodError");
}

function parseZodErrorIssues(issues: ZodIssue[]): string {
  return issues
    .map((i) =>
      i.code === "invalid_union"
        ? i.unionErrors.map((ue) => parseZodErrorIssues(ue.issues)).join("; ")
        : i.code === "unrecognized_keys"
        ? i.message
        : `${i.path.length ? `${i.code} in '${i.path}': ` : ""}${i.message}`
    )
    .join("; ");
}

export function getServerErrorFromUnknown(cause: unknown): HttpError {
  if (isZodError(cause)) {
    return httpError({
      statusCode: 400,
      message: parseZodErrorIssues(cause.issues),
      cause,
    });
  }

  if (cause instanceof SyntaxError) {
    return httpError({
      statusCode: 500,
      message: "Unexpected error, please reach out for our customer support.",
    });
  }

  if (cause instanceof PrismaClientKnownRequestError) {
    return createHttpError({ statusCode: 400, cause });
  }
  if (cause instanceof NotFoundError) {
    return createHttpError({ statusCode: 404, cause });
  }

  if (cause instanceof HttpError) {
    return createHttpError({ statusCode: cause.statusCode, cause });
  }
  if (cause instanceof Error) {
    return createHttpError({ statusCode: 500, cause });
  }
  if (typeof cause === "string") {
    // @ts-expect-error https://github.com/tc39/proposal-error-cause
    return new Error(cause, { cause });
  }

  return httpError({
    statusCode: 500,
    message: `Unhandled error of type '${typeof cause}'. Please reach out for our customer support.`,
  });
}

function createHttpError<T extends Error>({ statusCode, cause }: { statusCode: number; cause: T }) {
  const redacted = redactError(cause);
  return httpError({ statusCode, message: redacted.message, cause: redacted });
}
