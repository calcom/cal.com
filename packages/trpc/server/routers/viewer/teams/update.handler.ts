import type { Prisma } from "@prisma/client";

import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { validateIntervalLimitOrder } from "@calcom/lib/intervalLimits/validateIntervalLimitOrder";
import { isTeamAdmin } from "@calcom/lib/server/queries/teams";
import { TeamRepository } from "@calcom/lib/server/repository/team";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TUpdateInputSchema } from "./update.schema";

type UpdateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateInputSchema;
};

export const updateHandler = async ({ ctx, input }: UpdateOptions) => {
  const isOrgAdmin = ctx.user?.organization?.isOrgAdmin;

  if (!isOrgAdmin) {
    if (!(await isTeamAdmin(ctx.user?.id, input.id))) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
  }

  if (input.slug) {
    const hasConflict = await TeamRepository.checkSlugConflict({
      slug: input.slug,
      exceptTeamId: input.id,
    });
    if (hasConflict) return;
  }

  const prevTeam = await TeamRepository.findById({ id: input.id });

  if (!prevTeam) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });

  if (input.bookingLimits) {
    const isValid = validateIntervalLimitOrder(input.bookingLimits);
    if (!isValid)
      throw new TRPCError({ code: "BAD_REQUEST", message: "Booking limits must be in ascending order." });
  }

  const data: Prisma.TeamUpdateArgs["data"] = {
    name: input.name,
    bio: input.bio,
    hideBranding: input.hideBranding,
    isPrivate: input.isPrivate,
    hideBookATeamMember: input.hideBookATeamMember,
    hideTeamProfileLink: input.hideTeamProfileLink,
    brandColor: input.brandColor,
    darkBrandColor: input.darkBrandColor,
    theme: input.theme,
    bookingLimits: input.bookingLimits ?? undefined,
    includeManagedEventsInLimits: input.includeManagedEventsInLimits ?? undefined,
    rrResetInterval: input.rrResetInterval,
    slug: input.slug,
  };

  const updatedTeam = await TeamRepository.update({
    id: input.id,
    data,
    logo: input.logo,
    prevTeam,
    isTeamBillingEnabled: !!IS_TEAM_BILLING_ENABLED,
  });

  return {
    logoUrl: updatedTeam.logoUrl,
    name: updatedTeam.name,
    bio: updatedTeam.bio,
    slug: updatedTeam.slug,
    theme: updatedTeam.theme,
    brandColor: updatedTeam.brandColor,
    darkBrandColor: updatedTeam.darkBrandColor,
    bookingLimits: updatedTeam.bookingLimits as IntervalLimit,
    includeManagedEventsInLimits: updatedTeam.includeManagedEventsInLimits,
    rrResetInterval: updatedTeam.rrResetInterval,
  };
};

export default updateHandler;
