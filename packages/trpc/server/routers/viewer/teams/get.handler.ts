import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { getTeamWithMembers } from "@calcom/lib/server/queries/teams";

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
  const team = await getTeamWithMembers({
    id: input.teamId,
    userId: ctx.user.organization?.isOrgAdmin ? undefined : ctx.user.id,
    includeTeamLogo: input.includeTeamLogo,
    isOrgView: input?.isOrg,
  });

  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
  }

  const membership = team?.members.find((membership) => membership.id === ctx.user.id);

  if (!membership) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Not a member of this team." });
  }

  return {
    ...team,
    safeBio: markdownToSafeHTML(team.bio),
    membership: {
      role: membership.role,
      accepted: membership.accepted,
    },
  };
};

export default getHandler;
