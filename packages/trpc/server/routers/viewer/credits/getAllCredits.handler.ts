import { getAllCreditsForTeam } from "@calcom/features/ee/billing/lib/credits";
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

  const teamCredits = await getAllCreditsForTeam(teamId);
  return { teamCredits };
};
