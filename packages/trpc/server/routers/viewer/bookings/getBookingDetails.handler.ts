import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetBookingDetailsInputSchema } from "./getBookingDetails.schema";

type GetBookingDetailsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetBookingDetailsInputSchema;
};

export const getBookingDetailsHandler = async ({ ctx, input }: GetBookingDetailsOptions) => {
  const { user } = ctx;

  // Fetch the booking with minimal data needed for authorization
  const booking = await prisma.booking.findUnique({
    where: {
      uid: input.uid,
    },
    select: {
      id: true,
      userId: true,
      uid: true,
      rescheduled: true,
      fromReschedule: true,
      status: true,
      eventType: {
        select: {
          teamId: true,
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

  // Check authorization:
  // 1. User is the owner of the booking
  const isOwner = booking.userId === user.id;

  if (!isOwner) {
    // 2. User has booking.read permission to the booking's team
    if (!booking.eventType?.teamId) {
      // No team associated with booking and user is not owner
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to view this booking",
      });
    }

    const permissionCheckService = new PermissionCheckService();
    const hasPermission = await permissionCheckService.checkPermission({
      userId: user.id,
      teamId: booking.eventType.teamId,
      permission: "booking.read",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    if (!hasPermission) {
      // User doesn't have permission through team membership
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to view this booking",
      });
    }
  }

  if (!booking) {
    return null;
  }

  // Fetch rescheduled and previous bookings in parallel
  const [rescheduledToBooking, previousBooking] = await Promise.all([
    // For old rescheduled bookings, find the new booking
    booking.rescheduled
      ? prisma.booking.findFirst({
          where: {
            fromReschedule: booking.uid,
          },
          select: {
            uid: true,
          },
        })
      : Promise.resolve(null),
    // For new bookings that replaced an old one, fetch the previous booking's schedule
    booking.fromReschedule
      ? prisma.booking.findUnique({
          where: {
            uid: booking.fromReschedule,
          },
          select: {
            uid: true,
            startTime: true,
            endTime: true,
          },
        })
      : Promise.resolve(null),
  ]);

  return {
    rescheduledToBooking,
    previousBooking,
  };
};
