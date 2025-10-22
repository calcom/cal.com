import { Prisma } from "@prisma/client";
import { describe, expect, test } from "vitest";
import { ZodError } from "zod";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

import { TRPCError } from "@trpc/server";

import { HttpError } from "../http-error";
import { TracedError } from "../tracing/error";
import { getServerErrorFromUnknown } from "./getServerErrorFromUnknown";

const test400Codes = [
  ErrorCode.RequestBodyWithouEnd,
  ErrorCode.MissingPaymentCredential,
  ErrorCode.MissingPaymentAppId,
  ErrorCode.AvailabilityNotFoundInSchedule,
  ErrorCode.CancelledBookingsCannotBeRescheduled,
  ErrorCode.BookingTimeOutOfBounds,
  ErrorCode.BookingNotAllowedByRestrictionSchedule,
  ErrorCode.BookerLimitExceeded,
  ErrorCode.BookerLimitExceededReschedule,
  ErrorCode.ChargeCardFailure,
];

const test404Codes = [
  ErrorCode.EventTypeNotFound,
  ErrorCode.BookingNotFound,
  ErrorCode.RestrictionScheduleNotFound,
];

const test409Codes = [
  ErrorCode.NoAvailableUsersFound,
  ErrorCode.FixedHostsUnavailableForBooking,
  ErrorCode.RoundRobinHostsUnavailableForBooking,
  ErrorCode.AlreadySignedUpForBooking,
  ErrorCode.BookingSeatsFull,
  ErrorCode.NotEnoughAvailableSeats,
  ErrorCode.BookingConflict,
  ErrorCode.PaymentCreationFailure,
];

describe("getServerErrorFromUnknown", () => {
  test("should handle a StripeInvalidRequestError", () => {
    const stripeError = {
      name: "StripeInvalidRequestError",
      type: "StripeInvalidRequestError",
      rawType: "invalid_request_error",
      message: "No such customer: cus_12345; a valid customer ID is required.",
      code: "resource_missing",
      doc_url: "https://stripe.com/docs/error-codes/resource-missing",
      statusCode: 400,
      raw: {
        error: { type: "invalid_request_error", message: "No such customer" },
      },
      headers: {
        "content-type": "application/json",
        "request-id": "req_abc123xyz",
      },
      requestId: "req_abc123xyz",
      param: "customer",
    };
    Object.setPrototypeOf(stripeError, Error.prototype);
    const result = getServerErrorFromUnknown(stripeError);
    expect(result).toBeInstanceOf(HttpError);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe(stripeError.message);
    expect(result.cause).toEqual(stripeError);
    expect(result.name).toBe("HttpError");
  });

  test("ErrorWithCode should preserve data property", () => {
    const rescheduleData = {
      rescheduleUid: "abc123",
      startTime: new Date("2024-01-15T10:00:00Z"),
      attendees: [{ name: "John Doe", email: "john@example.com" }],
    };

    const error = new ErrorWithCode(
      ErrorCode.BookerLimitExceededReschedule,
      "Maximum booking limit reached, please reschedule an existing booking",
      rescheduleData
    );

    const result = getServerErrorFromUnknown(error);

    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Maximum booking limit reached, please reschedule an existing booking");
    expect(result.data).toEqual(rescheduleData);
  });

  test("Plain Error with ErrorCode message should work the same as ErrorWithCode", () => {
    const error = new Error(ErrorCode.NoAvailableUsersFound);

    const result = getServerErrorFromUnknown(error);

    expect(result.statusCode).toBe(409);
    expect(result.message).toBe(ErrorCode.NoAvailableUsersFound);
  });

  test("Generic Error without ErrorCode should return 500", () => {
    const error = new Error("Some unexpected server error");

    const result = getServerErrorFromUnknown(error);

    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("Some unexpected server error");
  });

  test("Server-side ErrorCode should return 500", () => {
    const error = new ErrorWithCode(ErrorCode.CreatingOauthClientError, "OAuth client creation failed");

    const result = getServerErrorFromUnknown(error);

    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("OAuth client creation failed");
  });
});

describe("TracedError handling", () => {
  test("should extract traceId and tracedData from TracedError", () => {
    const originalError = new Error("Original error message");
    const tracedData = { userId: "123", operation: "booking" };
    const traceContext = {
      traceId: "trace_abc123",
      spanId: "span_123",
      operation: "test_operation",
    };

    const tracedError = new TracedError(originalError, traceContext, tracedData);

    const result = getServerErrorFromUnknown(tracedError);

    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("Original error message");
    expect(result.data).toEqual({ ...tracedData, traceId: traceContext.traceId });
  });

  test("should handle TracedError wrapping ErrorWithCode", () => {
    const originalError = new ErrorWithCode(ErrorCode.BookingNotFound, "Booking not found");
    const tracedData = { bookingId: "456" };
    const traceContext = {
      traceId: "trace_def456",
      spanId: "span_456",
      operation: "booking_lookup",
    };

    const tracedError = new TracedError(originalError, traceContext, tracedData);

    const result = getServerErrorFromUnknown(tracedError);

    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Booking not found");
    expect(result.data).toEqual({ ...tracedData, traceId: traceContext.traceId });
  });
});

describe("TRPCError handling", () => {
  test("should handle TRPCError with BAD_REQUEST", () => {
    const trpcError = new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid input data",
    });

    const result = getServerErrorFromUnknown(trpcError);

    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid input data");
    expect(result.data).toBeUndefined();
  });

  test("should handle TracedError wrapping TRPCError", () => {
    const trpcError = new TRPCError({
      code: "NOT_FOUND",
      message: "Resource not found",
    });
    const tracedData = { resourceId: "789" };
    const traceContext = {
      traceId: "trace_trpc123",
      spanId: "span_trpc123",
      operation: "resource_lookup",
    };

    const tracedError = new TracedError(trpcError, traceContext, tracedData);

    const result = getServerErrorFromUnknown(tracedError);

    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Resource not found");
    expect(result.data).toEqual({ ...tracedData, traceId: traceContext.traceId });
  });
});

describe("ZodError handling", () => {
  test("should handle ZodError with validation issues", () => {
    const zodError = new ZodError([
      {
        code: "invalid_type",
        expected: "string",
        received: "number",
        path: ["name"],
        message: "Expected string, received number",
      },
    ]);

    const result = getServerErrorFromUnknown(zodError);

    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("invalid_type in 'name': Expected string, received number");
    expect(result.cause).toBe(zodError);
  });
});

describe("Prisma error handling", () => {
  test("should handle Prisma P2025 error (record not found)", () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError("Record to delete does not exist.", {
      code: "P2025",
      clientVersion: "5.0.0",
    });

    const result = getServerErrorFromUnknown(prismaError);

    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Record to delete does not exist.");
    expect(result.cause).toBe(prismaError);
  });

  test("should handle other Prisma errors as 400", () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed", {
      code: "P2003",
      clientVersion: "5.0.0",
    });

    const result = getServerErrorFromUnknown(prismaError);

    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Foreign key constraint failed");
  });
});

test("should handle unknown type fallback", () => {
  const result = getServerErrorFromUnknown({ someProperty: "value" });

  expect(result.statusCode).toBe(500);
  expect(result.message).toBe("Unhandled error of type 'object'. Please reach out for our customer support.");
  expect(result.data).toBeUndefined();
});

test400Codes.forEach((errorCode) => {
  test(`${errorCode} should return 400 Bad Request`, () => {
    const error = new ErrorWithCode(errorCode, `Test message for ${errorCode}`);
    const result = getServerErrorFromUnknown(error);
    expect(result.statusCode).toBe(400);
  });
});

test404Codes.forEach((errorCode) => {
  test(`${errorCode} should return 404 Not Found`, () => {
    const error = new ErrorWithCode(errorCode, `Test message for ${errorCode}`);
    const result = getServerErrorFromUnknown(error);
    expect(result.statusCode).toBe(404);
  });
});

test409Codes.forEach((errorCode) => {
  test(`${errorCode} should return 409 Conflict`, () => {
    const error = new ErrorWithCode(errorCode, `Test message for ${errorCode}`);
    const result = getServerErrorFromUnknown(error);
    expect(result.statusCode).toBe(409);
  });
});
