import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import type { EventBusyDetails } from "@calcom/types/Calendar";

const log = logger.getSubLogger({ prefix: ["[getGuestBusyTimes]"] });

/**
 * Attendee information from the original booking
 */
export interface BookingAttendee {
  email: string;
  name: string | null;
  timeZone: string;
}

/**
 * Cal.com user found from attendee email lookup
 */
interface CalComUser {
  id: number;
  email: string;
}

/**
 * Parameters for fetching guest busy times
 */
export interface GetGuestBusyTimesParams {
  /** UID of the booking being rescheduled */
  rescheduleUid: string;
  /** Start of the date range to check */
  startTime: Date;
  /** End of the date range to check */
  endTime: Date;
  /** Scheduling type of the event being rescheduled */
  schedulingType: SchedulingType | null;
}

/**
 * Result from guest busy times lookup
 */
export interface GuestBusyTimesResult {
  /** Combined busy times from all Cal.com user guests */
  busyTimes: EventBusyDetails[];
  /** Number of attendees who are Cal.com users */
  calComUserCount: number;
  /** Total number of attendees in the booking */
  totalAttendeeCount: number;
}

export interface IGuestBusyTimesService {
  prisma: PrismaClient;
}

/**
 * Service for fetching busy times of guests (attendees) when rescheduling a booking.
 *
 * This is used to ensure that when a host reschedules a booking, they can only
 * select time slots where the guest (if they're a Cal.com user) is also available.
 *
 * Key behaviors:
 * - Only applies when host reschedules (not attendee reschedule)
 * - Checks both ACCEPTED and PENDING bookings as busy
 * - Excludes the current booking being rescheduled
 * - Uses case-insensitive email matching
 * - Supports secondary/verified emails
 * - Skips for COLLECTIVE events (already coordinated)
 * - Fails gracefully (never blocks rescheduling on errors)
 */
export class GuestBusyTimesService {
  constructor(private readonly dependencies: IGuestBusyTimesService) {}

  /**
   * Fetches busy times for all Cal.com user guests of a booking being rescheduled.
   *
   * @param params - Parameters including rescheduleUid and date range
   * @returns Combined busy times from all Cal.com user guests, or empty array on error
   */
  async getGuestBusyTimes(params: GetGuestBusyTimesParams): Promise<GuestBusyTimesResult> {
    const { rescheduleUid, startTime, endTime, schedulingType } = params;

    // Skip for COLLECTIVE events - they already coordinate multiple hosts
    if (schedulingType === SchedulingType.COLLECTIVE) {
      log.debug("Skipping guest availability check for COLLECTIVE event");
      return {
        busyTimes: [],
        calComUserCount: 0,
        totalAttendeeCount: 0,
      };
    }

    try {
      // Step 1: Get the booking and its attendees
      const booking = await this.getBookingWithAttendees(rescheduleUid);

      if (!booking || !booking.attendees || booking.attendees.length === 0) {
        log.debug("No booking or attendees found for rescheduleUid", { rescheduleUid });
        return {
          busyTimes: [],
          calComUserCount: 0,
          totalAttendeeCount: 0,
        };
      }

      const attendees = booking.attendees;
      const totalAttendeeCount = attendees.length;

      // Step 2: Find Cal.com users among attendees
      const calComUsers = await this.findCalComUsersFromAttendees(attendees);

      if (calComUsers.length === 0) {
        log.debug("No Cal.com users found among attendees");
        return {
          busyTimes: [],
          calComUserCount: 0,
          totalAttendeeCount,
        };
      }

      log.debug(`Found ${calComUsers.length} Cal.com user(s) among ${totalAttendeeCount} attendee(s)`);

      // Step 3: Fetch busy times for each Cal.com user guest
      const allBusyTimes: EventBusyDetails[] = [];

      for (const user of calComUsers) {
        const userBusyTimes = await this.getUserBookingBusyTimes({
          userId: user.id,
          userEmail: user.email,
          startTime,
          endTime,
          excludeBookingUid: rescheduleUid,
        });

        allBusyTimes.push(...userBusyTimes);
      }

      log.debug(`Found ${allBusyTimes.length} busy time slot(s) from guest(s)`);

      return {
        busyTimes: allBusyTimes,
        calComUserCount: calComUsers.length,
        totalAttendeeCount,
      };
    } catch (error) {
      // Fail gracefully - never block rescheduling on errors
      log.error("Error fetching guest busy times, failing open", { error, rescheduleUid });
      return {
        busyTimes: [],
        calComUserCount: 0,
        totalAttendeeCount: 0,
      };
    }
  }

  /**
   * Fetches the booking and its attendees by UID.
   */
  private async getBookingWithAttendees(
    bookingUid: string
  ): Promise<{ id: number; attendees: BookingAttendee[] } | null> {
    const booking = await this.dependencies.prisma.booking.findUnique({
      where: { uid: bookingUid },
      select: {
        id: true,
        attendees: {
          select: {
            email: true,
            name: true,
            timeZone: true,
          },
        },
      },
    });

    return booking;
  }

  /**
   * Finds Cal.com users among the attendees using case-insensitive email matching.
   * Also checks secondary verified emails.
   */
  private async findCalComUsersFromAttendees(attendees: BookingAttendee[]): Promise<CalComUser[]> {
    const attendeeEmails = attendees.map((a) => a.email.toLowerCase());

    // Query 1: Find users by primary email (case-insensitive)
    const usersByPrimaryEmail = await this.dependencies.prisma.user.findMany({
      where: {
        email: {
          in: attendeeEmails,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    const foundPrimaryEmails = new Set(usersByPrimaryEmail.map((u) => u.email.toLowerCase()));
    const unmatchedEmails = attendeeEmails.filter((email) => !foundPrimaryEmails.has(email));

    // Query 2: Find users by verified secondary email for unmatched emails
    let usersBySecondaryEmail: CalComUser[] = [];

    if (unmatchedEmails.length > 0) {
      const secondaryEmailMatches = await this.dependencies.prisma.secondaryEmail.findMany({
        where: {
          email: {
            in: unmatchedEmails,
            mode: "insensitive",
          },
          emailVerified: {
            not: null, // Only verified secondary emails
          },
        },
        select: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      usersBySecondaryEmail = secondaryEmailMatches.map((match) => match.user);
    }

    // Combine and deduplicate by user ID
    const allUsers = [...usersByPrimaryEmail, ...usersBySecondaryEmail];
    const uniqueUsers = new Map<number, CalComUser>();

    for (const user of allUsers) {
      if (!uniqueUsers.has(user.id)) {
        uniqueUsers.set(user.id, user);
      }
    }

    return Array.from(uniqueUsers.values());
  }

  /**
   * Fetches busy times from a user's bookings.
   * Includes both ACCEPTED and PENDING bookings.
   * Excludes the booking being rescheduled.
   */
  private async getUserBookingBusyTimes(params: {
    userId: number;
    userEmail: string;
    startTime: Date;
    endTime: Date;
    excludeBookingUid: string;
  }): Promise<EventBusyDetails[]> {
    const { userId, userEmail, startTime, endTime, excludeBookingUid } = params;

    // Find all bookings where the user is either:
    // 1. The owner (userId matches)
    // 2. An attendee (email matches in attendees)
    const bookings = await this.dependencies.prisma.booking.findMany({
      where: {
        AND: [
          {
            uid: {
              not: excludeBookingUid, // Exclude the booking being rescheduled
            },
          },
          {
            status: {
              in: [BookingStatus.ACCEPTED, BookingStatus.PENDING], // Both accepted and pending
            },
          },
          {
            startTime: {
              lt: endTime, // Booking starts before our end time
            },
          },
          {
            endTime: {
              gt: startTime, // Booking ends after our start time
            },
          },
          {
            OR: [
              { userId }, // User owns the booking
              {
                attendees: {
                  some: {
                    email: {
                      equals: userEmail,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        uid: true,
        startTime: true,
        endTime: true,
        title: true,
        status: true,
      },
    });

    return bookings.map((booking) => ({
      start: booking.startTime,
      end: booking.endTime,
      title: booking.title || "Busy",
      source: `guest-booking-${booking.uid}`,
    }));
  }
}

/**
 * Creates an instance of GuestBusyTimesService with the given Prisma client.
 */
export function createGuestBusyTimesService(prisma: PrismaClient): GuestBusyTimesService {
  return new GuestBusyTimesService({ prisma });
}
