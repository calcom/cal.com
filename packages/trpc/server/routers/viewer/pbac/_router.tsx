import { z } from "zod";

import {
  checkUserPermissionInTeam,
  checkMultiplePermissionsInTeam,
} from "@calcom/features/pbac/lib/server/checkPermissions";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { CrudAction, CustomAction, Resource } from "@calcom/features/pbac/types/permission-registry";
import type { PermissionString } from "@calcom/features/pbac/types/permission-registry";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

// Create a Zod schema for PermissionString that validates the format
const permissionStringSchema = z.custom<PermissionString>((val) => {
  if (typeof val !== "string") return false;

  const [resource, action] = val.split(".");

  const isValidResource = Object.values(Resource).includes(resource as Resource);

  const isValidAction =
    Object.values(CrudAction).includes(action as CrudAction) ||
    Object.values(CustomAction).includes(action as CustomAction);

  return isValidResource && isValidAction;
}, "Invalid permission string format. Must be 'resource.action' where resource and action are valid enums");

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
      return checkUserPermissionInTeam({
        userId: ctx.user.id,
        teamId: input.teamId,
        permission: input.permission,
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
      return checkMultiplePermissionsInTeam({
        userId: ctx.user.id,
        teamId: input.teamId,
        permissions: input.permissions,
      });
    }),
});
