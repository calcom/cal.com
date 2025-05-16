import { jsonObjectFrom, jsonArrayFrom } from "kysely/helpers/postgres";
import { z } from "zod";

import {
  checkUserPermissionInTeam,
  checkMultiplePermissionsInTeam,
} from "@calcom/features/pbac/lib/server/checkPermissions";
import { CrudAction, CustomAction, Resource } from "@calcom/features/pbac/types/permission-registry";
import type { PermissionString } from "@calcom/features/pbac/types/permission-registry";
import kysely from "@calcom/kysely";

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

    // Using kysely here got his query down by 67% in execution time
    const memberships = await kysely
      .selectFrom("Membership")
      .leftJoin("Role", "Role.id", "Membership.customRoleId")
      .leftJoin("RolePermission", "RolePermission.roleId", "Role.id")
      .select((eb) => [
        "Membership.teamId",
        jsonObjectFrom(
          eb
            .selectFrom("Role")
            .select((eb) => [
              "Role.id",
              jsonArrayFrom(
                eb
                  .selectFrom("RolePermission")
                  .select(["RolePermission.resource", "RolePermission.action"])
                  .whereRef("RolePermission.roleId", "=", "Role.id")
              ).as("permissions"),
            ])
            .whereRef("Role.id", "=", "Membership.customRoleId")
        ).as("role"),
      ])
      .where("Membership.userId", "=", ctx.user.id)
      .execute();

    // Create a map of teamId to permissions
    const teamPermissions: Record<number, { roleId: string; permissions: PermissionString[] }> = {};

    for (const membership of memberships) {
      if (!membership.teamId || !membership.role) continue;

      if (membership.teamId && membership.role?.id) {
        teamPermissions[membership.teamId] = {
          roleId: membership.role.id,
          permissions: membership.role.permissions.map(
            (p) => `${p.resource}.${p.action}` as PermissionString
          ),
        };
      }
    }

    return teamPermissions;
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
