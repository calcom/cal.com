import { describe, expect, it, vi } from "vitest";

vi.mock("./getUserBooking", () => ({
  default: vi.fn(),
}));

vi.mock("@calcom/features/bookings/lib/get-booking", () => ({
  getBookingWithResponses: vi.fn((booking: unknown) => ({
    ...(booking as Record<string, unknown>),
    responses: { name: "Test" },
  })),
}));

import getBookingInfo from "./getBookingInfo";
import getUserBooking from "./getUserBooking";

describe("getBookingInfo", () => {
  it("returns undefined values when booking is not found", async () => {
    vi.mocked(getUserBooking).mockResolvedValue(null as never);

    const result = await getBookingInfo("nonexistent-uid");
    expect(result.bookingInfoRaw).toBeUndefined();
    expect(result.bookingInfo).toBeUndefined();
  });

  it("returns both raw and processed booking info when found", async () => {
    const rawBooking = {
      id: 1,
      uid: "test-uid",
      description: "test",
      customInputs: {},
      attendees: [{ email: "test@example.com", name: "Test" }],
      location: "zoom",
      responses: { name: "Test" },
    };
    vi.mocked(getUserBooking).mockResolvedValue(rawBooking as never);

    const result = await getBookingInfo("test-uid");
    expect(result.bookingInfoRaw).toBeDefined();
    expect(result.bookingInfo).toBeDefined();
    expect(result.bookingInfo).toHaveProperty("responses");
  });

  it("passes uid to getUserBooking", async () => {
    vi.mocked(getUserBooking).mockResolvedValue(null as never);

    await getBookingInfo("specific-uid-123");
    expect(getUserBooking).toHaveBeenCalledWith("specific-uid-123");
  });
});
