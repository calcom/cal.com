import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";

import type { GetAvailabilityUser } from "@calcom/lib/getUserAvailability";

import { _getReservedSlotsAndCleanupExpired } from "./util";

describe("_getReservedSlotsAndCleanupExpired", () => {
  const createTestUsers = (): GetAvailabilityUser[] => [
    {
      id: 1,
      username: "user1",
      name: "User 1",
      email: "user1@example.com",
      timeZone: "UTC",
      credentials: [],
      bufferTime: 0,
      destinationCalendar: null,
      locale: "en",
      schedules: [],
      defaultScheduleId: null,
      selectedCalendars: [],
      startTime: 0,
      endTime: 0,
      theme: null,
      brandColor: null,
      darkBrandColor: null,
      allowDynamicBooking: true,
      away: false,
    },
    {
      id: 2,
      username: "user2",
      name: "User 2",
      email: "user2@example.com",
      timeZone: "UTC",
      credentials: [],
      bufferTime: 0,
      destinationCalendar: null,
      locale: "en",
      schedules: [],
      defaultScheduleId: null,
      selectedCalendars: [],
      startTime: 0,
      endTime: 0,
      theme: null,
      brandColor: null,
      darkBrandColor: null,
      allowDynamicBooking: true,
      away: false,
    },
  ];

  const createTestSlots = async (slotData: { uid: string; expired?: boolean }[]) => {
    const slotsData = slotData.map((slot, index) => ({
      id: index + 1,
      eventTypeId: 1,
      userId: index % 2 === 0 ? 1 : 2, // Alternate between user 1 and 2
      slotUtcStartDate: new Date(`2023-01-02T${10 + index}:00:00Z`),
      slotUtcEndDate: new Date(`2023-01-02T${10 + index}:30:00Z`),
      uid: slot.uid,
      releaseAt: new Date(slot.expired ? "2023-01-01T11:00:00Z" : "2023-01-01T13:00:00Z"),
      isSeat: false,
    }));

    await prismock.selectedSlots.createMany({
      data: slotsData,
    });
  };

  beforeEach(async () => {
    // @ts-expect-error reset is a method on Prismock
    await prismock.reset();
    vi.setSystemTime("2023-01-01T12:00:00Z");
  });

  it("should return no reserved slots when bookerClientUid is undefined", async () => {
    const users = createTestUsers();

    await createTestSlots([{ uid: "slot1" }, { uid: "slot2" }, { uid: "slot3", expired: true }]);

    const reservedSlots = await _getReservedSlotsAndCleanupExpired({
      bookerClientUid: undefined,
      usersWithCredentials: users,
      eventTypeId: 1,
    });

    // Verify that no slots are returned as reserved
    expect(reservedSlots).toHaveLength(0);

    // Verify that expired slots are deleted from the database
    const remainingSlots = await prismock.selectedSlots.findMany();
    expect(remainingSlots).toHaveLength(2);
    expect(remainingSlots.map((slot) => slot.uid)).not.toContain("slot3");
  });

  it("should return slots with different uid when bookerClientUid is defined", async () => {
    const users = createTestUsers();

    await createTestSlots([
      { uid: "current-user-slot" },
      { uid: "other-user-slot" },
      { uid: "expired-slot", expired: true },
    ]);

    // Call the function with a defined bookerClientUid
    const reservedSlots = await _getReservedSlotsAndCleanupExpired({
      bookerClientUid: "current-user-slot",
      usersWithCredentials: users,
      eventTypeId: 1,
    });

    // Verify that only slots with different uid are returned as reserved
    expect(reservedSlots).toHaveLength(1);
    expect(reservedSlots[0].uid).toBe("other-user-slot");

    // Verify that expired slots are deleted from the database
    const remainingSlots = await prismock.selectedSlots.findMany();
    expect(remainingSlots).toHaveLength(2);
    expect(remainingSlots.map((slot) => slot.uid)).not.toContain("expired-slot");
  });
});
