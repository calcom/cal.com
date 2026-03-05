import { getTeamBillingServiceFactory } from "@calcom/ee/billing/di/containers/Billing";
import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TResubscribeInputSchema } from "./resubscribe.schema";

type ResubscribeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TResubscribeInputSchema;
};

export const resubscribeHandler = async ({ ctx, input }: ResubscribeOptions) => {
  const { teamId } = input;
  const userId = ctx.user.id;

  const membershipRepository = new MembershipRepository();
  const membership = await membershipRepository.findUniqueByUserIdAndTeamId({
    userId,
    teamId,
  });

  if (!membership || !membership.accepted) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this team",
    });
  }

  const team = await TeamService.fetchTeamOrThrow(teamId);
  const permissionService = new PermissionCheckService();
  const hasPermission = await permissionService.checkPermission({
    userId,
    teamId,
    permission: team.isOrganization ? "organization.manageBilling" : "team.manageBilling",
    fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only team admins or owners can resubscribe",
    });
  }

  const teamBillingFactory = getTeamBillingServiceFactory();
  const teamBillingService = await teamBillingFactory.findAndInit(teamId);

  const { checkoutUrl } = await teamBillingService.resubscribe(userId);

  return { checkoutUrl };
};

export default resubscribeHandler;
