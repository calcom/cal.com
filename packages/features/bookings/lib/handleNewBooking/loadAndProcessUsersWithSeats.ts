import dayjs from "@calcom/dayjs";
import type { PrismaClient } from "@calcom/prisma";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";

import type { UsersWithDelegationCredentials } from "./loadAndValidateUsers";
import type { IsFixedAwareUser } from "./types";

interface LoadAndProcessUsersWithSeatsParams {
  qualifiedRRUsers: UsersWithDelegationCredentials;
  additionalFallbackRRUsers: UsersWithDelegationCredentials;
  fixedUsers: UsersWithDelegationCredentials;
  eventType: {
    id: number;
    seatsPerTimeSlot?: number | null;
    schedulingType?: SchedulingType | null;
  };
  reqBodyStart: string;
  prismaClient: PrismaClient;
}

interface LoadAndProcessUsersWithSeatsResult {
  users: IsFixedAwareUser[];
  isFirstSeat: boolean;
}

/**
 * Loads and processes users for a booking, handling seat-based bookings.
 * For seated events with existing bookings, it adjusts the user list to maintain
 * consistency with the original booking's host assignment.
 *
 * @param params - Configuration parameters for loading and processing users
 * @returns Processed users list and whether this is the first seat
 */
export async function loadAndProcessUsersWithSeats(
  params: LoadAndProcessUsersWithSeatsParams
): Promise<LoadAndProcessUsersWithSeatsResult> {
  const {
    qualifiedRRUsers,
    additionalFallbackRRUsers,
    fixedUsers,
    eventType,
    reqBodyStart,
    prismaClient,
  } = params;

  // Combine all users and ensure isFixed is always defined
  let users: IsFixedAwareUser[] = [
    ...qualifiedRRUsers.map((user) => ({ ...user, isFixed: user.isFixed ?? false })),
    ...additionalFallbackRRUsers.map((user) => ({ ...user, isFixed: user.isFixed ?? false })),
    ...fixedUsers.map((user) => ({ ...user, isFixed: user.isFixed ?? true })),
  ];
  let isFirstSeat = true;

  // Handle seat-based bookings
  if (eventType.seatsPerTimeSlot) {
    const booking = await prismaClient.booking.findFirst({
      where: {
        eventTypeId: eventType.id,
        startTime: new Date(dayjs(reqBodyStart).utc().format()),
        status: BookingStatus.ACCEPTED,
      },
      select: {
        userId: true,
        attendees: { select: { email: true } },
      },
    });

    if (booking) {
      isFirstSeat = false;

      // For round robin events, maintain the same host assignment
      if (eventType.schedulingType === SchedulingType.ROUND_ROBIN) {
        const fixedHosts = users.filter((user) => user.isFixed);
        const originalNonFixedHost = users.find((user) => !user.isFixed && user.id === booking.userId);

        if (originalNonFixedHost) {
          // If the original host is still available, use them
          users = [...fixedHosts, originalNonFixedHost];
        } else {
          // If the original host is not available, find them in the attendees
          const attendeeEmailSet = new Set(booking.attendees.map((attendee) => attendee.email));

          // In this case, the first booking user is a fixed host, so the chosen non-fixed host is added as an attendee of the booking
          const nonFixedAttendeeHost = users.find(
            (user) => !user.isFixed && attendeeEmailSet.has(user.email)
          );
          users = [...fixedHosts, ...(nonFixedAttendeeHost ? [nonFixedAttendeeHost] : [])];
        }
      }
    }
  }

  return {
    users,
    isFirstSeat,
  };
}
