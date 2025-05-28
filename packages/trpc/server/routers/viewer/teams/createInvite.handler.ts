import { WEBAPP_URL } from "@calcom/lib/constants";
import { isTeamAdmin } from "@calcom/lib/server/queries/teams";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TCreateInviteInputSchema } from "./createInvite.schema";

type CreateInviteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInviteInputSchema;
};

export const createInviteHandler = async ({ ctx, input }: CreateInviteOptions) => {
  const { teamId } = input;
  const membership = await isTeamAdmin(ctx.user.id, teamId);

  if (!membership || !membership?.team) throw new TRPCError({ code: "UNAUTHORIZED" });
  const isOrganizationOrATeamInOrganization = !!(membership.team?.parentId || membership.team.isOrganization);

  if (input.token) {
    const existingToken = await TeamRepository.createInvite({
      teamId,
      token: input.token,
    });
    if (!existingToken) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      token: existingToken.token,
      inviteLink: await getInviteLink(existingToken.token, isOrganizationOrATeamInOrganization),
    };
  }

  const newToken = await TeamRepository.createInvite({
    teamId,
  });

  if (!newToken) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return {
    token: newToken.token,
    inviteLink: await getInviteLink(newToken.token, isOrganizationOrATeamInOrganization),
  };
};

async function getInviteLink(token = "", isOrgContext = false) {
  const teamInviteLink = `${WEBAPP_URL}/teams?token=${token}`;
  const orgInviteLink = `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/getting-started`;
  if (isOrgContext) return orgInviteLink;
  return teamInviteLink;
}

export default createInviteHandler;
