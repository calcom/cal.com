import { CreditsRepository } from "@calcom/lib/server/repository/credits";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TUpdateAutoTopUpSettingsSchema } from "./updateAutoTopUpSettings.schema";

type UpdateAutoTopUpSettingsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateAutoTopUpSettingsSchema;
};

export const updateAutoTopUpSettingsHandler = async ({ ctx, input }: UpdateAutoTopUpSettingsOptions) => {
  const { teamId, autoTopUpEnabled, autoTopUpThreshold, autoTopUpAmount } = input;

  if (teamId) {
    const adminMembership = await MembershipRepository.getAdminOrOwnerMembership(ctx.user.id, teamId);
    if (!adminMembership) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
      });
    }
  } else {
    const memberships = await MembershipRepository.findAllAcceptedPublishedTeamMemberships(ctx.user.id);
    if (memberships && memberships.length > 0) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
      });
    }
  }

  if (autoTopUpEnabled && (!autoTopUpThreshold || !autoTopUpAmount)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Threshold and amount are required when enabling auto top-up",
    });
  }

  let creditBalance = await CreditsRepository.findCreditBalance({
    teamId,
    userId: teamId ? undefined : ctx.user.id,
  });

  if (!creditBalance) {
    creditBalance = await CreditsRepository.createCreditBalance({
      teamId,
      userId: teamId ? undefined : ctx.user.id,
      additionalCredits: 0,
      autoTopUpEnabled,
      autoTopUpThreshold: autoTopUpEnabled ? autoTopUpThreshold : null,
      autoTopUpAmount: autoTopUpEnabled ? autoTopUpAmount : null,
    });
  } else {
    creditBalance = await CreditsRepository.updateCreditBalance({
      teamId,
      userId: teamId ? undefined : ctx.user.id,
      data: {
        autoTopUpEnabled,
        autoTopUpThreshold: autoTopUpEnabled ? autoTopUpThreshold : null,
        autoTopUpAmount: autoTopUpEnabled ? autoTopUpAmount : null,
      },
    });
  }

  return { success: true };
};
