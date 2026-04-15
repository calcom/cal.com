import { getAttributesForTeam } from "@calcom/features/attributes/lib/getAttributes";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TGetAttributesForTeamInputSchema } from "./getAttributesForTeam.schema";

type GetAttributesForTeamHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAttributesForTeamInputSchema;
};

const fallbackRoles = [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER];

/**
 * Team attribute options for building routing-form rules and event-type segments (e.g. round-robin
 * filters). Access is allowed if the user has `routingForm.read` or `eventType.read` for this team
 */
export default async function getAttributesForTeamHandler({
  ctx,
  input,
}: GetAttributesForTeamHandlerOptions) {
  const { teamId } = input;
  const { user } = ctx;

  const permissionService = new PermissionCheckService();
  const [canReadRoutingForms, canReadEventTypes] = await Promise.all([
    permissionService.checkPermission({
      userId: user.id,
      teamId,
      permission: "routingForm.read",
      fallbackRoles,
    }),
    permissionService.checkPermission({
      userId: user.id,
      teamId,
      permission: "eventType.read",
      fallbackRoles,
    }),
  ]);

  if (!canReadRoutingForms && !canReadEventTypes) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to load attributes for this team",
    });
  }

  return getAttributesForTeam({ teamId });
}
