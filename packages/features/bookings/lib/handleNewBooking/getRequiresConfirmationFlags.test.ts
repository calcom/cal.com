import dayjs from "@calcom/dayjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: (fn: (...args: never[]) => unknown) => fn,
}));

vi.mock("@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain", () => ({
  checkIfFreeEmailDomain: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

import { checkIfFreeEmailDomain } from "@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain";
import { getRequiresConfirmationFlags } from "./getRequiresConfirmationFlags";

const mockCheckFreeEmail = vi.mocked(checkIfFreeEmailDomain);

describe("getRequiresConfirmationFlags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckFreeEmail.mockResolvedValue(false);
  });

  const baseParams = {
    eventType: {
      metadata: {},
      requiresConfirmation: false,
      requiresConfirmationForFreeEmail: false,
    },
    bookingStartTime: dayjs().add(30, "days").toISOString(),
    userId: undefined,
    paymentAppData: { price: 0 },
    originalRescheduledBookingOrganizerId: undefined,
    bookerEmail: "test@company.com",
  };

  it("returns isConfirmedByDefault=true when no confirmation required and price=0", async () => {
    const result = await getRequiresConfirmationFlags(baseParams);

    expect(result.isConfirmedByDefault).toBe(true);
    expect(result.userReschedulingIsOwner).toBe(false);
  });

  it("returns isConfirmedByDefault=false when requiresConfirmation=true", async () => {
    const result = await getRequiresConfirmationFlags({
      ...baseParams,
      eventType: { ...baseParams.eventType, requiresConfirmation: true },
    });

    expect(result.isConfirmedByDefault).toBe(false);
  });

  it("returns userReschedulingIsOwner=true when userId matches organizer", async () => {
    const result = await getRequiresConfirmationFlags({
      ...baseParams,
      eventType: { ...baseParams.eventType, requiresConfirmation: true },
      userId: 42,
      originalRescheduledBookingOrganizerId: 42,
    });

    expect(result.userReschedulingIsOwner).toBe(true);
    expect(result.isConfirmedByDefault).toBe(true);
  });

  it("returns userReschedulingIsOwner=false when userId does not match organizer", async () => {
    const result = await getRequiresConfirmationFlags({
      ...baseParams,
      userId: 42,
      originalRescheduledBookingOrganizerId: 99,
    });

    expect(result.userReschedulingIsOwner).toBe(false);
  });

  it("returns userReschedulingIsOwner=false when userId is undefined", async () => {
    const result = await getRequiresConfirmationFlags({
      ...baseParams,
      userId: undefined,
      originalRescheduledBookingOrganizerId: 42,
    });

    expect(result.userReschedulingIsOwner).toBe(false);
  });

  it("checks free email domain when requiresConfirmationForFreeEmail is true", async () => {
    mockCheckFreeEmail.mockResolvedValue(true);

    const result = await getRequiresConfirmationFlags({
      ...baseParams,
      eventType: {
        ...baseParams.eventType,
        requiresConfirmationForFreeEmail: true,
      },
      bookerEmail: "user@gmail.com",
    });

    expect(mockCheckFreeEmail).toHaveBeenCalledWith({ email: "user@gmail.com" });
    expect(result.isConfirmedByDefault).toBe(false);
  });

  it("does not require confirmation for non-free email when requiresConfirmationForFreeEmail=true", async () => {
    mockCheckFreeEmail.mockResolvedValue(false);

    const result = await getRequiresConfirmationFlags({
      ...baseParams,
      eventType: {
        ...baseParams.eventType,
        requiresConfirmationForFreeEmail: true,
      },
      bookerEmail: "user@company.com",
    });

    expect(result.isConfirmedByDefault).toBe(true);
  });

  it("overrides requiresConfirmation=false when booking is far in the future and threshold is set", async () => {
    const result = await getRequiresConfirmationFlags({
      ...baseParams,
      eventType: {
        ...baseParams.eventType,
        requiresConfirmation: true,
        metadata: {
          requiresConfirmationThreshold: { time: 24, unit: "hours" as const },
        },
      },
      bookingStartTime: dayjs().add(48, "hours").toISOString(),
    });

    expect(result.isConfirmedByDefault).toBe(true);
  });

  it("keeps requiresConfirmation=true when booking is within threshold", async () => {
    const result = await getRequiresConfirmationFlags({
      ...baseParams,
      eventType: {
        ...baseParams.eventType,
        requiresConfirmation: true,
        metadata: {
          requiresConfirmationThreshold: { time: 72, unit: "hours" as const },
        },
      },
      bookingStartTime: dayjs().add(48, "hours").toISOString(),
    });

    expect(result.isConfirmedByDefault).toBe(false);
  });

  it("returns isConfirmedByDefault=false when price > 0 and requiresConfirmation=true", async () => {
    const result = await getRequiresConfirmationFlags({
      ...baseParams,
      eventType: { ...baseParams.eventType, requiresConfirmation: true },
      paymentAppData: { price: 100 },
    });

    expect(result.isConfirmedByDefault).toBe(false);
  });

  it("returns isConfirmedByDefault=true for paid reschedule when requiresConfirmation=false", async () => {
    const result = await getRequiresConfirmationFlags({
      ...baseParams,
      eventType: { ...baseParams.eventType, requiresConfirmation: false },
      paymentAppData: { price: 100 },
      originalRescheduledBookingOrganizerId: 99,
    });

    expect(result.isConfirmedByDefault).toBe(true);
  });

  it("returns isConfirmedByDefault=false for paid new booking when requiresConfirmation=false", async () => {
    const result = await getRequiresConfirmationFlags({
      ...baseParams,
      eventType: { ...baseParams.eventType, requiresConfirmation: false },
      paymentAppData: { price: 100 },
    });

    expect(result.isConfirmedByDefault).toBe(false);
  });
});
