import type { App, Credential, EventTypeCustomInput } from "@prisma/client";
import { BookingStatus, SchedulingType, WebhookTriggerEvents, WorkflowMethods, Prisma } from "@prisma/client";
import async from "async";
import { isValidPhoneNumber } from "libphonenumber-js";
import { cloneDeep } from "lodash";
import type { NextApiRequest } from "next";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";
import z from "zod";

import { metadata as GoogleMeetMetadata } from "@calcom/app-store/googlevideo/_metadata";
import type { LocationObject } from "@calcom/app-store/locations";
import { getLocationValueForDB } from "@calcom/app-store/locations";
import { MeetLocationType } from "@calcom/app-store/locations";
import { handleEthSignature } from "@calcom/app-store/rainbow/utils/ethereum";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import { getAppFromSlug, getEventTypeAppData } from "@calcom/app-store/utils";
import { cancelScheduledJobs, scheduleTrigger } from "@calcom/app-store/zapier/lib/nodeScheduler";
import EventManager from "@calcom/core/EventManager";
import { getEventName } from "@calcom/core/event";
import { getUserAvailability } from "@calcom/core/getUserAvailability";
import type { ConfigType, Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import {
  sendAttendeeRequestEmail,
  sendOrganizerRequestEmail,
  sendRescheduledEmails,
  sendScheduledEmails,
  sendScheduledSeatsEmails,
} from "@calcom/emails";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { deleteScheduledEmailReminder } from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import { scheduleWorkflowReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { deleteScheduledSMSReminder } from "@calcom/features/ee/workflows/lib/reminders/smsReminderManager";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import { getVideoCallUrl } from "@calcom/lib/CalEventParser";
import { getDSTDifference, isInDST } from "@calcom/lib/date-fns";
import { getDefaultEvent, getGroupName, getUsernameList } from "@calcom/lib/defaultEvents";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { HttpError } from "@calcom/lib/http-error";
import isOutOfBounds, { BookingDateInPastError } from "@calcom/lib/isOutOfBounds";
import logger from "@calcom/lib/logger";
import { handlePayment } from "@calcom/lib/payment/handlePayment";
import { checkBookingLimits, getLuckyUser } from "@calcom/lib/server";
import { getTranslation } from "@calcom/lib/server/i18n";
import { slugify } from "@calcom/lib/slugify";
import { updateWebUser as syncServicesUpdateWebUser } from "@calcom/lib/sync/SyncServiceManager";
import prisma, { userSelect } from "@calcom/prisma";
import type { bookingCreateSchemaLegacyPropsForApi } from "@calcom/prisma/zod-utils";
import {
  bookingCreateBodySchemaForApi,
  customInputSchema,
  EventTypeMetaDataSchema,
  extendedBookingCreateBody,
  userMetadata as userMetadataSchema,
} from "@calcom/prisma/zod-utils";
import type { BufferedBusyTime } from "@calcom/types/BufferedBusyTime";
import type { AdditionalInformation, AppsStatus, CalendarEvent } from "@calcom/types/Calendar";
import type { EventResult, PartialReference } from "@calcom/types/EventManager";
import type { WorkingHours } from "@calcom/types/schedule";

import type { EventTypeInfo } from "../../webhooks/lib/sendPayload";
import sendPayload from "../../webhooks/lib/sendPayload";
import getBookingResponsesSchema from "./getBookingResponsesSchema";

const translator = short();
const log = logger.getChildLogger({ prefix: ["[api] book:user"] });

type User = Prisma.UserGetPayload<typeof userSelect>;
type BufferedBusyTimes = BufferedBusyTime[];

interface IEventTypePaymentCredentialType {
  appId: EventTypeAppsList;
  app: {
    categories: App["categories"];
    dirName: string;
  };
  key: Prisma.JsonValue;
}

/**
 * Refreshes a Credential with fresh data from the database.
 *
 * @param credential
 */
async function refreshCredential(credential: Credential): Promise<Credential> {
  const newCredential = await prisma.credential.findUnique({
    where: {
      id: credential.id,
    },
  });

  if (!newCredential) {
    return credential;
  } else {
    return newCredential;
  }
}

/**
 * Refreshes the given set of credentials.
 *
 * @param credentials
 */
async function refreshCredentials(credentials: Array<Credential>): Promise<Array<Credential>> {
  return await async.mapLimit(credentials, 5, refreshCredential);
}

const isWithinAvailableHours = (
  timeSlot: { start: ConfigType; end: ConfigType },
  {
    workingHours,
    organizerTimeZone,
    inviteeTimeZone,
  }: {
    workingHours: WorkingHours[];
    organizerTimeZone: string;
    inviteeTimeZone: string;
  }
) => {
  const timeSlotStart = dayjs(timeSlot.start).utc();
  const timeSlotEnd = dayjs(timeSlot.end).utc();
  const isOrganizerInDST = isInDST(dayjs().tz(organizerTimeZone));
  const isInviteeInDST = isInDST(dayjs().tz(inviteeTimeZone));
  const isOrganizerInDSTWhenSlotStart = isInDST(timeSlotStart.tz(organizerTimeZone));
  const isInviteeInDSTWhenSlotStart = isInDST(timeSlotStart.tz(inviteeTimeZone));
  const organizerDSTDifference = getDSTDifference(organizerTimeZone);
  const inviteeDSTDifference = getDSTDifference(inviteeTimeZone);
  const sameDSTUsers = isOrganizerInDSTWhenSlotStart === isInviteeInDSTWhenSlotStart;
  const organizerDST = isOrganizerInDST === isOrganizerInDSTWhenSlotStart;
  const inviteeDST = isInviteeInDST === isInviteeInDSTWhenSlotStart;
  const getTime = (slotTime: Dayjs, minutes: number) =>
    slotTime
      .startOf("day")
      .add(
        sameDSTUsers && organizerDST && inviteeDST
          ? minutes
          : minutes -
              (isOrganizerInDSTWhenSlotStart || isOrganizerInDST
                ? organizerDSTDifference
                : inviteeDSTDifference),
        "minutes"
      );
  for (const workingHour of workingHours) {
    const startTime = getTime(timeSlotStart, workingHour.startTime);
    const endTime = getTime(timeSlotEnd, workingHour.endTime);
    if (
      workingHour.days.includes(timeSlotStart.day()) &&
      // UTC mode, should be performant.
      timeSlotStart.isBetween(startTime, endTime, null, "[)") &&
      timeSlotEnd.isBetween(startTime, endTime, null, "(]")
    ) {
      return true;
    }
  }
  return false;
};

// if true, there are conflicts.
function checkForConflicts(busyTimes: BufferedBusyTimes, time: dayjs.ConfigType, length: number) {
  // Early return
  if (!Array.isArray(busyTimes) || busyTimes.length < 1) {
    return false; // guaranteed no conflicts when there is no busy times.
  }

  for (const busyTime of busyTimes) {
    const startTime = dayjs(busyTime.start);
    const endTime = dayjs(busyTime.end);
    // Check if time is between start and end times
    if (dayjs(time).isBetween(startTime, endTime, null, "[)")) {
      return true;
    }
    // Check if slot end time is between start and end time
    if (dayjs(time).add(length, "minutes").isBetween(startTime, endTime)) {
      return true;
    }
    // Check if startTime is between slot
    if (startTime.isBetween(dayjs(time), dayjs(time).add(length, "minutes"))) {
      return true;
    }
  }
  return false;
}

const getEventTypesFromDB = async (eventTypeId: number) => {
  const eventType = await prisma.eventType.findUniqueOrThrow({
    where: {
      id: eventTypeId,
    },
    select: {
      id: true,
      customInputs: true,
      disableGuests: true,
      users: userSelect,
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      bookingFields: true,
      title: true,
      length: true,
      eventName: true,
      schedulingType: true,
      description: true,
      periodType: true,
      periodStartDate: true,
      periodEndDate: true,
      periodDays: true,
      periodCountCalendarDays: true,
      requiresConfirmation: true,
      userId: true,
      price: true,
      currency: true,
      metadata: true,
      destinationCalendar: true,
      hideCalendarNotes: true,
      seatsPerTimeSlot: true,
      recurringEvent: true,
      seatsShowAttendees: true,
      bookingLimits: true,
      workflows: {
        include: {
          workflow: {
            include: {
              steps: true,
            },
          },
        },
      },
      locations: true,
      timeZone: true,
      schedule: {
        select: {
          availability: true,
          timeZone: true,
        },
      },
      hosts: {
        select: {
          isFixed: true,
          user: userSelect,
        },
      },
      availability: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
          days: true,
        },
      },
    },
  });

  return {
    ...eventType,
    metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
    recurringEvent: parseRecurringEvent(eventType.recurringEvent),
    customInputs: customInputSchema.array().parse(eventType.customInputs || []),
    locations: (eventType.locations ?? []) as LocationObject[],
    bookingFields: getBookingFieldsWithSystemFields(eventType),
  };
};

type IsFixedAwareUser = User & { isFixed: boolean };

async function ensureAvailableUsers(
  eventType: Awaited<ReturnType<typeof getEventTypesFromDB>> & {
    users: IsFixedAwareUser[];
  },
  input: { dateFrom: string; dateTo: string; timeZone: string },
  recurringDatesInfo?: {
    allRecurringDates: string[] | undefined;
    currentRecurringIndex: number | undefined;
  }
) {
  const availableUsers: IsFixedAwareUser[] = [];
  /** Let's start checking for availability */
  for (const user of eventType.users) {
    const { busy: bufferedBusyTimes, workingHours } = await getUserAvailability(
      {
        userId: user.id,
        eventTypeId: eventType.id,
        ...input,
      },
      { user, eventType }
    );

    // check if time slot is outside of schedule.
    if (
      !isWithinAvailableHours(
        { start: input.dateFrom, end: input.dateTo },
        {
          workingHours,
          organizerTimeZone: eventType.timeZone || eventType?.schedule?.timeZone || user.timeZone,
          inviteeTimeZone: input.timeZone,
        }
      )
    ) {
      // user does not have availability at this time, skip user.
      continue;
    }

    console.log("calendarBusyTimes==>>>", bufferedBusyTimes);

    let foundConflict = false;
    try {
      if (
        eventType.recurringEvent &&
        recurringDatesInfo?.currentRecurringIndex === 0 &&
        recurringDatesInfo.allRecurringDates
      ) {
        const allBookingDates = recurringDatesInfo.allRecurringDates.map((strDate) => new Date(strDate));
        // Go through each date for the recurring event and check if each one's availability
        // DONE: Decreased computational complexity from O(2^n) to O(n) by refactoring this loop to stop
        // running at the first unavailable time.
        let i = 0;
        while (!foundConflict && i < allBookingDates.length) {
          foundConflict = checkForConflicts(bufferedBusyTimes, allBookingDates[i++], eventType.length);
        }
      } else {
        foundConflict = checkForConflicts(bufferedBusyTimes, input.dateFrom, eventType.length);
      }
    } catch {
      log.debug({
        message: "Unable set isAvailableToBeBooked. Using true. ",
      });
    }
    // no conflicts found, add to available users.
    if (!foundConflict) {
      availableUsers.push(user);
    }
  }
  if (!availableUsers.length) {
    throw new Error("No available users found.");
  }
  return availableUsers;
}

function getBookingData({
  req,
  isNotAnApiCall,
  eventType,
}: {
  req: NextApiRequest;
  isNotAnApiCall: boolean;
  eventType: Awaited<ReturnType<typeof getEventTypesFromDB>>;
}) {
  const bookingDataSchema = isNotAnApiCall
    ? extendedBookingCreateBody.merge(
        z.object({
          responses: getBookingResponsesSchema({
            bookingFields: eventType.bookingFields,
          }),
        })
      )
    : bookingCreateBodySchemaForApi;

  const reqBody = bookingDataSchema.parse(req.body);
  if ("responses" in reqBody) {
    const responses = reqBody.responses;
    const calEventResponses = {} as NonNullable<CalendarEvent["responses"]>;
    const calEventUserFieldsResponses = {} as NonNullable<CalendarEvent["userFieldsResponses"]>;
    eventType.bookingFields.forEach((field) => {
      const label = field.label || field.defaultLabel;
      if (!label) {
        throw new Error('Missing label for booking field "' + field.name + '"');
      }
      if (field.editable === "user" || field.editable === "user-readonly") {
        calEventUserFieldsResponses[field.name] = {
          label,
          value: responses[field.name],
        };
      }
      calEventResponses[field.name] = {
        label,
        value: responses[field.name],
      };
    });
    return {
      ...reqBody,
      name: responses.name,
      email: responses.email,
      guests: responses.guests ? responses.guests : [],
      location: responses.location?.optionValue || responses.location?.value || "",
      smsReminderNumber: responses.smsReminderNumber,
      notes: responses.notes || "",
      calEventUserFieldsResponses,
      rescheduleReason: responses.rescheduleReason,
      calEventResponses,
    };
  } else {
    // Check if required custom inputs exist
    handleCustomInputs(eventType.customInputs as EventTypeCustomInput[], reqBody.customInputs);

    return {
      ...reqBody,
      name: reqBody.name,
      email: reqBody.email,
      guests: reqBody.guests,
      location: reqBody.location || "",
      smsReminderNumber: reqBody.smsReminderNumber,
      notes: reqBody.notes,
      rescheduleReason: reqBody.rescheduleReason,
    };
  }
}

function getCustomInputsResponses(
  reqBody: {
    responses?: Record<string, any>;
    customInputs?: z.infer<typeof bookingCreateSchemaLegacyPropsForApi>["customInputs"];
  },
  eventTypeCustomInputs: Awaited<ReturnType<typeof getEventTypesFromDB>>["customInputs"]
) {
  const customInputsResponses = {} as NonNullable<CalendarEvent["customInputs"]>;
  if ("customInputs" in reqBody) {
    const reqCustomInputsResponses = reqBody.customInputs || [];
    if (reqCustomInputsResponses?.length > 0) {
      reqCustomInputsResponses.forEach(({ label, value }) => {
        customInputsResponses[label] = value;
      });
    }
  } else {
    const responses = reqBody.responses || {};
    // Backward Compatibility: Map new `responses` to old `customInputs` format so that webhooks can still receive same values.
    for (const [fieldName, fieldValue] of Object.entries(responses)) {
      const foundACustomInputForTheResponse = eventTypeCustomInputs.find(
        (input) => slugify(input.label) === fieldName
      );
      if (foundACustomInputForTheResponse) {
        customInputsResponses[foundACustomInputForTheResponse.label] = fieldValue;
      }
    }
  }

  return customInputsResponses;
}

async function handler(
  req: NextApiRequest & { userId?: number | undefined },
  {
    isNotAnApiCall = false,
  }: {
    isNotAnApiCall?: boolean;
  } = {
    isNotAnApiCall: false,
  }
) {
  const { userId } = req;

  // handle dynamic user
  let eventType =
    !req.body.eventTypeId && !!req.body.eventTypeSlug
      ? getDefaultEvent(req.body.eventTypeSlug)
      : await getEventTypesFromDB(req.body.eventTypeId);

  eventType = {
    ...eventType,
    bookingFields: getBookingFieldsWithSystemFields(eventType),
  };

  const {
    recurringCount,
    allRecurringDates,
    currentRecurringIndex,
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
    ...reqBody
  } = getBookingData({
    req,
    isNotAnApiCall,
    eventType,
  });

  const tAttendees = await getTranslation(language ?? "en", "common");
  const tGuests = await getTranslation("en", "common");
  log.debug(`Booking eventType ${eventTypeId} started`);
  const dynamicUserList = Array.isArray(reqBody.user)
    ? getGroupName(reqBody.user)
    : getUsernameList(reqBody.user);
  if (!eventType) throw new HttpError({ statusCode: 404, message: "eventType.notFound" });

  const isTeamEventType =
    eventType.schedulingType === SchedulingType.COLLECTIVE ||
    eventType.schedulingType === SchedulingType.ROUND_ROBIN;

  const paymentAppData = getPaymentAppData(eventType);

  let timeOutOfBounds = false;
  try {
    timeOutOfBounds = isOutOfBounds(reqBody.start, {
      periodType: eventType.periodType,
      periodDays: eventType.periodDays,
      periodEndDate: eventType.periodEndDate,
      periodStartDate: eventType.periodStartDate,
      periodCountCalendarDays: eventType.periodCountCalendarDays,
    });
  } catch (error) {
    if (error instanceof BookingDateInPastError) {
      // TODO: HttpError should not bleed through to the console.
      log.info(`Booking eventType ${eventTypeId} failed`, error);
      throw new HttpError({ statusCode: 400, message: error.message });
    }
    log.debug({
      message: "Unable set timeOutOfBounds. Using false. ",
    });
  }

  if (timeOutOfBounds) {
    const error = {
      errorCode: "BookingTimeOutOfBounds",
      message: `EventType '${eventType.eventName}' cannot be booked at this time.`,
    };

    throw new HttpError({ statusCode: 400, message: error.message });
  }

  const loadUsers = async () =>
    !eventTypeId
      ? await prisma.user.findMany({
          where: {
            username: {
              in: dynamicUserList,
            },
          },
          select: {
            ...userSelect.select,
            metadata: true,
          },
        })
      : !!eventType.hosts?.length
      ? eventType.hosts.map(({ user, isFixed }) => ({
          ...user,
          isFixed,
        }))
      : eventType.users;
  // loadUsers allows type inferring
  let users: (Awaited<ReturnType<typeof loadUsers>>[number] & {
    isFixed?: boolean;
    metadata?: Prisma.JsonValue;
  })[] = await loadUsers();

  const isDynamicAllowed = !users.some((user) => !user.allowDynamicBooking);
  if (!isDynamicAllowed && !eventTypeId) {
    throw new HttpError({
      message: "Some of the users in this group do not allow dynamic booking",
      statusCode: 400,
    });
  }

  // If this event was pre-relationship migration
  // TODO: Establish whether this is dead code.
  if (!users.length && eventType.userId) {
    const eventTypeUser = await prisma.user.findUnique({
      where: {
        id: eventType.userId,
      },
      ...userSelect,
    });
    if (!eventTypeUser) throw new HttpError({ statusCode: 404, message: "eventTypeUser.notFound" });
    users.push(eventTypeUser);
  }

  if (!users) throw new HttpError({ statusCode: 404, message: "eventTypeUser.notFound" });

  users = users.map((user) => ({
    ...user,
    isFixed:
      user.isFixed === false
        ? false
        : user.isFixed || eventType.schedulingType !== SchedulingType.ROUND_ROBIN,
  }));

  if (eventType && eventType.hasOwnProperty("bookingLimits") && eventType?.bookingLimits) {
    const startAsDate = dayjs(reqBody.start).toDate();
    await checkBookingLimits(eventType.bookingLimits, startAsDate, eventType.id);
  }

  if (!eventType.seatsPerTimeSlot) {
    const availableUsers = await ensureAvailableUsers(
      {
        ...eventType,
        users: users as IsFixedAwareUser[],
        ...(eventType.recurringEvent && {
          recurringEvent: {
            ...eventType.recurringEvent,
            count: recurringCount || eventType.recurringEvent.count,
          },
        }),
      },
      {
        dateFrom: reqBody.start,
        dateTo: reqBody.end,
        timeZone: reqBody.timeZone,
      },
      {
        allRecurringDates,
        currentRecurringIndex,
      }
    );

    const luckyUsers: typeof users = [];
    const luckyUserPool = availableUsers.filter((user) => !user.isFixed);
    // loop through all non-fixed hosts and get the lucky users
    while (luckyUserPool.length > 0 && luckyUsers.length < 1 /* TODO: Add variable */) {
      const newLuckyUser = await getLuckyUser("MAXIMIZE_AVAILABILITY", {
        // find a lucky user that is not already in the luckyUsers array
        availableUsers: luckyUserPool.filter(
          (user) => !luckyUsers.find((existing) => existing.id === user.id)
        ),
        eventTypeId: eventType.id,
      });
      if (!newLuckyUser) {
        break; // prevent infinite loop
      }
      luckyUsers.push(newLuckyUser);
    }
    // ALL fixed users must be available
    if (
      availableUsers.filter((user) => user.isFixed).length !== users.filter((user) => user.isFixed).length
    ) {
      throw new Error("Some users are unavailable for booking.");
    }
    // Pushing fixed user before the luckyUser guarantees the (first) fixed user as the organizer.
    users = [...availableUsers.filter((user) => user.isFixed), ...luckyUsers];
  }

  const rainbowAppData = getEventTypeAppData(eventType, "rainbow") || {};

  // @TODO: use the returned address somewhere in booking creation?
  // const address: string | undefined = await ...
  await handleEthSignature(rainbowAppData, reqBody.ethSignature);

  const [organizerUser] = users;
  const tOrganizer = await getTranslation(organizerUser.locale ?? "en", "common");

  const invitee = [
    {
      email: bookerEmail,
      name: bookerName,
      timeZone: reqBody.timeZone,
      language: { translate: tAttendees, locale: language ?? "en" },
    },
  ];

  const guests = (reqGuests || []).reduce((guestArray, guest) => {
    // If it's a team event, remove the team member from guests
    if (isTeamEventType) {
      if (users.some((user) => user.email === guest)) {
        return guestArray;
      } else {
        guestArray.push({
          email: guest,
          name: "",
          timeZone: reqBody.timeZone,
          language: { translate: tGuests, locale: "en" },
        });
      }
    }
    return guestArray;
  }, [] as typeof invitee);

  const seed = `${organizerUser.username}:${dayjs(reqBody.start).utc().format()}:${new Date().getTime()}`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));

  let locationBodyString = location;
  let defaultLocationUrl = undefined;
  if (dynamicUserList.length > 1) {
    users = users.sort((a, b) => {
      const aIndex = (a.username && dynamicUserList.indexOf(a.username)) || 0;
      const bIndex = (b.username && dynamicUserList.indexOf(b.username)) || 0;
      return aIndex - bIndex;
    });
    const firstUsersMetadata = userMetadataSchema.parse(users[0].metadata);
    const app = getAppFromSlug(firstUsersMetadata?.defaultConferencingApp?.appSlug);
    locationBodyString = app?.appData?.location?.type || locationBodyString;
    defaultLocationUrl = firstUsersMetadata?.defaultConferencingApp?.appLink;
  }

  const bookingLocation = getLocationValueForDB(locationBodyString, eventType.locations);
  const customInputs = getCustomInputsResponses(reqBody, eventType.customInputs);
  const teamMemberPromises =
    users.length > 1
      ? users.slice(1).map(async function (user) {
          return {
            email: user.email || "",
            name: user.name || "",
            timeZone: user.timeZone,
            language: {
              translate: await getTranslation(user.locale ?? "en", "common"),
              locale: user.locale ?? "en",
            },
          };
        })
      : [];

  const teamMembers = await Promise.all(teamMemberPromises);

  const attendeesList = [...invitee, ...guests];

  const eventNameObject = {
    //TODO: Can we have an unnamed attendee? If not, I would really like to throw an error here.
    attendeeName: bookerName || "Nameless",
    eventType: eventType.title,
    eventName: eventType.eventName,
    // TODO: Can we have an unnamed organizer? If not, I would really like to throw an error here.
    host: organizerUser.name || "Nameless",
    location: bookingLocation,
    t: tOrganizer,
  };

  let requiresConfirmation = eventType?.requiresConfirmation;
  const rcThreshold = eventType?.metadata?.requiresConfirmationThreshold;
  if (rcThreshold) {
    if (dayjs(dayjs(reqBody.start).utc().format()).diff(dayjs(), rcThreshold.unit) > rcThreshold.time) {
      requiresConfirmation = false;
    }
  }

  const responses = "responses" in reqBody ? reqBody.responses : null;
  const calEventUserFieldsResponses =
    "calEventUserFieldsResponses" in reqBody ? reqBody.calEventUserFieldsResponses : null;
  let evt: CalendarEvent = {
    type: eventType.title,
    title: getEventName(eventNameObject), //this needs to be either forced in english, or fetched for each attendee and organizer separately
    description: eventType.description,
    additionalNotes,
    customInputs,
    startTime: dayjs(reqBody.start).utc().format(),
    endTime: dayjs(reqBody.end).utc().format(),
    organizer: {
      id: organizerUser.id,
      name: organizerUser.name || "Nameless",
      email: organizerUser.email || "Email-less",
      timeZone: organizerUser.timeZone,
      language: { translate: tOrganizer, locale: organizerUser.locale ?? "en" },
    },
    responses: "calEventResponses" in reqBody ? reqBody.calEventResponses : null,
    userFieldsResponses: calEventUserFieldsResponses,
    attendees: attendeesList,
    location: bookingLocation, // Will be processed by the EventManager later.
    /** For team events & dynamic collective events, we will need to handle each member destinationCalendar eventually */
    destinationCalendar: eventType.destinationCalendar || organizerUser.destinationCalendar,
    hideCalendarNotes: eventType.hideCalendarNotes,
    requiresConfirmation: requiresConfirmation ?? false,
    eventTypeId: eventType.id,
    // if seats are not enabled we should default true
    seatsShowAttendees: !!eventType.seatsPerTimeSlot ? eventType.seatsShowAttendees : true,
    seatsPerTimeSlot: eventType.seatsPerTimeSlot,
  };

  // For seats, if the booking already exists then we want to add the new attendee to the existing booking
  if (reqBody.bookingUid) {
    if (!eventType.seatsPerTimeSlot) {
      throw new HttpError({ statusCode: 404, message: "Event type does not have seats" });
    }

    const booking = await prisma.booking.findUnique({
      where: {
        uid: reqBody.bookingUid,
      },
      select: {
        uid: true,
        id: true,
        attendees: true,
        userId: true,
        references: true,
        startTime: true,
        user: true,
      },
    });
    if (!booking) {
      throw new HttpError({ statusCode: 404, message: "Booking not found" });
    }

    // Need to add translation for attendees to pass type checks. Since these values are never written to the db we can just use the new attendee language
    const bookingAttendees = booking.attendees.map((attendee) => {
      return { ...attendee, language: { translate: tAttendees, locale: language ?? "en" } };
    });

    evt = { ...evt, attendees: [...bookingAttendees, invitee[0]] };

    if (eventType.seatsPerTimeSlot <= booking.attendees.length) {
      throw new HttpError({ statusCode: 409, message: "Booking seats are full" });
    }

    if (booking.attendees.find((attendee) => attendee.email === invitee[0].email)) {
      throw new HttpError({ statusCode: 409, message: "Already signed up for time slot" });
    }

    const videoCallReference = booking.references.find((reference) => reference.type.includes("_video"));

    if (videoCallReference) {
      evt.videoCallData = {
        type: videoCallReference.type,
        id: videoCallReference.meetingId,
        password: videoCallReference?.meetingPassword,
        url: videoCallReference.meetingUrl,
      };
    }
    await prisma.booking.update({
      where: {
        uid: reqBody.bookingUid,
      },
      data: {
        attendees: {
          create: {
            email: invitee[0].email,
            name: invitee[0].name,
            timeZone: invitee[0].timeZone,
            locale: invitee[0].language.locale,
          },
        },
      },
    });

    const newSeat = booking.attendees.length !== 0;

    /**
     * Remember objects are passed into functions as references
     * so if you modify it in a inner function it will be modified in the outer function
     * deep cloning evt to avoid this
     */
    const copyEvent = cloneDeep(evt);
    await sendScheduledSeatsEmails(copyEvent, invitee[0], newSeat, !!eventType.seatsShowAttendees);

    const credentials = await refreshCredentials(organizerUser.credentials);
    const eventManager = new EventManager({ ...organizerUser, credentials });
    await eventManager.updateCalendarAttendees(evt, booking);

    if (!Number.isNaN(paymentAppData.price) && paymentAppData.price > 0 && !!booking) {
      const credentialPaymentAppCategories = await prisma.credential.findMany({
        where: {
          userId: organizerUser.id,
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
      if (!eventTypePaymentAppCredential?.appId) {
        throw new HttpError({ statusCode: 400, message: "Missing payment app id" });
      }

      const payment = await handlePayment(
        evt,
        eventType,
        eventTypePaymentAppCredential as IEventTypePaymentCredentialType,
        booking
      );

      req.statusCode = 201;
      return { ...booking, message: "Payment required", paymentUid: payment?.uid };
    }

    req.statusCode = 201;
    return booking;
  }

  if (isTeamEventType) {
    evt.team = {
      members: teamMembers,
      name: eventType.team?.name || "Nameless",
    };
  }

  if (reqBody.recurringEventId && eventType.recurringEvent) {
    // Overriding the recurring event configuration count to be the actual number of events booked for
    // the recurring event (equal or less than recurring event configuration count)
    eventType.recurringEvent = Object.assign({}, eventType.recurringEvent, { count: recurringCount });
    evt.recurringEvent = eventType.recurringEvent;
  }

  // Initialize EventManager with credentials
  const rescheduleUid = reqBody.rescheduleUid;
  async function getOriginalRescheduledBooking(uid: string) {
    return prisma.booking.findFirst({
      where: {
        uid,
        status: {
          in: [BookingStatus.ACCEPTED, BookingStatus.CANCELLED, BookingStatus.PENDING],
        },
      },
      include: {
        attendees: {
          select: {
            name: true,
            email: true,
            locale: true,
            timeZone: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            locale: true,
            timeZone: true,
          },
        },
        payment: true,
        workflowReminders: true,
      },
    });
  }

  type BookingType = Prisma.PromiseReturnType<typeof getOriginalRescheduledBooking>;
  let originalRescheduledBooking: BookingType = null;
  if (rescheduleUid) {
    originalRescheduledBooking = await getOriginalRescheduledBooking(rescheduleUid);
  }
  // If the user is not the owner of the event, new booking should be always pending.
  // Otherwise, an owner rescheduling should be always accepted.
  // Before comparing make sure that userId is set, otherwise undefined === undefined
  const userReschedulingIsOwner = userId && originalRescheduledBooking?.user?.id === userId;
  const isConfirmedByDefault = (!requiresConfirmation && !paymentAppData.price) || userReschedulingIsOwner;

  async function createBooking() {
    if (originalRescheduledBooking) {
      evt.title = originalRescheduledBooking?.title || evt.title;
      evt.description = originalRescheduledBooking?.description || evt.additionalNotes;
      evt.location = originalRescheduledBooking?.location;
    }

    const eventTypeRel = !eventTypeId
      ? {}
      : {
          connect: {
            id: eventTypeId,
          },
        };

    const dynamicEventSlugRef = !eventTypeId ? eventTypeSlug : null;
    const dynamicGroupSlugRef = !eventTypeId ? (reqBody.user as string).toLowerCase() : null;

    const newBookingData: Prisma.BookingCreateInput = {
      uid,
      responses: responses === null ? Prisma.JsonNull : responses,
      title: evt.title,
      startTime: dayjs.utc(evt.startTime).toDate(),
      endTime: dayjs.utc(evt.endTime).toDate(),
      description: evt.additionalNotes,
      customInputs: isPrismaObjOrUndefined(evt.customInputs),
      status: isConfirmedByDefault ? BookingStatus.ACCEPTED : BookingStatus.PENDING,
      location: evt.location,
      eventType: eventTypeRel,
      smsReminderNumber,
      metadata: reqBody.metadata,
      attendees: {
        createMany: {
          data: [
            ...evt.attendees.map((attendee) => {
              //if attendee is team member, it should fetch their locale not booker's locale
              //perhaps make email fetch request to see if his locale is stored, else
              const retObj = {
                name: attendee.name,
                email: attendee.email,
                timeZone: attendee.timeZone,
                locale: attendee.language.locale,
              };
              return retObj;
            }),
            // Have this for now until we change the relationship between bookings & team members
            ...(evt.team?.members
              ? evt.team.members.map((member) => {
                  return {
                    email: member.email,
                    name: member.name,
                    timeZone: member.timeZone,
                    locale: member.language.locale,
                  };
                })
              : []),
          ],
        },
      },
      dynamicEventSlugRef,
      dynamicGroupSlugRef,
      user: {
        connect: {
          id: organizerUser.id,
        },
      },
      destinationCalendar: evt.destinationCalendar
        ? {
            connect: { id: evt.destinationCalendar.id },
          }
        : undefined,
    };
    if (reqBody.recurringEventId) {
      newBookingData.recurringEventId = reqBody.recurringEventId;
    }
    if (originalRescheduledBooking) {
      newBookingData["paid"] = originalRescheduledBooking.paid;
      newBookingData["fromReschedule"] = originalRescheduledBooking.uid;
      if (newBookingData.attendees?.createMany?.data) {
        newBookingData.attendees.createMany.data = originalRescheduledBooking.attendees;
      }
      if (originalRescheduledBooking.recurringEventId) {
        newBookingData.recurringEventId = originalRescheduledBooking.recurringEventId;
      }
    }
    const createBookingObj = {
      include: {
        user: {
          select: { email: true, name: true, timeZone: true },
        },
        attendees: true,
        payment: true,
      },
      data: newBookingData,
    };

    if (originalRescheduledBooking?.paid && originalRescheduledBooking?.payment) {
      const bookingPayment = originalRescheduledBooking?.payment?.find((payment) => payment.success);

      if (bookingPayment) {
        createBookingObj.data.payment = {
          connect: { id: bookingPayment.id },
        };
      }
    }

    if (typeof paymentAppData.price === "number" && paymentAppData.price > 0) {
      /* Validate if there is any stripe_payment credential for this user */
      /*  note: removes custom error message about stripe */
      await prisma.credential.findFirstOrThrow({
        where: {
          type: "stripe_payment",
          userId: organizerUser.id,
        },
        select: {
          id: true,
        },
      });
    }

    return prisma.booking.create(createBookingObj);
  }

  let results: EventResult<AdditionalInformation>[] = [];
  let referencesToCreate: PartialReference[] = [];

  type Booking = Prisma.PromiseReturnType<typeof createBooking>;
  let booking: (Booking & { appsStatus?: AppsStatus[] }) | null = null;
  try {
    booking = await createBooking();
    // Sync Services
    await syncServicesUpdateWebUser(
      await prisma.user.findFirst({
        where: { id: userId },
        select: { id: true, email: true, name: true, username: true, createdDate: true },
      })
    );
    evt.uid = booking?.uid ?? null;
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    log.error(`Booking ${eventTypeId} failed`, "Error when saving booking to db", err.message);
    if (err.code === "P2002") {
      throw new HttpError({ statusCode: 409, message: "booking.conflict" });
    }
    throw err;
  }

  // After polling videoBusyTimes, credentials might have been changed due to refreshment, so query them again.
  const credentials = await refreshCredentials(organizerUser.credentials);
  const eventManager = new EventManager({ ...organizerUser, credentials });

  function handleAppsStatus(
    results: EventResult<AdditionalInformation>[],
    booking: (Booking & { appsStatus?: AppsStatus[] }) | null
  ) {
    // Taking care of apps status
    const resultStatus: AppsStatus[] = results.map((app) => ({
      appName: app.appName,
      type: app.type,
      success: app.success ? 1 : 0,
      failures: !app.success ? 1 : 0,
      errors: app.calError ? [app.calError] : [],
      warnings: app.calWarnings,
    }));

    if (reqAppsStatus === undefined) {
      if (booking !== null) {
        booking.appsStatus = resultStatus;
      }
      evt.appsStatus = resultStatus;
      return;
    }
    // From down here we can assume reqAppsStatus is not undefined anymore
    // Other status exist, so this is the last booking of a series,
    // proceeding to prepare the info for the event
    const calcAppsStatus = reqAppsStatus.concat(resultStatus).reduce((prev, curr) => {
      if (prev[curr.type]) {
        prev[curr.type].success += curr.success;
        prev[curr.type].errors = prev[curr.type].errors.concat(curr.errors);
        prev[curr.type].warnings = prev[curr.type].warnings?.concat(curr.warnings || []);
      } else {
        prev[curr.type] = curr;
      }
      return prev;
    }, {} as { [key: string]: AppsStatus });
    evt.appsStatus = Object.values(calcAppsStatus);
  }

  let videoCallUrl;
  if (originalRescheduledBooking?.uid) {
    try {
      // cancel workflow reminders from previous rescheduled booking
      originalRescheduledBooking.workflowReminders.forEach((reminder) => {
        if (reminder.method === WorkflowMethods.EMAIL) {
          deleteScheduledEmailReminder(reminder.id, reminder.referenceId, true);
        } else if (reminder.method === WorkflowMethods.SMS) {
          deleteScheduledSMSReminder(reminder.id, reminder.referenceId);
        }
      });
    } catch (error) {
      log.error("Error while canceling scheduled workflow reminders", error);
    }

    // Use EventManager to conditionally use all needed integrations.
    const updateManager = await eventManager.reschedule(
      evt,
      originalRescheduledBooking.uid,
      booking?.id,
      rescheduleReason
    );
    // This gets overridden when updating the event - to check if notes have been hidden or not. We just reset this back
    // to the default description when we are sending the emails.
    evt.description = eventType.description;

    results = updateManager.results;
    referencesToCreate = updateManager.referencesToCreate;
    if (results.length > 0 && results.some((res) => !res.success)) {
      const error = {
        errorCode: "BookingReschedulingMeetingFailed",
        message: "Booking Rescheduling failed",
      };

      log.error(`Booking ${organizerUser.name} failed`, error, results);
    } else {
      const metadata: AdditionalInformation = {};

      if (results.length) {
        // TODO: Handle created event metadata more elegantly
        const [updatedEvent] = Array.isArray(results[0].updatedEvent)
          ? results[0].updatedEvent
          : [results[0].updatedEvent];
        if (updatedEvent) {
          metadata.hangoutLink = updatedEvent.hangoutLink;
          metadata.conferenceData = updatedEvent.conferenceData;
          metadata.entryPoints = updatedEvent.entryPoints;
          handleAppsStatus(results, booking);
          videoCallUrl = metadata.hangoutLink || videoCallUrl;
        }
      }
      if (noEmail !== true) {
        await sendRescheduledEmails({
          ...evt,
          additionalInformation: metadata,
          additionalNotes, // Resets back to the additionalNote input and not the override value
          cancellationReason: "$RCH$" + rescheduleReason, // Removable code prefix to differentiate cancellation from rescheduling for email
        });
      }
    }
    // If it's not a reschedule, doesn't require confirmation and there's no price,
    // Create a booking
  } else if (!requiresConfirmation && !paymentAppData.price) {
    // Use EventManager to conditionally use all needed integrations.
    const createManager = await eventManager.create(evt);

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

      log.error(`Booking ${organizerUser.username} failed`, error, results);
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

          const googleCalResult = results.find((result) => result.type === "google_calendar");

          if (!googleCalResult) {
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
        handleAppsStatus(results, booking);
        videoCallUrl = metadata.hangoutLink || defaultLocationUrl || videoCallUrl;
      }
      if (noEmail !== true) {
        await sendScheduledEmails({
          ...evt,
          additionalInformation: metadata,
          additionalNotes,
          customInputs,
        });
      }
    }
  }

  if (!isConfirmedByDefault && noEmail !== true) {
    await sendOrganizerRequestEmail({ ...evt, additionalNotes });
    await sendAttendeeRequestEmail({ ...evt, additionalNotes }, attendeesList[0]);
  }

  if (
    !Number.isNaN(paymentAppData.price) &&
    paymentAppData.price > 0 &&
    !originalRescheduledBooking?.paid &&
    !!booking
  ) {
    // Load credentials.app.categories
    const credentialPaymentAppCategories = await prisma.credential.findMany({
      where: {
        userId: organizerUser.id,
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
      booking
    );

    req.statusCode = 201;
    return { ...booking, message: "Payment required", paymentUid: payment?.uid };
  }

  log.debug(`Booking ${organizerUser.username} completed`);

  if (booking.location?.startsWith("http")) {
    videoCallUrl = booking.location;
  }

  const metadata = videoCallUrl ? { videoCallUrl: getVideoCallUrl(evt) || videoCallUrl } : undefined;
  if (isConfirmedByDefault) {
    const eventTrigger: WebhookTriggerEvents = rescheduleUid
      ? WebhookTriggerEvents.BOOKING_RESCHEDULED
      : WebhookTriggerEvents.BOOKING_CREATED;
    const subscriberOptions = {
      userId: organizerUser.id,
      eventTypeId,
      triggerEvent: eventTrigger,
    };

    const subscriberOptionsMeetingEnded = {
      userId: organizerUser.id,
      eventTypeId,
      triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
    };

    try {
      const subscribersMeetingEnded = await getWebhooks(subscriberOptionsMeetingEnded);

      subscribersMeetingEnded.forEach((subscriber) => {
        if (rescheduleUid && originalRescheduledBooking) {
          cancelScheduledJobs(originalRescheduledBooking, undefined, true);
        }
        if (booking && booking.status === BookingStatus.ACCEPTED) {
          scheduleTrigger(booking, subscriber.subscriberUrl, subscriber);
        }
      });
    } catch (error) {
      log.error("Error while running scheduledJobs for booking", error);
    }

    try {
      // Send Webhook call if hooked to BOOKING_CREATED & BOOKING_RESCHEDULED
      const subscribers = await getWebhooks(subscriberOptions);
      console.log("evt:", {
        ...evt,
        metadata: reqBody.metadata,
      });
      const bookingId = booking?.id;

      const eventTypeInfo: EventTypeInfo = {
        eventTitle: eventType.title,
        eventDescription: eventType.description,
        requiresConfirmation: requiresConfirmation || null,
        price: paymentAppData.price,
        currency: eventType.currency,
        length: eventType.length,
      };

      const promises = subscribers.map((sub) =>
        sendPayload(sub.secret, eventTrigger, new Date().toISOString(), sub, {
          ...evt,
          ...eventTypeInfo,
          bookingId,
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
        }).catch((e) => {
          console.error(`Error executing webhook for event: ${eventTrigger}, URL: ${sub.subscriberUrl}`, e);
        })
      );
      await Promise.all(promises);
    } catch (error) {
      log.error("Error while sending webhook", error);
    }
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
    log.error("Error while updating hashed link", error);
  }

  if (!booking) throw new HttpError({ statusCode: 400, message: "Booking failed" });

  try {
    await prisma.booking.update({
      where: {
        uid: booking.uid,
      },
      data: {
        metadata: { ...(typeof booking.metadata === "object" && booking.metadata), ...metadata },
        references: {
          createMany: {
            data: referencesToCreate,
          },
        },
      },
    });
  } catch (error) {
    log.error("Error while creating booking references", error);
  }

  try {
    await scheduleWorkflowReminders(
      eventType.workflows,
      smsReminderNumber || null,
      { ...evt, ...{ metadata } },
      evt.requiresConfirmation || false,
      rescheduleUid ? true : false,
      true
    );
  } catch (error) {
    log.error("Error while scheduling workflow reminders", error);
  }

  // booking successful
  req.statusCode = 201;
  return booking;
}

export default handler;

function handleCustomInputs(
  eventTypeCustomInputs: EventTypeCustomInput[],
  reqCustomInputs: {
    value: string | boolean;
    label: string;
  }[]
) {
  eventTypeCustomInputs.forEach((etcInput) => {
    if (etcInput.required) {
      const input = reqCustomInputs.find((i) => i.label === etcInput.label);
      if (etcInput.type === "BOOL") {
        z.literal(true, {
          errorMap: () => ({ message: `Missing ${etcInput.type} customInput: '${etcInput.label}'` }),
        }).parse(input?.value);
      } else if (etcInput.type === "PHONE") {
        z.string({
          errorMap: () => ({
            message: `Missing ${etcInput.type} customInput: '${etcInput.label}'`,
          }),
        })
          .refine((val) => isValidPhoneNumber(val), {
            message: "Phone number is invalid",
          })
          .parse(input?.value);
      } else {
        // type: NUMBER are also passed as string
        z.string({
          errorMap: () => ({ message: `Missing ${etcInput.type} customInput: '${etcInput.label}'` }),
        })
          .min(1)
          .parse(input?.value);
      }
    }
  });
}
