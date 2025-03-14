import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TGetAllCreditsSchema } from "./getAllCredits.schema";
import { getAllCreditsForTeam, getAllCreditsForUser } from "./util";

type GetAllCreditsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAllCreditsSchema;
};

export const getAllCreditsHandler = async ({ ctx, input }: GetAllCreditsOptions) => {
  const { teamId } = input;

  let userCredits = await getAllCreditsForUser(ctx.user.id);

  const teamOrOrgId = ctx.user.organizationId ?? teamId;

  if (teamOrOrgId) {
    const teamCredits = await getAllCreditsForTeam(teamOrOrgId);
    return { teamCredits, userCredits };
  } else {
    // if no teamId and not org member
    if (!userCredits) {
      // check if non-org user is part of a team
      const isTeamPlan = await prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          accepted: true,
        },
      });

      // if user is part of team we don't need user credits,
      userCredits = !isTeamPlan ? { additionalCredits: 0 } : undefined;
    }
    return { userCredits };
  }
};
