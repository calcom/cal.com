/**
 * Unit tests for validateRoundRobinSlotAvailability.
 *
 * Prevents overbooking for round-robin event types by ensuring:
 * - Fixed hosts: slot has no existing booking with a host as attendee and no active reservation.
 * - Non-fixed hosts: not all hosts have reserved the slot.
 */
import { DateTime } from "luxon";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateRoundRobinSlotAvailability } from "./validateRoundRobinSlotAvailability";

const mockBookingFindFirst = vi.hoisted(() => vi.fn());
const mockSelectedSlotsCount = vi.hoisted(() => vi.fn());

vi.mock("@calcom/prisma", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/prisma")>();
  const mockPrisma = {
    ...actual.prisma,
    booking: { findFirst: mockBookingFindFirst },
    selectedSlots: { count: mockSelectedSlotsCount },
  };
  return {
    ...actual,
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

describe("validateRoundRobinSlotAvailability", () => {
  const eventTypeId = 1;
  const startDate = DateTime.utc(2025, 6, 1, 14, 0);
  const endDate = DateTime.utc(2025, 6, 1, 14, 30);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fixed hosts", () => {
    const fixedHosts = [
      { userId: 10, isFixed: true },
      { userId: 11, isFixed: true },
    ] as any;

    it("does not throw when slot is free (no booking, no reservation)", async () => {
      mockBookingFindFirst.mockResolvedValue(null);
      mockSelectedSlotsCount.mockResolvedValue(0);

      await expect(
        validateRoundRobinSlotAvailability(eventTypeId, startDate, endDate, fixedHosts)
      ).resolves.not.toThrow();

      expect(mockBookingFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            eventTypeId,
            startTime: startDate.toJSDate(),
            endTime: endDate.toJSDate(),
          },
        })
      );
      expect(mockSelectedSlotsCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventTypeId,
            slotUtcStartDate: startDate.toISO(),
            slotUtcEndDate: endDate.toISO(),
          }),
        })
      );
    });

    it("throws 422 when there is an active slot reservation", async () => {
      mockBookingFindFirst.mockResolvedValue(null);
      mockSelectedSlotsCount.mockResolvedValue(1);

      await expect(
        validateRoundRobinSlotAvailability(eventTypeId, startDate, endDate, fixedHosts)
      ).rejects.toMatchObject({
        statusCode: 422,
        message: expect.stringContaining("no available hosts left"),
      });
    });

    it("throws 422 when existing booking has host as attendee", async () => {
      mockBookingFindFirst.mockResolvedValue({
        userId: 10,
        attendees: [{ id: 10 }, { id: 99 }],
        status: "ACCEPTED",
      } as any);
      mockSelectedSlotsCount.mockResolvedValue(0);

      await expect(
        validateRoundRobinSlotAvailability(eventTypeId, startDate, endDate, fixedHosts)
      ).rejects.toMatchObject({
        statusCode: 422,
        message: expect.stringContaining("already booked"),
      });
    });

    it("throws 422 when existing booking userId is one of the hosts", async () => {
      mockBookingFindFirst.mockResolvedValue({
        userId: 10,
        attendees: [],
        status: "ACCEPTED",
      } as any);
      mockSelectedSlotsCount.mockResolvedValue(0);

      await expect(
        validateRoundRobinSlotAvailability(eventTypeId, startDate, endDate, fixedHosts)
      ).rejects.toMatchObject({
        statusCode: 422,
        message: expect.stringContaining("already booked"),
      });
    });
  });

  describe("non-fixed hosts", () => {
    const nonFixedHosts = [
      { userId: 20, isFixed: false },
      { userId: 21, isFixed: false },
    ] as any;

    it("does not throw when not all hosts have reserved the slot", async () => {
      mockSelectedSlotsCount.mockResolvedValue(1);

      await expect(
        validateRoundRobinSlotAvailability(eventTypeId, startDate, endDate, nonFixedHosts)
      ).resolves.not.toThrow();
    });

    it("throws 422 when all hosts have reserved the slot", async () => {
      mockSelectedSlotsCount.mockResolvedValue(2);

      await expect(
        validateRoundRobinSlotAvailability(eventTypeId, startDate, endDate, nonFixedHosts)
      ).rejects.toMatchObject({
        statusCode: 422,
        message: expect.stringContaining("no available hosts left"),
      });
    });
  });
});
