import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import prisma from "@calcom/prisma";
import type { MembershipRole } from "@calcom/prisma/enums";

import { PermissionMapper } from "../domain/mappers/PermissionMapper";
import type { PermissionCheck, TeamPermissions } from "../domain/models/Permission";
import type { IPermissionRepository } from "../domain/repositories/IPermissionRepository";
import type {
  PermissionString,
  Resource,
  CrudAction,
  CustomAction,
} from "../domain/types/permission-registry";
import { PermissionRepository } from "../infrastructure/repositories/PermissionRepository";
import { PermissionService } from "./permission.service";

export class PermissionCheckService {
  private readonly PBAC_FEATURE_FLAG = "pbac" as const;
  private readonly logger = logger.getSubLogger({ prefix: ["PermissionCheckService"] });
  private readonly featuresRepository: FeaturesRepository;
  private readonly permissionService: PermissionService;

  constructor(
    private readonly repository: IPermissionRepository = new PermissionRepository(),
    featuresRepository: FeaturesRepository = new FeaturesRepository(prisma),
    permissionService: PermissionService = new PermissionService()
  ) {
    this.featuresRepository = featuresRepository;
    this.permissionService = permissionService;
  }

  async getUserPermissions(userId: number): Promise<TeamPermissions[]> {
    const memberships = await this.repository.getUserMemberships(userId);
    return memberships;
  }

  /**
   * Gets all permissions for a specific resource in a team context
   * @warning: this approach of fetching permssions per resource does not account for fall back roles. This should be used in places where you know PBAC is enabled and has been rolled out.
   */
  async getResourcePermissions({
    userId,
    teamId,
    resource,
  }: {
    userId: number;
    teamId: number;
    resource: Resource;
  }): Promise<PermissionString[]> {
    try {
      const isPBACEnabled = await this.featuresRepository.checkIfTeamHasFeature(
        teamId,
        this.PBAC_FEATURE_FLAG
      );

      if (!isPBACEnabled) {
        return [];
      }

      const { membership, orgMembership } = await this.getMembership({ userId, teamId });
      const actions = new Set<CrudAction | CustomAction>();

      // Get team-level permissions
      if (membership?.customRoleId) {
        const teamActions = await this.repository.getResourcePermissionsByRoleId(
          membership.customRoleId,
          resource
        );
        teamActions.forEach((action) => actions.add(action));
      }

      // Get org-level permissions as fallback
      if (membership?.team?.parentId && orgMembership?.customRoleId) {
        const orgActions = await this.repository.getResourcePermissionsByRoleId(
          orgMembership.customRoleId,
          resource
        );
        orgActions.forEach((action) => actions.add(action));
      }

      return Array.from(actions).map((action) => PermissionMapper.toPermissionString({ resource, action }));
    } catch (error) {
      this.logger.error(error);
      return [];
    }
  }

  /**
   * Checks if a user has a specific permission in a team context
   */
  async checkPermission({
    userId,
    teamId,
    permission,
    fallbackRoles,
  }: {
    userId: number;
    teamId: number;
    permission: PermissionString;
    fallbackRoles: MembershipRole[];
  }): Promise<boolean> {
    try {
      const validationResult = this.permissionService.validatePermission(permission);
      if (!validationResult.isValid) {
        this.logger.error(validationResult.error);
        return false;
      }

      const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({
        userId,
        teamId,
      });

      if (!membership) return false;

      const isPBACEnabled = await this.featuresRepository.checkIfTeamHasFeature(
        teamId,
        this.PBAC_FEATURE_FLAG
      );

      if (isPBACEnabled) {
        if (!membership.customRoleId) {
          this.logger.info(`PBAC is enabled for ${teamId} but no custom role is set on membership relation`);
          return false;
        }

        return this.hasPermission({ membershipId: membership.id }, permission);
      }

      return this.checkFallbackRoles(membership.role, fallbackRoles);
    } catch (error) {
      this.logger.error(error);
      return false;
    }
  }

  /**
   * Checks if a user has all specified permissions in a team context
   */
  async checkPermissions({
    userId,
    teamId,
    permissions,
    fallbackRoles,
  }: {
    userId: number;
    teamId: number;
    permissions: PermissionString[];
    fallbackRoles: MembershipRole[];
  }): Promise<boolean> {
    try {
      const validationResult = this.permissionService.validatePermissions(permissions);
      if (!validationResult.isValid) {
        this.logger.error(validationResult.error);
        return false;
      }

      const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({
        userId,
        teamId,
      });

      if (!membership) return false;

      const isPBACEnabled = await this.featuresRepository.checkIfTeamHasFeature(
        teamId,
        this.PBAC_FEATURE_FLAG
      );

      if (isPBACEnabled) {
        if (!membership.customRoleId) {
          this.logger.info(`PBAC is enabled for ${teamId} but no custom role is set on membership relation`);
          return false;
        }

        return this.hasPermissions({ membershipId: membership.id }, permissions);
      }

      return this.checkFallbackRoles(membership.role, fallbackRoles);
    } catch (error) {
      this.logger.error(error);
      return false;
    }
  }

  /**
   * Internal method to check permissions for a specific role
   */
  private async hasPermission(query: PermissionCheck, permission: PermissionString): Promise<boolean> {
    const { membership, orgMembership } = await this.getMembership(query);

    // First check team-level permissions
    if (membership?.customRoleId) {
      const hasTeamPermission = await this.repository.checkRolePermission(
        membership.customRoleId,
        permission
      );
      if (hasTeamPermission) return true;
    }

    // If no team permission, check org-level permissions
    if (orgMembership?.customRoleId) {
      return this.repository.checkRolePermission(orgMembership.customRoleId, permission);
    }

    return false;
  }

  /**
   * Internal method to check multiple permissions for a specific role
   */
  private async hasPermissions(query: PermissionCheck, permissions: PermissionString[]): Promise<boolean> {
    const { membership, orgMembership } = await this.getMembership(query);

    // First check team-level permissions
    if (membership?.customRoleId) {
      const hasTeamPermissions = await this.repository.checkRolePermissions(
        membership.customRoleId,
        permissions
      );
      if (hasTeamPermissions) return true;
    }

    // If no team permissions, check org-level permissions
    if (orgMembership?.customRoleId) {
      return this.repository.checkRolePermissions(orgMembership.customRoleId, permissions);
    }

    return false;
  }

  private async getMembership(query: PermissionCheck) {
    let membership = null;
    let orgMembership = null;

    if (query.membershipId) {
      membership = await this.repository.getMembershipByMembershipId(query.membershipId);
    } else if (query.userId && query.teamId) {
      membership = await this.repository.getMembershipByUserAndTeam(query.userId, query.teamId);
    }

    if (membership?.team.parentId) {
      orgMembership = await this.repository.getOrgMembership(membership.userId, membership.team.parentId);
    }

    return { membership, orgMembership };
  }

  private checkFallbackRoles(userRole: MembershipRole, allowedRoles: MembershipRole[]): boolean {
    return allowedRoles.includes(userRole);
  }

  /**
   * Gets all team IDs where the user has a specific permission
   */
  async getTeamIdsWithPermission(userId: number, permission: PermissionString): Promise<number[]> {
    try {
      const validationResult = this.permissionService.validatePermission(permission);
      if (!validationResult.isValid) {
        this.logger.error(validationResult.error);
        return [];
      }

      return await this.repository.getTeamIdsWithPermission(userId, permission);
    } catch (error) {
      this.logger.error(error);
      return [];
    }
  }

  /**
   * Gets all team IDs where the user has all of the specified permissions
   */
  async getTeamIdsWithPermissions(userId: number, permissions: PermissionString[]): Promise<number[]> {
    try {
      const validationResult = this.permissionService.validatePermissions(permissions);
      if (!validationResult.isValid) {
        this.logger.error(validationResult.error);
        return [];
      }

      return await this.repository.getTeamIdsWithPermissions(userId, permissions);
    } catch (error) {
      this.logger.error(error);
      return [];
    }
  }
}
