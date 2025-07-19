import { prisma } from "@calcom/prisma";

type HasTeamPlanOptions = {
  ctx: {
    user: { id: number };
  };
};

export const hasTeamPlanHandler = async ({ ctx: { user } }: HasTeamPlanOptions) => {
  const hasTeamPlan = await prisma.membership.findFirst({
    where: {
      accepted: true,
      userId: user.id,
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
