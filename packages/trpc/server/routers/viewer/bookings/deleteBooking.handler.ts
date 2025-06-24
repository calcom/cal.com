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

  // First, get the booking with all necessary information
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      eventType: {
        include: {
          team: {
            include: {
              members: {
                where: {
                  userId: user.id,
                  accepted: true,
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
          id: true,
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

  // Check user permissions
  let hasPermission = false;

  if (booking.eventType?.team) {
    // For team bookings, check if user is OWNER or ADMIN of the team
    const membership = booking.eventType.team.members[0];
    if (
      membership &&
      (membership.role === MembershipRole.OWNER || membership.role === MembershipRole.ADMIN)
    ) {
      hasPermission = true;
    }
  } else {
    // For personal bookings, the booking owner can delete their own booking
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
