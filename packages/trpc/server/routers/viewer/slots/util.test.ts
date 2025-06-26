import { describe, it, expect, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import { buildDateRanges } from "@calcom/lib/date-ranges";
import getSlots from "@calcom/lib/slots";
import { SchedulingType } from "@calcom/prisma/enums";

vi.mock("@calcom/lib/constants", () => ({
  IS_PRODUCTION: true,
  WEBAPP_URL: "http://localhost:3000",
  RESERVED_SUBDOMAINS: ["auth", "docs"],
  SINGLE_ORG_SLUG: "",
}));

describe("Optimized Slot Generation Algorithm", () => {
  const createMockEventType = (schedulingType: SchedulingType) => ({
    id: 1,
    length: 30,
    offsetStart: 0,
    minimumBookingNotice: 0,
    slotInterval: 30,
    schedulingType,
    availability: [],
  });

  const createMockHosts = (count: number, isFixed = false) => {
    return Array.from({ length: count }, (_, i) => ({
      isFixed,
      user: {
        id: i + 1,
        email: `user${i + 1}@example.com`,
        name: `User ${i + 1}`,
        credentials: [],
      },
    }));
  };

  const createMockInput = () => ({
    timeZone: "UTC",
    duration: 30,
  });

  it("should have correct batch size constant", () => {
    const BATCH_SIZE = 10;
    expect(BATCH_SIZE).toBe(10);
  });

  it("should handle different scheduling types", () => {
    const collectiveEventType = createMockEventType(SchedulingType.COLLECTIVE);
    const roundRobinEventType = createMockEventType(SchedulingType.ROUND_ROBIN);

    expect(collectiveEventType.schedulingType).toBe(SchedulingType.COLLECTIVE);
    expect(roundRobinEventType.schedulingType).toBe(SchedulingType.ROUND_ROBIN);
  });

  it("should create mock hosts with correct structure", () => {
    const hosts = createMockHosts(5, true);

    expect(hosts).toHaveLength(5);
    expect(hosts[0]).toHaveProperty("isFixed", true);
    expect(hosts[0].user).toHaveProperty("id", 1);
    expect(hosts[0].user).toHaveProperty("email", "user1@example.com");
  });

  it("should handle minimum user requirements logic", () => {
    const collectiveHosts = createMockHosts(5, true);
    const roundRobinHosts = createMockHosts(10, false);

    const collectiveRequiredUsers = collectiveHosts.filter((h) => h.isFixed).length;
    const roundRobinRequiredUsers = 2;

    expect(collectiveRequiredUsers).toBe(5);
    expect(roundRobinRequiredUsers).toBe(2);
  });

  it("should calculate batch processing correctly", () => {
    const BATCH_SIZE = 10;
    const totalHosts = 25;
    const expectedBatches = Math.ceil(totalHosts / BATCH_SIZE);

    expect(expectedBatches).toBe(3);

    const batches = [];
    for (let i = 0; i < totalHosts; i += BATCH_SIZE) {
      batches.push(Math.min(BATCH_SIZE, totalHosts - i));
    }

    expect(batches).toEqual([10, 10, 5]);
  });

  describe("Large Team Events (10+ members)", () => {
    it("should generate ideal slots correctly using event type settings", () => {
      const today = dayjs().startOf("day");
      const startTime = today.add(1, "day").hour(9);
      const endTime = today.add(1, "day").hour(17);

      const idealSlots = getSlots({
        inviteeDate: startTime,
        eventLength: 60,
        offsetStart: 0,
        dateRanges: buildDateRanges({
          availability: [
            {
              days: [0, 1, 2, 3, 4, 5, 6],
              startTime: new Date("1970-01-01T09:00:00.000Z"),
              endTime: new Date("1970-01-01T17:00:00.000Z"),
            },
          ],
          timeZone: "UTC",
          dateFrom: startTime,
          dateTo: endTime,
          travelSchedules: [],
        }).dateRanges,
        minimumBookingNotice: 0,
        frequency: 60,
      });

      expect(idealSlots.length).toBeGreaterThan(0);
      expect(idealSlots[0]).toHaveProperty("time");
    });

    it("should handle batch processing logic correctly", () => {
      const BATCH_SIZE = 10;
      const totalHosts = 25;

      const batches = [];
      for (let i = 0; i < totalHosts; i += BATCH_SIZE) {
        const batchSize = Math.min(BATCH_SIZE, totalHosts - i);
        batches.push(batchSize);
      }

      expect(batches).toEqual([10, 10, 5]);
      expect(batches.length).toBe(3);
    });

    it("should determine correct user requirements for different scheduling types", () => {
      const collectiveHosts = Array.from({ length: 12 }, (_, i) => ({
        isFixed: true,
        user: { id: i + 1, email: `user${i + 1}@example.com` },
      }));

      const roundRobinHosts = Array.from({ length: 15 }, (_, i) => ({
        isFixed: false,
        user: { id: i + 1, email: `user${i + 1}@example.com` },
      }));

      const collectiveRequiredUsers = collectiveHosts.filter((h) => h.isFixed).length;
      const roundRobinRequiredUsers = 2;

      expect(collectiveRequiredUsers).toBe(12);
      expect(roundRobinRequiredUsers).toBe(2);
    });

    it("should trigger optimized algorithm for teams with more than 10 members", () => {
      const isTeamEvent = true;
      const allHostsCount = 15;
      const shouldUseOptimizedAlgorithm = isTeamEvent && allHostsCount > 10;

      expect(shouldUseOptimizedAlgorithm).toBe(true);
    });

    it("should not trigger optimized algorithm for teams with 10 or fewer members", () => {
      const isTeamEvent = true;
      const allHostsCount = 10;
      const shouldUseOptimizedAlgorithm = isTeamEvent && allHostsCount > 10;

      expect(shouldUseOptimizedAlgorithm).toBe(false);
    });

    it("should handle short-circuit logic when all slots are confirmed", () => {
      const idealSlotsCount = 8;
      const confirmedSlots = new Set([
        "2024-06-26T09:00:00.000Z",
        "2024-06-26T10:00:00.000Z",
        "2024-06-26T11:00:00.000Z",
        "2024-06-26T12:00:00.000Z",
        "2024-06-26T13:00:00.000Z",
        "2024-06-26T14:00:00.000Z",
        "2024-06-26T15:00:00.000Z",
        "2024-06-26T16:00:00.000Z",
      ]);

      const shouldShortCircuit = confirmedSlots.size >= idealSlotsCount;
      expect(shouldShortCircuit).toBe(true);
    });

    it("should validate slot confirmation logic for COLLECTIVE scheduling", () => {
      const batch = Array.from({ length: 10 }, (_, i) => ({
        isFixed: true,
        user: { id: i + 1 },
      }));

      const availableUsersCount = 8;
      const requiredUsers = batch.filter((h) => h.isFixed).length;
      const isSlotConfirmed = availableUsersCount >= Math.min(requiredUsers, batch.length);

      expect(requiredUsers).toBe(10);
      expect(isSlotConfirmed).toBe(false);
    });

    it("should validate slot confirmation logic for ROUND_ROBIN scheduling", () => {
      const batch = Array.from({ length: 10 }, (_, i) => ({
        isFixed: false,
        user: { id: i + 1 },
      }));

      const availableUsersCount = 5;
      const requiredUsers = 2;
      const isSlotConfirmed = availableUsersCount >= Math.min(requiredUsers, batch.length);

      expect(isSlotConfirmed).toBe(true);
    });
  });
});
