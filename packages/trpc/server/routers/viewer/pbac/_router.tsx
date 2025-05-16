import { z } from "zod";

import {
  checkUserPermissionInTeam,
  checkMultiplePermissionsInTeam,
} from "@calcom/features/pbac/lib/server/checkPermissions";
import type { PermissionString } from "@calcom/features/pbac/types/permission-registry";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

export const permissionsRouter = router({
  checkPermission: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
        permission: z.string() as z.ZodType<PermissionString>,
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
        permissions: z.array(z.string() as z.ZodType<PermissionString>),
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
