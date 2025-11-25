import type { ZodIssue } from "zod";
import { ZodError } from "zod";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { Prisma } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

import { HttpError } from "../http-error";
import { redactError } from "../redactError";
import { stripeInvalidRequestErrorSchema } from "../stripe-error";
import { TracedError } from "../tracing/error";

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
  let traceId: string | undefined;
  let tracedData: Record<string, unknown> | undefined;

  if (cause instanceof TracedError) {
    traceId = cause.traceId;
    tracedData = cause.data;
    cause = cause.originalError;
  }

  if (cause instanceof TRPCError) {
    const statusCode = getHTTPStatusCodeFromError(cause);
    return new HttpError({
      statusCode,
      message: cause.message,
      cause,
      data: traceId ? { ...tracedData, traceId } : undefined,
    });
  }
  if (isZodError(cause)) {
    return new HttpError({
      statusCode: 400,
      message: parseZodErrorIssues(cause.issues),
      cause,
      data: traceId ? { ...tracedData, traceId } : undefined,
    });
  }
  if (cause instanceof SyntaxError) {
    return new HttpError({
      statusCode: 500,
      message: "Unexpected error, please reach out for our customer support.",
      cause,
      data: traceId ? { ...tracedData, traceId } : undefined,
    });
  }
  if (isPrismaError(cause)) {
    return getServerErrorFromPrismaError(cause, traceId, tracedData);
  }
  const parsedStripeError = stripeInvalidRequestErrorSchema.safeParse(cause);
  if (parsedStripeError.success) {
    const stripeErrorObj = new Error(parsedStripeError.data.message || "Stripe error");
    stripeErrorObj.name = parsedStripeError.data.type || "StripeInvalidRequestError";
    return getHttpError({ statusCode: 400, cause: stripeErrorObj, traceId, tracedData });
  }
  if (cause instanceof ErrorWithCode) {
    const statusCode = getStatusCode(cause);
    return new HttpError({
      statusCode,
      message: cause.message ?? "",
      data: traceId ? { ...cause.data, ...tracedData, traceId } : cause.data,
      cause,
    });
  }
  if (cause instanceof HttpError) {
    const originalData = cause.data;
    return new HttpError({
      statusCode: cause.statusCode,
      message: cause.message ?? "",
      cause: cause.cause,
      url: cause.url,
      method: cause.method,
      data: traceId ? { ...originalData, ...tracedData, traceId } : originalData,
    });
  }
  if (cause instanceof Error) {
    const statusCode = getStatusCode(cause);
    return getHttpError({ statusCode, cause, traceId, tracedData });
  }
  if (typeof cause === "string") {
    return new HttpError({
      statusCode: 500,
      message: cause,
      data: traceId ? { ...tracedData, traceId } : undefined,
    });
  }

  return new HttpError({
    statusCode: 500,
    message: `Unhandled error of type '${typeof cause}'. Please reach out for our customer support.`,
    data: traceId ? { ...tracedData, traceId } : tracedData,
  });
}

function getStatusCode(cause: Error | ErrorWithCode): number {
  const errorCode = cause instanceof ErrorWithCode ? cause.code : cause.message;

  switch (errorCode) {
    // 400 Bad Request
    case ErrorCode.RequestBodyWithouEnd:
    case ErrorCode.MissingPaymentCredential:
    case ErrorCode.MissingPaymentAppId:
    case ErrorCode.AvailabilityNotFoundInSchedule:
    case ErrorCode.CancelledBookingsCannotBeRescheduled:
    case ErrorCode.BookingTimeOutOfBounds:
    case ErrorCode.BookingNotAllowedByRestrictionSchedule:
    case ErrorCode.BookerLimitExceeded:
    case ErrorCode.BookerLimitExceededReschedule:
    case ErrorCode.EventTypeNoHosts:
    case ErrorCode.RequestBodyInvalid:
    case ErrorCode.ChargeCardFailure:
      return 400;
    // 409 Conflict
    case ErrorCode.NoAvailableUsersFound:
    case ErrorCode.FixedHostsUnavailableForBooking:
    case ErrorCode.RoundRobinHostsUnavailableForBooking:
    case ErrorCode.AlreadySignedUpForBooking:
    case ErrorCode.BookingSeatsFull:
    case ErrorCode.NotEnoughAvailableSeats:
    case ErrorCode.BookingConflict:
    case ErrorCode.PaymentCreationFailure:
      return 409;
    // 404 Not Found
    case ErrorCode.EventTypeNotFound:
    case ErrorCode.BookingNotFound:
    case ErrorCode.RestrictionScheduleNotFound:
      return 404;
    case ErrorCode.UnableToSubscribeToThePlatform:
    case ErrorCode.UpdatingOauthClientError:
    case ErrorCode.CreatingOauthClientError:
    default:
      return 500;
  }
}

function getHttpError<T extends Error>({
  statusCode,
  cause,
  traceId,
  tracedData,
}: {
  statusCode: number;
  cause: T;
  traceId?: string;
  tracedData?: Record<string, unknown>;
}) {
  const redacted = redactError(cause);
  return new HttpError({
    statusCode,
    message: redacted.message,
    cause: redacted,
    data: traceId ? { ...tracedData, traceId } : undefined,
  });
}

function getServerErrorFromPrismaError(
  cause: Prisma.PrismaClientKnownRequestError,
  traceId?: string,
  tracedData?: Record<string, unknown>
) {
  if (cause.code === "P2025") {
    return getHttpError({ statusCode: 404, cause, traceId, tracedData });
  }
  return getHttpError({ statusCode: 400, cause, traceId, tracedData });
}
