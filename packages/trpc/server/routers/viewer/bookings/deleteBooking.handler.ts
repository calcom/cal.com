import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TDeleteBookingInputSchema } from "./deleteBooking.schema";

type DeleteBookingOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteBookingInputSchema;
};

export const deleteBookingHandler = async ({ ctx, input }: DeleteBookingOptions) => {
  const { user } = ctx;
  const { id } = input;

  // Fetch booking with permission-checking data:
  // - eventType.team.members: filtered to current user to check their team role
  // - user: to verify ownership for personal bookings
  // - Only include accepted team memberships for valid permission checks
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      id: true,
      endTime: true,
      eventType: {
        select: {
          team: {
            select: {
              members: {
                where: {
                  userId: user.id,
                  accepted: true, // Only accepted memberships grant permissions
                },
                select: {
                  role: true,
                },
              },
            },
          },
        },
      },
      user: {
        select: {
          id: true, // Only need ID for ownership comparison
        },
      },
    },
  });

  if (!booking) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Booking not found",
    });
  }

  // Check if booking is in the past
  const isBookingInPast = new Date(booking.endTime) < new Date();
  if (!isBookingInPast) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only past bookings can be deleted",
    });
  }

  // Determine if current user has permission to delete this booking
  let hasPermission = false;

  if (booking.eventType?.team) {
    // Team booking: Only team OWNER or ADMIN can delete any team booking
    // Note: members[0] is safe because the query filters by current user.id
    // If user is not a team member, the array will be empty
    const membership = booking.eventType.team.members[0];
    if (
      membership &&
      (membership.role === MembershipRole.OWNER || membership.role === MembershipRole.ADMIN)
    ) {
      hasPermission = true;
    }
  } else {
    // Personal booking: Only the original booking owner can delete their own booking
    if (booking.user && booking.user.id === user.id) {
      hasPermission = true;
    }
  }

  if (!hasPermission) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to delete this booking",
    });
  }

  // Delete the booking
  await prisma.booking.delete({
    where: { id },
  });

  return {
    id,
    message: "Booking deleted successfully",
  };
};
