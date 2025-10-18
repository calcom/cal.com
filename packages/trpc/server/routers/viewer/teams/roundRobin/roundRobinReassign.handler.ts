import { roundRobinReassignment } from "@calcom/features/ee/round-robin/roundRobinReassignment";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
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

  // Check if user has access to change booking
  const bookingRepo = new BookingRepository(prisma);
  const isAllowed = await bookingRepo.doesUserIdHaveAccessToBooking({ userId: ctx.user.id, bookingId });

  if (!isAllowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission" });
  }

  return await roundRobinReassignment({
    bookingId,
    orgId: ctx.user.organizationId,
    reassignedById: ctx.user.id,
  });
};

export default roundRobinReassignHandler;
