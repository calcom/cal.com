import { z } from "zod";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { isValidPermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import type { PermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { RoleService } from "@calcom/features/pbac/services/role.service";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";

const permissionStringSchema = z.custom<PermissionString>((val) => {
  return isValidPermissionString(val);
}, "Invalid permission string format. Must be 'resource.action' where resource and action are valid enums");

export const pbacQueriesRouter = router({
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
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
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
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });
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
