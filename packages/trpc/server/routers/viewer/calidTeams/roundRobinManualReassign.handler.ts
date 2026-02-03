import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import roundRobinManualUserReassign from "../../../../../calid/modules/teams/lib/roundRobinManualReassignment";
import type { TRoundRobinManualReassignInputSchema } from "./roundRobinManualReassign.schema";

type RoundRobinManualReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRoundRobinManualReassignInputSchema;
};

export const roundRobinManualReassignHandler = async ({ ctx, input }: RoundRobinManualReassignOptions) => {
  const { bookingId, teamMemberId, reassignReason } = input;

  const bookingAccessRepo = new BookingRepository(prisma);
  const hasPermission = await bookingAccessRepo.doesUserIdHaveAccessToBookingOrItsCalIdTeam({
    userId: ctx.user.id,
    bookingId,
  });

  if (!hasPermission) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission" });
  }

  await roundRobinManualUserReassign({
    bookingId,
    newUserId: teamMemberId,
    orgId: ctx.user.organizationId,
    reassignReason,
    reassignedById: ctx.user.id,
  });

  return { success: true };
};

export default roundRobinManualReassignHandler;
