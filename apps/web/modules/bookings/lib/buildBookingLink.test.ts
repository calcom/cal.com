import { describe, expect, it } from "vitest";

import { buildBookingLink } from "./buildBookingLink";

describe("buildBookingLink", () => {
  it("builds a link with bookingUid and allRemainingBookings=true", () => {
    const result = buildBookingLink({
      bookingUid: "abc-123",
      allRemainingBookings: true,
    });
    expect(result).toBe("/booking/abc-123?allRemainingBookings=true");
  });

  it("builds a link with allRemainingBookings=false", () => {
    const result = buildBookingLink({
      bookingUid: "abc-123",
      allRemainingBookings: false,
    });
    expect(result).toBe("/booking/abc-123?allRemainingBookings=false");
  });

  it("includes email when provided", () => {
    const result = buildBookingLink({
      bookingUid: "abc-123",
      allRemainingBookings: true,
      email: "test@example.com",
    });
    expect(result).toContain("allRemainingBookings=true");
    expect(result).toContain("email=test%40example.com");
    expect(result.startsWith("/booking/abc-123?")).toBe(true);
  });

  it("omits email when null", () => {
    const result = buildBookingLink({
      bookingUid: "abc-123",
      allRemainingBookings: false,
      email: null,
    });
    expect(result).not.toContain("email=");
  });

  it("omits email when undefined", () => {
    const result = buildBookingLink({
      bookingUid: "abc-123",
      allRemainingBookings: false,
      email: undefined,
    });
    expect(result).not.toContain("email=");
  });

  it("omits email when empty string", () => {
    const result = buildBookingLink({
      bookingUid: "abc-123",
      allRemainingBookings: false,
      email: "",
    });
    expect(result).not.toContain("email=");
  });

  it("handles special characters in bookingUid", () => {
    const result = buildBookingLink({
      bookingUid: "uid-with-special_chars.123",
      allRemainingBookings: true,
    });
    expect(result.startsWith("/booking/uid-with-special_chars.123?")).toBe(true);
  });
});
