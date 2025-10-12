import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TRPCContext } from "../../../createContext";
import type { TListByOrganizationSchema } from "./listByOrganization.schema";

export default async function listByOrganizationHandler(opts: {
  ctx: TRPCContext;
  input: TListByOrganizationSchema;
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
      message: "You do not have permission to view this organization's watchlist",
    });
  }

  return await services.watchlistService.listEntries({
    organizationId: input.organizationId,
  });
}
