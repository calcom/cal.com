import { TeamRepository } from "@calcom/lib/server/repository/team";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type HasTeamPlanOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const hasTeamPlanHandler = async ({ ctx }: HasTeamPlanOptions) => {
  const userId = ctx.user.id;
  return await TeamRepository.hasTeamPlan(userId);
};

export default hasTeamPlanHandler;
