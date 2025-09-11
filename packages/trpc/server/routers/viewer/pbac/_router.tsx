import { z } from "zod";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { isValidPermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import type { PermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { RoleService } from "@calcom/features/pbac/services/role.service";
import {
  NAVIGATION_PERMISSION_MAP,
  DEFAULT_PERMISSIONS,
  type NavigationItemName,
} from "@calcom/features/shell/permissions/types";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import prisma from "@calcom/prisma";
import { RoleType, MembershipRole } from "@calcom/prisma/enums";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

// Create a Zod schema for PermissionString that validates the format
const permissionStringSchema = z.custom<PermissionString>((val) => {
  return isValidPermissionString(val);
}, "Invalid permission string format. Must be 'resource.action' where resource and action are valid enums");

// Schema for creating/updating roles
const roleInputSchema = z.object({
  teamId: z.number(),
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  permissions: z.array(permissionStringSchema),
});

export const permissionsRouter = router({
  getUserPermissions: authedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) return {};

    const permissionCheckService = new PermissionCheckService();
    return await permissionCheckService.getUserPermissions(ctx.user.id);
  }),

  getNavigationPermissions: authedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      return DEFAULT_PERMISSIONS;
    }

    const teamIds = await MembershipRepository.findUserTeamIds({ userId: ctx.user.id });
    if (teamIds.length === 0) {
      return DEFAULT_PERMISSIONS;
    }

    const permissionService = new PermissionCheckService();
    const navigationItems = Object.keys(NAVIGATION_PERMISSION_MAP) as Array<NavigationItemName>;

    const permissionChecks = await Promise.all(
      navigationItems.map((itemName) =>
        permissionService.getTeamIdsWithPermission(ctx.user.id, NAVIGATION_PERMISSION_MAP[itemName])
      )
    );

    return Object.fromEntries(
      navigationItems.map((itemName, index) => [itemName, permissionChecks[index].length > 0])
    ) as Record<NavigationItemName, boolean>;
  }),

  checkPermission: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
        permission: permissionStringSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        return false;
      }

      const permissionCheckService = new PermissionCheckService();
      return permissionCheckService.checkPermission({
        userId: ctx.user.id,
        teamId: input.teamId,
        permission: input.permission,
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN], // Default fallback roles for backward compatibility
      });
    }),

  checkPermissions: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
        permissions: z.array(permissionStringSchema),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        return false;
      }

      const permissionCheckService = new PermissionCheckService();
      return permissionCheckService.checkPermissions({
        userId: ctx.user.id,
        teamId: input.teamId,
        permissions: input.permissions,
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN], // Default fallback roles for backward compatibility
      });
    }),

  createRole: authedProcedure.input(roleInputSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.user?.id) {
      throw new Error("Unauthorized");
    }

    // Check if user has permission to create roles
    const permissionCheckService = new PermissionCheckService();
    const hasPermission = await permissionCheckService.checkPermission({
      userId: ctx.user.id,
      teamId: input.teamId,
      permission: "role.create",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });

    if (!hasPermission) {
      throw new Error("You don't have permission to create roles");
    }

    const roleService = new RoleService();
    return roleService.createRole({
      ...input,
      type: RoleType.CUSTOM,
    });
  }),

  updateRole: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
        roleId: z.string(),
        name: z.string().optional(),
        permissions: z.array(permissionStringSchema),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("Unauthorized");
      }

      // Check if user has permission to update roles
      const permissionCheckService = new PermissionCheckService();
      const hasPermission = await permissionCheckService.checkPermission({
        userId: ctx.user.id,
        teamId: input.teamId,
        permission: "role.update",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      if (!hasPermission) {
        throw new Error("You don't have permission to update roles");
      }

      const roleService = new RoleService();
      return roleService.update({
        roleId: input.roleId,
        permissions: input.permissions,
        updates: {
          name: input.name,
          color: input.color,
        },
      });
    }),

  deleteRole: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
        roleId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("Unauthorized");
      }

      // Check if user has permission to delete roles
      const permissionCheckService = new PermissionCheckService();
      const hasPermission = await permissionCheckService.checkPermission({
        userId: ctx.user.id,
        teamId: input.teamId,
        permission: "role.delete",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      if (!hasPermission) {
        throw new Error("You don't have permission to delete roles");
      }

      const roleService = new RoleService();
      await roleService.deleteRole(input.roleId);
      return { success: true };
    }),

  getTeamRoles: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new Error("Unauthorized");
      }

      const featureRepo = new FeaturesRepository(prisma);
      const teamHasPBACFeature = await featureRepo.checkIfTeamHasFeature(input.teamId, "pbac");

      if (!teamHasPBACFeature) {
        throw new Error("PBAC is not enabled for this team");
      }

      // Check if user has permission to view roles
      const permissionCheckService = new PermissionCheckService();
      const hasPermission = await permissionCheckService.checkPermission({
        userId: ctx.user.id,
        teamId: input.teamId,
        permission: "role.read",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

      if (!hasPermission) {
        throw new Error("You don't have permission to view roles");
      }

      const roleService = new RoleService();
      return roleService.getTeamRoles(input.teamId);
    }),
});
