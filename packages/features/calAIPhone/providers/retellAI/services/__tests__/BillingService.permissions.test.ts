import { describe, it, expect, vi, beforeEach } from "vitest";

import { MembershipRole, PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import { BillingService } from "../BillingService";
import { setupBasicMocks, createMockPhoneNumberRecord } from "./test-utils";

/**
 * Permission tests for BillingService
 * 
 * These tests verify that:
 * 1. Team-scoped operations properly use permissionCheckService
 * 2. User-scoped operations properly check userId ownership
 * 3. Users cannot act on resources outside their scope
 * 4. Proper dependency injection is used throughout
 * 
 * Note: These tests focus on permission check logic only.
 * Full integration tests with Stripe mocking are in BillingService.test.ts
 */

const buildService = () => {
  const mocks = setupBasicMocks();
  const service = new BillingService({
    phoneNumberRepository: mocks.mockPhoneNumberRepository,
    retellRepository: mocks.mockRetellRepository,
    permissionService: mocks.mockPermissionService,
  });
  return { service, mocks };
};

describe("BillingService - Permission Checks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("generatePhoneNumberCheckoutSession - Team-scoped permissions", () => {
    it("should deny when permissionCheckService returns false", async () => {
      const { service, mocks } = buildService();
      
            vi.mocked(mocks.mockPermissionService.checkPermission).mockResolvedValue(false);

            await expect(
              service.generatePhoneNumberCheckoutSession({
                userId: 1,
                teamId: 42,
                agentId: "agent-123",
                workflowId: "workflow-123",
              })
            ).rejects.toThrow("Insufficient permission to create phone numbers for team 42.");

      expect(mocks.mockPermissionService.checkPermission).toHaveBeenCalledWith({
        userId: 1,
        teamId: 42,
        permission: "phoneNumber.create",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MEMBER],
      });
    });
  });

  describe("cancelPhoneNumberSubscription - Team-scoped permissions", () => {
    it("should deny when permissionCheckService returns false", async () => {
      const { service, mocks } = buildService();
      
            vi.mocked(mocks.mockPermissionService.checkPermission).mockResolvedValue(false);

            await expect(
              service.cancelPhoneNumberSubscription({
                phoneNumberId: 1,
                userId: 1,
                teamId: 42,
              })
            ).rejects.toThrow("Insufficient permission to delete phone numbers for team 42.");

      expect(mocks.mockPermissionService.checkPermission).toHaveBeenCalledWith({
        userId: 1,
        teamId: 42,
        permission: "phoneNumber.delete",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MEMBER],
      });

      expect(mocks.mockPhoneNumberRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe("cancelPhoneNumberSubscription - User-scoped permissions (no teamId)", () => {
    it("should deny when phone number is not owned by user", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockPhoneNumberRepository.findById).mockResolvedValue(
        createMockPhoneNumberRecord({
          id: 1,
          phoneNumber: "+1234567890",
          userId: 999,
          teamId: null,
          stripeSubscriptionId: "sub_123",
          subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
        })
      );

      await expect(
        service.cancelPhoneNumberSubscription({
          phoneNumberId: 1,
          userId: 1,
        })
      ).rejects.toThrow("Insufficient permission to delete phone number +1234567890.");

      expect(mocks.mockPermissionService.checkPermission).not.toHaveBeenCalled();

      expect(mocks.mockPhoneNumberRepository.updateSubscriptionStatus).not.toHaveBeenCalled();
    });
  });

  describe("cancelPhoneNumberSubscription - Team phone number ownership", () => {
    it("should deny when phone number does not belong to the team", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockPermissionService.checkPermission).mockResolvedValue(true);

      vi.mocked(mocks.mockPhoneNumberRepository.findById).mockResolvedValue(
        createMockPhoneNumberRecord({
          id: 1,
          phoneNumber: "+1234567890",
          userId: 1,
          teamId: 999,
          stripeSubscriptionId: "sub_123",
          subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
        })
      );

      await expect(
        service.cancelPhoneNumberSubscription({
          phoneNumberId: 1,
          userId: 1,
          teamId: 42,
        })
      ).rejects.toThrow("Insufficient permission to delete phone number +1234567890.");

      expect(mocks.mockPermissionService.checkPermission).toHaveBeenCalledWith({
        userId: 1,
        teamId: 42,
        permission: "phoneNumber.delete",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MEMBER],
      });

      expect(mocks.mockPhoneNumberRepository.findById).toHaveBeenCalledWith(1);

      expect(mocks.mockPhoneNumberRepository.updateSubscriptionStatus).not.toHaveBeenCalled();
    });
  });
});
