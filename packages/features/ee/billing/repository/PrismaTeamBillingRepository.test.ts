import prismaMock from "../../../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { Plan, SubscriptionStatus } from "./IBillingRepository";
import { PrismaTeamBillingRepository } from "./PrismaTeamBillingRepository";

describe("PrismaTeamBillingRepository", () => {
  let repository: PrismaTeamBillingRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaTeamBillingRepository(prismaMock);
  });

  describe("create", () => {
    it("should create a team billing record with correct data structure", async () => {
      const mockBillingData = {
        teamId: 123,
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
        customerId: "cus_123",
        planName: Plan.TEAM,
        status: SubscriptionStatus.ACTIVE,
      };

      const mockCreatedRecord = {
        id: "billing_123",
        ...mockBillingData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.teamBilling.create.mockResolvedValue(mockCreatedRecord);

      const result = await repository.create(mockBillingData);

      expect(prismaMock.teamBilling.create).toHaveBeenCalledWith({
        data: mockBillingData,
      });

      expect(result).toEqual({
        id: "billing_123",
        teamId: 123,
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
        customerId: "cus_123",
        planName: Plan.TEAM,
        status: SubscriptionStatus.ACTIVE,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it("should correctly cast planName to Plan enum", async () => {
      const mockBillingData = {
        teamId: 456,
        subscriptionId: "sub_456",
        subscriptionItemId: "si_456",
        customerId: "cus_456",
        planName: Plan.ENTERPRISE,
        status: SubscriptionStatus.ACTIVE,
      };

      const mockCreatedRecord = {
        id: "billing_456",
        ...mockBillingData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.teamBilling.create.mockResolvedValue(mockCreatedRecord);

      const result = await repository.create(mockBillingData);

      expect(result.planName).toBe(Plan.ENTERPRISE);
      expect(typeof result.planName).toBe("string");
    });

    it("should correctly cast status to SubscriptionStatus enum", async () => {
      const mockBillingData = {
        teamId: 789,
        subscriptionId: "sub_789",
        subscriptionItemId: "si_789",
        customerId: "cus_789",
        planName: Plan.TEAM,
        status: SubscriptionStatus.TRIALING,
      };

      const mockCreatedRecord = {
        id: "billing_789",
        ...mockBillingData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.teamBilling.create.mockResolvedValue(mockCreatedRecord);

      const result = await repository.create(mockBillingData);

      expect(result.status).toBe(SubscriptionStatus.TRIALING);
      expect(typeof result.status).toBe("string");
    });

    it("should propagate Prisma errors", async () => {
      const mockBillingData = {
        teamId: 999,
        subscriptionId: "sub_999",
        subscriptionItemId: "si_999",
        customerId: "cus_999",
        planName: Plan.TEAM,
        status: SubscriptionStatus.ACTIVE,
      };

      const prismaError = new Error("Unique constraint violation");
      prismaMock.teamBilling.create.mockRejectedValue(prismaError);

      await expect(repository.create(mockBillingData)).rejects.toThrow("Unique constraint violation");
    });

    it("should spread args correctly when creating record", async () => {
      const mockBillingData = {
        teamId: 111,
        subscriptionId: "sub_111",
        subscriptionItemId: "si_111",
        customerId: "cus_111",
        planName: Plan.ORGANIZATION,
        status: SubscriptionStatus.PAST_DUE,
      };

      const mockCreatedRecord = {
        id: "billing_111",
        ...mockBillingData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.teamBilling.create.mockResolvedValue(mockCreatedRecord);

      await repository.create(mockBillingData);

      expect(prismaMock.teamBilling.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teamId: 111,
          subscriptionId: "sub_111",
          subscriptionItemId: "si_111",
          customerId: "cus_111",
          planName: Plan.ORGANIZATION,
          status: SubscriptionStatus.PAST_DUE,
        }),
      });
    });
  });
});
