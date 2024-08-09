import { roundRobinReassignment } from "@calcom/features/ee/round-robin/roundRobinReassignment";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

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
  const isAllowed = await BookingRepository.doesUserIdHaveAccessToBooking({ userId: ctx.user.id, bookingId });

  if (!isAllowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission" });
  }

  await roundRobinReassignment({ bookingId });
};

export default roundRobinReassignHandler;
