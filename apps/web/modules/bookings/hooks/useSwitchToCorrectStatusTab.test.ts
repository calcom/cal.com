import { describe, it, expect } from "vitest";

import { getTabForBooking } from "./useSwitchToCorrectStatusTab";

function makeBooking(overrides: {
  status: string;
  endTime: Date;
  recurringEventId?: string | null;
}){
  return {
    status: overrides.status,
    endTime: overrides.endTime,
    recurringEventId: overrides.recurringEventId ?? null,
  };
}

const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

describe("getTabForBooking", () => {
  it("returns 'cancelled' for CANCELLED bookings", () => {
    expect(getTabForBooking(makeBooking({ status: "CANCELLED", endTime: future }))).toBe("cancelled");
  });

  it("returns 'cancelled' for REJECTED bookings", () => {
    expect(getTabForBooking(makeBooking({ status: "REJECTED", endTime: future }))).toBe("cancelled");
  });

  it("returns 'cancelled' for CANCELLED bookings even if past", () => {
    expect(getTabForBooking(makeBooking({ status: "CANCELLED", endTime: past }))).toBe("cancelled");
  });

  it("returns 'unconfirmed' for PENDING bookings in the future", () => {
    expect(getTabForBooking(makeBooking({ status: "PENDING", endTime: future }))).toBe("unconfirmed");
  });

  it("returns 'past' for PENDING bookings that have ended", () => {
    expect(getTabForBooking(makeBooking({ status: "PENDING", endTime: past }))).toBe("past");
  });

  it("returns 'past' for ACCEPTED bookings that have ended", () => {
    expect(getTabForBooking(makeBooking({ status: "ACCEPTED", endTime: past }))).toBe("past");
  });

  it("returns 'recurring' for future ACCEPTED bookings with recurringEventId", () => {
    expect(
      getTabForBooking(makeBooking({ status: "ACCEPTED", endTime: future, recurringEventId: "rec-123" }))
    ).toBe("recurring");
  });

  it("returns 'upcoming' for future ACCEPTED bookings without recurringEventId", () => {
    expect(getTabForBooking(makeBooking({ status: "ACCEPTED", endTime: future }))).toBe("upcoming");
  });

  it("returns 'past' for recurring bookings that have ended", () => {
    expect(
      getTabForBooking(makeBooking({ status: "ACCEPTED", endTime: past, recurringEventId: "rec-123" }))
    ).toBe("past");
  });
});
