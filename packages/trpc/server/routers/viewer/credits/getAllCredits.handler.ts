import { CreditService } from "@calcom/features/ee/billing/credit-service";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TGetAllCreditsSchema } from "./getAllCredits.schema";

type GetAllCreditsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAllCreditsSchema;
};

export const getAllCreditsHandler = async ({ ctx, input }: GetAllCreditsOptions) => {
  const { teamId } = input;

  const creditService = new CreditService();

  const teamCredits = await creditService.getAllCreditsForTeam(teamId);
  return { teamCredits };
};
