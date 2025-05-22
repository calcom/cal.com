import { PermissionCheckService } from "pbac/services/permission-check.service";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import type { MembershipRole } from "@calcom/prisma/enums";

import { PermissionService } from "../services/permission.service";
import type { PermissionString } from "../types/permission-registry";

interface CheckPermissionInput {
  userId: number;
  teamId: number;
  permission: PermissionString;
  fallbackRoles: MembershipRole[];
}

interface CheckPermissionsInput {
  userId: number;
  teamId: number;
  permissions: PermissionString[];
  fallbackRoles: MembershipRole[];
}

export class CheckPermissionUseCase {
  private readonly permissionService: PermissionService;
  private readonly permissionCheckService: PermissionCheckService;
  private readonly featuresRepository: FeaturesRepository;
  private readonly PBAC_FEATURE_FLAG = "pbac" as const;
  private readonly checkPermissionLogger = logger.getSubLogger({
    prefix: ["CheckPermissionUseCase"],
  });

  constructor() {
    this.permissionService = new PermissionService();
    this.featuresRepository = new FeaturesRepository();
    this.permissionCheckService = new PermissionCheckService();
  }

  /**
   * Checks if a single permission is granted based on PBAC (if enabled) or falls back to role-based check
   */
  public async check({ userId, teamId, permission, fallbackRoles }: CheckPermissionInput): Promise<boolean> {
    try {
      if (!this.permissionService.validatePermission(permission)) {
        throw new Error(`Invalid permission format: ${permission}`);
      }

      // We auto handle checking their org membership to check permissions if the target resource is a sub-team inside of permission check service
      const membership = await MembershipRepository.findFirstByUserIdAndTeamId({
        userId,
        teamId,
      });

      // If no membership found, deny permission
      if (!membership) {
        return false;
      }

      const isPBACEnabled = await this.featuresRepository.checkIfTeamHasFeature(
        teamId,
        this.PBAC_FEATURE_FLAG
      );

      if (isPBACEnabled) {
        // If user has a custom role, check permissions associated with that role
        // They should always have a customRoleId as we created a trigget to keep them in sync until Membership.Role is marked as depricated.
        if (membership.customRoleId) {
          const hasPermissionForResource = await this.permissionCheckService.hasPermission(
            {
              membershipId: membership.id,
            },
            permission
          );
          return hasPermissionForResource;
        }

        this.checkPermissionLogger.info(
          `PBAC is enabled for ${teamId} but no custom role is set on membership relation`
        );

        return false; // we should never hit this due to trigger in pgsql.
      }

      // Fall back to role-based check
      return this.checkFallbackRoles(membership.role, fallbackRoles);
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if multiple permissions are granted based on PBAC (if enabled) or falls back to role-based check
   */
  public async checkAll({
    userId,
    teamId,
    permissions,
    fallbackRoles,
  }: CheckPermissionsInput): Promise<boolean> {
    try {
      // First validate if all permission formats are valid
      if (!this.permissionService.validatePermissions(permissions)) {
        throw new Error(`Invalid permissions format in: ${permissions.join(", ")}`);
      }

      // Get user's membership in the team
      const membership = await MembershipRepository.findFirstByUserIdAndTeamId({
        userId,
        teamId,
      });

      // If no membership found, deny permissions
      if (!membership) {
        return false;
      }

      // Check if PBAC is enabled for this team
      const isPBACEnabled = await this.featuresRepository.checkIfTeamHasFeature(
        teamId,
        this.PBAC_FEATURE_FLAG
      );

      if (isPBACEnabled) {
        // If user has a custom role, check permissions associated with that role
        // They should always have a customRoleId as we created a trigget to keep them in sync until Membership.Role is marked as depricated.
        if (membership.customRoleId) {
          const hasPermissionForResource = await this.permissionCheckService.hasPermissions(
            {
              membershipId: membership.id,
            },
            permissions
          );
          return hasPermissionForResource;
        }

        this.checkPermissionLogger.info(
          `PBAC is enabled for ${teamId} but no custom role is set on membership relation`
        );

        return false; // we should never hit this due to trigger in pgsql.
      }
      return this.checkFallbackRoles(membership.role, fallbackRoles);
    } catch (error) {
      return false;
    }
  }

  private checkFallbackRoles(userRole: MembershipRole, fallbackRoles: MembershipRole[]): boolean {
    return fallbackRoles.includes(userRole);
  }
}
