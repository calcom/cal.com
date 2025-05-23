import type { PermissionString } from "pbac/domain/types/permission-registry";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import type { MembershipRole } from "@calcom/prisma/enums";

import { PermissionCheckService } from "../services/permission-check.service";
import { PermissionService } from "../services/permission.service";

interface CheckPermissionInput {
  userId: number;
  teamId: number;
  permission: PermissionString;
  fallbackRoles: MembershipRole[];
}

interface CheckPermissionsInput extends Omit<CheckPermissionInput, "permission"> {
  permissions: PermissionString[];
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
      const validationResult = this.permissionService.validatePermission(permission);
      if (!validationResult.isValid) {
        this.checkPermissionLogger.error(validationResult.error);
        return false;
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
        // They should always have a customRoleId as we created a trigger to keep them in sync until Membership.Role is marked as deprecated.
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
      this.checkPermissionLogger.error(error);
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
      const validationResult = this.permissionService.validatePermissions(permissions);
      if (!validationResult.isValid) {
        this.checkPermissionLogger.error(validationResult.error);
        return false;
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
        // They should always have a customRoleId as we created a trigger to keep them in sync until Membership.Role is marked as deprecated.
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
      this.checkPermissionLogger.error(error);
      return false;
    }
  }

  private checkFallbackRoles(userRole: MembershipRole, allowedRoles: MembershipRole[]): boolean {
    return allowedRoles.includes(userRole);
  }
}
