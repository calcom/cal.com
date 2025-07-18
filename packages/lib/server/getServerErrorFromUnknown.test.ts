import { describe, expect, test } from "vitest";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

import { HttpError } from "../http-error";
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
