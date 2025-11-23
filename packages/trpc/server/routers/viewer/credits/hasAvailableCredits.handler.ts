import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { THasAvailableCreditsSchema } from "./hasAvailableCredits.schema";

type HasAvailableCreditsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: THasAvailableCreditsSchema;
};

export const hasAvailableCreditsHandler = async ({ ctx, input }: HasAvailableCreditsOptions) => {
  const { teamId } = input;

  const orgId = ctx.user.organization?.id;

  const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
  const creditService = new CreditService();

  const hasCredits = await creditService.hasAvailableCredits({
    userId: ctx.user.id,
    teamId: teamId ?? orgId,
  });
  return hasCredits;
};
