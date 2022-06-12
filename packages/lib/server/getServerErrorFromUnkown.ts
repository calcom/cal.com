import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import { ZodError } from "zod";

import { HttpError } from "../http-error";

export function getServerErrorFromUnkown(cause: unknown): HttpError {
  if (cause instanceof Prisma.PrismaClientKnownRequestError) {
    return new HttpError({ statusCode: 400, message: cause.message, cause });
  }
  if (cause instanceof Error) {
    return new HttpError({ statusCode: 500, message: cause.message, cause });
  }
  if (cause instanceof HttpError) {
    return cause;
  }
  if (cause instanceof Stripe.errors.StripeInvalidRequestError) {
    return new HttpError({ statusCode: 400, message: cause.message, cause });
  }
  if (cause instanceof ZodError) {
    return new HttpError({ statusCode: 400, message: cause.message, cause });
  }
  if (typeof cause === "string") {
    // @ts-expect-error https://github.com/tc39/proposal-error-cause
    return new Error(cause, { cause });
  }

  return new HttpError({ statusCode: 500, message: `Unhandled error of type '${typeof cause}'` });
}
