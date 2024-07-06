import type { DestinationCalendar, EventType } from "@prisma/client";
// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";
import type { NextApiRequest } from "next";
import short, { uuid } from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import processExternalId from "@calcom/app-store/_utils/calendars/processExternalId";
import { metadata as GoogleMeetMetadata } from "@calcom/app-store/googlevideo/_metadata";
import {
  MeetLocationType,
  OrganizerDefaultConferencingAppType,
  getLocationValueForDB,
} from "@calcom/app-store/locations";
import { DailyLocationType } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import EventManager from "@calcom/core/EventManager";
import { getEventName } from "@calcom/core/event";
import dayjs from "@calcom/dayjs";
import { scheduleMandatoryReminder } from "@calcom/ee/workflows/lib/reminders/scheduleMandatoryReminder";
import {
  sendAttendeeRequestEmail,
  sendOrganizerRequestEmail,
  sendRescheduledEmails,
  sendRoundRobinCancelledEmails,
  sendRoundRobinRescheduledEmails,
  sendRoundRobinScheduledEmails,
  sendScheduledEmails,
} from "@calcom/emails";
import getICalUID from "@calcom/emails/lib/getICalUID";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import { isEventTypeLoggingEnabled } from "@calcom/features/bookings/lib/isEventTypeLoggingEnabled";
import {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "@calcom/features/ee/workflows/lib/allowDisablingStandardEmails";
import {
  cancelWorkflowReminders,
  scheduleWorkflowReminders,
} from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { getFullName } from "@calcom/features/form-builder/utils";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import {
  deleteWebhookScheduledTriggers,
  scheduleTrigger,
} from "@calcom/features/webhooks/lib/scheduleTrigger";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import { getDefaultEvent, getUsernameList } from "@calcom/lib/defaultEvents";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { extractBaseEmail } from "@calcom/lib/extract-base-email";
import { getBookerBaseUrlFromEventType } from "@calcom/lib/getBookerUrl/server";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { handlePayment } from "@calcom/lib/payment/handlePayment";
import { getPiiFreeCalendarEvent, getPiiFreeEventType } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getLuckyUser } from "@calcom/lib/server";
import { getTranslation } from "@calcom/lib/server/i18n";
import { updateWebUser as syncServicesUpdateWebUser } from "@calcom/lib/sync/SyncServiceManager";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import { BookingStatus, SchedulingType, WebhookTriggerEvents } from "@calcom/prisma/enums";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { AdditionalInformation, AppsStatus, CalendarEvent, Person } from "@calcom/types/Calendar";
import type { EventResult, PartialReference } from "@calcom/types/EventManager";

import type { EventTypeInfo } from "../../webhooks/lib/sendPayload";
import { getAllCredentials } from "./getAllCredentialsForUsersOnEvent/getAllCredentials";
import { refreshCredentials } from "./getAllCredentialsForUsersOnEvent/refreshCredentials";
import getBookingDataSchema from "./getBookingDataSchema";
import { addVideoCallDataToEvent } from "./handleNewBooking/addVideoCallDataToEvent";
import { checkBookingAndDurationLimits } from "./handleNewBooking/checkBookingAndDurationLimits";
import { checkIfBookerEmailIsBlocked } from "./handleNewBooking/checkIfBookerEmailIsBlocked";
import {
  checkUsersAreAvailableInFirstRecurringSlot,
  getDateParams,
} from "./handleNewBooking/checkUsersAreAvailableInFirstRecurringSlot";
import { createBooking } from "./handleNewBooking/createBooking";
import { ensureAvailableUsers } from "./handleNewBooking/ensureAvailableUsers";
import { getBookingData } from "./handleNewBooking/getBookingData";
import { getCustomInputsResponses } from "./handleNewBooking/getCustomInputsResponses";
import { getEventTypesFromDB } from "./handleNewBooking/getEventTypesFromDB";
import type { getEventTypeResponse } from "./handleNewBooking/getEventTypesFromDB";
import { getLocationValuesForDb } from "./handleNewBooking/getLocationValuesForDb";
import { getOriginalRescheduledBookingAndSeat } from "./handleNewBooking/getOriginalRescheduledBookingAndSeat";
import { getRequiresConfirmationFlags } from "./handleNewBooking/getRequiresConfirmationFlags";
import { getSubcriberOptions } from "./handleNewBooking/getSubcriberOptions";
import { getVideoCallDetails } from "./handleNewBooking/getVideoCallDetails";
import { handleAppsStatus } from "./handleNewBooking/handleAppsStatus";
import { loadAndValidateUsers } from "./handleNewBooking/loadAndValidateUsers";
import { selectOrganizerEmail } from "./handleNewBooking/selectOrganizerEmail";
import type {
  Invitee,
  IEventTypePaymentCredentialType,
  IsFixedAwareUser,
  BookingType,
  Booking,
  Users,
  EventTypeWithUsers,
} from "./handleNewBooking/types";
import { validateBookingTimeIsNotOutOfBounds } from "./handleNewBooking/validateBookingTimeIsNotOutOfBounds";
import { validateEventLength } from "./handleNewBooking/validateEventLength";
import handleSeats from "./handleSeats/handleSeats";

const translator = short();
const log = logger.getSubLogger({ prefix: ["[api] book:user"] });

export const createLoggerWithEventDetails = (
  eventTypeId: number,
  reqBodyUser: string | string[] | undefined,
  eventTypeSlug: string | undefined
) => {
  return logger.getSubLogger({
    prefix: ["book:user", `${eventTypeId}:${reqBodyUser}/${eventTypeSlug}`],
  });
};

function getICalSequence(originalRescheduledBooking: BookingType | null) {
  // If new booking set the sequence to 0
  if (!originalRescheduledBooking) {
    return 0;
  }

  // If rescheduling and there is no sequence set, assume sequence should be 1
  if (!originalRescheduledBooking.iCalSequence) {
    return 1;
  }

  // If rescheduling then increment sequence by 1
  return originalRescheduledBooking.iCalSequence + 1;
}

const getEventType = async ({
  eventTypeId,
  eventTypeSlug,
}: {
  eventTypeId: number;
  eventTypeSlug?: string;
}) => {
  // handle dynamic user
  const eventType =
    !eventTypeId && !!eventTypeSlug ? getDefaultEvent(eventTypeSlug) : await getEventTypesFromDB(eventTypeId);

  return {
    ...eventType,
    bookingFields: getBookingFieldsWithSystemFields(eventType),
  };
};

const checkIsFirstSeat = async ({
  uid,
  eventTypeId,
  reqBodyStart,
}: {
  uid?: string;
  eventTypeId: number;
  reqBodyStart: string;
}) => {
  const booking = await prisma.booking.findFirst({
    where: {
      OR: [
        {
          uid,
        },
        {
          eventTypeId,
          startTime: new Date(dayjs(reqBodyStart).utc().format()),
        },
      ],
      status: BookingStatus.ACCEPTED,
    },
  });

  if (booking) return false;
  return true;
};

const enrichEventTypeWithUsers = (eventType: getEventTypeResponse, users: Users) => {
  return {
    ...eventType,
    users: users as IsFixedAwareUser[],
    ...(eventType.recurringEvent && {
      recurringEvent: {
        ...eventType.recurringEvent,
        count: eventType.recurringEvent.count,
      },
    }),
  };
};

const blacklistedGuestEmails = process.env.BLACKLISTED_GUEST_EMAILS
  ? process.env.BLACKLISTED_GUEST_EMAILS.split(",")
  : [];

const selectDestinationCalendar = (
  eventTypeCalendar: EventType["destinationCalendar"],
  organizerCalendar: Users[number]["destinationCalendar"]
) => {
  if (eventTypeCalendar) return [eventTypeCalendar];
  else if (organizerCalendar) return [organizerCalendar];

  return null;
};

type BookingDataSchemaGetter =
  | typeof getBookingDataSchema
  | typeof import("@calcom/features/bookings/lib/getBookingDataSchemaForApi").default;

async function handler(
  req: NextApiRequest & {
    userId?: number | undefined;
    platformClientId?: string;
    platformRescheduleUrl?: string;
    platformCancelUrl?: string;
    platformBookingUrl?: string;
    platformBookingLocation?: string;
  },
  bookingDataSchemaGetter: BookingDataSchemaGetter = getBookingDataSchema
) {
  const {
    userId,
    platformClientId,
    platformCancelUrl,
    platformBookingUrl,
    platformRescheduleUrl,
    platformBookingLocation,
  } = req;

  const eventType = await getEventType({
    eventTypeId: req.body.eventTypeId,
    eventTypeSlug: req.body.eventTypeSlug,
  });

  const bookingDataSchema = bookingDataSchemaGetter({
    view: req.body?.rescheduleUid ? "reschedule" : "booking",
    bookingFields: eventType.bookingFields,
  });
  const bookingData = await getBookingData({
    req,
    eventType,
    schema: bookingDataSchema,
  });

  const {
    recurringCount,
    noEmail,
    eventTypeId,
    eventTypeSlug,
    hasHashedBookingLink,
    language,
    appsStatus: reqAppsStatus,
    name: bookerName,
    email: bookerEmail,
    guests: reqGuests,
    location,
    notes: additionalNotes,
    smsReminderNumber,
    rescheduleReason,
    luckyUsers,
    ...reqBody
  } = bookingData;

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

  const isTeamEventType =
    !!eventType.schedulingType && ["COLLECTIVE", "ROUND_ROBIN"].includes(eventType.schedulingType);

  const paymentAppData = getPaymentAppData(eventType);
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

  await validateBookingTimeIsNotOutOfBounds<typeof eventType>(
    reqBody.start,
    reqBody.timeZone,
    eventType,
    loggerWithEventDetails
  );

  validateEventLength({
    reqBodyStart: reqBody.start,
    reqBodyEnd: reqBody.end,
    eventTypeMutipleDuration: eventType.metadata?.multipleDuration,
    eventTypeLength: eventType.length,
    logger: loggerWithEventDetails,
  });

  let users = await loadAndValidateUsers({
    req,
    eventType,
    eventTypeId,
    dynamicUserList,
    logger: loggerWithEventDetails,
  });

  let { locationBodyString, organizerOrFirstDynamicGroupMemberDefaultLocationUrl } = getLocationValuesForDb(
    dynamicUserList,
    users,
    location
  );

  await checkBookingAndDurationLimits({
    eventType,
    reqBodyStart: reqBody.start,
    reqBodyRescheduleUid: reqBody.rescheduleUid,
  });

  const {
    rescheduleUid,
    originalRescheduledBooking: originalBooking,
    bookingSeat,
  } = await getOriginalRescheduledBookingAndSeat({
    reqBodyRescheduleUid: reqBody.rescheduleUid,
    seatsPerTimeSlot: eventType.seatsPerTimeSlot,
  });

  let originalRescheduledBooking = originalBooking;

  const isFirstSeat = eventType.seatsPerTimeSlot
    ? await checkIsFirstSeat({
        uid: rescheduleUid || reqBody.bookingUid,
        eventTypeId: eventType.id,
        reqBodyStart: reqBody.start,
      })
    : true;

  let luckyUserResponse;

  //checks what users are available
  if (isFirstSeat) {
    const eventTypeWithUsers: EventTypeWithUsers = enrichEventTypeWithUsers(eventType, users);

    await checkUsersAreAvailableInFirstRecurringSlot({
      allRecurringDates: req.body.allRecurringDates,
      numSlotsToCheckForAvailability: req.body.numSlotsToCheckForAvailability,
      isFirstRecurringSlot: req.body.isFirstRecurringSlot,
      isTeamEventType,
      eventTypeWithUsers,
      timeZone: reqBody.timeZone,
      originalRescheduledBooking,
      logger: loggerWithEventDetails,
    });

    if (!req.body.allRecurringDates || req.body.isFirstRecurringSlot) {
      const availableUsers = await ensureAvailableUsers(
        eventTypeWithUsers,
        {
          dateFrom: dayjs(reqBody.start).tz(reqBody.timeZone).format(),
          dateTo: dayjs(reqBody.end).tz(reqBody.timeZone).format(),
          timeZone: reqBody.timeZone,
          originalRescheduledBooking,
        },
        loggerWithEventDetails
      );

      const luckyUsers: typeof users = [];
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

      if (reqBody.teamMemberEmail) {
        const isTeamMemberFixed = fixedUserPool.some((user) => user.email === reqBody.teamMemberEmail);
        const teamMember = availableUsers.find((user) => user.email === reqBody.teamMemberEmail);

        // If requested user is not a fixed host, assign the lucky user as the team member
        if (!isTeamMemberFixed && teamMember) {
          luckyUsers.push(teamMember);
        }
      }

      // loop through all non-fixed hosts and get the lucky users
      while (luckyUserPool.length > 0 && luckyUsers.length < 1 /* TODO: Add variable */) {
        const allLuckyUserIds = new Set([...luckyUsers, ...notAvailableLuckyUsers].map((user) => user.id));
        const newLuckyUser = await getLuckyUser("MAXIMIZE_AVAILABILITY", {
          // find a lucky user that is not already in the luckyUsers array
          availableUsers: luckyUserPool.filter((user) => !allLuckyUserIds.has(user.id)),
          eventTypeId: eventType.id,
        });

        if (!newLuckyUser) {
          break; // prevent infinite loop
        }

        const isFirstRoundRobinRecurringEvent =
          req.body.isFirstRecurringSlot && eventType.schedulingType === SchedulingType.ROUND_ROBIN;

        if (isFirstRoundRobinRecurringEvent) {
          // for recurring round robin events check if lucky user is available for next slots
          try {
            const slotsToCheck = Math.min(
              req.body.allRecurringDates.length,
              req.body.numSlotsToCheckForAvailability
            );

            for (let i = 0; i < slotsToCheck; i++) {
              const { start, end } = req.body.allRecurringDates[i];

              await ensureAvailableUsers(
                { ...eventTypeWithUsers, users: [newLuckyUser] },
                getDateParams(start, end, reqBody.timeZone, originalRescheduledBooking),
                loggerWithEventDetails
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
    } else if (req.body.allRecurringDates && eventType.schedulingType === SchedulingType.ROUND_ROBIN) {
      // all recurring slots except the first one
      const luckyUsersFromFirstBooking = luckyUsers
        ? eventTypeWithUsers.users.filter((user) => luckyUsers.find((luckyUserId) => luckyUserId === user.id))
        : [];
      const fixedHosts = eventTypeWithUsers.users.filter((user: IsFixedAwareUser) => user.isFixed);
      users = [...fixedHosts, ...luckyUsersFromFirstBooking];
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
  const allCredentials = await getAllCredentials(organizerUser, eventType);

  const { userReschedulingIsOwner, isConfirmedByDefault } = getRequiresConfirmationFlags({
    eventType,
    bookingStartTime: reqBody.start,
    userId,
    originalRescheduledBookingOrganizerId: originalRescheduledBooking?.user?.id,
    paymentAppData,
  });

  // If the Organizer himself is rescheduling, the booker should be sent the communication in his timezone and locale.
  const attendeeInfoOnReschedule =
    userReschedulingIsOwner && originalRescheduledBooking
      ? originalRescheduledBooking.attendees.find((attendee) => attendee.email === bookerEmail)
      : null;

  const attendeeLanguage = attendeeInfoOnReschedule ? attendeeInfoOnReschedule.locale : language;
  const attendeeTimezone = attendeeInfoOnReschedule ? attendeeInfoOnReschedule.timeZone : reqBody.timeZone;

  const tAttendees = await getTranslation(attendeeLanguage ?? "en", "common");

  // use host default
  const isManagedEventType = !!eventType.parentId;
  const useHostDefaultLocation =
    (isManagedEventType || isTeamEventType) && locationBodyString === OrganizerDefaultConferencingAppType;

  if (useHostDefaultLocation) {
    const metadataParseResult = userMetadataSchema.safeParse(organizerUser.metadata);
    const organizerMetadata = metadataParseResult.success ? metadataParseResult.data : undefined;

    const getDefaultAppLocationType = (appSlug: string) => {
      const app = getAppFromSlug(appSlug);
      return app?.appData?.location?.type;
    };

    const appSlug = organizerMetadata?.defaultConferencingApp?.appSlug;
    if (appSlug) {
      locationBodyString = getDefaultAppLocationType(appSlug) || locationBodyString;
      organizerOrFirstDynamicGroupMemberDefaultLocationUrl =
        organizerMetadata?.defaultConferencingApp?.appLink;
    } else {
      locationBodyString = DailyLocationType;
    }
  }

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

  const generateUid = () => {
    const seed = `${organizerUser.username}:${dayjs(reqBody.start).utc().format()}:${new Date().getTime()}`;
    return translator.fromUUID(uuidv5(seed, uuidv5.URL));
  };
  const uid = generateUid();

  // For static link based video apps, it would have the static URL value instead of it's type(e.g. integrations:campfire_video)
  // This ensures that createMeeting isn't called for static video apps as bookingLocation becomes just a regular value for them.
  const { bookingLocation, conferenceCredentialId } = organizerOrFirstDynamicGroupMemberDefaultLocationUrl
    ? {
        bookingLocation: organizerOrFirstDynamicGroupMemberDefaultLocationUrl,
        conferenceCredentialId: undefined,
      }
    : getLocationValueForDB(locationBodyString, eventType.locations);

  const customInputs = getCustomInputsResponses(reqBody, eventType.customInputs);
  const teamDestinationCalendars: DestinationCalendar[] = [];

  // Organizer or user owner of this event type it's not listed as a team member.
  const teamMemberPromises = users
    .filter((user) => user.email !== organizerUser.email)
    .map(async (user) => {
      // TODO: Add back once EventManager tests are ready https://github.com/calcom/cal.com/pull/14610#discussion_r1567817120
      // push to teamDestinationCalendars if it's a team event but collective only
      if (isTeamEventType && eventType.schedulingType === "COLLECTIVE" && user.destinationCalendar) {
        teamDestinationCalendars.push({
          ...user.destinationCalendar,
          externalId: processExternalId(user.destinationCalendar),
        });
      }

      return {
        id: user.id,
        email: user.email ?? "",
        name: user.name ?? "",
        firstName: "",
        lastName: "",
        timeZone: user.timeZone,
        language: {
          translate: await getTranslation(user.locale ?? "en", "common"),
          locale: user.locale ?? "en",
        },
      };
    });
  const teamMembers = await Promise.all(teamMemberPromises);

  const invitee: Invitee = [
    {
      email: bookerEmail,
      name: fullName,
      firstName: (typeof bookerName === "object" && bookerName.firstName) || "",
      lastName: (typeof bookerName === "object" && bookerName.lastName) || "",
      timeZone: attendeeTimezone,
      language: { translate: tAttendees, locale: attendeeLanguage ?? "en" },
    },
  ];
  const attendeesList = [...invitee, ...guests];

  const responses = reqBody.responses || null;

  const evtName = !eventType?.isDynamic ? eventType.eventName : responses?.title;
  const eventNameObject = {
    //TODO: Can we have an unnamed attendee? If not, I would really like to throw an error here.
    attendeeName: fullName || "Nameless",
    eventType: eventType.title,
    eventName: evtName,
    // we send on behalf of team if >1 round robin attendee | collective
    teamName: eventType.schedulingType === "COLLECTIVE" || users.length > 1 ? eventType.team?.name : null,
    // TODO: Can we have an unnamed organizer? If not, I would really like to throw an error here.
    host: organizerUser.name || "Nameless",
    location: bookingLocation,
    bookingFields: { ...responses },
    t: tOrganizer,
  };

  const iCalUID = getICalUID({
    event: { iCalUID: originalRescheduledBooking?.iCalUID, uid: originalRescheduledBooking?.uid },
    uid,
  });
  // For bookings made before introducing iCalSequence, assume that the sequence should start at 1. For new bookings start at 0.
  const iCalSequence = getICalSequence(originalRescheduledBooking);

  const bookerUrl = getBookerBaseUrlFromEventType(eventType.team, organizerUser.id, dynamicUserList);

  const destinationCalendar = selectDestinationCalendar(
    eventType.destinationCalendar,
    organizerUser.destinationCalendar
  );

  const organizerEmail = selectOrganizerEmail({
    organizerEmail: organizerUser.email,
    useEventTypeDestinationCalendarEmail: eventType.useEventTypeDestinationCalendarEmail,
    destinationCalendar,
    secondaryEmailId: eventType.secondaryEmailId,
    secondaryEmail: eventType.secondaryEmail,
  });

  let evt: CalendarEvent = {
    bookerUrl,
    type: eventType.slug,
    title: getEventName(eventNameObject), //this needs to be either forced in english, or fetched for each attendee and organizer separately
    description: eventType.description,
    additionalNotes,
    customInputs,
    startTime: dayjs(reqBody.start).utc().format(),
    endTime: dayjs(reqBody.end).utc().format(),
    organizer: {
      id: organizerUser.id,
      name: organizerUser.name || "Nameless",
      email: organizerEmail,
      username: organizerUser.username || undefined,
      timeZone: organizerUser.timeZone,
      language: { translate: tOrganizer, locale: organizerUser.locale ?? "en" },
      timeFormat: getTimeFormatStringFromUserTimeFormat(organizerUser.timeFormat),
    },
    responses: reqBody.calEventResponses || null,
    userFieldsResponses: reqBody.calEventUserFieldsResponses || null,
    attendees: attendeesList,
    location: platformBookingLocation ?? bookingLocation, // Will be processed by the EventManager later.
    conferenceCredentialId,
    destinationCalendar,
    hideCalendarNotes: eventType.hideCalendarNotes,
    requiresConfirmation: !isConfirmedByDefault,
    eventTypeId: eventType.id,
    // if seats are not enabled we should default true
    seatsShowAttendees: eventType.seatsPerTimeSlot ? eventType.seatsShowAttendees : true,
    seatsPerTimeSlot: eventType.seatsPerTimeSlot,
    seatsShowAvailabilityCount: eventType.seatsPerTimeSlot ? eventType.seatsShowAvailabilityCount : true,
    schedulingType: eventType.schedulingType,
    iCalUID,
    iCalSequence,
    platformClientId,
    platformRescheduleUrl,
    platformCancelUrl,
    platformBookingUrl,
  };

  if (req.body.thirdPartyRecurringEventId) {
    evt.existingRecurringEvent = {
      recurringEventId: req.body.thirdPartyRecurringEventId,
    };
  }

  if (isTeamEventType && eventType.schedulingType === "COLLECTIVE") {
    evt.destinationCalendar?.push(...teamDestinationCalendars);
  }

  // data needed for triggering webhooks
  const eventTypeInfo: EventTypeInfo = {
    eventTitle: eventType.title,
    eventDescription: eventType.description,
    price: paymentAppData.price,
    currency: eventType.currency,
    length: dayjs(reqBody.end).diff(dayjs(reqBody.start), "minutes"),
  };

  const subscriberOptions = await getSubcriberOptions({
    eventType,
    organizerId: organizerUser.id,
    triggerEvent: rescheduleUid
      ? WebhookTriggerEvents.BOOKING_RESCHEDULED
      : WebhookTriggerEvents.BOOKING_CREATED,
  });

  // For seats, if the booking already exists then we want to add the new attendee to the existing booking
  if (eventType.seatsPerTimeSlot) {
    const newBooking = await handleSeats({
      rescheduleUid,
      reqBookingUid: reqBody.bookingUid,
      eventType,
      evt,
      invitee,
      allCredentials,
      organizerUser,
      originalRescheduledBooking,
      bookerEmail,
      tAttendees,
      bookingSeat,
      reqUserId: req.userId,
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
      eventTrigger: subscriberOptions.triggerEvent,
      responses,
    });

    if (newBooking) {
      req.statusCode = 201;
      const bookingResponse = {
        ...newBooking,
        user: {
          ...newBooking.user,
          email: null,
        },
        paymentRequired: false,
      };
      return {
        ...bookingResponse,
        ...luckyUserResponse,
      };
    } else {
      // Rescheduling logic for the original seated event was handled in handleSeats
      // We want to use new booking logic for the new time slot
      originalRescheduledBooking = null;
      evt.iCalUID = getICalUID({
        attendeeId: bookingSeat?.attendeeId,
      });
    }
  }
  if (isTeamEventType) {
    evt.team = {
      members: teamMembers,
      name: eventType.team?.name || "Nameless",
      id: eventType.team?.id ?? 0,
    };
  }
  if (reqBody.recurringEventId && eventType.recurringEvent) {
    // Overriding the recurring event configuration count to be the actual number of events booked for
    // the recurring event (equal or less than recurring event configuration count)
    eventType.recurringEvent = Object.assign({}, eventType.recurringEvent, { count: recurringCount });
    evt.recurringEvent = eventType.recurringEvent;
  }

  const changedOrganizer =
    !!originalRescheduledBooking &&
    eventType.schedulingType === SchedulingType.ROUND_ROBIN &&
    originalRescheduledBooking.userId !== evt.organizer.id;

  let results: EventResult<AdditionalInformation & { url?: string; iCalUID?: string }>[] = [];
  let referencesToCreate: PartialReference[] = [];

  let booking: (Booking & { appsStatus?: AppsStatus[]; paymentUid?: string; paymentId?: number }) | null =
    null;

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

  // update original rescheduled booking (no seats event)
  if (!eventType.seatsPerTimeSlot && originalRescheduledBooking?.uid) {
    await prisma.booking.update({
      where: {
        id: originalRescheduledBooking.id,
      },
      data: {
        rescheduled: true,
        status: BookingStatus.CANCELLED,
      },
    });
  }

  try {
    booking = await createBooking({
      originalRescheduledBooking,
      evt,
      eventTypeId,
      eventTypeSlug,
      reqBodyUser: reqBody.user,
      reqBodyMetadata: reqBody.metadata,
      reqBodyRecurringEventId: reqBody.recurringEventId,
      uid,
      responses,
      isConfirmedByDefault,
      smsReminderNumber,
      organizerUser,
      rescheduleReason,
      eventType,
      bookerEmail,
      paymentAppData,
      changedOrganizer,
    });

    // @NOTE: Add specific try catch for all subsequent async calls to avoid error
    // Sync Services
    await syncServicesUpdateWebUser(
      await prisma.user.findFirst({
        where: { id: userId },
        select: { id: true, email: true, name: true, username: true, createdDate: true },
      })
    );
    evt.uid = booking?.uid ?? null;

    if (booking && booking.id && eventType.seatsPerTimeSlot) {
      const currentAttendee = booking.attendees.find(
        (attendee) => attendee.email === req.body.responses.email
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
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    loggerWithEventDetails.error(
      `Booking ${eventTypeId} failed`,
      "Error when saving booking to db",
      err.message
    );
    if (err.code === "P2002") {
      throw new HttpError({ statusCode: 409, message: "booking_conflict" });
    }
    throw err;
  }

  // After polling videoBusyTimes, credentials might have been changed due to refreshment, so query them again.
  const credentials = await refreshCredentials(allCredentials);
  const eventManager = new EventManager({ ...organizerUser, credentials });

  let videoCallUrl;

  //this is the actual rescheduling logic
  if (!eventType.seatsPerTimeSlot && originalRescheduledBooking?.uid) {
    log.silly("Rescheduling booking", originalRescheduledBooking.uid);
    try {
      // cancel workflow reminders from previous rescheduled booking
      await cancelWorkflowReminders(originalRescheduledBooking.workflowReminders);
    } catch (error) {
      loggerWithEventDetails.error(
        "Error while canceling scheduled workflow reminders",
        JSON.stringify({ error })
      );
    }

    evt = addVideoCallDataToEvent(originalRescheduledBooking.references, evt);

    // If organizer is changed in RR event then we need to delete the previous host destination calendar events
    const previousHostDestinationCalendar = originalRescheduledBooking?.destinationCalendar
      ? [originalRescheduledBooking?.destinationCalendar]
      : [];

    if (changedOrganizer) {
      evt.title = getEventName(eventNameObject);
      // location might changed and will be new created in eventManager.create (organizer default location)
      evt.videoCallData = undefined;
      // To prevent "The requested identifier already exists" error while updating event, we need to remove iCalUID
      evt.iCalUID = undefined;
    } else {
      // In case of rescheduling, we need to keep the previous host destination calendar
      evt.destinationCalendar = originalRescheduledBooking?.destinationCalendar
        ? [originalRescheduledBooking?.destinationCalendar]
        : evt.destinationCalendar;
    }

    const updateManager = await eventManager.reschedule(
      evt,
      originalRescheduledBooking.uid,
      undefined,
      changedOrganizer,
      previousHostDestinationCalendar
    );

    // This gets overridden when updating the event - to check if notes have been hidden or not. We just reset this back
    // to the default description when we are sending the emails.
    evt.description = eventType.description;

    results = updateManager.results;
    referencesToCreate = updateManager.referencesToCreate;

    videoCallUrl = evt.videoCallData && evt.videoCallData.url ? evt.videoCallData.url : null;

    // This gets overridden when creating the event - to check if notes have been hidden or not. We just reset this back
    // to the default description when we are sending the emails.
    evt.description = eventType.description;

    const { metadata: videoMetadata, videoCallUrl: _videoCallUrl } = getVideoCallDetails({
      results,
    });

    let metadata: AdditionalInformation = {};
    metadata = videoMetadata;
    videoCallUrl = _videoCallUrl;

    const isThereAnIntegrationError = results && results.some((res) => !res.success);

    if (isThereAnIntegrationError) {
      const error = {
        errorCode: "BookingReschedulingMeetingFailed",
        message: "Booking Rescheduling failed",
      };

      loggerWithEventDetails.error(
        `EventManager.reschedule failure in some of the integrations ${organizerUser.username}`,
        safeStringify({ error, results })
      );
    } else {
      if (results.length) {
        // Handle Google Meet results
        // We use the original booking location since the evt location changes to daily
        if (bookingLocation === MeetLocationType) {
          const googleMeetResult = {
            appName: GoogleMeetMetadata.name,
            type: "conferencing",
            uid: results[0].uid,
            originalEvent: results[0].originalEvent,
          };

          // Find index of google_calendar inside createManager.referencesToCreate
          const googleCalIndex = updateManager.referencesToCreate.findIndex(
            (ref) => ref.type === "google_calendar"
          );
          const googleCalResult = results[googleCalIndex];

          if (!googleCalResult) {
            loggerWithEventDetails.warn("Google Calendar not installed but using Google Meet as location");
            results.push({
              ...googleMeetResult,
              success: false,
              calWarnings: [tOrganizer("google_meet_warning")],
            });
          }

          const googleHangoutLink = Array.isArray(googleCalResult?.updatedEvent)
            ? googleCalResult.updatedEvent[0]?.hangoutLink
            : googleCalResult?.updatedEvent?.hangoutLink ?? googleCalResult?.createdEvent?.hangoutLink;

          if (googleHangoutLink) {
            results.push({
              ...googleMeetResult,
              success: true,
            });

            // Add google_meet to referencesToCreate in the same index as google_calendar
            updateManager.referencesToCreate[googleCalIndex] = {
              ...updateManager.referencesToCreate[googleCalIndex],
              meetingUrl: googleHangoutLink,
            };

            // Also create a new referenceToCreate with type video for google_meet
            updateManager.referencesToCreate.push({
              type: "google_meet_video",
              meetingUrl: googleHangoutLink,
              uid: googleCalResult.uid,
              credentialId: updateManager.referencesToCreate[googleCalIndex].credentialId,
            });
          } else if (googleCalResult && !googleHangoutLink) {
            results.push({
              ...googleMeetResult,
              success: false,
            });
          }
        }
        const createdOrUpdatedEvent = Array.isArray(results[0]?.updatedEvent)
          ? results[0]?.updatedEvent[0]
          : results[0]?.updatedEvent ?? results[0]?.createdEvent;
        metadata.hangoutLink = createdOrUpdatedEvent?.hangoutLink;
        metadata.conferenceData = createdOrUpdatedEvent?.conferenceData;
        metadata.entryPoints = createdOrUpdatedEvent?.entryPoints;
        evt.appsStatus = handleAppsStatus(results, booking, reqAppsStatus);
        videoCallUrl =
          metadata.hangoutLink ||
          createdOrUpdatedEvent?.url ||
          organizerOrFirstDynamicGroupMemberDefaultLocationUrl ||
          getVideoCallUrlFromCalEvent(evt) ||
          videoCallUrl;
      }

      const calendarResult = results.find((result) => result.type.includes("_calendar"));

      evt.iCalUID = Array.isArray(calendarResult?.updatedEvent)
        ? calendarResult?.updatedEvent[0]?.iCalUID
        : calendarResult?.updatedEvent?.iCalUID || undefined;
    }

    evt.appsStatus = handleAppsStatus(results, booking, reqAppsStatus);

    // If there is an integration error, we don't send successful rescheduling email, instead broken integration email should be sent that are handled by either CalendarManager or videoClient
    if (noEmail !== true && isConfirmedByDefault && !isThereAnIntegrationError) {
      const copyEvent = cloneDeep(evt);
      const copyEventAdditionalInfo = {
        ...copyEvent,
        additionalInformation: metadata,
        additionalNotes, // Resets back to the additionalNote input and not the override value
        cancellationReason: `$RCH$${rescheduleReason ? rescheduleReason : ""}`, // Removable code prefix to differentiate cancellation from rescheduling for email
      };
      loggerWithEventDetails.debug("Emails: Sending rescheduled emails for booking confirmation");

      /*
        handle emails for round robin
          - if booked rr host is the same, then rescheduling email
          - if new rr host is booked, then cancellation email to old host and confirmation email to new host
      */
      if (eventType.schedulingType === SchedulingType.ROUND_ROBIN) {
        const originalBookingMemberEmails: Person[] = [];

        for (const user of originalRescheduledBooking.attendees) {
          const translate = await getTranslation(user.locale ?? "en", "common");
          originalBookingMemberEmails.push({
            name: user.name,
            email: user.email,
            timeZone: user.timeZone,
            language: { translate, locale: user.locale ?? "en" },
          });
        }
        if (originalRescheduledBooking.user) {
          const translate = await getTranslation(originalRescheduledBooking.user.locale ?? "en", "common");
          originalBookingMemberEmails.push({
            ...originalRescheduledBooking.user,
            name: originalRescheduledBooking.user.name || "",
            language: { translate, locale: originalRescheduledBooking.user.locale ?? "en" },
          });
        }

        const newBookingMemberEmails: Person[] =
          copyEvent.team?.members
            .map((member) => member)
            .concat(copyEvent.organizer)
            .concat(copyEvent.attendees) || [];

        // scheduled Emails
        const newBookedMembers = newBookingMemberEmails.filter(
          (member) =>
            !originalBookingMemberEmails.find((originalMember) => originalMember.email === member.email)
        );
        // cancelled Emails
        const cancelledMembers = originalBookingMemberEmails.filter(
          (member) => !newBookingMemberEmails.find((newMember) => newMember.email === member.email)
        );
        // rescheduled Emails
        const rescheduledMembers = newBookingMemberEmails.filter((member) =>
          originalBookingMemberEmails.find((orignalMember) => orignalMember.email === member.email)
        );

        sendRoundRobinRescheduledEmails(copyEventAdditionalInfo, rescheduledMembers);
        sendRoundRobinScheduledEmails(copyEventAdditionalInfo, newBookedMembers);
        sendRoundRobinCancelledEmails(copyEventAdditionalInfo, cancelledMembers);
      } else {
        // send normal rescheduled emails (non round robin event, where organizers stay the same)
        await sendRescheduledEmails({
          ...copyEvent,
          additionalInformation: metadata,
          additionalNotes, // Resets back to the additionalNote input and not the override value
          cancellationReason: `$RCH$${rescheduleReason ? rescheduleReason : ""}`, // Removable code prefix to differentiate cancellation from rescheduling for email
        });
      }
    }
    // If it's not a reschedule, doesn't require confirmation and there's no price,
    // Create a booking
  } else if (isConfirmedByDefault) {
    // Use EventManager to conditionally use all needed integrations.
    const createManager = await eventManager.create(evt);
    if (evt.location) {
      booking.location = evt.location;
    }
    // This gets overridden when creating the event - to check if notes have been hidden or not. We just reset this back
    // to the default description when we are sending the emails.
    evt.description = eventType.description;

    results = createManager.results;
    referencesToCreate = createManager.referencesToCreate;
    videoCallUrl = evt.videoCallData && evt.videoCallData.url ? evt.videoCallData.url : null;

    if (results.length > 0 && results.every((res) => !res.success)) {
      const error = {
        errorCode: "BookingCreatingMeetingFailed",
        message: "Booking failed",
      };

      loggerWithEventDetails.error(
        `EventManager.create failure in some of the integrations ${organizerUser.username}`,
        safeStringify({ error, results })
      );
    } else {
      const metadata: AdditionalInformation = {};

      if (results.length) {
        // Handle Google Meet results
        // We use the original booking location since the evt location changes to daily
        if (bookingLocation === MeetLocationType) {
          const googleMeetResult = {
            appName: GoogleMeetMetadata.name,
            type: "conferencing",
            uid: results[0].uid,
            originalEvent: results[0].originalEvent,
          };

          // Find index of google_calendar inside createManager.referencesToCreate
          const googleCalIndex = createManager.referencesToCreate.findIndex(
            (ref) => ref.type === "google_calendar"
          );
          const googleCalResult = results[googleCalIndex];

          if (!googleCalResult) {
            loggerWithEventDetails.warn("Google Calendar not installed but using Google Meet as location");
            results.push({
              ...googleMeetResult,
              success: false,
              calWarnings: [tOrganizer("google_meet_warning")],
            });
          }

          if (googleCalResult?.createdEvent?.hangoutLink) {
            results.push({
              ...googleMeetResult,
              success: true,
            });

            // Add google_meet to referencesToCreate in the same index as google_calendar
            createManager.referencesToCreate[googleCalIndex] = {
              ...createManager.referencesToCreate[googleCalIndex],
              meetingUrl: googleCalResult.createdEvent.hangoutLink,
            };

            // Also create a new referenceToCreate with type video for google_meet
            createManager.referencesToCreate.push({
              type: "google_meet_video",
              meetingUrl: googleCalResult.createdEvent.hangoutLink,
              uid: googleCalResult.uid,
              credentialId: createManager.referencesToCreate[googleCalIndex].credentialId,
            });
          } else if (googleCalResult && !googleCalResult.createdEvent?.hangoutLink) {
            results.push({
              ...googleMeetResult,
              success: false,
            });
          }
        }
        // TODO: Handle created event metadata more elegantly
        metadata.hangoutLink = results[0].createdEvent?.hangoutLink;
        metadata.conferenceData = results[0].createdEvent?.conferenceData;
        metadata.entryPoints = results[0].createdEvent?.entryPoints;
        evt.appsStatus = handleAppsStatus(results, booking, reqAppsStatus);
        videoCallUrl =
          metadata.hangoutLink || organizerOrFirstDynamicGroupMemberDefaultLocationUrl || videoCallUrl;

        if (evt.iCalUID !== booking.iCalUID) {
          // The eventManager could change the iCalUID. At this point we can update the DB record
          await prisma.booking.update({
            where: {
              id: booking.id,
            },
            data: {
              iCalUID: evt.iCalUID || booking.iCalUID,
            },
          });
        }
      }
      if (noEmail !== true) {
        let isHostConfirmationEmailsDisabled = false;
        let isAttendeeConfirmationEmailDisabled = false;

        const workflows = eventType.workflows.map((workflow) => workflow.workflow);

        if (eventType.workflows) {
          isHostConfirmationEmailsDisabled =
            eventType.metadata?.disableStandardEmails?.confirmation?.host || false;
          isAttendeeConfirmationEmailDisabled =
            eventType.metadata?.disableStandardEmails?.confirmation?.attendee || false;

          if (isHostConfirmationEmailsDisabled) {
            isHostConfirmationEmailsDisabled = allowDisablingHostConfirmationEmails(workflows);
          }

          if (isAttendeeConfirmationEmailDisabled) {
            isAttendeeConfirmationEmailDisabled = allowDisablingAttendeeConfirmationEmails(workflows);
          }
        }

        loggerWithEventDetails.debug(
          "Emails: Sending scheduled emails for booking confirmation",
          safeStringify({
            calEvent: getPiiFreeCalendarEvent(evt),
          })
        );

        await sendScheduledEmails(
          {
            ...evt,
            additionalInformation: metadata,
            additionalNotes,
            customInputs,
          },
          eventNameObject,
          isHostConfirmationEmailsDisabled,
          isAttendeeConfirmationEmailDisabled
        );
      }
    }
  } else {
    // If isConfirmedByDefault is false, then booking can't be considered ACCEPTED and thus EventManager has no role to play. Booking is created as PENDING
    loggerWithEventDetails.debug(
      `EventManager doesn't need to create or reschedule event for booking ${organizerUser.username}`,
      safeStringify({
        calEvent: getPiiFreeCalendarEvent(evt),
        isConfirmedByDefault,
        paymentValue: paymentAppData.price,
      })
    );
  }

  const bookingRequiresPayment =
    !Number.isNaN(paymentAppData.price) &&
    paymentAppData.price > 0 &&
    !originalRescheduledBooking?.paid &&
    !!booking;

  if (!isConfirmedByDefault && noEmail !== true && !bookingRequiresPayment) {
    loggerWithEventDetails.debug(
      `Emails: Booking ${organizerUser.username} requires confirmation, sending request emails`,
      safeStringify({
        calEvent: getPiiFreeCalendarEvent(evt),
      })
    );
    await sendOrganizerRequestEmail({ ...evt, additionalNotes });
    await sendAttendeeRequestEmail({ ...evt, additionalNotes }, attendeesList[0]);
  }

  if (booking.location?.startsWith("http")) {
    videoCallUrl = booking.location;
  }

  const metadata = videoCallUrl
    ? {
        videoCallUrl: getVideoCallUrlFromCalEvent(evt) || videoCallUrl,
      }
    : undefined;

  const webhookData = {
    ...evt,
    ...eventTypeInfo,
    bookingId: booking?.id,
    rescheduleId: originalRescheduledBooking?.id || undefined,
    rescheduleUid,
    rescheduleStartTime: originalRescheduledBooking?.startTime
      ? dayjs(originalRescheduledBooking?.startTime).utc().format()
      : undefined,
    rescheduleEndTime: originalRescheduledBooking?.endTime
      ? dayjs(originalRescheduledBooking?.endTime).utc().format()
      : undefined,
    metadata: { ...metadata, ...reqBody.metadata },
    eventTypeId,
    status: "ACCEPTED",
    smsReminderNumber: booking?.smsReminderNumber || undefined,
  };

  if (bookingRequiresPayment) {
    loggerWithEventDetails.debug(`Booking ${organizerUser.username} requires payment`);
    // Load credentials.app.categories
    const credentialPaymentAppCategories = await prisma.credential.findMany({
      where: {
        ...(paymentAppData.credentialId ? { id: paymentAppData.credentialId } : { userId: organizerUser.id }),
        app: {
          categories: {
            hasSome: ["payment"],
          },
        },
      },
      select: {
        key: true,
        appId: true,
        app: {
          select: {
            categories: true,
            dirName: true,
          },
        },
      },
    });
    const eventTypePaymentAppCredential = credentialPaymentAppCategories.find((credential) => {
      return credential.appId === paymentAppData.appId;
    });

    if (!eventTypePaymentAppCredential) {
      throw new HttpError({ statusCode: 400, message: "Missing payment credentials" });
    }

    // Convert type of eventTypePaymentAppCredential to appId: EventTypeAppList
    if (!booking.user) booking.user = organizerUser;
    const payment = await handlePayment(
      evt,
      eventType,
      eventTypePaymentAppCredential as IEventTypePaymentCredentialType,
      booking,
      fullName,
      bookerEmail
    );
    const subscriberOptionsPaymentInitiated: GetSubscriberOptions = {
      userId: triggerForUser ? organizerUser.id : null,
      eventTypeId,
      triggerEvent: WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
      teamId,
      orgId,
    };
    await handleWebhookTrigger({
      subscriberOptions: subscriberOptionsPaymentInitiated,
      eventTrigger: WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
      webhookData: {
        ...webhookData,
        paymentId: payment?.id,
      },
    });

    req.statusCode = 201;
    // TODO: Refactor better so this booking object is not passed
    // all around and instead the individual fields are sent as args.
    const bookingResponse = {
      ...booking,
      user: {
        ...booking.user,
        email: null,
      },
    };

    return {
      ...bookingResponse,
      ...luckyUserResponse,
      message: "Payment required",
      paymentRequired: true,
      paymentUid: payment?.uid,
      paymentId: payment?.id,
    };
  }

  loggerWithEventDetails.debug(`Booking ${organizerUser.username} completed`);

  // We are here so, booking doesn't require payment and booking is also created in DB already, through createBooking call
  if (isConfirmedByDefault) {
    const subscriberOptionsMeetingEnded = await getSubcriberOptions({
      eventType,
      organizerId: organizerUser.id,
      triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
    });
    const subscribersMeetingEnded = await getWebhooks(subscriberOptionsMeetingEnded);

    const subscriberOptionsMeetingStarted = {
      ...subscriberOptionsMeetingEnded,
      triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
    };
    const subscribersMeetingStarted = await getWebhooks(subscriberOptionsMeetingStarted);

    let deleteWebhookScheduledTriggerPromise: Promise<unknown> = Promise.resolve();
    const scheduleTriggerPromises = [];

    if (rescheduleUid && originalRescheduledBooking) {
      //delete all scheduled triggers for meeting ended and meeting started of booking
      deleteWebhookScheduledTriggerPromise = deleteWebhookScheduledTriggers({
        booking: originalRescheduledBooking,
      });
    }

    if (booking && booking.status === BookingStatus.ACCEPTED) {
      for (const subscriber of subscribersMeetingEnded) {
        scheduleTriggerPromises.push(
          scheduleTrigger({
            booking,
            subscriberUrl: subscriber.subscriberUrl,
            subscriber,
            triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
          })
        );
      }

      for (const subscriber of subscribersMeetingStarted) {
        scheduleTriggerPromises.push(
          scheduleTrigger({
            booking,
            subscriberUrl: subscriber.subscriberUrl,
            subscriber,
            triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
          })
        );
      }
    }

    await Promise.all([deleteWebhookScheduledTriggerPromise, ...scheduleTriggerPromises]).catch((error) => {
      loggerWithEventDetails.error(
        "Error while scheduling or canceling webhook triggers",
        JSON.stringify({ error })
      );
    });

    // Send Webhook call if hooked to BOOKING_CREATED & BOOKING_RESCHEDULED
    await handleWebhookTrigger({
      subscriberOptions,
      eventTrigger: subscriberOptions.triggerEvent,
      webhookData,
    });
  } else {
    // if eventType requires confirmation we will trigger the BOOKING REQUESTED Webhook
    subscriberOptions.triggerEvent = WebhookTriggerEvents.BOOKING_REQUESTED;
    webhookData.status = "PENDING";
    await handleWebhookTrigger({
      subscriberOptions,
      eventTrigger: WebhookTriggerEvents.BOOKING_REQUESTED,
      webhookData,
    });
  }

  // Avoid passing referencesToCreate with id unique constrain values
  // refresh hashed link if used
  const urlSeed = `${organizerUser.username}:${dayjs(reqBody.start).utc().format()}`;
  const hashedUid = translator.fromUUID(uuidv5(urlSeed, uuidv5.URL));

  try {
    if (hasHashedBookingLink) {
      await prisma.hashedLink.update({
        where: {
          link: reqBody.hashedLink as string,
        },
        data: {
          link: hashedUid,
        },
      });
    }
  } catch (error) {
    loggerWithEventDetails.error("Error while updating hashed link", JSON.stringify({ error }));
  }

  if (!booking) throw new HttpError({ statusCode: 400, message: "Booking failed" });

  try {
    await prisma.booking.update({
      where: {
        uid: booking.uid,
      },
      data: {
        location: evt.location,
        metadata: { ...(typeof booking.metadata === "object" && booking.metadata), ...metadata },
        references: {
          createMany: {
            data: referencesToCreate,
          },
        },
      },
    });
  } catch (error) {
    loggerWithEventDetails.error("Error while creating booking references", JSON.stringify({ error }));
  }

  const evtWithMetadata = { ...evt, metadata, eventType: { slug: eventType.slug } };

  await scheduleMandatoryReminder(
    evtWithMetadata,
    eventType.workflows || [],
    !isConfirmedByDefault,
    !!eventType.owner?.hideBranding,
    evt.attendeeSeatId
  );

  try {
    await scheduleWorkflowReminders({
      workflows: eventType.workflows,
      smsReminderNumber: smsReminderNumber || null,
      calendarEvent: evtWithMetadata,
      isNotConfirmed: rescheduleUid ? false : !isConfirmedByDefault,
      isRescheduleEvent: !!rescheduleUid,
      isFirstRecurringEvent: req.body.allRecurringDates ? req.body.isFirstRecurringSlot : undefined,
      hideBranding: !!eventType.owner?.hideBranding,
      seatReferenceUid: evt.attendeeSeatId,
    });
  } catch (error) {
    loggerWithEventDetails.error("Error while scheduling workflow reminders", JSON.stringify({ error }));
  }

  // booking successful
  req.statusCode = 201;

  // TODO: Refactor better so this booking object is not passed
  // all around and instead the individual fields are sent as args.
  const bookingResponse = {
    ...booking,
    user: {
      ...booking.user,
      email: null,
    },
    paymentRequired: false,
  };

  return {
    ...bookingResponse,
    ...luckyUserResponse,
    references: referencesToCreate,
    seatReferenceUid: evt.attendeeSeatId,
  };
}

export default handler;
