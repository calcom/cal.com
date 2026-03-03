import { checkUserHasActivePaidTeamPlan } from "@calcom/features/ee/teams/lib/checkUserHasActivePaidTeamPlan";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { THasActiveTeamPlanInputSchema } from "./hasActiveTeamPlan.schema";

type HasActiveTeamPlanOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: THasActiveTeamPlanInputSchema;
};

export const hasActiveTeamPlanHandler = async ({ ctx, input }: HasActiveTeamPlanOptions) => {
  return await checkUserHasActivePaidTeamPlan(ctx.user.id, { ownerOnly: input?.ownerOnly });
};

export default hasActiveTeamPlanHandler;
