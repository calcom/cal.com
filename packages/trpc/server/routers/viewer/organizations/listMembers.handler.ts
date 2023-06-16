import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { getTeamWithMembers } from "@calcom/lib/server/queries/teams";
import type { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listMembersHandler = async ({ ctx }: GetOptions) => {
  const organizationId = ctx.user.organizationId;
  if (!organizationId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User is not part of any organization." });
  }
  const team = await getTeamWithMembers(organizationId, undefined, ctx.user.id);

  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
  }

  const membership = team?.members.find((membership) => membership.id === ctx.user.id);

  return {
    ...team,
    safeBio: markdownToSafeHTML(team.bio),
    membership: {
      role: membership?.role as MembershipRole,
      accepted: membership?.accepted,
    },
  };
};
