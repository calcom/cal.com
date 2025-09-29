import prismaMock from "../../../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { Plan, SubscriptionStatus } from "./IBillingRepository";
import { PrismaOrganizationBillingRepository } from "./PrismaOrganizationBillingRepository";

describe("PrismaOrganizationBillingRepository", () => {
  let repository: PrismaOrganizationBillingRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaOrganizationBillingRepository(prismaMock);
  });

  describe("create", () => {
    it("should create an organization billing record with correct data structure", async () => {
      const mockBillingData = {
        teamId: 123,
        subscriptionId: "sub_org_123",
        subscriptionItemId: "si_org_123",
        customerId: "cus_org_123",
        planName: Plan.ORGANIZATION,
        status: SubscriptionStatus.ACTIVE,
      };

      const mockCreatedRecord = {
        id: "org_billing_123",
        ...mockBillingData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.organizationBilling.create.mockResolvedValue(mockCreatedRecord);

      const result = await repository.create(mockBillingData);

      expect(prismaMock.organizationBilling.create).toHaveBeenCalledWith({
        data: mockBillingData,
      });

      expect(result).toEqual({
        id: "org_billing_123",
        teamId: 123,
        subscriptionId: "sub_org_123",
        subscriptionItemId: "si_org_123",
        customerId: "cus_org_123",
        planName: Plan.ORGANIZATION,
        status: SubscriptionStatus.ACTIVE,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it("should write to organizationBilling table instead of teamBilling", async () => {
      const mockBillingData = {
        teamId: 456,
        subscriptionId: "sub_org_456",
        subscriptionItemId: "si_org_456",
        customerId: "cus_org_456",
        planName: Plan.ORGANIZATION,
        status: SubscriptionStatus.ACTIVE,
      };

      const mockCreatedRecord = {
        id: "org_billing_456",
        ...mockBillingData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.organizationBilling.create.mockResolvedValue(mockCreatedRecord);

      await repository.create(mockBillingData);

      expect(prismaMock.organizationBilling.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.teamBilling.create).not.toHaveBeenCalled();
    });

    it("should correctly cast planName to Plan enum", async () => {
      const mockBillingData = {
        teamId: 789,
        subscriptionId: "sub_org_789",
        subscriptionItemId: "si_org_789",
        customerId: "cus_org_789",
        planName: Plan.ENTERPRISE,
        status: SubscriptionStatus.ACTIVE,
      };

      const mockCreatedRecord = {
        id: "org_billing_789",
        ...mockBillingData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.organizationBilling.create.mockResolvedValue(mockCreatedRecord);

      const result = await repository.create(mockBillingData);

      expect(result.planName).toBe(Plan.ENTERPRISE);
      expect(typeof result.planName).toBe("string");
    });

    it("should correctly cast status to SubscriptionStatus enum", async () => {
      const mockBillingData = {
        teamId: 999,
        subscriptionId: "sub_org_999",
        subscriptionItemId: "si_org_999",
        customerId: "cus_org_999",
        planName: Plan.ORGANIZATION,
        status: SubscriptionStatus.CANCELLED,
      };

      const mockCreatedRecord = {
        id: "org_billing_999",
        ...mockBillingData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.organizationBilling.create.mockResolvedValue(mockCreatedRecord);

      const result = await repository.create(mockBillingData);

      expect(result.status).toBe(SubscriptionStatus.CANCELLED);
      expect(typeof result.status).toBe("string");
    });

    it("should propagate Prisma errors", async () => {
      const mockBillingData = {
        teamId: 111,
        subscriptionId: "sub_org_111",
        subscriptionItemId: "si_org_111",
        customerId: "cus_org_111",
        planName: Plan.ORGANIZATION,
        status: SubscriptionStatus.ACTIVE,
      };

      const prismaError = new Error("Unique constraint violation on subscriptionId");
      prismaMock.organizationBilling.create.mockRejectedValue(prismaError);

      await expect(repository.create(mockBillingData)).rejects.toThrow(
        "Unique constraint violation on subscriptionId"
      );
    });

    it("should implement IBillingRepository interface consistently with team repository", async () => {
      const mockBillingData = {
        teamId: 222,
        subscriptionId: "sub_org_222",
        subscriptionItemId: "si_org_222",
        customerId: "cus_org_222",
        planName: Plan.ORGANIZATION,
        status: SubscriptionStatus.ACTIVE,
      };

      const mockCreatedRecord = {
        id: "org_billing_222",
        ...mockBillingData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.organizationBilling.create.mockResolvedValue(mockCreatedRecord);

      const result = await repository.create(mockBillingData);

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("teamId");
      expect(result).toHaveProperty("subscriptionId");
      expect(result).toHaveProperty("subscriptionItemId");
      expect(result).toHaveProperty("customerId");
      expect(result).toHaveProperty("planName");
      expect(result).toHaveProperty("status");
    });
  });
});
