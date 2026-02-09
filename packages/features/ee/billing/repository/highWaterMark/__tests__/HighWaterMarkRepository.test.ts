import { describe, it, expect, vi, beforeEach } from "vitest";

import { HighWaterMarkRepository } from "../HighWaterMarkRepository";

// Create mock Prisma client
const createMockPrisma = () => ({
  team: {
    findUnique: vi.fn(),
  },
  teamBilling: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  organizationBilling: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
});

describe("HighWaterMarkRepository", () => {
  let repository: HighWaterMarkRepository;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    // @ts-expect-error - mock prisma
    repository = new HighWaterMarkRepository(mockPrisma);
  });

  describe("getByTeamId", () => {
    it("returns null when team not found", async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);

      const result = await repository.getByTeamId(123);

      expect(result).toBeNull();
    });

    it("returns null when team has no billing record", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        isOrganization: false,
        teamBilling: null,
        organizationBilling: null,
      });

      const result = await repository.getByTeamId(123);

      expect(result).toBeNull();
    });

    it("returns team billing data for non-organization", async () => {
      const teamBillingData = {
        id: "tb_1",
        teamId: 123,
        highWaterMark: 5,
        highWaterMarkPeriodStart: new Date("2024-01-01"),
        paidSeats: 5,
        billingPeriod: "MONTHLY",
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
        customerId: "cus_123",
        subscriptionStart: new Date("2024-01-01"),
      };

      mockPrisma.team.findUnique.mockResolvedValue({
        isOrganization: false,
        teamBilling: teamBillingData,
        organizationBilling: null,
      });

      const result = await repository.getByTeamId(123);

      expect(result).toEqual({
        ...teamBillingData,
        isOrganization: false,
      });
    });

    it("returns organization billing data for organization", async () => {
      const orgBillingData = {
        id: "ob_1",
        teamId: 456,
        highWaterMark: 10,
        highWaterMarkPeriodStart: new Date("2024-01-01"),
        paidSeats: 8,
        billingPeriod: "MONTHLY",
        subscriptionId: "sub_456",
        subscriptionItemId: "si_456",
        customerId: "cus_456",
        subscriptionStart: new Date("2024-01-01"),
      };

      mockPrisma.team.findUnique.mockResolvedValue({
        isOrganization: true,
        teamBilling: null,
        organizationBilling: orgBillingData,
      });

      const result = await repository.getByTeamId(456);

      expect(result).toEqual({
        ...orgBillingData,
        isOrganization: true,
      });
    });
  });

  describe("getBySubscriptionId", () => {
    it("returns team billing when found in teamBilling", async () => {
      const teamBillingData = {
        id: "tb_1",
        teamId: 123,
        highWaterMark: 5,
        highWaterMarkPeriodStart: new Date("2024-01-01"),
        paidSeats: 5,
        billingPeriod: "MONTHLY",
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
        subscriptionStart: new Date("2024-01-01"),
      };

      mockPrisma.teamBilling.findUnique.mockResolvedValue(teamBillingData);

      const result = await repository.getBySubscriptionId("sub_123");

      expect(result).toEqual({
        ...teamBillingData,
        isOrganization: false,
      });
      expect(mockPrisma.organizationBilling.findUnique).not.toHaveBeenCalled();
    });

    it("returns organization billing when not found in teamBilling but found in orgBilling", async () => {
      const orgBillingData = {
        id: "ob_1",
        teamId: 456,
        highWaterMark: 10,
        highWaterMarkPeriodStart: new Date("2024-01-01"),
        paidSeats: 8,
        billingPeriod: "MONTHLY",
        subscriptionId: "sub_456",
        subscriptionItemId: "si_456",
        subscriptionStart: new Date("2024-01-01"),
      };

      mockPrisma.teamBilling.findUnique.mockResolvedValue(null);
      mockPrisma.organizationBilling.findUnique.mockResolvedValue(orgBillingData);

      const result = await repository.getBySubscriptionId("sub_456");

      expect(result).toEqual({
        ...orgBillingData,
        isOrganization: true,
      });
    });

    it("returns null when subscription not found in either table", async () => {
      mockPrisma.teamBilling.findUnique.mockResolvedValue(null);
      mockPrisma.organizationBilling.findUnique.mockResolvedValue(null);

      const result = await repository.getBySubscriptionId("sub_not_found");

      expect(result).toBeNull();
    });
  });

  describe("updateIfHigher", () => {
    it("throws error when team not found", async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          team: { findUnique: vi.fn().mockResolvedValue(null) },
          teamBilling: { update: vi.fn() },
          organizationBilling: { update: vi.fn() },
        };
        return callback(mockTx);
      });

      await expect(
        repository.updateIfHigher({
          teamId: 123,
          isOrganization: false,
          newSeatCount: 5,
          periodStart: new Date(),
        })
      ).rejects.toThrow("No team found for teamId 123");
    });

    it("throws error when billing record not found", async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          team: {
            findUnique: vi.fn().mockResolvedValue({
              isOrganization: false,
              teamBilling: null,
              organizationBilling: null,
            }),
          },
          teamBilling: { update: vi.fn() },
          organizationBilling: { update: vi.fn() },
        };
        return callback(mockTx);
      });

      await expect(
        repository.updateIfHigher({
          teamId: 123,
          isOrganization: false,
          newSeatCount: 5,
          periodStart: new Date(),
        })
      ).rejects.toThrow("No billing record found for team 123");
    });

    it("does not update when newSeatCount is not higher than current HWM in same period", async () => {
      const periodStart = new Date("2024-01-01");
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          team: {
            findUnique: vi.fn().mockResolvedValue({
              isOrganization: false,
              teamBilling: {
                highWaterMark: 10,
                highWaterMarkPeriodStart: periodStart,
              },
              organizationBilling: null,
            }),
          },
          teamBilling: { update: vi.fn() },
          organizationBilling: { update: vi.fn() },
        };
        return callback(mockTx);
      });

      const result = await repository.updateIfHigher({
        teamId: 123,
        isOrganization: false,
        newSeatCount: 8, // Lower than current HWM of 10
        periodStart,
      });

      expect(result).toEqual({
        updated: false,
        previousHighWaterMark: 10,
      });
    });

    it("updates when newSeatCount is higher than current HWM", async () => {
      const periodStart = new Date("2024-01-01");
      const mockUpdate = vi.fn();

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          team: {
            findUnique: vi.fn().mockResolvedValue({
              isOrganization: false,
              teamBilling: {
                highWaterMark: 5,
                highWaterMarkPeriodStart: periodStart,
              },
              organizationBilling: null,
            }),
          },
          teamBilling: { update: mockUpdate },
          organizationBilling: { update: vi.fn() },
        };
        return callback(mockTx);
      });

      const result = await repository.updateIfHigher({
        teamId: 123,
        isOrganization: false,
        newSeatCount: 8, // Higher than current HWM of 5
        periodStart,
      });

      expect(result).toEqual({
        updated: true,
        previousHighWaterMark: 5,
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { teamId: 123 },
        data: {
          highWaterMark: 8,
          highWaterMarkPeriodStart: periodStart,
        },
      });
    });

    it("always updates when in a new period", async () => {
      const oldPeriodStart = new Date("2024-01-01");
      const newPeriodStart = new Date("2024-02-01");
      const mockUpdate = vi.fn();

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          team: {
            findUnique: vi.fn().mockResolvedValue({
              isOrganization: false,
              teamBilling: {
                highWaterMark: 10,
                highWaterMarkPeriodStart: oldPeriodStart,
              },
              organizationBilling: null,
            }),
          },
          teamBilling: { update: mockUpdate },
          organizationBilling: { update: vi.fn() },
        };
        return callback(mockTx);
      });

      const result = await repository.updateIfHigher({
        teamId: 123,
        isOrganization: false,
        newSeatCount: 5, // Lower than current HWM, but new period
        periodStart: newPeriodStart,
      });

      expect(result).toEqual({
        updated: true,
        previousHighWaterMark: 10,
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { teamId: 123 },
        data: {
          highWaterMark: 5,
          highWaterMarkPeriodStart: newPeriodStart,
        },
      });
    });

    it("updates organization billing for organizations", async () => {
      const periodStart = new Date("2024-01-01");
      const mockOrgUpdate = vi.fn();

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          team: {
            findUnique: vi.fn().mockResolvedValue({
              isOrganization: true,
              teamBilling: null,
              organizationBilling: {
                highWaterMark: 5,
                highWaterMarkPeriodStart: periodStart,
              },
            }),
          },
          teamBilling: { update: vi.fn() },
          organizationBilling: { update: mockOrgUpdate },
        };
        return callback(mockTx);
      });

      await repository.updateIfHigher({
        teamId: 456,
        isOrganization: true,
        newSeatCount: 10,
        periodStart,
      });

      expect(mockOrgUpdate).toHaveBeenCalledWith({
        where: { teamId: 456 },
        data: {
          highWaterMark: 10,
          highWaterMarkPeriodStart: periodStart,
        },
      });
    });

    it("updates when current HWM is null", async () => {
      const periodStart = new Date("2024-01-01");
      const mockUpdate = vi.fn();

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          team: {
            findUnique: vi.fn().mockResolvedValue({
              isOrganization: false,
              teamBilling: {
                highWaterMark: null,
                highWaterMarkPeriodStart: null,
              },
              organizationBilling: null,
            }),
          },
          teamBilling: { update: mockUpdate },
          organizationBilling: { update: vi.fn() },
        };
        return callback(mockTx);
      });

      const result = await repository.updateIfHigher({
        teamId: 123,
        isOrganization: false,
        newSeatCount: 5,
        periodStart,
      });

      expect(result).toEqual({
        updated: true,
        previousHighWaterMark: null,
      });
    });
  });

  describe("reset", () => {
    it("updates team billing for non-organization", async () => {
      const newPeriodStart = new Date("2024-02-01");

      await repository.reset({
        teamId: 123,
        isOrganization: false,
        currentSeatCount: 5,
        newPeriodStart,
      });

      expect(mockPrisma.teamBilling.update).toHaveBeenCalledWith({
        where: { teamId: 123 },
        data: {
          highWaterMark: 5,
          highWaterMarkPeriodStart: newPeriodStart,
        },
      });
    });

    it("updates organization billing for organization", async () => {
      const newPeriodStart = new Date("2024-02-01");

      await repository.reset({
        teamId: 456,
        isOrganization: true,
        currentSeatCount: 10,
        newPeriodStart,
      });

      expect(mockPrisma.organizationBilling.update).toHaveBeenCalledWith({
        where: { teamId: 456 },
        data: {
          highWaterMark: 10,
          highWaterMarkPeriodStart: newPeriodStart,
        },
      });
    });
  });

  describe("updateQuantityAfterStripeSync", () => {
    it("updates team billing paidSeats for non-organization", async () => {
      await repository.updateQuantityAfterStripeSync({
        teamId: 123,
        isOrganization: false,
        paidSeats: 8,
      });

      expect(mockPrisma.teamBilling.update).toHaveBeenCalledWith({
        where: { teamId: 123 },
        data: { paidSeats: 8 },
      });
    });

    it("updates organization billing paidSeats for organization", async () => {
      await repository.updateQuantityAfterStripeSync({
        teamId: 456,
        isOrganization: true,
        paidSeats: 15,
      });

      expect(mockPrisma.organizationBilling.update).toHaveBeenCalledWith({
        where: { teamId: 456 },
        data: { paidSeats: 15 },
      });
    });
  });
});
