import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TGetAllCreditsSchema } from "./getAllCredits.schema";

type GetAllCreditsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAllCreditsSchema;
};

export const getAllCreditsHandler = async ({ ctx, input }: GetAllCreditsOptions) => {
  const { teamId } = input;

  const adminMembership = await MembershipRepository.getAdminMembership(ctx.user.id, teamId);

  if (!adminMembership) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }
  const creditService = new CreditService();

  const teamCredits = await creditService.getAllCreditsForTeam(teamId);
  return { teamCredits };
};
