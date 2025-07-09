import { z } from "zod";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { Resource, CrudAction, CustomAction } from "@calcom/features/pbac/domain/types/permission-registry";
import type { PermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { RoleService } from "@calcom/features/pbac/services/role.service";
import { RoleType, MembershipRole } from "@calcom/prisma/enums";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

// Create a Zod schema for PermissionString that validates the format
const permissionStringSchema = z.custom<PermissionString>((val) => {
  if (typeof val !== "string") return false;

  const [resource, action] = val.split(".");

  const isValidResource = Object.values(Resource).includes(resource as Resource);

  if (action === "_resource") {
    return true;
  }

  const isValidAction =
    Object.values(CrudAction).includes(action as CrudAction) ||
    Object.values(CustomAction).includes(action as CustomAction);

  return isValidResource && isValidAction;
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

      const featureRepo = new FeaturesRepository();
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
