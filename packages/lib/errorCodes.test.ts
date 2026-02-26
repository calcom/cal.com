import { describe, expect, it } from "vitest";
import { ErrorCode } from "./errorCodes";

describe("ErrorCode", () => {
  it("has Unauthorized error code", () => {
    expect(ErrorCode.Unauthorized).toBe("unauthorized_error");
  });

  it("has Forbidden error code", () => {
    expect(ErrorCode.Forbidden).toBe("forbidden_error");
  });

  it("has NotFound error code", () => {
    expect(ErrorCode.NotFound).toBe("not_found_error");
  });

  it("has BadRequest error code", () => {
    expect(ErrorCode.BadRequest).toBe("bad_request_error");
  });

  it("has InternalServerError error code", () => {
    expect(ErrorCode.InternalServerError).toBe("internal_server_error");
  });

  it("has PaymentCreationFailure error code", () => {
    expect(ErrorCode.PaymentCreationFailure).toBe("payment_not_created_error");
  });

  it("has ChargeCardFailure error code", () => {
    expect(ErrorCode.ChargeCardFailure).toBe("couldnt_charge_card_error");
  });

  it("has CollectCardFailure error code", () => {
    expect(ErrorCode.CollectCardFailure).toBe("couldnt_collect_card_error");
  });

  it("has EventTypeNotFound error code", () => {
    expect(ErrorCode.EventTypeNotFound).toBe("event_type_not_found_error");
  });

  it("has BookingNotFound error code", () => {
    expect(ErrorCode.BookingNotFound).toBe("booking_not_found_error");
  });

  it("has BookingSeatsFull error code", () => {
    expect(ErrorCode.BookingSeatsFull).toBe("booking_seats_full_error");
  });

  it("has all expected enum members", () => {
    const values = Object.values(ErrorCode);
    expect(values.length).toBeGreaterThanOrEqual(30);
    expect(values.every((v) => typeof v === "string")).toBe(true);
    expect(values.every((v) => v.length > 0)).toBe(true);
  });

  it("has unique values for each member", () => {
    const values = Object.values(ErrorCode);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it("has CancelledBookingsCannotBeRescheduled", () => {
    expect(ErrorCode.CancelledBookingsCannotBeRescheduled).toBe("cancelled_bookings_cannot_be_rescheduled");
  });

  it("has BookingConflict error code", () => {
    expect(ErrorCode.BookingConflict).toBe("booking_conflict_error");
  });
});
