import { describe, it, expect, vi, beforeEach } from "vitest";

// Create mock functions that will be shared across all tests
const mockShouldApplyMonthlyProration = vi.fn();
const mockLogSeatAddition = vi.fn();
const mockLogSeatRemoval = vi.fn();

// Mock the services - MUST be before the import of trackSeatChanges
vi.mock("@calcom/features/ee/billing/service/billingPeriod/BillingPeriodService", () => ({
  BillingPeriodService: class {
    shouldApplyMonthlyProration = mockShouldApplyMonthlyProration;
  },
}));

vi.mock("@calcom/features/ee/billing/service/seatTracking/SeatChangeTrackingService", () => ({
  SeatChangeTrackingService: class {
    logSeatAddition = mockLogSeatAddition;
    logSeatRemoval = mockLogSeatRemoval;
  },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Import AFTER mocks are set up
import { getBillingEntityId, trackSeatAdditions, trackSeatRemovals } from "../trackSeatChanges";

describe("trackSeatChanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShouldApplyMonthlyProration.mockReset();
    mockLogSeatAddition.mockReset();
    mockLogSeatRemoval.mockReset();
  });

  describe("getBillingEntityId", () => {
    it("should return team ID for standalone team", () => {
      const team = {
        id: 123,
        isOrganization: false,
        parentId: null,
      };

      const result = getBillingEntityId(team);

      expect(result).toBe(123);
    });

    it("should return org ID for organization", () => {
      const org = {
        id: 456,
        isOrganization: true,
        parentId: null,
      };

      const result = getBillingEntityId(org);

      expect(result).toBe(456);
    });

    it("should return parent org ID for sub-team", () => {
      const subTeam = {
        id: 789,
        isOrganization: false,
        parentId: 456,
      };

      const result = getBillingEntityId(subTeam);

      expect(result).toBe(456);
    });

    it("should prioritize isOrganization over parentId", () => {
      // Edge case: org with a parentId (shouldn't happen but test the logic)
      const org = {
        id: 999,
        isOrganization: true,
        parentId: 888,
      };

      const result = getBillingEntityId(org);

      expect(result).toBe(999); // Uses own ID because it's an org
    });
  });

  describe("trackSeatAdditions", () => {
    it("should track seat additions when proration is enabled", async () => {
      mockShouldApplyMonthlyProration.mockResolvedValue(true);
      mockLogSeatAddition.mockResolvedValue(undefined);

      await trackSeatAdditions({
        billingEntityId: 100,
        userIds: [1, 2, 3],
        triggeredBy: 50,
        metadata: { source: "test" },
      });

      expect(mockShouldApplyMonthlyProration).toHaveBeenCalledWith(100);
      expect(mockLogSeatAddition).toHaveBeenCalledTimes(3);
      expect(mockLogSeatAddition).toHaveBeenCalledWith({
        teamId: 100,
        userId: 1,
        triggeredBy: 50,
        metadata: { source: "test" },
      });
      expect(mockLogSeatAddition).toHaveBeenCalledWith({
        teamId: 100,
        userId: 2,
        triggeredBy: 50,
        metadata: { source: "test" },
      });
      expect(mockLogSeatAddition).toHaveBeenCalledWith({
        teamId: 100,
        userId: 3,
        triggeredBy: 50,
        metadata: { source: "test" },
      });
    });

    it("should not track when proration is disabled", async () => {
      mockShouldApplyMonthlyProration.mockResolvedValue(false);

      await trackSeatAdditions({
        billingEntityId: 100,
        userIds: [1, 2, 3],
        triggeredBy: 50,
      });

      expect(mockShouldApplyMonthlyProration).toHaveBeenCalledWith(100);
      expect(mockLogSeatAddition).not.toHaveBeenCalled();
    });

    it("should handle empty user list", async () => {
      await trackSeatAdditions({
        billingEntityId: 100,
        userIds: [],
        triggeredBy: 50,
      });

      expect(mockShouldApplyMonthlyProration).not.toHaveBeenCalled();
      expect(mockLogSeatAddition).not.toHaveBeenCalled();
    });

    it("should not throw error if tracking fails", async () => {
      mockShouldApplyMonthlyProration.mockResolvedValue(true);
      mockLogSeatAddition.mockRejectedValue(new Error("Database error"));

      // Should not throw
      await expect(
        trackSeatAdditions({
          billingEntityId: 100,
          userIds: [1],
          triggeredBy: 50,
        })
      ).resolves.not.toThrow();

      expect(mockLogSeatAddition).toHaveBeenCalledTimes(1);
    });

    it("should work without metadata", async () => {
      mockShouldApplyMonthlyProration.mockResolvedValue(true);
      mockLogSeatAddition.mockResolvedValue(undefined);

      await trackSeatAdditions({
        billingEntityId: 100,
        userIds: [1],
        triggeredBy: 50,
      });

      expect(mockLogSeatAddition).toHaveBeenCalledWith({
        teamId: 100,
        userId: 1,
        triggeredBy: 50,
        metadata: undefined,
      });
    });
  });

  describe("trackSeatRemovals", () => {
    it("should track seat removals when proration is enabled", async () => {
      mockShouldApplyMonthlyProration.mockResolvedValue(true);
      mockLogSeatRemoval.mockResolvedValue(undefined);

      await trackSeatRemovals({
        billingEntityId: 100,
        userIds: [1, 2],
        triggeredBy: 50,
        metadata: { reason: "left" },
      });

      expect(mockShouldApplyMonthlyProration).toHaveBeenCalledWith(100);
      expect(mockLogSeatRemoval).toHaveBeenCalledTimes(2);
      expect(mockLogSeatRemoval).toHaveBeenCalledWith({
        teamId: 100,
        userId: 1,
        triggeredBy: 50,
        metadata: { reason: "left" },
      });
      expect(mockLogSeatRemoval).toHaveBeenCalledWith({
        teamId: 100,
        userId: 2,
        triggeredBy: 50,
        metadata: { reason: "left" },
      });
    });

    it("should not track when proration is disabled", async () => {
      mockShouldApplyMonthlyProration.mockResolvedValue(false);

      await trackSeatRemovals({
        billingEntityId: 100,
        userIds: [1, 2],
        triggeredBy: 50,
      });

      expect(mockShouldApplyMonthlyProration).toHaveBeenCalledWith(100);
      expect(mockLogSeatRemoval).not.toHaveBeenCalled();
    });

    it("should handle empty user list", async () => {
      await trackSeatRemovals({
        billingEntityId: 100,
        userIds: [],
        triggeredBy: 50,
      });

      expect(mockShouldApplyMonthlyProration).not.toHaveBeenCalled();
      expect(mockLogSeatRemoval).not.toHaveBeenCalled();
    });

    it("should work without triggeredBy (system action)", async () => {
      mockShouldApplyMonthlyProration.mockResolvedValue(true);
      mockLogSeatRemoval.mockResolvedValue(undefined);

      await trackSeatRemovals({
        billingEntityId: 100,
        userIds: [1],
      });

      expect(mockLogSeatRemoval).toHaveBeenCalledWith({
        teamId: 100,
        userId: 1,
        triggeredBy: undefined,
        metadata: undefined,
      });
    });

    it("should not throw error if tracking fails", async () => {
      mockShouldApplyMonthlyProration.mockResolvedValue(true);
      mockLogSeatRemoval.mockRejectedValue(new Error("Database error"));

      // Should not throw
      await expect(
        trackSeatRemovals({
          billingEntityId: 100,
          userIds: [1],
          triggeredBy: 50,
        })
      ).resolves.not.toThrow();

      expect(mockLogSeatRemoval).toHaveBeenCalledTimes(1);
    });
  });
});
