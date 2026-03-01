import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain", () => ({
  checkIfFreeEmailDomain: vi.fn().mockResolvedValue(true),
}));

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: vi.fn((fn: (...args: never[]) => unknown) => fn),
}));

import { checkIfFreeEmailDomain } from "@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain";
import { getRequiresConfirmationFlags } from "./getRequiresConfirmationFlags";

describe("getRequiresConfirmationFlags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns isConfirmedByDefault true when no confirmation required and price is 0", async () => {
    const result = await getRequiresConfirmationFlags({
      eventType: { metadata: null, requiresConfirmation: false, requiresConfirmationForFreeEmail: false },
      bookingStartTime: new Date().toISOString(),
      userId: 1,
      paymentAppData: { price: 0 },
      originalRescheduledBookingOrganizerId: undefined,
      bookerEmail: "test@company.com",
    });

    expect(result.isConfirmedByDefault).toBe(true);
    expect(result.userReschedulingIsOwner).toBe(false);
  });

  it("returns userReschedulingIsOwner true when user is the original organizer", async () => {
    const result = await getRequiresConfirmationFlags({
      eventType: { metadata: null, requiresConfirmation: true, requiresConfirmationForFreeEmail: false },
      bookingStartTime: new Date().toISOString(),
      userId: 5,
      paymentAppData: { price: 0 },
      originalRescheduledBookingOrganizerId: 5,
      bookerEmail: "test@company.com",
    });

    expect(result.userReschedulingIsOwner).toBe(true);
    expect(result.isConfirmedByDefault).toBe(true);
  });

  it("checks free email domain when requiresConfirmationForFreeEmail is true", async () => {
    await getRequiresConfirmationFlags({
      eventType: { metadata: null, requiresConfirmation: false, requiresConfirmationForFreeEmail: true },
      bookingStartTime: new Date().toISOString(),
      userId: 1,
      paymentAppData: { price: 0 },
      originalRescheduledBookingOrganizerId: undefined,
      bookerEmail: "test@gmail.com",
    });

    expect(checkIfFreeEmailDomain).toHaveBeenCalledWith({ email: "test@gmail.com" });
  });

  it("returns isConfirmedByDefault false when confirmation required and not owner", async () => {
    const result = await getRequiresConfirmationFlags({
      eventType: { metadata: null, requiresConfirmation: true, requiresConfirmationForFreeEmail: false },
      bookingStartTime: new Date().toISOString(),
      userId: 1,
      paymentAppData: { price: 0 },
      originalRescheduledBookingOrganizerId: undefined,
      bookerEmail: "test@company.com",
    });

    expect(result.isConfirmedByDefault).toBe(false);
  });

  it("handles paid rescheduling correctly", async () => {
    const result = await getRequiresConfirmationFlags({
      eventType: { metadata: null, requiresConfirmation: false, requiresConfirmationForFreeEmail: false },
      bookingStartTime: new Date().toISOString(),
      userId: 1,
      paymentAppData: { price: 100 },
      originalRescheduledBookingOrganizerId: 2,
      bookerEmail: "test@company.com",
    });

    expect(result.isConfirmedByDefault).toBe(true);
  });

  it("overrides requiresConfirmation based on time threshold", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const result = await getRequiresConfirmationFlags({
      eventType: {
        metadata: { requiresConfirmationThreshold: { time: 30, unit: "minutes" as const } },
        requiresConfirmation: true,
        requiresConfirmationForFreeEmail: false,
      },
      bookingStartTime: futureDate.toISOString(),
      userId: 1,
      paymentAppData: { price: 0 },
      originalRescheduledBookingOrganizerId: undefined,
      bookerEmail: "test@company.com",
    });

    expect(result.isConfirmedByDefault).toBe(true);
  });
});
