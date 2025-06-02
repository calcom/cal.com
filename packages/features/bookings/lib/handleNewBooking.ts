// eslint-disable-next-line no-restricted-imports
import short, { uuid } from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import dayjs from "@calcom/dayjs";
import getICalUID from "@calcom/emails/lib/getICalUID";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { isEventTypeLoggingEnabled } from "@calcom/features/bookings/lib/isEventTypeLoggingEnabled";
import { getShouldServeCache } from "@calcom/features/calendar-cache/lib/getShouldServeCache";
import { getFullName } from "@calcom/features/form-builder/utils";
import { UsersRepository } from "@calcom/features/users/users.repository";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import { shouldIgnoreContactOwner } from "@calcom/lib/bookings/routing/utils";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import {
  enrichHostsWithDelegationCredentials,
  getFirstDelegationConferencingCredentialAppLocation,
} from "@calcom/lib/delegationCredential/server";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { extractBaseEmail } from "@calcom/lib/extract-base-email";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getPaymentAppData } from "@calcom/lib/getPaymentAppData";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { getPiiFreeEventType } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getLuckyUser } from "@calcom/lib/server/getLuckyUser";
import { getTranslation } from "@calcom/lib/server/i18n";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import prisma from "@calcom/prisma";
import { BookingStatus, SchedulingType, WebhookTriggerEvents } from "@calcom/prisma/enums";
import { CreationSource } from "@calcom/prisma/enums";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";
import { getAllWorkflowsFromEventType } from "@calcom/trpc/server/routers/viewer/workflows/util";
import type { AppsStatus } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import type { EventTypeInfo } from "../../webhooks/lib/sendPayload";
import { getAllCredentialsIncludeServiceAccountKey } from "./getAllCredentialsForUsersOnEvent/getAllCredentials";
import { refreshCredentials } from "./getAllCredentialsForUsersOnEvent/refreshCredentials";
import getBookingDataSchema from "./getBookingDataSchema";
import { checkBookingAndDurationLimits } from "./handleNewBooking/checkBookingAndDurationLimits";
import { checkIfBookerEmailIsBlocked } from "./handleNewBooking/checkIfBookerEmailIsBlocked";
import { createBooking } from "./handleNewBooking/createBooking";
import type { Booking } from "./handleNewBooking/createBooking";
import { ensureAvailableUsers } from "./handleNewBooking/ensureAvailableUsers";
import { getBookingData } from "./handleNewBooking/getBookingData";
import { getEventType } from "./handleNewBooking/getEventType";
import type { getEventTypeResponse } from "./handleNewBooking/getEventTypesFromDB";
import { getRequiresConfirmationFlags } from "./handleNewBooking/getRequiresConfirmationFlags";
import { getSeatedBooking } from "./handleNewBooking/getSeatedBooking";
import { loadAndValidateUsers } from "./handleNewBooking/loadAndValidateUsers";
import { createLoggerWithEventDetails } from "./handleNewBooking/logger";
import { getOriginalRescheduledBooking } from "./handleNewBooking/originalRescheduledBookingUtils";
import type { Invitee, IsFixedAwareUser, PlatformParams } from "./handleNewBooking/types";
import { validateBookingTimeIsNotOutOfBounds } from "./handleNewBooking/validateBookingTimeIsNotOutOfBounds";
import { validateEventLength } from "./handleNewBooking/validateEventLength";
import handleSeats from "./handleSeats/handleSeats";
import { onBookingCreationInDb } from "./onBookingCreationInDb";
import { buildEvent, getDestinationCalendar, getICalSequence } from "./wip-utils";

const translator = short();
const log = logger.getSubLogger({ prefix: ["[api] book:user"] });

type IsFixedAwareUserWithCredentials = Omit<IsFixedAwareUser, "credentials"> & {
  credentials: CredentialForCalendarService[];
};

function assertNonEmptyArray<T>(arr: T[]): asserts arr is [T, ...T[]] {
  if (arr.length === 0) {
    throw new Error("Array should have at least one item, but it's empty");
  }
}

type BookingDataSchemaGetter =
  | typeof getBookingDataSchema
  | typeof import("@calcom/features/bookings/lib/getBookingDataSchemaForApi").default;

type CreatedBooking = Booking & { appsStatus?: AppsStatus[]; paymentUid?: string; paymentId?: number };
type ReturnTypeCreateBooking = Awaited<ReturnType<typeof createBooking>>;
export const buildDryRunBooking = ({
  eventTypeId,
  organizerUser,
  eventName,
  startTime,
  endTime,
  contactOwnerFromReq,
  contactOwnerEmail,
  allHostUsers,
  isManagedEventType,
}: {
  eventTypeId: number;
  organizerUser: {
    id: number;
    name: string | null;
    username: string | null;
    email: string;
    timeZone: string;
  };
  eventName: string;
  startTime: string;
  endTime: string;
  contactOwnerFromReq: string | null;
  contactOwnerEmail: string | null;
  allHostUsers: { id: number }[];
  isManagedEventType: boolean;
}) => {
  const sanitizedOrganizerUser = {
    id: organizerUser.id,
    name: organizerUser.name,
    username: organizerUser.username,
    email: organizerUser.email,
    timeZone: organizerUser.timeZone,
  };
  const booking = {
    id: -101,
    uid: "DRY_RUN_UID",
    iCalUID: "DRY_RUN_ICAL_UID",
    status: BookingStatus.ACCEPTED,
    eventTypeId: eventTypeId,
    user: sanitizedOrganizerUser,
    userId: sanitizedOrganizerUser.id,
    title: eventName,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    createdAt: new Date(),
    updatedAt: new Date(),
    attendees: [],
    oneTimePassword: null,
    smsReminderNumber: null,
    metadata: {},
    idempotencyKey: null,
    userPrimaryEmail: null,
    description: null,
    customInputs: null,
    responses: null,
    location: null,
    paid: false,
    cancellationReason: null,
    rejectionReason: null,
    dynamicEventSlugRef: null,
    dynamicGroupSlugRef: null,
    fromReschedule: null,
    recurringEventId: null,
    scheduledJobs: [],
    rescheduledBy: null,
    destinationCalendarId: null,
    reassignReason: null,
    reassignById: null,
    rescheduled: false,
    isRecorded: false,
    iCalSequence: 0,
    rating: null,
    ratingFeedback: null,
    noShowHost: null,
    cancelledBy: null,
    creationSource: CreationSource.WEBAPP,
    references: [],
    payment: [],
  } satisfies ReturnTypeCreateBooking;

  /**
   * Troubleshooting data
   */
  const troubleshooterData = {
    organizerUserId: organizerUser.id,
    eventTypeId,
    askedContactOwnerEmail: contactOwnerFromReq,
    usedContactOwnerEmail: contactOwnerEmail,
    allHostUsers: allHostUsers.map((user) => user.id),
    isManagedEventType: isManagedEventType,
  };

  return {
    booking,
    troubleshooterData,
  };
};

function buildTroubleshooterData({
  eventType,
}: {
  eventType: {
    id: number;
    slug: string;
  };
}) {
  const troubleshooterData: {
    organizerUser: {
      id: number;
    } | null;
    eventType: {
      id: number;
      slug: string;
    };
    allHostUsers: number[];
    luckyUsers: number[];
    luckyUserPool: number[];
    fixedUsers: number[];
    luckyUsersFromFirstBooking: number[];
    usedContactOwnerEmail: string | null;
    askedContactOwnerEmail: string | null;
    isManagedEventType: boolean;
  } = {
    organizerUser: null,
    eventType: {
      id: eventType.id,
      slug: eventType.slug,
    },
    luckyUsers: [],
    luckyUserPool: [],
    fixedUsers: [],
    luckyUsersFromFirstBooking: [],
    usedContactOwnerEmail: null,
    allHostUsers: [],
    askedContactOwnerEmail: null,
    isManagedEventType: false,
  };
  return troubleshooterData;
}

export type BookingHandlerInput = {
  bookingData: Record<string, any>;
  userId?: number;
  // These used to come from headers but now we're passing them as params
  hostname?: string;
  forcedSlug?: string;
} & PlatformParams;

async function handler(
  input: BookingHandlerInput,
  bookingDataSchemaGetter: BookingDataSchemaGetter = getBookingDataSchema
) {
  const {
    bookingData: rawBookingData,
    userId,
    platformClientId,
    platformCancelUrl,
    platformBookingUrl,
    platformRescheduleUrl,
    platformBookingLocation,
    hostname,
    forcedSlug,
  } = input;

  const isPlatformBooking = !!platformClientId;

  const eventType = await getEventType({
    eventTypeId: rawBookingData.eventTypeId,
    eventTypeSlug: rawBookingData.eventTypeSlug,
  });

  console.log("GOT EVENT TYPE", {
    eventType,
    eventTypeId: rawBookingData.eventTypeId,
    eventTypeSlug: rawBookingData.eventTypeSlug,
  });

  const bookingDataSchema = bookingDataSchemaGetter({
    view: rawBookingData.rescheduleUid ? "reschedule" : "booking",
    bookingFields: eventType.bookingFields,
  });

  const bookingData = await getBookingData({
    reqBody: rawBookingData,
    eventType,
    schema: bookingDataSchema,
  });

  const {
    recurringCount,
    noEmail,
    eventTypeId,
    eventTypeSlug,
    language,
    appsStatus: reqAppsStatus,
    name: bookerName,
    attendeePhoneNumber: bookerPhoneNumber,
    email: bookerEmail,
    guests: reqGuests,
    location,
    notes: additionalNotes,
    smsReminderNumber,
    rescheduleReason,
    luckyUsers,
    routedTeamMemberIds,
    reroutingFormResponses,
    routingFormResponseId,
    _isDryRun: isDryRun = false,
    _shouldServeCache,
    ...reqBody
  } = bookingData;

  let troubleshooterData = buildTroubleshooterData({
    eventType,
  });

  const loggerWithEventDetails = createLoggerWithEventDetails(eventTypeId, reqBody.user, eventTypeSlug);

  await checkIfBookerEmailIsBlocked({ loggedInUserId: userId, bookerEmail });

  if (isEventTypeLoggingEnabled({ eventTypeId, usernameOrTeamName: reqBody.user })) {
    logger.settings.minLevel = 0;
  }

  const fullName = getFullName(bookerName);
  // Why are we only using "en" locale
  const tGuests = await getTranslation("en", "common");

  const dynamicUserList = Array.isArray(reqBody.user) ? reqBody.user : getUsernameList(reqBody.user);
  if (!eventType) throw new HttpError({ statusCode: 404, message: "event_type_not_found" });

  if (eventType.seatsPerTimeSlot && eventType.recurringEvent) {
    throw new HttpError({
      statusCode: 400,
      message: "recurring_event_seats_error",
    });
  }

  const bookingSeat = reqBody.rescheduleUid ? await getSeatedBooking(reqBody.rescheduleUid) : null;
  const rescheduleUid = bookingSeat ? bookingSeat.booking.uid : reqBody.rescheduleUid;

  let originalRescheduledBooking = rescheduleUid
    ? await getOriginalRescheduledBooking(rescheduleUid, !!eventType.seatsPerTimeSlot)
    : null;

  const paymentAppData = getPaymentAppData({
    ...eventType,
    metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
  });

  const { userReschedulingIsOwner, isConfirmedByDefault } = await getRequiresConfirmationFlags({
    eventType,
    bookingStartTime: reqBody.start,
    userId,
    originalRescheduledBookingOrganizerId: originalRescheduledBooking?.user?.id,
    paymentAppData,
    bookerEmail,
  });

  // For unconfirmed bookings or round robin bookings with the same attendee and timeslot, return the original booking
  if (
    (!isConfirmedByDefault && !userReschedulingIsOwner) ||
    eventType.schedulingType === SchedulingType.ROUND_ROBIN
  ) {
    const existingBooking = await BookingRepository.getValidBookingFromEventTypeForAttendee({
      eventTypeId,
      bookerEmail,
      bookerPhoneNumber,
      startTime: new Date(dayjs(reqBody.start).utc().format()),
      filterForUnconfirmed: !isConfirmedByDefault,
    });

    if (existingBooking) {
      const bookingResponse = {
        ...existingBooking,
        user: {
          ...existingBooking.user,
          email: null,
        },
        paymentRequired: false,
        seatReferenceUid: "",
      };

      return {
        ...bookingResponse,
        luckyUsers: bookingResponse.userId ? [bookingResponse.userId] : [],
        isDryRun,
        ...(isDryRun ? { troubleshooterData } : {}),
        paymentUid: undefined,
        paymentId: undefined,
      };
    }
  }

  const shouldServeCache = await getShouldServeCache(_shouldServeCache, eventType.team?.id);

  const isTeamEventType =
    !!eventType.schedulingType && ["COLLECTIVE", "ROUND_ROBIN"].includes(eventType.schedulingType);

  loggerWithEventDetails.info(
    `Booking eventType ${eventTypeId} started`,
    safeStringify({
      reqBody: {
        user: reqBody.user,
        eventTypeId,
        eventTypeSlug,
        startTime: reqBody.start,
        endTime: reqBody.end,
        rescheduleUid: reqBody.rescheduleUid,
        location: location,
        timeZone: reqBody.timeZone,
      },
      isTeamEventType,
      eventType: getPiiFreeEventType(eventType),
      dynamicUserList,
      paymentAppData: {
        enabled: paymentAppData.enabled,
        price: paymentAppData.price,
        paymentOption: paymentAppData.paymentOption,
        currency: paymentAppData.currency,
        appId: paymentAppData.appId,
      },
    })
  );

  const user = eventType.users.find((user) => user.id === eventType.userId);
  const userSchedule = user?.schedules.find((schedule) => schedule.id === user?.defaultScheduleId);
  const eventTimeZone = eventType.schedule?.timeZone ?? userSchedule?.timeZone;

  await validateBookingTimeIsNotOutOfBounds<typeof eventType>(
    reqBody.start,
    reqBody.timeZone,
    eventType,
    eventTimeZone,
    loggerWithEventDetails
  );

  validateEventLength({
    reqBodyStart: reqBody.start,
    reqBodyEnd: reqBody.end,
    eventTypeMultipleDuration: eventType.metadata?.multipleDuration,
    eventTypeLength: eventType.length,
    logger: loggerWithEventDetails,
  });

  const contactOwnerFromReq = reqBody.teamMemberEmail ?? null;

  const skipContactOwner = shouldIgnoreContactOwner({
    skipContactOwner: reqBody.skipContactOwner ?? null,
    rescheduleUid: reqBody.rescheduleUid ?? null,
    routedTeamMemberIds: routedTeamMemberIds ?? null,
  });

  const contactOwnerEmail = skipContactOwner ? null : contactOwnerFromReq;

  let routingFormResponse = null;

  if (routedTeamMemberIds) {
    //routingFormResponseId could be 0 for dry run. So, we just avoid undefined value
    if (routingFormResponseId === undefined) {
      throw new HttpError({ statusCode: 400, message: "Missing routingFormResponseId" });
    }
    routingFormResponse = await prisma.app_RoutingForms_FormResponse.findUnique({
      where: {
        id: routingFormResponseId,
      },
      select: {
        response: true,
        form: {
          select: {
            routes: true,
            fields: true,
          },
        },
        chosenRouteId: true,
      },
    });
  }

  const { qualifiedRRUsers, additionalFallbackRRUsers, fixedUsers } = await loadAndValidateUsers({
    hostname,
    forcedSlug,
    isPlatform: isPlatformBooking,
    eventType,
    eventTypeId,
    dynamicUserList,
    logger: loggerWithEventDetails,
    routedTeamMemberIds: routedTeamMemberIds ?? null,
    contactOwnerEmail,
    rescheduleUid: reqBody.rescheduleUid || null,
    routingFormResponse,
  });

  // We filter out users but ensure allHostUsers remain same.
  let users = [...qualifiedRRUsers, ...additionalFallbackRRUsers, ...fixedUsers];

  const firstUser = users[0];

  // let { locationBodyString, organizerOrFirstDynamicGroupMemberDefaultLocationUrl } = getLocationValuesForDb({
  //   dynamicUserList,
  //   users,
  //   location,
  // });

  await checkBookingAndDurationLimits({
    eventType,
    reqBodyStart: reqBody.start,
    reqBodyRescheduleUid: reqBody.rescheduleUid,
  });

  let luckyUserResponse;
  let isFirstSeat = true;

  if (eventType.seatsPerTimeSlot) {
    const booking = await prisma.booking.findFirst({
      where: {
        eventTypeId: eventType.id,
        startTime: new Date(dayjs(reqBody.start).utc().format()),
        status: BookingStatus.ACCEPTED,
      },
    });

    if (booking) isFirstSeat = false;
  }

  //checks what users are available
  if (isFirstSeat) {
    const eventTypeWithUsers: Omit<getEventTypeResponse, "users"> & {
      users: IsFixedAwareUserWithCredentials[];
    } = {
      ...eventType,
      users: users as IsFixedAwareUserWithCredentials[],
      ...(eventType.recurringEvent && {
        recurringEvent: {
          ...eventType.recurringEvent,
          count: recurringCount || eventType.recurringEvent.count,
        },
      }),
    };
    if (input.bookingData.allRecurringDates && input.bookingData.isFirstRecurringSlot) {
      const isTeamEvent =
        eventType.schedulingType === SchedulingType.COLLECTIVE ||
        eventType.schedulingType === SchedulingType.ROUND_ROBIN;

      const fixedUsers = isTeamEvent
        ? eventTypeWithUsers.users.filter((user: IsFixedAwareUserWithCredentials) => user.isFixed)
        : [];

      for (
        let i = 0;
        i < input.bookingData.allRecurringDates.length &&
        i < input.bookingData.numSlotsToCheckForAvailability;
        i++
      ) {
        const start = input.bookingData.allRecurringDates[i].start;
        const end = input.bookingData.allRecurringDates[i].end;
        if (isTeamEvent) {
          // each fixed user must be available
          for (const key in fixedUsers) {
            await ensureAvailableUsers(
              { ...eventTypeWithUsers, users: [fixedUsers[key]] },
              {
                dateFrom: dayjs(start).tz(reqBody.timeZone).format(),
                dateTo: dayjs(end).tz(reqBody.timeZone).format(),
                timeZone: reqBody.timeZone,
                originalRescheduledBooking: originalRescheduledBooking ?? null,
              },
              loggerWithEventDetails,
              shouldServeCache
            );
          }
        } else {
          eventTypeWithUsers.users[0].credentials;
          await ensureAvailableUsers(
            eventTypeWithUsers,
            {
              dateFrom: dayjs(start).tz(reqBody.timeZone).format(),
              dateTo: dayjs(end).tz(reqBody.timeZone).format(),
              timeZone: reqBody.timeZone,
              originalRescheduledBooking,
            },
            loggerWithEventDetails,
            shouldServeCache
          );
        }
      }
    }

    if (!input.bookingData.allRecurringDates || input.bookingData.isFirstRecurringSlot) {
      let availableUsers: IsFixedAwareUser[] = [];
      try {
        availableUsers = await ensureAvailableUsers(
          { ...eventTypeWithUsers, users: [...qualifiedRRUsers, ...fixedUsers] as IsFixedAwareUser[] },
          {
            dateFrom: dayjs(reqBody.start).tz(reqBody.timeZone).format(),
            dateTo: dayjs(reqBody.end).tz(reqBody.timeZone).format(),
            timeZone: reqBody.timeZone,
            originalRescheduledBooking,
          },
          loggerWithEventDetails,
          shouldServeCache
        );
      } catch {
        if (additionalFallbackRRUsers.length) {
          loggerWithEventDetails.debug(
            "Qualified users not available, check for fallback users",
            safeStringify({
              qualifiedRRUsers: qualifiedRRUsers.map((user) => user.id),
              additionalFallbackRRUsers: additionalFallbackRRUsers.map((user) => user.id),
            })
          );
          // can happen when contact owner not available for 2 weeks or fairness would block at least 2 weeks
          // use fallback instead
          availableUsers = await ensureAvailableUsers(
            {
              ...eventTypeWithUsers,
              users: [...additionalFallbackRRUsers, ...fixedUsers] as IsFixedAwareUser[],
            },
            {
              dateFrom: dayjs(reqBody.start).tz(reqBody.timeZone).format(),
              dateTo: dayjs(reqBody.end).tz(reqBody.timeZone).format(),
              timeZone: reqBody.timeZone,
              originalRescheduledBooking,
            },
            loggerWithEventDetails,
            shouldServeCache
          );
        } else {
          loggerWithEventDetails.debug(
            "Qualified users not available, no fallback users",
            safeStringify({
              qualifiedRRUsers: qualifiedRRUsers.map((user) => user.id),
            })
          );
          throw new Error(ErrorCode.NoAvailableUsersFound);
        }
      }

      const luckyUserPool: IsFixedAwareUser[] = [];
      const fixedUserPool: IsFixedAwareUser[] = [];

      availableUsers.forEach((user) => {
        user.isFixed ? fixedUserPool.push(user) : luckyUserPool.push(user);
      });

      const notAvailableLuckyUsers: typeof users = [];

      loggerWithEventDetails.debug(
        "Computed available users",
        safeStringify({
          availableUsers: availableUsers.map((user) => user.id),
          luckyUserPool: luckyUserPool.map((user) => user.id),
        })
      );

      const luckyUsers: typeof users = [];

      // loop through all non-fixed hosts and get the lucky users
      // This logic doesn't run when contactOwner is used because in that case, luckUsers.length === 1
      while (luckyUserPool.length > 0 && luckyUsers.length < 1 /* TODO: Add variable */) {
        const freeUsers = luckyUserPool.filter(
          (user) => !luckyUsers.concat(notAvailableLuckyUsers).find((existing) => existing.id === user.id)
        );
        // no more freeUsers after subtracting notAvailableLuckyUsers from luckyUsers :(
        if (freeUsers.length === 0) break;
        assertNonEmptyArray(freeUsers); // make sure TypeScript knows it too with an assertion; the error will never be thrown.
        // freeUsers is ensured

        const userIdsSet = new Set(users.map((user) => user.id));
        const firstUserOrgId = await getOrgIdFromMemberOrTeamId({
          memberId: eventTypeWithUsers.users[0].id ?? null,
          teamId: eventType.teamId,
        });
        const newLuckyUser = await getLuckyUser({
          // find a lucky user that is not already in the luckyUsers array
          availableUsers: freeUsers,
          allRRHosts: (
            await enrichHostsWithDelegationCredentials({
              orgId: firstUserOrgId ?? null,
              hosts: eventTypeWithUsers.hosts,
            })
          ).filter((host) => !host.isFixed && userIdsSet.has(host.user.id)),
          eventType,
          routingFormResponse,
        });
        if (!newLuckyUser) {
          break; // prevent infinite loop
        }
        if (
          input.bookingData.isFirstRecurringSlot &&
          eventType.schedulingType === SchedulingType.ROUND_ROBIN
        ) {
          // for recurring round robin events check if lucky user is available for next slots
          try {
            for (
              let i = 0;
              i < input.bookingData.allRecurringDates.length &&
              i < input.bookingData.numSlotsToCheckForAvailability;
              i++
            ) {
              const start = input.bookingData.allRecurringDates[i].start;
              const end = input.bookingData.allRecurringDates[i].end;

              await ensureAvailableUsers(
                { ...eventTypeWithUsers, users: [newLuckyUser] },
                {
                  dateFrom: dayjs(start).tz(reqBody.timeZone).format(),
                  dateTo: dayjs(end).tz(reqBody.timeZone).format(),
                  timeZone: reqBody.timeZone,
                  originalRescheduledBooking,
                },
                loggerWithEventDetails,
                shouldServeCache
              );
            }
            // if no error, then lucky user is available for the next slots
            luckyUsers.push(newLuckyUser);
          } catch {
            notAvailableLuckyUsers.push(newLuckyUser);
            loggerWithEventDetails.info(
              `Round robin host ${newLuckyUser.name} not available for first two slots. Trying to find another host.`
            );
          }
        } else {
          luckyUsers.push(newLuckyUser);
        }
      }
      // ALL fixed users must be available
      if (fixedUserPool.length !== users.filter((user) => user.isFixed).length) {
        throw new Error(ErrorCode.HostsUnavailableForBooking);
      }
      // Pushing fixed user before the luckyUser guarantees the (first) fixed user as the organizer.
      users = [...fixedUserPool, ...luckyUsers];
      luckyUserResponse = { luckyUsers: luckyUsers.map((u) => u.id) };
      troubleshooterData = {
        ...troubleshooterData,
        luckyUsers: luckyUsers.map((u) => u.id),
        fixedUsers: fixedUserPool.map((u) => u.id),
        luckyUserPool: luckyUserPool.map((u) => u.id),
      };
    } else if (
      input.bookingData.allRecurringDates &&
      eventType.schedulingType === SchedulingType.ROUND_ROBIN
    ) {
      // all recurring slots except the first one
      const luckyUsersFromFirstBooking = luckyUsers
        ? eventTypeWithUsers.users.filter((user) => luckyUsers.find((luckyUserId) => luckyUserId === user.id))
        : [];
      const fixedHosts = eventTypeWithUsers.users.filter((user: IsFixedAwareUser) => user.isFixed);
      users = [...fixedHosts, ...luckyUsersFromFirstBooking];
      troubleshooterData = {
        ...troubleshooterData,
        luckyUsersFromFirstBooking: luckyUsersFromFirstBooking.map((u) => u.id),
        fixedUsers: fixedHosts.map((u) => u.id),
      };
    }
  }

  if (users.length === 0 && eventType.schedulingType === SchedulingType.ROUND_ROBIN) {
    loggerWithEventDetails.error(`No available users found for round robin event.`);
    throw new Error(ErrorCode.NoAvailableUsersFound);
  }

  // If the team member is requested then they should be the organizer
  const organizerUser = reqBody.teamMemberEmail
    ? users.find((user) => user.email === reqBody.teamMemberEmail) ?? users[0]
    : users[0];

  const tOrganizer = await getTranslation(organizerUser?.locale ?? "en", "common");
  const allCredentials = await getAllCredentialsIncludeServiceAccountKey(organizerUser, eventType);

  // If the Organizer himself is rescheduling, the booker should be sent the communication in his timezone and locale.
  const attendeeInfoOnReschedule =
    userReschedulingIsOwner && originalRescheduledBooking
      ? originalRescheduledBooking.attendees.find((attendee) => attendee.email === bookerEmail)
      : null;

  const attendeeLanguage = attendeeInfoOnReschedule ? attendeeInfoOnReschedule.locale : language;
  const attendeeTimezone = attendeeInfoOnReschedule ? attendeeInfoOnReschedule.timeZone : reqBody.timeZone;

  const tAttendees = await getTranslation(attendeeLanguage ?? "en", "common");

  const isManagedEventType = !!eventType.parentId;

  // // If location passed is empty , use default location of event
  // // If location of event is not set , use host default
  // if (locationBodyString.trim().length == 0) {
  //   if (eventType.locations.length > 0) {
  //     locationBodyString = eventType.locations[0].type;
  //   } else {
  //     locationBodyString = OrganizerDefaultConferencingAppType;
  //   }
  // }

  const organizationDefaultLocation = getFirstDelegationConferencingCredentialAppLocation({
    credentials: firstUser.credentials,
  });

  // // use host default
  // if (locationBodyString == OrganizerDefaultConferencingAppType) {
  //   const metadataParseResult = userMetadataSchema.safeParse(organizerUser.metadata);
  //   const organizerMetadata = metadataParseResult.success ? metadataParseResult.data : undefined;
  //   if (organizerMetadata?.defaultConferencingApp?.appSlug) {
  //     const app = getAppFromSlug(organizerMetadata?.defaultConferencingApp?.appSlug);
  //     locationBodyString = app?.appData?.location?.type || locationBodyString;
  //     if (isManagedEventType || isTeamEventType) {
  //       organizerOrFirstDynamicGroupMemberDefaultLocationUrl =
  //         organizerMetadata?.defaultConferencingApp?.appLink;
  //     }
  //   } else if (organizationDefaultLocation) {
  //     locationBodyString = organizationDefaultLocation;
  //   } else {
  //     locationBodyString = "integrations:daily";
  //   }
  // }

  const invitee: Invitee = [
    {
      email: bookerEmail,
      name: fullName,
      phoneNumber: bookerPhoneNumber,
      firstName: (typeof bookerName === "object" && bookerName.firstName) || "",
      lastName: (typeof bookerName === "object" && bookerName.lastName) || "",
      timeZone: attendeeTimezone,
      language: { translate: tAttendees, locale: attendeeLanguage ?? "en" },
    },
  ];

  const blacklistedGuestEmails = process.env.BLACKLISTED_GUEST_EMAILS
    ? process.env.BLACKLISTED_GUEST_EMAILS.split(",")
    : [];

  const guestsRemoved: string[] = [];
  const guests = (reqGuests || []).reduce((guestArray, guest) => {
    const baseGuestEmail = extractBaseEmail(guest).toLowerCase();
    if (blacklistedGuestEmails.some((e) => e.toLowerCase() === baseGuestEmail)) {
      guestsRemoved.push(guest);
      return guestArray;
    }
    // If it's a team event, remove the team member from guests
    if (isTeamEventType && users.some((user) => user.email === guest)) {
      return guestArray;
    }
    guestArray.push({
      email: guest,
      name: "",
      firstName: "",
      lastName: "",
      timeZone: attendeeTimezone,
      language: { translate: tGuests, locale: "en" },
    });
    return guestArray;
  }, [] as Invitee);

  if (guestsRemoved.length > 0) {
    log.info("Removed guests from the booking", guestsRemoved);
  }

  const seed = `${organizerUser.username}:${dayjs(reqBody.start).utc().format()}:${new Date().getTime()}`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));

  // // For static link based video apps, it would have the static URL value instead of it's type(e.g. integrations:campfire_video)
  // // This ensures that createMeeting isn't called for static video apps as bookingLocation becomes just a regular value for them.
  // const { bookingLocation, conferenceCredentialId } = organizerOrFirstDynamicGroupMemberDefaultLocationUrl
  //   ? {
  //       bookingLocation: organizerOrFirstDynamicGroupMemberDefaultLocationUrl,
  //       conferenceCredentialId: undefined,
  //     }
  //   : getLocationValueForDB(locationBodyString, eventType.locations);

  const { bookingLocation, conferenceCredentialId } = decideLocation({
    dynamicUserList,
    users,
    location: reqBody.location,
    eventType,
    organizerUser,
    isManagedEventType,
    isTeamEventType,
  });

  const attendeesList = [...invitee, ...guests];

  const responses = reqBody.responses || null;

  const iCalUID = getICalUID({
    event: { iCalUID: originalRescheduledBooking?.iCalUID, uid: originalRescheduledBooking?.uid },
    uid,
  });
  // For bookings made before introducing iCalSequence, assume that the sequence should start at 1. For new bookings start at 0.
  const iCalSequence = getICalSequence(originalRescheduledBooking);
  const organizerOrganizationProfile = await prisma.profile.findFirst({
    where: {
      userId: organizerUser.id,
      username: dynamicUserList[0],
    },
  });

  const organizerOrganizationId = organizerOrganizationProfile?.organizationId;
  const bookerUrl = eventType.team
    ? await getBookerBaseUrl(eventType.team.parentId)
    : await getBookerBaseUrl(organizerOrganizationId ?? null);

  const destinationCalendar = getDestinationCalendar({ eventType, organizerUser });

  let organizerEmail = organizerUser.email || "Email-less";
  if (eventType.useEventTypeDestinationCalendarEmail && destinationCalendar?.[0]?.primaryEmail) {
    organizerEmail = destinationCalendar[0].primaryEmail;
  } else if (eventType.secondaryEmailId && eventType.secondaryEmail?.email) {
    organizerEmail = eventType.secondaryEmail.email;
  }

  //update cal event responses with latest location value , later used by webhook
  if (reqBody.calEventResponses)
    reqBody.calEventResponses["location"].value = {
      value: platformBookingLocation ?? bookingLocation,
      optionValue: "",
    };

  console.log("Calling buildEvent", {
    fullName,
    responses,
    eventType,
    organizerUser,
    organizerEmail,
    attendeesList,
    input,
  });
  const {
    evt: basicEvt,
    eventNameObject,
    eventName,
  } = await buildEvent({
    fullName,
    eventType,
    organizerUser,
    organizerEmail,
    attendeesList,
    bookerUrl,
    platformBookingLocation,
    bookingLocation,
    conferenceCredentialId,
    destinationCalendar,
    tOrganizer,
    isConfirmedByDefault,
    iCalUID,
    iCalSequence,
    platformClientId,
    platformRescheduleUrl,
    platformCancelUrl,
    platformBookingUrl,
    isTeamEventType,
    users,
    bookingData,
  });

  let evt = basicEvt;

  console.log("buildEvent returned", { evt, eventNameObject });

  // data needed for triggering webhooks
  const eventTypeInfo: EventTypeInfo = {
    eventTitle: eventType.title,
    eventDescription: eventType.description,
    price: paymentAppData.price,
    currency: eventType.currency,
    length: dayjs(reqBody.end).diff(dayjs(reqBody.start), "minutes"),
  };

  const teamId = await getTeamIdFromEventType({ eventType });

  const triggerForUser = !teamId || (teamId && eventType.parentId);

  const organizerUserId = triggerForUser ? organizerUser.id : null;

  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: organizerUserId, teamId });

  const subscriberOptions: GetSubscriberOptions = {
    userId: organizerUserId,
    eventTypeId,
    triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
    teamId,
    orgId,
    oAuthClientId: platformClientId,
  };

  const eventTrigger: WebhookTriggerEvents = rescheduleUid
    ? WebhookTriggerEvents.BOOKING_RESCHEDULED
    : WebhookTriggerEvents.BOOKING_CREATED;

  subscriberOptions.triggerEvent = eventTrigger;

  const workflows = await getAllWorkflowsFromEventType(
    {
      ...eventType,
      metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
    },
    organizerUser.id
  );

  // For seats, if the booking already exists then we want to add the new attendee to the existing booking
  if (eventType.seatsPerTimeSlot) {
    const newBooking = await handleSeats({
      rescheduleUid,
      reqBookingUid: reqBody.bookingUid,
      eventType,
      evt: { ...evt, bookerUrl },
      invitee,
      allCredentials,
      organizerUser,
      originalRescheduledBooking,
      bookerEmail,
      bookerPhoneNumber,
      tAttendees,
      bookingSeat,
      reqUserId: input.userId,
      rescheduleReason,
      reqBodyUser: reqBody.user,
      noEmail,
      isConfirmedByDefault,
      additionalNotes,
      reqAppsStatus,
      attendeeLanguage,
      paymentAppData,
      fullName,
      smsReminderNumber,
      eventTypeInfo,
      uid,
      eventTypeId,
      reqBodyMetadata: reqBody.metadata,
      subscriberOptions,
      eventTrigger,
      responses,
      workflows,
      rescheduledBy: reqBody.rescheduledBy,
      isDryRun,
    });

    if (newBooking) {
      const bookingResponse = {
        ...newBooking,
        user: {
          ...newBooking.user,
          email: null,
        },
        paymentRequired: false,
        isDryRun: isDryRun,
        ...(isDryRun ? { troubleshooterData } : {}),
      };
      return {
        ...bookingResponse,
        ...luckyUserResponse,
      };
    } else {
      // Rescheduling logic for the original seated event was handled in handleSeats
      // We want to use new booking logic for the new time slot
      originalRescheduledBooking = null;
      evt = CalendarEventBuilder.fromEvent(evt)
        .withIdentifiers({
          iCalUID: getICalUID({
            attendeeId: bookingSeat?.attendeeId,
          }),
        })
        .build();
    }
  }

  if (reqBody.recurringEventId && eventType.recurringEvent) {
    // Overriding the recurring event configuration count to be the actual number of events booked for
    // the recurring event (equal or less than recurring event configuration count)
    eventType.recurringEvent = Object.assign({}, eventType.recurringEvent, { count: recurringCount });
  }

  let booking: CreatedBooking | null = null;

  loggerWithEventDetails.debug(
    "Going to create booking in DB now",
    safeStringify({
      organizerUser: organizerUser.id,
      attendeesList: attendeesList.map((guest) => ({ timeZone: guest.timeZone })),
      requiresConfirmation: evt.requiresConfirmation,
      isConfirmedByDefault,
      userReschedulingIsOwner,
    })
  );

  try {
    if (!isDryRun) {
      booking = await createBooking({
        uid,
        rescheduledBy: reqBody.rescheduledBy,
        routingFormResponseId: routingFormResponseId,
        reroutingFormResponses: reroutingFormResponses ?? null,
        reqBody: {
          user: reqBody.user,
          metadata: reqBody.metadata,
          recurringEventId: reqBody.recurringEventId,
        },
        eventType: {
          eventTypeData: eventType,
          id: eventTypeId,
          slug: eventTypeSlug,
          organizerUser,
          isConfirmedByDefault,
          paymentAppData,
        },
        input: {
          bookerEmail,
          rescheduleReason,
          smsReminderNumber,
          responses,
        },
        evt,
        originalRescheduledBooking,
        creationSource: input.bookingData.creationSource,
        tracking: reqBody.tracking,
      });

      if (booking?.userId) {
        const usersRepository = new UsersRepository();
        await usersRepository.updateLastActiveAt(booking.userId);
      }

      if (booking && booking.id && eventType.seatsPerTimeSlot) {
        const currentAttendee = booking.attendees.find(
          (attendee) =>
            attendee.email === input.bookingData.responses.email ||
            (input.bookingData.responses.attendeePhoneNumber &&
              attendee.phoneNumber === input.bookingData.responses.attendeePhoneNumber)
        );

        // Save description to bookingSeat
        const uniqueAttendeeId = uuid();
        await prisma.bookingSeat.create({
          data: {
            referenceUid: uniqueAttendeeId,
            data: {
              description: additionalNotes,
              responses,
            },
            metadata: reqBody.metadata,
            booking: {
              connect: {
                id: booking.id,
              },
            },
            attendee: {
              connect: {
                id: currentAttendee?.id,
              },
            },
          },
        });
        evt.attendeeSeatId = uniqueAttendeeId;
      }
    } else {
      const { booking: dryRunBooking, troubleshooterData: _troubleshooterData } = buildDryRunBooking({
        eventTypeId,
        organizerUser,
        eventName,
        startTime: reqBody.start,
        endTime: reqBody.end,
        contactOwnerFromReq,
        contactOwnerEmail,
        allHostUsers: users,
        isManagedEventType,
      });

      booking = dryRunBooking;
      troubleshooterData = {
        ...troubleshooterData,
        ..._troubleshooterData,
      };
    }
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    loggerWithEventDetails.error(
      `Booking ${eventTypeId} failed`,
      "Error when saving booking to db",
      err.message
    );
    if (err.code === "P2002") {
      throw new HttpError({ statusCode: 409, message: ErrorCode.BookingConflict });
    }
    throw err;
  }

  // After polling videoBusyTimes, credentials might have been changed due to refreshment, so query them again.
  const credentials = await refreshCredentials(allCredentials);

  // Call the new abstracted function
  const { videoCallUrl, paymentDetails, referencesToCreate } = await onBookingCreationInDb({
    // It would be null for fresh booking
    bookingBeingRescheduled: originalRescheduledBooking,
    newBooking: booking,
    // TODO: This eventType already has workflows populated and we repeat that in OnBookingCreationInDb
    eventType,
    userIdMakingBooking: userId ?? null,
    platformParams: {
      platformClientId,
      platformCancelUrl,
      platformBookingUrl,
      platformRescheduleUrl,
      platformBookingLocation,
    },
    configurationData: {
      isDryRun,
      noEmail,
      triggerForUser: !!triggerForUser,
      bookerUrl,
    },
    preloadedData: {
      credentials,
    },
    // Ideally below data should be derivable from the newBooking itself
    bookingData,
    legacyData: {
      organizationData: {
        teamId,
        orgId,
      },
      userData: {
        organizerUser: {
          id: organizerUser.id,
          name: organizerUser.name,
          username: organizerUser.username,
          organizationId: organizerOrganizationId,
          email: organizerEmail,
          locale: organizerUser.locale,
          destinationCalendar: organizerUser.destinationCalendar ?? null,
          credentials: organizerUser.credentials,
        },
        attendeesList: attendeesList,
        attendeeLanguage,
        users: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          timeZone: user.timeZone,
          locale: user.locale,
          destinationCalendar: user.destinationCalendar ?? null,
          isFixed: user.isFixed ?? false,
        })),
      },
    },
  });

  loggerWithEventDetails.debug(`Booking ${organizerUser.username} completed`);

  // TODO: Refactor better so this booking object is not passed
  // all around and instead the individual fields are sent as args.
  const bookingResponse = {
    ...booking,
    user: {
      // Ensure booking.user is not null before spreading. It should be set by createBooking or buildDryRunBooking.
      ...(booking.user || {}),
      email: null,
    },
    paymentRequired: paymentDetails?.paymentRequired || false,
  };

  return {
    ...bookingResponse,
    ...luckyUserResponse,
    isDryRun,
    ...(isDryRun ? { troubleshooterData } : {}),
    references: referencesToCreate, // referencesToCreate is mutated by onBookingCreationInDb
    seatReferenceUid: evt.attendeeSeatId, // evt is mutated by onBookingCreationInDb
    videoCallUrl: videoCallUrl,
    ...(paymentDetails || {}), // Spread payment details if they exist
  };
}

export default handler;
