import type { CreateBookingMeta, CreateRecurringBookingData } from "@calcom/features/bookings/lib/dto/types";
import type { BookingResponse } from "@calcom/features/bookings/types";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import type { AppsStatus } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { checkMultipleSlotAvailability } from "../handleNewBooking/checkMultipleSlotAvailability";
import { getEventType } from "../handleNewBooking/getEventType";
import type { getEventTypeResponse } from "../handleNewBooking/getEventTypesFromDB";
import { loadAndProcessUsersWithSeats } from "../handleNewBooking/loadAndProcessUsersWithSeats";
import { loadAndValidateUsers } from "../handleNewBooking/loadAndValidateUsers";
import type { IBookingService } from "../interfaces/IBookingService";
import type { IsFixedAwareUserWithCredentials, RegularBookingService } from "./RegularBookingService";


export type BookingHandlerInput = {
  bookingData: CreateRecurringBookingData;
} & CreateBookingMeta;

export const handleNewRecurringBooking = async (
  input: BookingHandlerInput,
  deps: IRecurringBookingServiceDependencies
): Promise<BookingResponse[]> => {
  const data = input.bookingData;
  const { regularBookingService } = deps;
  const createdBookings: BookingResponse[] = [];
  const allRecurringDates: { start: string; end: string | undefined }[] = data.map((booking) => {
    return { start: booking.start, end: booking.end };
  });
  const appsStatus: AppsStatus[] | undefined = undefined;

  const numSlotsToCheckForAvailability = 1;

  let thirdPartyRecurringEventId = null;

  const firstBooking = data[0];
  const isRoundRobin = firstBooking.schedulingType === SchedulingType.ROUND_ROBIN;

  const availabilityResults: Map<number, { isAvailable: boolean; reason?: string }> = new Map();

  if (
    allRecurringDates &&
    allRecurringDates.length > 0 &&
    firstBooking.eventTypeId &&
    numSlotsToCheckForAvailability > 0
  ) {
    const eventTypeWithUsers = await getEventType({
      eventTypeId: firstBooking.eventTypeId,
      eventTypeSlug: firstBooking.eventTypeSlug,
    });

    const isTeamEvent =
      eventTypeWithUsers.schedulingType === SchedulingType.COLLECTIVE ||
      eventTypeWithUsers.schedulingType === SchedulingType.ROUND_ROBIN;

    const loggerWithEventDetails = logger.getSubLogger({
      prefix: ["[recurring-booking-availability]"],
    });

    const { qualifiedRRUsers, additionalFallbackRRUsers, fixedUsers } = await loadAndValidateUsers({
      hostname: input.hostname,
      forcedSlug: input.forcedSlug,
      isPlatform: !!input.platformClientId,
      eventType: eventTypeWithUsers,
      eventTypeId: firstBooking.eventTypeId,
      dynamicUserList: [],
      logger: loggerWithEventDetails,
      routedTeamMemberIds: null,
      contactOwnerEmail: null,
      rescheduleUid: null,
      routingFormResponse: null,
    });

    const processedUsersResult = await loadAndProcessUsersWithSeats({
      qualifiedRRUsers,
      additionalFallbackRRUsers,
      fixedUsers,
      eventType: eventTypeWithUsers,
      reqBodyStart: firstBooking.start,
      prismaClient: deps.prismaClient,
    });

    const eventTypeWithProcessedUsers: Omit<getEventTypeResponse, "users"> & {
      users: IsFixedAwareUserWithCredentials[];
    } = {
      ...eventTypeWithUsers,
      users: processedUsersResult.users as IsFixedAwareUserWithCredentials[],
      ...(eventTypeWithUsers.recurringEvent && {
        recurringEvent: {
          ...eventTypeWithUsers.recurringEvent,
          count:
            //  recurringCount ||
            eventTypeWithUsers.recurringEvent.count,
        },
      }),
    };

    const fixedUsersForAvailability = isTeamEvent
      ? processedUsersResult.users.filter((user) => user.isFixed)
      : [];

    console.log(`Checking availability for ${allRecurringDates.length} slots with single API call...`);

    const timeSlots = allRecurringDates
      .filter((date) => date.start && date.end)
      .map((date) => ({
        start: date.start,
        end: date.end!,
      }));

    if (timeSlots.length > 0) {
      if (isTeamEvent) {
        for (const user of fixedUsersForAvailability) {
          try {
            const slotResults = await checkMultipleSlotAvailability(
              { ...eventTypeWithProcessedUsers, users: [user] },
              {
                timeSlots,
                timeZone: firstBooking.timeZone,
                originalRescheduledBooking: null,
              },
              loggerWithEventDetails,
              false
            );

            slotResults.forEach((result) => {
              const existingResult = availabilityResults.get(result.slotIndex);
              if (!result.isAvailable) {
                availabilityResults.set(result.slotIndex, {
                  isAvailable: false,
                  reason: result.reason,
                });
              } else if (!existingResult) {
                availabilityResults.set(result.slotIndex, {
                  isAvailable: true,
                });
              }
            });

            console.log(`  ✓ Checked availability for user ${user.id}`);
          } catch (error) {
            console.log(`  ✗ Error checking user ${user.id}:`, error);
            for (let i = 0; i < timeSlots.length; i++) {
              availabilityResults.set(i, {
                isAvailable: false,
                reason: "Error checking availability",
              });
            }
          }
        }
      } else {
        try {
          const slotResults = await checkMultipleSlotAvailability(
            eventTypeWithProcessedUsers,
            {
              timeSlots,
              timeZone: firstBooking.timeZone,
              originalRescheduledBooking: null,
            },
            loggerWithEventDetails,
            false
          );

          slotResults.forEach((result) => {
            availabilityResults.set(result.slotIndex, {
              isAvailable: result.isAvailable,
              reason: result.reason,
            });
          });

          const availableCount = slotResults.filter((r) => r.isAvailable).length;
          console.log(`  ✓ Checked ${timeSlots.length} slots: ${availableCount} available`);
        } catch (error) {
          console.log("  ✗ Error checking availability:", error);
          for (let i = 0; i < timeSlots.length; i++) {
            availabilityResults.set(i, {
              isAvailable: false,
              reason: "Error checking availability",
            });
          }
        }
      }
    }
  }

  let luckyUsers = undefined;

  const handleBookingMeta = {
    userId: input.userId,
    platformClientId: input.platformClientId,
    platformRescheduleUrl: input.platformRescheduleUrl,
    platformCancelUrl: input.platformCancelUrl,
    platformBookingUrl: input.platformBookingUrl,
    platformBookingLocation: input.platformBookingLocation,
    areCalendarEventsEnabled: input.areCalendarEventsEnabled,
  };

  if (isRoundRobin) {
    const recurringEventData = {
      ...firstBooking,
      appsStatus,
      allRecurringDates,
      isFirstRecurringSlot: true,
      thirdPartyRecurringEventId,
      numSlotsToCheckForAvailability,
      currentRecurringIndex: 0,
      noEmail: input.noEmail !== undefined ? input.noEmail : false,
    };

    const firstBookingResult = await regularBookingService.createBooking({
      bookingData: recurringEventData,
      bookingMeta: {
        hostname: input.hostname || "",
        forcedSlug: input.forcedSlug as string | undefined,
        ...handleBookingMeta,
      },
    });
    luckyUsers = firstBookingResult.luckyUsers;
  }

  for (let key = isRoundRobin ? 1 : 0; key < data.length; key++) {
    const booking = data[key];
    // Disable AppStatus in Recurring Booking Email as it requires us to iterate backwards to be able to compute the AppsStatus for all the bookings except the very first slot and then send that slot's email with statuses
    // It is also doubtful that how useful is to have the AppsStatus of all the bookings in the email.
    // It is more important to iterate forward and check for conflicts for only first few bookings defined by 'numSlotsToCheckForAvailability'
    // if (key === 0) {
    //   const calcAppsStatus: { [key: string]: AppsStatus } = createdBookings
    //     .flatMap((book) => (book.appsStatus !== undefined ? book.appsStatus : []))
    //     .reduce((prev, curr) => {
    //       if (prev[curr.type]) {
    //         prev[curr.type].failures += curr.failures;
    //         prev[curr.type].success += curr.success;
    //       } else {
    //         prev[curr.type] = curr;
    //       }
    //       return prev;
    //     }, {} as { [key: string]: AppsStatus });
    //   appsStatus = Object.values(calcAppsStatus);
    // }
    const slotAvailability = availabilityResults.get(key);

    const recurringEventData = {
      ...booking,
      appsStatus,
      allRecurringDates,
      isFirstRecurringSlot: key == 0,
      thirdPartyRecurringEventId,
      numSlotsToCheckForAvailability,
      currentRecurringIndex: key,
      noEmail: input.noEmail !== undefined ? input.noEmail : key !== 0,
      luckyUsers,
      // Pass availability override if we have checked this slot
      _availabilityOverride: slotAvailability
        ? {
            isAvailable: slotAvailability.isAvailable,
            reason: slotAvailability.reason,
          }
        : undefined,
    };

    const promiseEachRecurringBooking = regularBookingService.createBooking({
      bookingData: recurringEventData,
      bookingMeta: {
        hostname: input.hostname || "",
        forcedSlug: input.forcedSlug as string | undefined,
        ...handleBookingMeta,
      },
    });

    const eachRecurringBooking = await promiseEachRecurringBooking;

    createdBookings.push(eachRecurringBooking);

    if (!thirdPartyRecurringEventId) {
      if (eachRecurringBooking.references && eachRecurringBooking.references.length > 0) {
        for (const reference of eachRecurringBooking.references) {
          if (reference.thirdPartyRecurringEventId) {
            thirdPartyRecurringEventId = reference.thirdPartyRecurringEventId;
            break;
          }
        }
      }
    }
  }
  return createdBookings;
};

export interface IRecurringBookingServiceDependencies {
  regularBookingService: RegularBookingService;
  prismaClient: PrismaClient;
}

/**
 * Recurring Booking Service takes care of creating/rescheduling recurring bookings.
 */
export class RecurringBookingService implements IBookingService {
  constructor(private readonly deps: IRecurringBookingServiceDependencies) {}

  async createBooking(input: {
    bookingData: CreateRecurringBookingData;
    bookingMeta?: CreateBookingMeta;
  }): Promise<BookingResponse[]> {
    const handlerInput = { bookingData: input.bookingData, ...(input.bookingMeta || {}) };
    return handleNewRecurringBooking(handlerInput, this.deps);
  }

  async rescheduleBooking(input: {
    bookingData: CreateRecurringBookingData;
    bookingMeta?: CreateBookingMeta;
  }): Promise<BookingResponse[]> {
    const handlerInput = { bookingData: input.bookingData, ...(input.bookingMeta || {}) };
    return handleNewRecurringBooking(handlerInput, this.deps);
  }
}