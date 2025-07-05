import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type HasTeamPlanOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const hasTeamPlanHandler = async ({ ctx }: HasTeamPlanOptions) => {
  const userId = ctx.user.id;

  const hasTeamPlan = await prisma.membership.findFirst({
    where: {
      accepted: true,
      userId,
      team: {
        slug: {
          not: null,
        },
      },
    },
  });
  return { hasTeamPlan: !!hasTeamPlan };
};

export default hasTeamPlanHandler;
