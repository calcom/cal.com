import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TRPCContext } from "../../../createContext";
import type { TDeleteForOrganizationSchema } from "./deleteForOrganization.schema";

export default async function deleteForOrganizationHandler(opts: {
  ctx: TRPCContext;
  input: TDeleteForOrganizationSchema;
}) {
  const { ctx, input } = opts;
  const { services } = await getWatchlistFeature();

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Check if user has org admin rights
  const membership = await ctx.prisma.membership.findFirst({
    where: {
      userId: ctx.user.id,
      teamId: input.organizationId,
      role: {
        in: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to delete entries for this organization",
    });
  }

  // Verify the entry belongs to this organization
  const entry = await services.watchlistService.getEntry(input.id);

  if (!entry) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Watchlist entry not found",
    });
  }

  if (entry.organizationId !== input.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This entry does not belong to the specified organization",
    });
  }

  if (entry.isGlobal) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot delete global entries",
    });
  }

  await services.watchlistService.deleteEntry(input.id);

  return { success: true };
}
