import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import type { ZodIssue } from "zod";
import { ZodError } from "zod";

import { HttpError } from "../http-error";
import { redactError } from "../redactError";

function hasName(cause: unknown): cause is { name: string } {
  return !!cause && typeof cause === "object" && "name" in cause;
}

function isZodError(cause: unknown): cause is ZodError {
  return cause instanceof ZodError || (hasName(cause) && cause.name === "ZodError");
}

function isPrismaError(cause: unknown): cause is Prisma.PrismaClientKnownRequestError {
  return cause instanceof Prisma.PrismaClientKnownRequestError;
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
    return new HttpError({
      statusCode: 400,
      message: parseZodErrorIssues(cause.issues),
      cause,
    });
  }
  if (cause instanceof SyntaxError) {
    return new HttpError({
      statusCode: 500,
      message: "Unexpected error, please reach out for our customer support.",
    });
  }
  if (isPrismaError(cause)) {
    return getServerErrorFromPrismaError(cause);
  }
  if (cause instanceof Stripe.errors.StripeInvalidRequestError) {
    return getHttpError({ statusCode: 400, cause });
  }
  if (cause instanceof HttpError) {
    const redactedCause = redactError(cause);
    return {
      ...redactedCause,
      name: cause.name,
      message: cause.message ?? "",
      cause: cause.cause,
      url: cause.url,
      statusCode: cause.statusCode,
      method: cause.method,
    };
  }
  if (cause instanceof Error) {
    return getHttpError({ statusCode: 500, cause });
  }
  if (typeof cause === "string") {
    // @ts-expect-error https://github.com/tc39/proposal-error-cause
    return new Error(cause, { cause });
  }

  return new HttpError({
    statusCode: 500,
    message: `Unhandled error of type '${typeof cause}'. Please reach out for our customer support.`,
  });
}

function getHttpError<T extends Error>({ statusCode, cause }: { statusCode: number; cause: T }) {
  const redacted = redactError(cause);
  return new HttpError({ statusCode, message: redacted.message, cause: redacted });
}

function getServerErrorFromPrismaError(cause: Prisma.PrismaClientKnownRequestError) {
  if (cause.code === "P2025") {
    return getHttpError({ statusCode: 404, cause });
  }
  return getHttpError({ statusCode: 400, cause });
}
