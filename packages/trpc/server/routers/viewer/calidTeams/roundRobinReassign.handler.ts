import roundRobinReassignUser from "@calid/features/modules/teams/lib/roundRobinReassignUser";

import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TRoundRobinReassignInputSchema } from "./roundRobinReassign.schema";

type RoundRobinReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRoundRobinReassignInputSchema;
};

export const roundRobinReassignHandler = async ({ ctx, input }: RoundRobinReassignOptions) => {
  const { bookingId } = input;

  const repo = new BookingRepository(prisma);
  const canAccess = await repo.doesUserIdHaveAccessToBookingOrItsCalIdTeam({
    userId: ctx.user.id,
    bookingId,
  });

  if (!canAccess) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission" });
  }

  return await roundRobinReassignUser({
    bookingId,
    orgId: ctx.user.organizationId,
    reassignedById: ctx.user.id,
  });
};

export default roundRobinReassignHandler;
