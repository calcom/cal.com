import { PrismaClientKnownRequestError, NotFoundError } from "@prisma/client/runtime/library";
import Stripe from "stripe";
import type { ZodIssue } from "zod";
import { ZodError } from "zod";

import { HttpError } from "../http-error";

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
    console.log("cause", cause);
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
  if (cause instanceof PrismaClientKnownRequestError) {
    return new HttpError({ statusCode: 400, message: cause.message, cause });
  }
  if (cause instanceof NotFoundError) {
    return new HttpError({ statusCode: 404, message: cause.message, cause });
  }
  if (cause instanceof Stripe.errors.StripeInvalidRequestError) {
    return new HttpError({ statusCode: 400, message: cause.message, cause });
  }
  if (cause instanceof HttpError) {
    return cause;
  }
  if (cause instanceof Error) {
    return new HttpError({ statusCode: 500, message: cause.message, cause });
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
