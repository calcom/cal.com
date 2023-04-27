import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type HasTeamPlanOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const hasTeamPlanHandler = async ({ ctx }: HasTeamPlanOptions) => {
  const userId = ctx.user.id;

  const hasTeamPlan = await prisma.membership.findFirst({
    where: {
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
