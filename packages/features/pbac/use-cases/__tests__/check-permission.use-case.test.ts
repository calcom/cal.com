import { describe, expect, it, vi, beforeEach } from "vitest";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { MembershipRole } from "@calcom/prisma/enums";

import { PermissionCheckService } from "../../services/permission-check.service";
import { PermissionService } from "../../services/permission.service";
import type { PermissionString } from "../../types/permission-registry";
import { CheckPermissionUseCase } from "../check-permission.use-case";

// Mock the dependencies
vi.mock("@calcom/features/flags/features.repository");
vi.mock("@calcom/lib/server/repository/membership");
vi.mock("../../services/permission-check.service");
vi.mock("../../services/permission.service");

describe("CheckPermissionUseCase", () => {
  let checkPermissionUseCase: CheckPermissionUseCase;
  const mockMembership = {
    id: 1,
    userId: 1,
    teamId: 1,
    role: MembershipRole.MEMBER,
    customRoleId: "custom-role-1",
    accepted: true,
    disableImpersonation: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    checkPermissionUseCase = new CheckPermissionUseCase();
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(PermissionService.prototype.validatePermission).mockReturnValue(true);
    vi.mocked(MembershipRepository.findFirstByUserIdAndTeamId).mockResolvedValue(mockMembership);
    vi.mocked(FeaturesRepository.prototype.checkIfTeamHasFeature).mockResolvedValue(false);
    vi.mocked(PermissionCheckService.prototype.hasPermission).mockResolvedValue(true);
    vi.mocked(PermissionCheckService.prototype.hasPermissions).mockResolvedValue(true);
  });

  describe("check", () => {
    const defaultParams = {
      userId: 1,
      teamId: 1,
      permission: "team.update" as PermissionString,
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    };

    it("should return false if permission format is invalid", async () => {
      vi.mocked(PermissionService.prototype.validatePermission).mockReturnValue(false);

      const result = await checkPermissionUseCase.check(defaultParams);

      expect(result).toBe(false);
      expect(PermissionService.prototype.validatePermission).toHaveBeenCalledWith(defaultParams.permission);
    });

    it("should return false if no membership found", async () => {
      vi.mocked(MembershipRepository.findFirstByUserIdAndTeamId).mockResolvedValue(null);

      const result = await checkPermissionUseCase.check(defaultParams);

      expect(result).toBe(false);
      expect(MembershipRepository.findFirstByUserIdAndTeamId).toHaveBeenCalledWith({
        userId: defaultParams.userId,
        teamId: defaultParams.teamId,
      });
    });

    describe("when PBAC is enabled", () => {
      beforeEach(() => {
        vi.mocked(FeaturesRepository.prototype.checkIfTeamHasFeature).mockResolvedValue(true);
      });

      it("should check permissions using PermissionCheckService when custom role exists", async () => {
        const result = await checkPermissionUseCase.check(defaultParams);

        expect(result).toBe(true);
        expect(PermissionCheckService.prototype.hasPermission).toHaveBeenCalledWith(
          { membershipId: mockMembership.id },
          defaultParams.permission
        );
      });

      it("should return false when no custom role exists", async () => {
        vi.mocked(MembershipRepository.findFirstByUserIdAndTeamId).mockResolvedValue({
          ...mockMembership,
          customRoleId: null,
        });

        const result = await checkPermissionUseCase.check(defaultParams);

        expect(result).toBe(false);
      });
    });

    describe("when PBAC is disabled", () => {
      beforeEach(() => {
        vi.mocked(FeaturesRepository.prototype.checkIfTeamHasFeature).mockResolvedValue(false);
      });

      it("should fall back to role-based check and return true if role matches", async () => {
        vi.mocked(MembershipRepository.findFirstByUserIdAndTeamId).mockResolvedValue({
          ...mockMembership,
          role: MembershipRole.ADMIN,
        });

        const result = await checkPermissionUseCase.check(defaultParams);

        expect(result).toBe(true);
      });

      it("should fall back to role-based check and return false if role doesn't match", async () => {
        vi.mocked(MembershipRepository.findFirstByUserIdAndTeamId).mockResolvedValue({
          ...mockMembership,
          role: MembershipRole.MEMBER,
        });

        const result = await checkPermissionUseCase.check(defaultParams);

        expect(result).toBe(false);
      });
    });
  });

  describe("checkAll", () => {
    const defaultParams = {
      userId: 1,
      teamId: 1,
      permissions: ["team.update", "team.delete"] as PermissionString[],
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    };

    it("should return false if permissions format is invalid", async () => {
      vi.mocked(PermissionService.prototype.validatePermissions).mockReturnValue(false);

      const result = await checkPermissionUseCase.checkAll(defaultParams);

      expect(result).toBe(false);
      expect(PermissionService.prototype.validatePermissions).toHaveBeenCalledWith(defaultParams.permissions);
    });

    describe("when PBAC is enabled", () => {
      beforeEach(() => {
        vi.mocked(FeaturesRepository.prototype.checkIfTeamHasFeature).mockResolvedValue(true);
      });

      it("should check all permissions using PermissionCheckService when custom role exists", async () => {
        const result = await checkPermissionUseCase.checkAll(defaultParams);

        expect(result).toBe(true);
        expect(PermissionCheckService.prototype.hasPermissions).toHaveBeenCalledWith(
          { membershipId: mockMembership.id },
          defaultParams.permissions
        );
      });

      it("should return false when custom role check fails", async () => {
        vi.mocked(PermissionCheckService.prototype.hasPermissions).mockResolvedValue(false);

        const result = await checkPermissionUseCase.checkAll(defaultParams);

        expect(result).toBe(false);
      });
    });

    describe("when PBAC is disabled", () => {
      beforeEach(() => {
        vi.mocked(FeaturesRepository.prototype.checkIfTeamHasFeature).mockResolvedValue(false);
      });

      it("should fall back to role-based check for all permissions", async () => {
        vi.mocked(MembershipRepository.findFirstByUserIdAndTeamId).mockResolvedValue({
          ...mockMembership,
          role: MembershipRole.ADMIN,
        });

        const result = await checkPermissionUseCase.checkAll(defaultParams);

        expect(result).toBe(true);
      });
    });
  });
});
