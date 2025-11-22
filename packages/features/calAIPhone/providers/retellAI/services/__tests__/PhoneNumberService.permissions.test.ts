import { describe, it, expect, vi, beforeEach } from "vitest";

import { MembershipRole, PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import { PhoneNumberService } from "../PhoneNumberService";
import {
  setupBasicMocks,
  createMockDatabaseAgent,
  createMockPhoneNumberRecord,
  createMockPhoneNumber,
} from "./test-utils";

/**
 * Permission tests for PhoneNumberService
 * 
 * These tests verify that:
 * 1. Team-scoped operations properly use permissionCheckService
 * 2. User-scoped operations properly check userId ownership
 * 3. Users cannot act on resources outside their scope
 * 4. Proper dependency injection is used throughout
 */

const buildService = () => {
  const mocks = setupBasicMocks();
  const service = new PhoneNumberService({
    retellRepository: mocks.mockRetellRepository,
    agentRepository: mocks.mockAgentRepository,
    phoneNumberRepository: mocks.mockPhoneNumberRepository,
    transactionManager: mocks.mockTransactionManager,
    permissionService: mocks.mockPermissionService,
  });
  return { service, mocks };
};

describe("PhoneNumberService - Permission Checks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("importPhoneNumber - Team-scoped permissions", () => {
    it("should deny when permissionCheckService returns false", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockPermissionService.checkPermissions).mockResolvedValue(false);
      
      vi.mocked(mocks.mockAgentRepository.findByIdWithUserAccess).mockResolvedValue(
        createMockDatabaseAgent({ id: "db-agent-123", teamId: 42 })
      );

      await expect(
        service.importPhoneNumber({
          userId: 1,
          teamId: 42,
          agentId: "db-agent-123",
          phone_number: "+1234567890",
          termination_uri: "sip:term@example.com",
          sip_trunk_auth_username: "username",
          sip_trunk_auth_password: "password",
          nickname: "Test Phone",
        })
      ).rejects.toThrow("Insufficient permission to import phone numbers for team 42.");

      expect(mocks.mockPermissionService.checkPermissions).toHaveBeenCalledWith({
        userId: 1,
        teamId: 42,
        permissions: ["phoneNumber.create"],
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      expect(mocks.mockRetellRepository.importPhoneNumber).not.toHaveBeenCalled();
    });

    it("should allow when permissionCheckService returns true", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockPermissionService.checkPermissions).mockResolvedValue(true);
      
      vi.mocked(mocks.mockAgentRepository.findByIdWithUserAccess).mockResolvedValue(
        createMockDatabaseAgent({ id: "db-agent-123", providerAgentId: "agent-123", teamId: 42 })
      );

      vi.mocked(mocks.mockRetellRepository.importPhoneNumber).mockResolvedValue(
        createMockPhoneNumber({ phone_number: "+1234567890" })
      );

      const result = await service.importPhoneNumber({
        userId: 1,
        teamId: 42,
        agentId: "db-agent-123",
        phone_number: "+1234567890",
        termination_uri: "sip:term@example.com",
        sip_trunk_auth_username: "username",
        sip_trunk_auth_password: "password",
        nickname: "Test Phone",
      });

      expect(mocks.mockPermissionService.checkPermissions).toHaveBeenCalledWith({
        userId: 1,
        teamId: 42,
        permissions: ["phoneNumber.create"],
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      expect(mocks.mockRetellRepository.importPhoneNumber).toHaveBeenCalled();
      expect(result.phone_number).toBe("+1234567890");
    });
  });

  describe("deletePhoneNumber - Team-scoped permissions", () => {
    it("should deny when permissionCheckService returns false", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockPermissionService.checkPermissions).mockResolvedValue(false);

      await expect(
        service.deletePhoneNumber({
          phoneNumber: "+1234567890",
          userId: 1,
          teamId: 42,
          deleteFromDB: false,
        })
      ).rejects.toThrow("Insufficient permission to delete phone numbers for team 42.");

      expect(mocks.mockPermissionService.checkPermissions).toHaveBeenCalledWith({
        userId: 1,
        teamId: 42,
        permissions: ["phoneNumber.delete"],
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      expect(mocks.mockPhoneNumberRepository.findByPhoneNumber).not.toHaveBeenCalled();
      expect(mocks.mockRetellRepository.deletePhoneNumber).not.toHaveBeenCalled();
    });

    it("should allow when permissionCheckService returns true", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockPermissionService.checkPermissions).mockResolvedValue(true);
      
      vi.mocked(mocks.mockPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(
        createMockPhoneNumberRecord({
          phoneNumber: "+1234567890",
          userId: 1,
          teamId: 42,
          subscriptionStatus: PhoneNumberSubscriptionStatus.PENDING,
        })
      );

      await service.deletePhoneNumber({
        phoneNumber: "+1234567890",
        userId: 1,
        teamId: 42,
        deleteFromDB: false,
      });

      expect(mocks.mockPermissionService.checkPermissions).toHaveBeenCalledWith({
        userId: 1,
        teamId: 42,
        permissions: ["phoneNumber.delete"],
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      expect(mocks.mockRetellRepository.updatePhoneNumber).toHaveBeenCalled();
      expect(mocks.mockRetellRepository.deletePhoneNumber).toHaveBeenCalledWith("+1234567890");
    });
  });

  describe("deletePhoneNumber - User-scoped permissions (no teamId)", () => {
    it("should allow when phone number is owned by user", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(
        createMockPhoneNumberRecord({
          phoneNumber: "+1234567890",
          userId: 1,
          teamId: null,
          subscriptionStatus: PhoneNumberSubscriptionStatus.PENDING,
        })
      );

      await service.deletePhoneNumber({
        phoneNumber: "+1234567890",
        userId: 1,
        deleteFromDB: false,
      });

      expect(mocks.mockPermissionService.checkPermissions).not.toHaveBeenCalled();

      expect(mocks.mockRetellRepository.deletePhoneNumber).toHaveBeenCalledWith("+1234567890");
    });

    it("should deny when phone number is not owned by user", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(
        createMockPhoneNumberRecord({
          phoneNumber: "+1234567890",
          userId: 999,
          teamId: null,
          subscriptionStatus: PhoneNumberSubscriptionStatus.PENDING,
        })
      );

      await expect(
        service.deletePhoneNumber({
          phoneNumber: "+1234567890",
          userId: 1,
          deleteFromDB: false,
        })
      ).rejects.toThrow("Insufficient permission to delete phone number +1234567890.");

      expect(mocks.mockPermissionService.checkPermissions).not.toHaveBeenCalled();

      expect(mocks.mockRetellRepository.deletePhoneNumber).not.toHaveBeenCalled();
    });
  });

  describe("deletePhoneNumber - Team phone number ownership", () => {
    it("should deny when phone number does not belong to the team", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockPermissionService.checkPermissions).mockResolvedValue(true);
      
      vi.mocked(mocks.mockPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(
        createMockPhoneNumberRecord({
          phoneNumber: "+1234567890",
          userId: 1,
          teamId: 999,
          subscriptionStatus: PhoneNumberSubscriptionStatus.PENDING,
        })
      );

      await expect(
        service.deletePhoneNumber({
          phoneNumber: "+1234567890",
          userId: 1,
          teamId: 42,
          deleteFromDB: false,
        })
      ).rejects.toThrow("Insufficient permission to delete phone number +1234567890.");

      expect(mocks.mockPermissionService.checkPermissions).toHaveBeenCalledWith({
        userId: 1,
        teamId: 42,
        permissions: ["phoneNumber.delete"],
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      expect(mocks.mockPhoneNumberRepository.findByPhoneNumber).toHaveBeenCalledWith("+1234567890");

      expect(mocks.mockRetellRepository.deletePhoneNumber).not.toHaveBeenCalled();
    });

    it("should allow when phone number belongs to the team", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockPermissionService.checkPermissions).mockResolvedValue(true);
      
      vi.mocked(mocks.mockPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(
        createMockPhoneNumberRecord({
          phoneNumber: "+1234567890",
          userId: 1,
          teamId: 42,
          subscriptionStatus: PhoneNumberSubscriptionStatus.PENDING,
        })
      );

      await service.deletePhoneNumber({
        phoneNumber: "+1234567890",
        userId: 1,
        teamId: 42,
        deleteFromDB: false,
      });

      expect(mocks.mockPermissionService.checkPermissions).toHaveBeenCalledWith({
        userId: 1,
        teamId: 42,
        permissions: ["phoneNumber.delete"],
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      expect(mocks.mockPhoneNumberRepository.findByPhoneNumber).toHaveBeenCalledWith("+1234567890");

      expect(mocks.mockRetellRepository.deletePhoneNumber).toHaveBeenCalledWith("+1234567890");
    });
  });

  describe("updatePhoneNumberWithAgents - Team-scoped permissions", () => {
    it("should deny when permissionCheckService returns false", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockPermissionService.checkPermissions).mockResolvedValue(false);

      await expect(
        service.updatePhoneNumberWithAgents({
          phoneNumber: "+1234567890",
          userId: 1,
          teamId: 42,
          inboundAgentId: "inbound-agent-123",
        })
      ).rejects.toThrow("Insufficient permission to update phone numbers for team 42.");

      expect(mocks.mockPermissionService.checkPermissions).toHaveBeenCalledWith({
        userId: 1,
        teamId: 42,
        permissions: ["phoneNumber.update"],
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      expect(mocks.mockPhoneNumberRepository.findByPhoneNumber).not.toHaveBeenCalled();
      expect(mocks.mockPhoneNumberRepository.updateAgents).not.toHaveBeenCalled();
    });

    it("should allow when permissionCheckService returns true", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockPermissionService.checkPermissions).mockResolvedValue(true);
      
      vi.mocked(mocks.mockPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(
        createMockPhoneNumberRecord({
          id: 1,
          phoneNumber: "+1234567890",
          userId: 1,
          teamId: 42,
        })
      );

      vi.mocked(mocks.mockAgentRepository.findByProviderAgentIdWithUserAccess).mockResolvedValue(
        createMockDatabaseAgent({
          providerAgentId: "inbound-agent-123",
          teamId: 42,
        })
      );

      vi.mocked(mocks.mockRetellRepository.getPhoneNumber).mockResolvedValue(
        createMockPhoneNumber({ phone_number: "+1234567890" })
      );

      await service.updatePhoneNumberWithAgents({
        phoneNumber: "+1234567890",
        userId: 1,
        teamId: 42,
        inboundAgentId: "inbound-agent-123",
      });

      expect(mocks.mockPermissionService.checkPermissions).toHaveBeenCalledWith({
        userId: 1,
        teamId: 42,
        permissions: ["phoneNumber.update"],
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      expect(mocks.mockPhoneNumberRepository.updateAgents).toHaveBeenCalledWith({
        id: 1,
        inboundProviderAgentId: "inbound-agent-123",
        outboundProviderAgentId: undefined,
      });
    });

    it("should deny when agent belongs to a different team", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockPermissionService.checkPermissions).mockResolvedValue(true);
      
      vi.mocked(mocks.mockPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(
        createMockPhoneNumberRecord({
          id: 1,
          phoneNumber: "+1234567890",
          userId: 1,
          teamId: 42,
        })
      );

      vi.mocked(mocks.mockAgentRepository.findByProviderAgentIdWithUserAccess).mockResolvedValue(
        createMockDatabaseAgent({
          providerAgentId: "inbound-agent-123",
          teamId: 999,
        })
      );

      await expect(
        service.updatePhoneNumberWithAgents({
          phoneNumber: "+1234567890",
          userId: 1,
          teamId: 42,
          inboundAgentId: "inbound-agent-123",
        })
      ).rejects.toThrow("Selected inbound agent does not belong to the specified team.");

      expect(mocks.mockRetellRepository.updatePhoneNumber).not.toHaveBeenCalled();
      expect(mocks.mockPhoneNumberRepository.updateAgents).not.toHaveBeenCalled();
    });
  });

  describe("updatePhoneNumberWithAgents - User-scoped permissions (no teamId)", () => {
    it("should allow when phone number is owned by user", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(
        createMockPhoneNumberRecord({
          id: 1,
          phoneNumber: "+1234567890",
          userId: 1,
          teamId: null,
        })
      );

      vi.mocked(mocks.mockAgentRepository.findByProviderAgentIdWithUserAccess).mockResolvedValue(
        createMockDatabaseAgent({
          providerAgentId: "inbound-agent-123",
          userId: 1,
          teamId: null,
        })
      );

      vi.mocked(mocks.mockRetellRepository.getPhoneNumber).mockResolvedValue(
        createMockPhoneNumber({ phone_number: "+1234567890" })
      );

      await service.updatePhoneNumberWithAgents({
        phoneNumber: "+1234567890",
        userId: 1,
        inboundAgentId: "inbound-agent-123",
      });

      expect(mocks.mockPermissionService.checkPermissions).not.toHaveBeenCalled();

      expect(mocks.mockPhoneNumberRepository.updateAgents).toHaveBeenCalledWith({
        id: 1,
        inboundProviderAgentId: "inbound-agent-123",
        outboundProviderAgentId: undefined,
      });
    });

    it("should deny when phone number is not owned by user", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(
        createMockPhoneNumberRecord({
          id: 1,
          phoneNumber: "+1234567890",
          userId: 999,
          teamId: null,
        })
      );

      await expect(
        service.updatePhoneNumberWithAgents({
          phoneNumber: "+1234567890",
          userId: 1,
          inboundAgentId: "inbound-agent-123",
        })
      ).rejects.toThrow("Insufficient permission to update phone number +1234567890.");

      expect(mocks.mockPermissionService.checkPermissions).not.toHaveBeenCalled();

      expect(mocks.mockPhoneNumberRepository.updateAgents).not.toHaveBeenCalled();
    });
  });

  describe("updatePhoneNumberWithAgents - Team phone number ownership", () => {
    it("should deny when phone number does not belong to the team", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockPermissionService.checkPermissions).mockResolvedValue(true);
      
      vi.mocked(mocks.mockPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(
        createMockPhoneNumberRecord({
          id: 1,
          phoneNumber: "+1234567890",
          userId: 1,
          teamId: 999,
        })
      );

      await expect(
        service.updatePhoneNumberWithAgents({
          phoneNumber: "+1234567890",
          userId: 1,
          teamId: 42,
          inboundAgentId: "inbound-agent-123",
        })
      ).rejects.toThrow("Insufficient permission to update phone number +1234567890.");

      expect(mocks.mockPermissionService.checkPermissions).toHaveBeenCalledWith({
        userId: 1,
        teamId: 42,
        permissions: ["phoneNumber.update"],
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      expect(mocks.mockPhoneNumberRepository.findByPhoneNumber).toHaveBeenCalledWith("+1234567890");

      expect(mocks.mockPhoneNumberRepository.updateAgents).not.toHaveBeenCalled();
    });

    it("should allow when phone number belongs to the team", async () => {
      const { service, mocks } = buildService();
      
      vi.mocked(mocks.mockPermissionService.checkPermissions).mockResolvedValue(true);
      
      vi.mocked(mocks.mockPhoneNumberRepository.findByPhoneNumber).mockResolvedValue(
        createMockPhoneNumberRecord({
          id: 1,
          phoneNumber: "+1234567890",
          userId: 1,
          teamId: 42,
        })
      );

      vi.mocked(mocks.mockAgentRepository.findByProviderAgentIdWithUserAccess).mockResolvedValue(
        createMockDatabaseAgent({
          providerAgentId: "inbound-agent-123",
          teamId: 42,
        })
      );

      vi.mocked(mocks.mockRetellRepository.getPhoneNumber).mockResolvedValue(
        createMockPhoneNumber({ phone_number: "+1234567890" })
      );

      await service.updatePhoneNumberWithAgents({
        phoneNumber: "+1234567890",
        userId: 1,
        teamId: 42,
        inboundAgentId: "inbound-agent-123",
      });

      expect(mocks.mockPermissionService.checkPermissions).toHaveBeenCalledWith({
        userId: 1,
        teamId: 42,
        permissions: ["phoneNumber.update"],
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      expect(mocks.mockPhoneNumberRepository.findByPhoneNumber).toHaveBeenCalledWith("+1234567890");

      expect(mocks.mockPhoneNumberRepository.updateAgents).toHaveBeenCalledWith({
        id: 1,
        inboundProviderAgentId: "inbound-agent-123",
        outboundProviderAgentId: undefined,
      });
    });
  });
});
