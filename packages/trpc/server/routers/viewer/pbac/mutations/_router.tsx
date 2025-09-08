import { z } from "zod";

import { isValidPermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import type { PermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { RoleService } from "@calcom/features/pbac/services/role.service";
import { RoleType, MembershipRole } from "@calcom/prisma/enums";

import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";

const permissionStringSchema = z.custom<PermissionString>((val) => {
  return isValidPermissionString(val);
}, "Invalid permission string format. Must be 'resource.action' where resource and action are valid enums");

const roleInputSchema = z.object({
  teamId: z.number(),
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  permissions: z.array(permissionStringSchema),
});

export const pbacRouter = router({
  createRole: authedProcedure.input(roleInputSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.user?.id) {
      throw new Error("Unauthorized");
    }

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
});
