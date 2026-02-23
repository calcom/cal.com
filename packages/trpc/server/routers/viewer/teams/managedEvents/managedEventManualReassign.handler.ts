import { managedEventManualReassignment } from "@calcom/features/ee/managed-event-types/reassignment";
import { getBookingAccessService } from "@calcom/features/di/containers/BookingAccessService";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TManagedEventManualReassignInputSchema } from "./managedEventManualReassign.schema";

type ManagedEventManualReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TManagedEventManualReassignInputSchema;
};

export const managedEventManualReassignHandler = async ({
  ctx,
  input,
}: ManagedEventManualReassignOptions) => {
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

  await managedEventManualReassignment({
    bookingId,
    newUserId: teamMemberId,
    orgId: ctx.user.organizationId ?? null,
    reassignReason,
    reassignedById: ctx.user.id,
  });

  return { success: true };
};

export default managedEventManualReassignHandler;
