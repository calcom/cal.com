import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { getTeamWithMembers } from "@calcom/lib/server/queries/teams";
import type { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx, input }: GetOptions) => {
  const team = await getTeamWithMembers(input.teamId, undefined, ctx.user.id);

  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
  }

  const membership = team?.members.find((membership) => membership.id === ctx.user.id);

  return {
    ...team,
    /** To prevent breaking we only return non-email attached token here, if we have one */
    inviteToken: team.inviteTokens.find((token) => token.identifier === "invite-link-for-teamId-" + team.id),
    safeBio: markdownToSafeHTML(team.bio),
    membership: {
      role: membership?.role as MembershipRole,
      accepted: membership?.accepted,
    },
  };
};
