import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    booking: {
      update: vi.fn().mockResolvedValue({}),
    },
  };
  return { default: mockPrisma };
});

vi.mock("@calcom/app-store/_utils/getCalendar", () => ({
  getCalendar: vi.fn().mockResolvedValue(null),
}));

vi.mock("@calcom/app-store/delegationCredential", () => ({
  getAllDelegationCredentialsForUserIncludeServiceAccountKey: vi.fn().mockResolvedValue([]),
  getDelegationCredentialOrFindRegularCredential: vi.fn().mockResolvedValue(null),
}));

vi.mock("@calcom/features/conferencing/lib/videoClient", () => ({
  deleteMeeting: vi.fn().mockResolvedValue(undefined),
}));

import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import lastAttendeeDeleteBooking from "./lastAttendeeDeleteBooking";

describe("lastAttendeeDeleteBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when originalRescheduledBooking is null", async () => {
    const result = await lastAttendeeDeleteBooking(null as never, [], undefined);
    expect(result).toBe(false);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it("cancels booking when no attendees remain", async () => {
    const originalBooking = {
      id: 1,
      uid: "booking-uid",
      user: null,
      references: [
        { type: "google_calendar", uid: "cal-ref", credentialId: null, delegationCredentialId: null },
      ],
    };

    await lastAttendeeDeleteBooking(originalBooking as never, [], undefined);

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          status: BookingStatus.CANCELLED,
        }),
      })
    );
  });

  it("cancels booking when filteredAttendees is undefined", async () => {
    const originalBooking = {
      id: 1,
      uid: "booking-uid",
      user: null,
      references: [],
    };

    await lastAttendeeDeleteBooking(originalBooking as never, undefined, undefined);

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          status: BookingStatus.CANCELLED,
        }),
      })
    );
  });

  it("does not cancel booking when attendees still remain", async () => {
    const originalBooking = {
      id: 1,
      uid: "booking-uid",
      user: null,
      references: [],
    };
    const filteredAttendees = [{ email: "remaining@example.com" }];

    const result = await lastAttendeeDeleteBooking(originalBooking as never, filteredAttendees, undefined);

    expect(prisma.booking.update).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});
