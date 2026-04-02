import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { MembershipRole } from "@calcom/prisma/enums";
import { PermissionMapper } from "../domain/mappers/PermissionMapper";
import type { PermissionCheck, TeamPermissions } from "../domain/models/Permission";
import type { IPermissionRepository } from "../domain/repositories/IPermissionRepository";
import type {
  CrudAction,
  CustomAction,
  PermissionString,
  Resource,
} from "../domain/types/permission-registry";
import { PermissionRepository } from "../infrastructure/repositories/PermissionRepository";
import { PermissionService } from "./permission.service";

export class PermissionCheckService {
  private readonly PBAC_FEATURE_FLAG = "pbac" as const;
  private readonly logger = logger.getSubLogger({ prefix: ["PermissionCheckService"] });
  private readonly featuresRepository: FeaturesRepository;
  private readonly permissionService: PermissionService;
  private readonly membershipRepository: MembershipRepository;

  constructor(
    private readonly repository: IPermissionRepository = new PermissionRepository(),
    featuresRepository: FeaturesRepository = new FeaturesRepository(prisma),
    permissionService: PermissionService = new PermissionService(),
    membershipRepository: MembershipRepository = new MembershipRepository()
  ) {
    this.featuresRepository = featuresRepository;
    this.permissionService = permissionService;
    this.membershipRepository = membershipRepository;
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

      // Get org-level permissions (works even without team membership)
      if (orgMembership?.customRoleId) {
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

      const isPBACEnabled = await this.featuresRepository.checkIfTeamHasFeature(
        teamId,
        this.PBAC_FEATURE_FLAG
      );

      if (isPBACEnabled) {
        // Check if user has permission through team or org membership
        return this.hasPermission({ userId, teamId }, permission);
      }

      // Fallback to role-based check - use highest role between team and org membership
      const membership = await this.membershipRepository.findUniqueByUserIdAndTeamId({
        userId,
        teamId,
      });

      let effectiveRole: MembershipRole | null = membership?.role ?? null;

      // Check if team has parent org and get org membership
      const team = await this.repository.getTeamById(teamId);
      if (team?.parentId) {
        const orgMembership = await this.membershipRepository.findUniqueByUserIdAndTeamId({
          userId,
          teamId: team.parentId,
        });

        // Use the highest role between team and org
        if (orgMembership) {
          effectiveRole = this.getHighestRole(effectiveRole, orgMembership.role);
        }
      }

      if (!effectiveRole) {
        return false;
      }

      return this.checkFallbackRoles(effectiveRole, fallbackRoles);
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

      const isPBACEnabled = await this.featuresRepository.checkIfTeamHasFeature(
        teamId,
        this.PBAC_FEATURE_FLAG
      );

      if (isPBACEnabled) {
        // Check if user has permissions through team or org membership
        return this.hasPermissions({ userId, teamId }, permissions);
      }

      // Fallback to role-based check - use highest role between team and org membership
      const membership = await this.membershipRepository.findUniqueByUserIdAndTeamId({
        userId,
        teamId,
      });

      let effectiveRole: MembershipRole | null = membership?.role ?? null;

      // Check if team has parent org and get org membership
      const team = await this.repository.getTeamById(teamId);
      if (team?.parentId) {
        const orgMembership = await this.membershipRepository.findUniqueByUserIdAndTeamId({
          userId,
          teamId: team.parentId,
        });

        // Use the highest role between team and org
        if (orgMembership) {
          effectiveRole = this.getHighestRole(effectiveRole, orgMembership.role);
        }
      }

      if (!effectiveRole) {
        return false;
      }

      return this.checkFallbackRoles(effectiveRole, fallbackRoles);
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

    // Get org membership either through the team membership or directly from teamId
    if (membership?.team.parentId) {
      // User has team membership, check org through that
      orgMembership = await this.repository.getOrgMembership(membership.userId, membership.team.parentId);
    } else if (query.userId && query.teamId) {
      // No team membership, but check if team belongs to an org
      const team = await this.repository.getTeamById(query.teamId);
      if (team?.parentId) {
        orgMembership = await this.repository.getOrgMembership(query.userId, team.parentId);
      }
    }

    return { membership, orgMembership };
  }

  private checkFallbackRoles(userRole: MembershipRole, allowedRoles: MembershipRole[]): boolean {
    return allowedRoles.includes(userRole);
  }

  private getHighestRole(role1: MembershipRole | null, role2: MembershipRole | null): MembershipRole | null {
    if (!role1) return role2;
    if (!role2) return role1;

    const roleHierarchy: Record<MembershipRole, number> = {
      OWNER: 3,
      ADMIN: 2,
      MEMBER: 1,
    };

    return roleHierarchy[role1] >= roleHierarchy[role2] ? role1 : role2;
  }

  /**
   * Gets all team IDs where the user has a specific permission
   * @param orgId Optional organization ID to scope results to. When provided, only returns teams within this organization.
   */
  async getTeamIdsWithPermission({
    userId,
    permission,
    fallbackRoles,
    orgId,
  }: {
    userId: number;
    permission: PermissionString;
    fallbackRoles: MembershipRole[];
    orgId?: number;
  }): Promise<number[]> {
    try {
      const validationResult = this.permissionService.validatePermission(permission);
      if (!validationResult.isValid) {
        this.logger.error(validationResult.error);
        return [];
      }

      return await this.repository.getTeamIdsWithPermission({
        userId,
        permission,
        fallbackRoles,
        orgId,
      });
    } catch (error) {
      this.logger.error(error);
      return [];
    }
  }

  /**
   * Gets all team IDs where the user has all of the specified permissions
   * @param orgId Optional organization ID to scope results to. When provided, only returns teams within this organization.
   */
  async getTeamIdsWithPermissions({
    userId,
    permissions,
    fallbackRoles,
    orgId,
  }: {
    userId: number;
    permissions: PermissionString[];
    fallbackRoles: MembershipRole[];
    orgId?: number;
  }): Promise<number[]> {
    try {
      const validationResult = this.permissionService.validatePermissions(permissions);
      if (!validationResult.isValid) {
        this.logger.error(validationResult.error);
        return [];
      }

      return await this.repository.getTeamIdsWithPermissions({
        userId,
        permissions,
        fallbackRoles,
        orgId,
      });
    } catch (error) {
      this.logger.error(error);
      return [];
    }
  }
}
