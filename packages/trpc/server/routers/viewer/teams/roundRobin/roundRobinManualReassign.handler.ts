import { roundRobinManualReassignment } from "@calcom/features/ee/round-robin/roundRobinManualReassignment";
import { getBookingAccessService } from "@calcom/features/di/containers/BookingAccessService";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TRoundRobinManualReassignInputSchema } from "./roundRobinManualReassign.schema";

type RoundRobinManualReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRoundRobinManualReassignInputSchema;
};

export const roundRobinManualReassignHandler = async ({ ctx, input }: RoundRobinManualReassignOptions) => {
  const { bookingId, teamMemberId, reassignReason } = input;

  // Check if user has access to change booking
  const bookingAccessService = getBookingAccessService();
  const isAllowed = await bookingAccessService.doesUserIdHaveAccessToBooking({
    userId: ctx.user.id,
    bookingId,
  });

  if (!isAllowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission" });
  }

  await roundRobinManualReassignment({
    bookingId,
    newUserId: teamMemberId,
    orgId: ctx.user.organizationId,
    reassignReason,
    reassignedById: ctx.user.id,
    actionSource: "WEBAPP",
    reassignedByUuid: ctx.user.uuid,
  });

  return { success: true };
};

export default roundRobinManualReassignHandler;
