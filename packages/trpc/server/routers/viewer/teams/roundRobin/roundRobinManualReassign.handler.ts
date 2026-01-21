import { roundRobinManualReassignment } from "@calcom/features/ee/round-robin/roundRobinManualReassignment";
import { getBookingAccessService } from "@calcom/features/di/containers/BookingAccessService";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TRoundRobinManualReassignInputSchema } from "./roundRobinManualReassign.schema";

type RoundRobinManualReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TRoundRobinManualReassignInputSchema;
};

/**
 * Validates that the user has permission to reassign a booking to the target host.
 * Admins/Owners can reassign to ANY host.
 * Non-admin members can only reassign to hosts in their same group (filtered by groupId).
 * If no groups are configured (both null), allow reassignment (backward compatible).
 */
async function validateReassignmentPermissions(
  prisma: PrismaClient,
  userId: number,
  targetUserId: number,
  eventTypeId: number,
  teamId: number | null | undefined
): Promise<void> {
  let isTeamAdminOrOwner = false;
  if (teamId) {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
      select: { role: true },
    });
    if (membership?.role === MembershipRole.ADMIN) {
      isTeamAdminOrOwner = true;
    }
    if (membership?.role === MembershipRole.OWNER) {
      isTeamAdminOrOwner = true;
    }
  }

  if (isTeamAdminOrOwner) {
    return;
  }

  const requestingUserHost = await prisma.host.findUnique({
    where: {
      userId_eventTypeId: {
        userId,
        eventTypeId,
      },
    },
    select: { groupId: true },
  });

  const targetHost = await prisma.host.findUnique({
    where: {
      userId_eventTypeId: {
        userId: targetUserId,
        eventTypeId,
      },
    },
    select: { groupId: true },
  });

  if (requestingUserHost?.groupId) {
    if (!targetHost?.groupId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You can only reassign to hosts in your group",
      });
    }
    if (targetHost.groupId !== requestingUserHost.groupId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You can only reassign to hosts in your group",
      });
    }
  }
}

export const roundRobinManualReassignHandler = async ({
  ctx,
  input,
}: RoundRobinManualReassignOptions): Promise<{ success: boolean }> => {
  const { bookingId, teamMemberId, reassignReason } = input;
  const { prisma, user } = ctx;

  // Check if user has access to change booking
  const bookingAccessService = getBookingAccessService();
  const isAllowed = await bookingAccessService.doesUserIdHaveAccessToBooking({
    userId: user.id,
    bookingId,
  });

  if (!isAllowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission",
    });
  }

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: {
      eventTypeId: true,
      eventType: {
        select: { teamId: true },
      },
    },
  });

  if (!booking.eventTypeId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Booking requires an event type to reassign",
    });
  }

  await validateReassignmentPermissions(
    prisma,
    user.id,
    teamMemberId,
    booking.eventTypeId,
    booking.eventType?.teamId
  );

  await roundRobinManualReassignment({
    bookingId,
    newUserId: teamMemberId,
    orgId: user.organizationId,
    reassignReason,
    reassignedById: user.id,
  });

  return { success: true };
};

export default roundRobinManualReassignHandler;
