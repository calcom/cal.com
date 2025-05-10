import { InternalTeamBilling } from "@calcom/ee/billing/teams/internal-team-billing";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type HasActiveTeamPlanOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const hasActiveTeamPlanHandler = async ({ ctx }: HasActiveTeamPlanOptions) => {
  if (IS_SELF_HOSTED) return { isActive: true, isTrial: false };

  const teams = await prisma.team.findMany({
    where: {
      members: {
        some: {
          userId: ctx.user.id,
          accepted: true,
        },
      },
    },
  });

  if (!teams.length) return { isActive: false, isTrial: false };

  let isTrial = false;
  // check if user has at least on membership with an active plan
  for (const team of teams) {
    const teamBillingService = new InternalTeamBilling(team);
    const subscriptionStatus = await teamBillingService.getSubscriptionStatus();

    if (subscriptionStatus === "active" || subscriptionStatus === "past_due") {
      return { isActive: true, isTrial: false };
    }
    if (subscriptionStatus === "trialing") {
      isTrial = true;
    }
  }

  return { isActive: false, isTrial };
};

export default hasActiveTeamPlanHandler;
