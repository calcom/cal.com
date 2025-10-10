import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TGetAllCreditsSchema } from "./getAllCredits.schema";

type GetAllCreditsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAllCreditsSchema;
};

export const getAllCreditsHandler = async ({ ctx, input }: GetAllCreditsOptions) => {
  const { teamId } = input;

  if (teamId) {
    const team = await TeamService.fetchTeamOrThrow(teamId);

    const permissionService = new PermissionCheckService();
    const hasManageBillingPermission = await permissionService.checkPermission({
      userId: ctx.user.id,
      teamId,
      permission: team.isOrganization ? "organization.manageBilling" : "team.manageBilling",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    if (!hasManageBillingPermission) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
      });
    }
  } else {
    //if user is part of team, don't return any credits if teamId is not given
    const memberships = await MembershipRepository.findAllAcceptedPublishedTeamMemberships(ctx.user.id);

    if (memberships && memberships.length > 0) {
      return null;
    }
  }
  const { CreditService } = await import("@calcom/features/ee/billing/credit-service");

  const creditService = new CreditService();

  const credits = await creditService.getAllCredits({ userId: ctx.user.id, teamId });
  return { credits };
};
