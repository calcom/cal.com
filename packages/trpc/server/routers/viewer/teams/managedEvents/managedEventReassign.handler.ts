import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { managedEventReassignment } from "@calcom/features/ee/managed-event-types/reassignment";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TManagedEventReassignInputSchema } from "./managedEventReassign.schema";

type ManagedEventReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TManagedEventReassignInputSchema;
};

export const managedEventReassignHandler = async ({ ctx, input }: ManagedEventReassignOptions) => {
  const { bookingId } = input;

  // Check if user has access to change booking
  const bookingRepo = new BookingRepository(prisma);
  const isAllowed = await bookingRepo.doesUserIdHaveAccessToBooking({ userId: ctx.user.id, bookingId });

  if (!isAllowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission" });
  }

  return await managedEventReassignment({
    bookingId,
    orgId: ctx.user.organizationId,
    reassignedById: ctx.user.id,
  });
};

export default managedEventReassignHandler;

