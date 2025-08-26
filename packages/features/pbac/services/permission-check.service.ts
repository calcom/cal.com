import type { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import type { MembershipRepository } from "@calcom/lib/server/repository/membership";
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
import { PERMISSION_REGISTRY, filterResourceConfig } from "../domain/types/permission-registry";
import { PermissionService } from "./permission.service";

interface Dependencies {
  repository: IPermissionRepository;
  featuresRepository: FeaturesRepository;
  membershipRepository: MembershipRepository;
  permissionService: PermissionService;
}

export class PermissionCheckService {
  private readonly PBAC_FEATURE_FLAG = "pbac" as const;
  private readonly logger = logger.getSubLogger({ prefix: ["PermissionCheckService"] });

  constructor(private readonly dependencies: Dependencies) {}

  static async build() {
    const { FeaturesRepository } = await import("@calcom/features/flags/features.repository");
    const featuresRepository = new FeaturesRepository();
    const { PermissionRepository } = await import("../infrastructure/repositories/PermissionRepository");
    const repository = new PermissionRepository();
    const { MembershipRepository } = await import("@calcom/lib/server/repository/membership");
    const membershipRepository = new MembershipRepository();

    return new PermissionCheckService({
      repository,
      featuresRepository,
      membershipRepository,
      permissionService: new PermissionService(),
    });
  }

  async getUserPermissions(userId: number): Promise<TeamPermissions[]> {
    const memberships = await this.dependencies.repository.getUserMemberships(userId);
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
      const isPBACEnabled = await this.dependencies.featuresRepository.checkIfTeamHasFeature(
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
        const teamActions = await this.dependencies.repository.getResourcePermissionsByRoleId(
          membership.customRoleId,
          resource
        );
        teamActions.forEach((action) => actions.add(action));
      }

      // Get org-level permissions as fallback
      if (membership?.team?.parentId && orgMembership?.customRoleId) {
        const orgActions = await this.dependencies.repository.getResourcePermissionsByRoleId(
          orgMembership.customRoleId,
          resource
        );
        orgActions.forEach((action) => actions.add(action));
      }

      // Check if user has "manage" permission - if so, grant all actions for this resource
      if (actions.has("manage" as CrudAction)) {
        // Get all possible actions for this resource from the permission registry
        const resourceConfig = PERMISSION_REGISTRY[resource];
        if (resourceConfig) {
          const allActions = Object.keys(filterResourceConfig(resourceConfig)) as (
            | CrudAction
            | CustomAction
          )[];
          allActions.forEach((action) => actions.add(action));
        }
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
      const validationResult = this.dependencies.permissionService.validatePermission(permission);
      if (!validationResult.isValid) {
        this.logger.error(validationResult.error);
        return false;
      }

      const membership = await this.dependencies.membershipRepository.findUniqueByUserIdAndTeamId({
        userId,
        teamId,
      });

      if (!membership) return false;

      const isPBACEnabled = await this.dependencies.featuresRepository.checkIfTeamHasFeature(
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
      const validationResult = this.dependencies.permissionService.validatePermissions(permissions);
      if (!validationResult.isValid) {
        this.logger.error(validationResult.error);
        return false;
      }

      const membership = await this.dependencies.membershipRepository.findUniqueByUserIdAndTeamId({
        userId,
        teamId,
      });

      if (!membership) return false;

      const isPBACEnabled = await this.dependencies.featuresRepository.checkIfTeamHasFeature(
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
      const hasTeamPermission = await this.dependencies.repository.checkRolePermission(
        membership.customRoleId,
        permission
      );
      if (hasTeamPermission) return true;

      // Check if user has manage permission for this resource
      const [resource] = permission.split(".");
      const managePermission = `${resource}.manage` as PermissionString;
      const hasManagePermission = await this.dependencies.repository.checkRolePermission(
        membership.customRoleId,
        managePermission
      );
      if (hasManagePermission) return true;
    }

    // If no team permission, check org-level permissions
    if (orgMembership?.customRoleId) {
      const [resource] = permission.split(".");
      const managePermission = `${resource}.manage` as PermissionString;
      return this.dependencies.repository.checkRolePermission(orgMembership.customRoleId, managePermission);
    }

    return false;
  }

  /**
   * Internal method to check multiple permissions for a specific role
   */
  private async hasPermissions(query: PermissionCheck, permissions: PermissionString[]): Promise<boolean> {
    // Return false for empty permissions array to prevent privilege escalation
    if (permissions.length === 0) {
      return false;
    }

    const { membership, orgMembership } = await this.getMembership(query);

    // First check team-level permissions
    if (membership?.customRoleId) {
      const hasTeamPermissions = await this.dependencies.repository.checkRolePermissions(
        membership.customRoleId,
        permissions
      );
      if (hasTeamPermissions) return true;

      // Check if user has manage permissions for all requested resources
      const resourcesWithManage = new Set<string>();
      for (const permission of permissions) {
        const [resource] = permission.split(".");
        if (!resourcesWithManage.has(resource)) {
          const managePermission = `${resource}.manage` as PermissionString;
          const hasManagePermission = await this.dependencies.repository.checkRolePermission(
            membership.customRoleId,
            managePermission
          );
          if (hasManagePermission) {
            resourcesWithManage.add(resource);
          }
        }
      }

      // Check if all requested permissions are covered by manage permissions
      const allPermissionsCovered = permissions.every((permission) => {
        const [resource] = permission.split(".");
        return resourcesWithManage.has(resource);
      });

      if (allPermissionsCovered) return true;
    }

    // If no team permissions, check org-level permissions
    if (orgMembership?.customRoleId) {
      const hasOrgPermissions = await this.dependencies.repository.checkRolePermissions(
        orgMembership.customRoleId,
        permissions
      );
      if (hasOrgPermissions) return true;

      // Check if user has manage permissions for all requested resources at org level
      const resourcesWithManage = new Set<string>();
      for (const permission of permissions) {
        const [resource] = permission.split(".");
        if (!resourcesWithManage.has(resource)) {
          const managePermission = `${resource}.manage` as PermissionString;
          const hasManagePermission = await this.dependencies.repository.checkRolePermission(
            orgMembership.customRoleId,
            managePermission
          );
          if (hasManagePermission) {
            resourcesWithManage.add(resource);
          }
        }
      }

      // Check if all requested permissions are covered by manage permissions
      return permissions.every((permission) => {
        const [resource] = permission.split(".");
        return resourcesWithManage.has(resource);
      });
    }

    return false;
  }

  private async getMembership(query: PermissionCheck) {
    let membership = null;
    let orgMembership = null;

    if (query.membershipId) {
      membership = await this.dependencies.repository.getMembershipByMembershipId(query.membershipId);
    } else if (query.userId && query.teamId) {
      membership = await this.dependencies.repository.getMembershipByUserAndTeam(query.userId, query.teamId);
    }

    if (membership?.team.parentId) {
      orgMembership = await this.dependencies.repository.getOrgMembership(
        membership.userId,
        membership.team.parentId
      );
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
      const validationResult = this.dependencies.permissionService.validatePermission(permission);
      if (!validationResult.isValid) {
        this.logger.error(validationResult.error);
        return [];
      }

      return await this.dependencies.repository.getTeamIdsWithPermission(userId, permission);
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
      const validationResult = this.dependencies.permissionService.validatePermissions(permissions);
      if (!validationResult.isValid) {
        this.logger.error(validationResult.error);
        return [];
      }

      return await this.dependencies.repository.getTeamIdsWithPermissions(userId, permissions);
    } catch (error) {
      this.logger.error(error);
      return [];
    }
  }
}
