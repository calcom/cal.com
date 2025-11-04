import { describe, expect, test } from "vitest";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { ERROR_CODE_TO_HTTP_STATUS } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

import { HttpError } from "../http-error";
import { getServerErrorFromUnknown } from "./getServerErrorFromUnknown";

function getErrorCodesForStatus(statusCode: number): ErrorCode[] {
  return Object.entries(ERROR_CODE_TO_HTTP_STATUS)
    .filter(([, status]) => status === statusCode)
    .map(([errorCode]) => errorCode as ErrorCode);
}

const test400Codes = getErrorCodesForStatus(400);
const test401Codes = getErrorCodesForStatus(401);
const test402Codes = getErrorCodesForStatus(402);
const test403Codes = getErrorCodesForStatus(403);
const test404Codes = getErrorCodesForStatus(404);
const test409Codes = getErrorCodesForStatus(409);
const test500Codes = getErrorCodesForStatus(500);
const test503Codes = getErrorCodesForStatus(503);

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

  test("should handle ErrorWithCode with undefined message", () => {
    const error = new ErrorWithCode(ErrorCode.Unauthorized, undefined as any);
    const result = getServerErrorFromUnknown(error);

    expect(result.statusCode).toBe(401);
    expect(result.message).toBe("");
  });

  test("should handle ErrorWithCode with empty message", () => {
    const error = new ErrorWithCode(ErrorCode.InvalidInput, "");
    const result = getServerErrorFromUnknown(error);

    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("");
  });

  test("should handle ErrorWithCode with complex data object", () => {
    const complexData = {
      userId: 123,
      eventTypeId: 456,
      metadata: { source: "api", version: "v1" },
      timestamps: [new Date("2024-01-01"), new Date("2024-01-02")],
    };

    const error = new ErrorWithCode(ErrorCode.EventTypeNotFound, "Event type not found", complexData);
    const result = getServerErrorFromUnknown(error);

    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Event type not found");
    expect(result.data).toEqual(complexData);
    expect(result.cause).toBe(error);
  });

  test("should handle string error", () => {
    const result = getServerErrorFromUnknown("Simple string error");

    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("Simple string error");
  });

  test("should handle null/undefined errors", () => {
    const nullResult = getServerErrorFromUnknown(null);
    const undefinedResult = getServerErrorFromUnknown(undefined);

    expect(nullResult.statusCode).toBe(500);
    expect(undefinedResult.statusCode).toBe(500);
    expect(nullResult.message).toContain("Unhandled error of type");
    expect(undefinedResult.message).toContain("Unhandled error of type");
  });

  test("should handle existing HttpError passthrough", () => {
    const originalError = new HttpError({
      statusCode: 418,
      message: "I'm a teapot",
      url: "/api/coffee",
      method: "BREW",
    });

    const result = getServerErrorFromUnknown(originalError);

    expect(result.statusCode).toBe(418);
    expect(result.message).toBe("I'm a teapot");
    expect(result.url).toBe("/api/coffee");
    expect(result.method).toBe("BREW");
  });

  test("should handle SyntaxError", () => {
    const syntaxError = new SyntaxError("Unexpected token");
    const result = getServerErrorFromUnknown(syntaxError);

    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("Unexpected error, please reach out for our customer support.");
  });
});

test400Codes.forEach((errorCode) => {
  test(`${errorCode} should return 400 Bad Request`, () => {
    const error = new ErrorWithCode(errorCode, `Test message for ${errorCode}`);
    const result = getServerErrorFromUnknown(error);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe(`Test message for ${errorCode}`);
    expect(result).toBeInstanceOf(HttpError);
  });
});

test401Codes.forEach((errorCode) => {
  test(`${errorCode} should return 401 Unauthorized`, () => {
    const error = new ErrorWithCode(errorCode, `Test message for ${errorCode}`);
    const result = getServerErrorFromUnknown(error);
    expect(result.statusCode).toBe(401);
    expect(result.message).toBe(`Test message for ${errorCode}`);
    expect(result).toBeInstanceOf(HttpError);
  });
});

test402Codes.forEach((errorCode) => {
  test(`${errorCode} should return 402 Payment Required`, () => {
    const error = new ErrorWithCode(errorCode, `Test message for ${errorCode}`);
    const result = getServerErrorFromUnknown(error);
    expect(result.statusCode).toBe(402);
    expect(result.message).toBe(`Test message for ${errorCode}`);
    expect(result).toBeInstanceOf(HttpError);
  });
});

test403Codes.forEach((errorCode) => {
  test(`${errorCode} should return 403 Forbidden`, () => {
    const error = new ErrorWithCode(errorCode, `Test message for ${errorCode}`);
    const result = getServerErrorFromUnknown(error);
    expect(result.statusCode).toBe(403);
    expect(result.message).toBe(`Test message for ${errorCode}`);
    expect(result).toBeInstanceOf(HttpError);
  });
});

test404Codes.forEach((errorCode) => {
  test(`${errorCode} should return 404 Not Found`, () => {
    const error = new ErrorWithCode(errorCode, `Test message for ${errorCode}`);
    const result = getServerErrorFromUnknown(error);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe(`Test message for ${errorCode}`);
    expect(result).toBeInstanceOf(HttpError);
  });
});

test409Codes.forEach((errorCode) => {
  test(`${errorCode} should return 409 Conflict`, () => {
    const error = new ErrorWithCode(errorCode, `Test message for ${errorCode}`);
    const result = getServerErrorFromUnknown(error);
    expect(result.statusCode).toBe(409);
    expect(result.message).toBe(`Test message for ${errorCode}`);
    expect(result).toBeInstanceOf(HttpError);
  });
});

test500Codes.forEach((errorCode) => {
  test(`${errorCode} should return 500 Internal Server Error`, () => {
    const error = new ErrorWithCode(errorCode, `Test message for ${errorCode}`);
    const result = getServerErrorFromUnknown(error);
    expect(result.statusCode).toBe(500);
    expect(result.message).toBe(`Test message for ${errorCode}`);
    expect(result).toBeInstanceOf(HttpError);
  });
});

test503Codes.forEach((errorCode) => {
  test(`${errorCode} should return 503 Service Unavailable`, () => {
    const error = new ErrorWithCode(errorCode, `Test message for ${errorCode}`);
    const result = getServerErrorFromUnknown(error);
    expect(result.statusCode).toBe(503);
    expect(result.message).toBe(`Test message for ${errorCode}`);
    expect(result).toBeInstanceOf(HttpError);
  });
});
