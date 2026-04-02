import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { MembershipRole } from "@calcom/prisma/enums";
import type { NextApiRequest } from "next";
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BillingPortalServiceFactory,
  OrganizationBillingPortalService,
  TeamBillingPortalService,
  UserBillingPortalService,
} from "../../lib/BillingPortalService";
import * as customerModule from "../../lib/customer";
import { buildReturnUrl, validateAuthentication } from "../portal";

// Mock dependencies
vi.mock("@calcom/features/pbac/services/permission-check.service");
vi.mock("@calcom/features/ee/teams/repositories/TeamRepository");
vi.mock("../../lib/customer");
vi.mock("../../lib/server");
vi.mock("../../lib/subscriptions");
vi.mock("@calcom/prisma", () => ({
  default: {},
}));

const mockPermissionService = vi.mocked(PermissionCheckService);
const mockTeamRepository = vi.mocked(TeamRepository);
const mockCustomerModule = vi.mocked(customerModule);

interface RequestWithSession extends NextApiRequest {
  session?: Session | null;
}

interface MockPermissionService {
  checkPermission: ReturnType<typeof vi.fn>;
}

interface MockTeamRepository {
  findById: ReturnType<typeof vi.fn>;
}

describe("Portal API - Service-Based Architecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateAuthentication", () => {
    it("should return user when session exists", () => {
      const req = {
        session: {
          user: { id: 123 },
          hasValidLicense: true,
          upId: "test-upid",
          expires: "2024-12-31T23:59:59.999Z",
        } as Session,
      } as RequestWithSession;

      const result = validateAuthentication(req as NextApiRequest);

      expect(result).toEqual({ id: 123 });
    });

    it("should return null when session is missing", () => {
      const req = {} as NextApiRequest;

      const result = validateAuthentication(req);

      expect(result).toBeNull();
    });

    it("should return null when user id is missing", () => {
      const req = {
        session: {
          user: {} as any,
          hasValidLicense: true,
          upId: "test-upid",
          expires: "2024-12-31T23:59:59.999Z",
        } as Session,
      } as RequestWithSession;

      const result = validateAuthentication(req as NextApiRequest);

      expect(result).toBeNull();
    });
  });

  describe("buildReturnUrl", () => {
    it("should return default URL when returnTo is not provided", () => {
      const result = buildReturnUrl();

      expect(result).toBe(`${WEBAPP_URL}/settings/billing`);
    });

    it("should return default URL when returnTo is not a string", () => {
      const result = buildReturnUrl(123 as unknown as string);

      expect(result).toBe(`${WEBAPP_URL}/settings/billing`);
    });

    it("should return safe redirect URL when valid returnTo is provided", () => {
      const returnTo = `${WEBAPP_URL}/settings/teams`;

      const result = buildReturnUrl(returnTo);

      expect(result).toBe(`${WEBAPP_URL}/settings/teams`);
    });

    it("should return WEBAPP_URL root when unsafe redirect URL is provided", () => {
      const returnTo = "http://malicious-site.com";

      const result = buildReturnUrl(returnTo);

      expect(result).toBe(`${WEBAPP_URL}/`);
    });
  });

  describe("BillingPortalServiceFactory", () => {
    let mockTeamRepo: MockTeamRepository;

    beforeEach(() => {
      mockTeamRepo = {
        findById: vi.fn(),
      };
      mockTeamRepository.mockImplementation(function () {
        return mockTeamRepo as unknown as TeamRepository;
      });
    });

    it("should create OrganizationBillingPortalService for organizations", async () => {
      const mockTeam = { id: 1, isOrganization: true, metadata: {} };
      mockTeamRepo.findById.mockResolvedValue(mockTeam);

      const service = await BillingPortalServiceFactory.createService(1);

      expect(service).toBeInstanceOf(OrganizationBillingPortalService);
    });

    it("should create TeamBillingPortalService for regular teams", async () => {
      const mockTeam = { id: 1, isOrganization: false, metadata: {} };
      mockTeamRepo.findById.mockResolvedValue(mockTeam);

      const service = await BillingPortalServiceFactory.createService(1);

      expect(service).toBeInstanceOf(TeamBillingPortalService);
    });

    it("should throw error when team not found", async () => {
      mockTeamRepo.findById.mockResolvedValue(null);

      await expect(BillingPortalServiceFactory.createService(1)).rejects.toThrow("Team not found");
    });

    it("should create UserBillingPortalService", () => {
      const service = BillingPortalServiceFactory.createUserService();

      expect(service).toBeInstanceOf(UserBillingPortalService);
    });
  });

  describe("TeamBillingPortalService", () => {
    let service: TeamBillingPortalService;
    let mockPermissionServiceInstance: MockPermissionService;

    beforeEach(() => {
      mockPermissionServiceInstance = {
        checkPermission: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(PermissionCheckService).mockImplementation(function () {
        return mockPermissionServiceInstance as unknown as PermissionCheckService;
      });

      const mockTeamRepo: MockTeamRepository = {
        findById: vi.fn(),
      };
      mockTeamRepository.mockImplementation(function () {
        return mockTeamRepo as unknown as TeamRepository;
      });

      service = new TeamBillingPortalService();
    });

    it("should check team.manageBilling permission", async () => {
      const result = await service.checkPermissions(123, 456);

      expect(mockPermissionServiceInstance.checkPermission).toHaveBeenCalledWith({
        userId: 123,
        teamId: 456,
        permission: "team.manageBilling",
        fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      });
      expect(result).toBe(true);
    });
  });

  describe("OrganizationBillingPortalService", () => {
    let service: OrganizationBillingPortalService;
    let mockPermissionServiceInstance: MockPermissionService;

    beforeEach(() => {
      mockPermissionServiceInstance = {
        checkPermission: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(PermissionCheckService).mockImplementation(function () {
        return mockPermissionServiceInstance as unknown as PermissionCheckService;
      });

      service = new OrganizationBillingPortalService();
    });

    it("should check organization.manageBilling permission", async () => {
      const result = await service.checkPermissions(123, 456);

      expect(mockPermissionServiceInstance.checkPermission).toHaveBeenCalledWith({
        userId: 123,
        teamId: 456,
        permission: "organization.manageBilling",
        fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      });
      expect(result).toBe(true);
    });
  });

  describe("UserBillingPortalService", () => {
    let service: UserBillingPortalService;

    beforeEach(() => {
      service = new UserBillingPortalService();
      mockCustomerModule.getStripeCustomerIdFromUserId = vi.fn();
    });

    it("should get customer ID for user", async () => {
      mockCustomerModule.getStripeCustomerIdFromUserId.mockResolvedValue("cus_123");

      const result = await service.getCustomerId(123);

      expect(result).toBe("cus_123");
      expect(mockCustomerModule.getStripeCustomerIdFromUserId).toHaveBeenCalledWith(123);
    });
  });
});
