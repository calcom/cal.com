import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

export interface PermissionCheckOptions {
  userId: number;
  teamId?: number;
  organizationId?: number | null;
  isOrgAdmin: boolean;
  isSystemAdmin: boolean;
  userRole?: MembershipRole;
}

/**
 * Service for checking event type permissions
 */
export class EventTypePermissionService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Check if user has organization-level event type create permission
   */
  async checkOrganizationPermission(options: {
    userId: number;
    organizationId: number;
    isOrgAdmin: boolean;
  }): Promise<boolean> {
    try {
      const orgPermissions = await getResourcePermissions({
        userId: options.userId,
        teamId: options.organizationId,
        resource: Resource.EventType,
        userRole: options.isOrgAdmin ? MembershipRole.ADMIN : MembershipRole.MEMBER,
        fallbackRoles: {
          create: {
            roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
          },
        },
      });
      return orgPermissions.canCreate;
    } catch (error) {
      console.warn(
        `PBAC check failed for organization ${options.organizationId}, falling back to isOrgAdmin:`,
        error
      );
      return options.isOrgAdmin;
    }
  }

  /**
   * Check if user has team-level event type create permission
   */
  async checkTeamPermission(options: {
    userId: number;
    teamId: number;
  }): Promise<{ hasPermission: boolean; hasMembership: boolean }> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: options.userId,
        teamId: options.teamId,
        accepted: true,
      },
    });

    if (!membership) {
      return { hasPermission: false, hasMembership: false };
    }

    try {
      const permissions = await getResourcePermissions({
        userId: options.userId,
        teamId: options.teamId,
        resource: Resource.EventType,
        userRole: membership.role,
        fallbackRoles: {
          create: {
            roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
          },
        },
      });
      return { hasPermission: permissions.canCreate, hasMembership: true };
    } catch (error) {
      console.warn(
        `PBAC check failed for user ${options.userId} on team ${options.teamId}, falling back to role check:`,
        error
      );
      const hasPermission = ["ADMIN", "OWNER"].includes(membership.role);
      return { hasPermission, hasMembership: true };
    }
  }

  /**
   * Check if event type creation is locked for users in the organization
   */
  async checkOrganizationEventTypeLock(organizationId: number): Promise<boolean> {
    const orgSettings = await this.prisma.organizationSettings.findUnique({
      where: {
        organizationId,
      },
      select: {
        lockEventTypeCreationForUsers: true,
      },
    });

    return !!orgSettings?.lockEventTypeCreationForUsers;
  }

  /**
   * Validate permissions for creating an event type
   */
  async validateCreatePermissions(options: PermissionCheckOptions & { teamId?: number }): Promise<void> {
    const { userId, teamId, organizationId, isOrgAdmin, isSystemAdmin } = options;

    // Check organization-level permissions
    let hasOrgPermission = false;
    if (organizationId) {
      hasOrgPermission = await this.checkOrganizationPermission({
        userId,
        organizationId,
        isOrgAdmin,
      });
    }

    // If creating a team event type
    if (teamId) {
      const teamPermissionResult = await this.checkTeamPermission({ userId, teamId });

      if (!isSystemAdmin && !hasOrgPermission && !teamPermissionResult.hasPermission) {
        console.warn(
          `User ${userId} does not have eventType.create permission for team ${teamId}. Membership found: ${teamPermissionResult.hasMembership}`
        );
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
    } else if (organizationId && !hasOrgPermission) {
      // Check if personal event type creation is locked
      const isLocked = await this.checkOrganizationEventTypeLock(organizationId);
      if (isLocked) {
        console.warn(
          `User ${userId} does not have permission to create personal event type - Organization has locked event type creation`
        );
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
    }
  }
}
