import { prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";

export type BookingForPermissionCheck = {
  id: number;
  userId: number | null;
  eventType?: {
    id: number;
    teamId: number | null;
    schedulingType: SchedulingType | null;
    userId: number | null;
    hosts?: Array<{
      userId: number;
      user?: {
        id: number;
        email: string;
      } | null;
    }>;
    team?: {
      id: number;
      parentId: number | null;
    } | null;
    parent?: {
      teamId: number | null;
    } | null;
  } | null;
  attendees?: Array<{
    email: string;
  }>;
};

/**
 * Determines if a user can view sensitive booking data (hidden fields and UTM parameters)
 * 
 * Rules:
 * - For personal events: only the host can view sensitive data
 * - For team events (round-robin, collective, managed): hosts, team members, and team admins can view
 * - Managed events resolve to their backing team for permission checks
 * 
 * @param userId - ID of the user requesting access
 * @param booking - Booking object with related event type and team data
 * @returns Promise<boolean> - true if user can view sensitive data
 */
export async function canViewSensitiveBookingData(
  userId: number,
  booking: BookingForPermissionCheck
): Promise<boolean> {
  if (!booking.eventType) {
    // If there's no event type, only the booking creator can see sensitive data
    return booking.userId === userId;
  }

  const { eventType } = booking;

  // Check if user is a host of the booking
  const isHost = await isUserHostOfBooking(userId, booking);
  if (isHost) {
    return true;
  }

  // For personal events (no team), only hosts can view sensitive data
  if (!eventType.teamId) {
    return false;
  }

  // For team events, resolve the owning team
  let owningTeamId = eventType.teamId;

  // Handle managed events - resolve to backing team
  if (eventType.schedulingType === SchedulingType.MANAGED && eventType.parent?.teamId) {
    owningTeamId = eventType.parent.teamId;
  }

  // Check if user is a member or admin of the owning team
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      teamId: owningTeamId,
      accepted: true,
    },
    select: {
      role: true,
    },
  });

  return !!membership;
}

/**
 * Checks if a user is a host of a specific booking
 * 
 * @param userId - ID of the user to check
 * @param booking - Booking object with related data
 * @returns Promise<boolean> - true if user is a host
 */
async function isUserHostOfBooking(
  userId: number,
  booking: BookingForPermissionCheck
): Promise<boolean> {
  // Check if user is the booking creator
  if (booking.userId === userId) {
    return true;
  }

  if (!booking.eventType) {
    return false;
  }

  // Check if user is listed as a host in the event type
  if (booking.eventType.hosts && booking.eventType.hosts.length > 0) {
    const userEmails = new Set(
      booking.attendees?.map((attendee) => attendee.email) || []
    );

    const isHostWithAttendee = booking.eventType.hosts.some(({ user: hostUser }) => {
      return hostUser?.id === userId && userEmails.has(hostUser.email);
    });

    if (isHostWithAttendee) {
      return true;
    }
  }

  // For collective events, check if user is one of the users associated with the event type
  if (booking.eventType.schedulingType === SchedulingType.COLLECTIVE) {
    const eventTypeWithUsers = await prisma.eventType.findUnique({
      where: { id: booking.eventType.id },
      select: {
        users: {
          select: {
            id: true,
          },
        },
      },
    });

    if (eventTypeWithUsers?.users.some((user) => user.id === userId)) {
      return true;
    }
  }

  return false;
}

/**
 * Helper function to get the owning team ID for a booking, resolving managed events
 * 
 * @param booking - Booking object with event type data
 * @returns number | null - The owning team ID or null for personal events
 */
export function getOwningTeamId(booking: BookingForPermissionCheck): number | null {
  if (!booking.eventType?.teamId) {
    return null;
  }

  // Handle managed events - resolve to backing team
  if (
    booking.eventType.schedulingType === SchedulingType.MANAGED &&
    booking.eventType.parent?.teamId
  ) {
    return booking.eventType.parent.teamId;
  }

  return booking.eventType.teamId;
}
