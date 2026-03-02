import { describe, it, expect } from "vitest";

import type { BookingStatus } from "@calcom/prisma/enums";

import { bookingStatusToText } from "./bookingStatusToText";

describe("bookingStatusToText", () => {
  it("should convert ACCEPTED to 'Accepted'", () => {
    expect(bookingStatusToText("ACCEPTED" as BookingStatus)).toBe("Accepted");
  });

  it("should convert PENDING to 'Pending'", () => {
    expect(bookingStatusToText("PENDING" as BookingStatus)).toBe("Pending");
  });

  it("should convert CANCELLED to 'Cancelled'", () => {
    expect(bookingStatusToText("CANCELLED" as BookingStatus)).toBe("Cancelled");
  });

  it("should convert REJECTED to 'Rejected'", () => {
    expect(bookingStatusToText("REJECTED" as BookingStatus)).toBe("Rejected");
  });

  it("should convert AWAITING_HOST to 'Awaiting Host'", () => {
    expect(bookingStatusToText("AWAITING_HOST" as BookingStatus)).toBe("Awaiting Host");
  });

  it("should handle single word statuses", () => {
    expect(bookingStatusToText("PENDING" as BookingStatus)).toBe("Pending");
  });

  it("should handle multi-word statuses with underscores", () => {
    expect(bookingStatusToText("AWAITING_HOST" as BookingStatus)).toBe("Awaiting Host");
  });
});
