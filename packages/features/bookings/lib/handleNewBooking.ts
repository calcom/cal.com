import type { App, DestinationCalendar, EventTypeCustomInput } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { IncomingMessage } from "http";
import { isValidPhoneNumber } from "libphonenumber-js";
// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";
import type { NextApiRequest } from "next";
import type { TFunction } from "next-i18next";
import short, { uuid } from "short-uuid";
import type { Logger } from "tslog";
import { v5 as uuidv5 } from "uuid";
import z from "zod";

import processExternalId from "@calcom/app-store/_utils/calendars/processExternalId";
import { metadata as GoogleMeetMetadata } from "@calcom/app-store/googlevideo/_metadata";
import type { LocationObject } from "@calcom/app-store/locations";
import {
  MeetLocationType,
  OrganizerDefaultConferencingAppType,
  getLocationValueForDB,
} from "@calcom/app-store/locations";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import { getAppFromSlug } from "@calcom/app-store/utils";
import EventManager from "@calcom/core/EventManager";
import { getEventName } from "@calcom/core/event";
import { getBusyTimesForLimitChecks } from "@calcom/core/getBusyTimes";
import { getUsersAvailability } from "@calcom/core/getUserAvailability";
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
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import { isEventTypeLoggingEnabled } from "@calcom/features/bookings/lib/isEventTypeLoggingEnabled";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
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
import { cancelScheduledJobs, scheduleTrigger } from "@calcom/features/webhooks/lib/scheduleTrigger";
import {
  isPrismaObjOrUndefined,
  parseBookingLimit,
  parseDurationLimit,
  parseRecurringEvent,
} from "@calcom/lib";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import { getDefaultEvent, getUsernameList } from "@calcom/lib/defaultEvents";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import { HttpError } from "@calcom/lib/http-error";
import isOutOfBounds, { BookingDateInPastError } from "@calcom/lib/isOutOfBounds";
import logger from "@calcom/lib/logger";
import { handlePayment } from "@calcom/lib/payment/handlePayment";
import { getPiiFreeCalendarEvent, getPiiFreeEventType, getPiiFreeUser } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import { checkBookingLimits, checkDurationLimits, getLuckyUser } from "@calcom/lib/server";
import { getTranslation } from "@calcom/lib/server/i18n";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { slugify } from "@calcom/lib/slugify";
import { updateWebUser as syncServicesUpdateWebUser } from "@calcom/lib/sync/SyncServiceManager";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma, { userSelect } from "@calcom/prisma";
import type { BookingReference } from "@calcom/prisma/client";
import { BookingStatus, SchedulingType, WebhookTriggerEvents } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import {
  EventTypeMetaDataSchema,
  bookingCreateSchemaLegacyPropsForApi,
  customInputSchema,
  userMetadata as userMetadataSchema,
} from "@calcom/prisma/zod-utils";
import type {
  AdditionalInformation,
  AppsStatus,
  CalendarEvent,
  IntervalLimit,
  Person,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { EventResult, PartialReference } from "@calcom/types/EventManager";

import type { EventTypeInfo } from "../../webhooks/lib/sendPayload";
import { checkForConflicts } from "./conflictChecker/checkForConflicts";
import { getAllCredentials } from "./getAllCredentialsForUsersOnEvent/getAllCredentials";
import { refreshCredentials } from "./getAllCredentialsForUsersOnEvent/refreshCredentials";
import getBookingDataSchema from "./getBookingDataSchema";
import handleSeats from "./handleSeats/handleSeats";
import type { BookingSeat } from "./handleSeats/types";

const translator = short();
const log = logger.getSubLogger({ prefix: ["[api] book:user"] });

type User = Prisma.UserGetPayload<typeof userSelect>;
type BookingType = Prisma.PromiseReturnType<typeof getOriginalRescheduledBooking>;
export type Booking = Prisma.PromiseReturnType<typeof createBooking>;
export type NewBookingEventType =
  | Awaited<ReturnType<typeof getDefaultEvent>>
  | Awaited<ReturnType<typeof getEventTypesFromDB>>;

// Work with Typescript to require reqBody.end
type ReqBodyWithoutEnd = z.infer<ReturnType<typeof getBookingDataSchema>>;
type ReqBodyWithEnd = ReqBodyWithoutEnd & { end: string };
export type Invitee = {
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  timeZone: string;
  language: {
    translate: TFunction;
    locale: string;
  };
}[];
export type OrganizerUser = Awaited<ReturnType<typeof loadUsers>>[number] & {
  isFixed?: boolean;
  metadata?: Prisma.JsonValue;
};
export type OriginalRescheduledBooking = Awaited<ReturnType<typeof getOriginalRescheduledBooking>>;

type AwaitedBookingData = Awaited<ReturnType<typeof getBookingData>>;
export type RescheduleReason = AwaitedBookingData["rescheduleReason"];
export type NoEmail = AwaitedBookingData["noEmail"];
export type AdditionalNotes = AwaitedBookingData["notes"];
export type ReqAppsStatus = AwaitedBookingData["appsStatus"];
export type SmsReminderNumber = AwaitedBookingData["smsReminderNumber"];
export type EventTypeId = AwaitedBookingData["eventTypeId"];
export type ReqBodyMetadata = ReqBodyWithEnd["metadata"];

export type IsConfirmedByDefault = ReturnType<typeof getRequiresConfirmationFlags>["isConfirmedByDefault"];
export type PaymentAppData = ReturnType<typeof getPaymentAppData>;

export interface IEventTypePaymentCredentialType {
  appId: EventTypeAppsList;
  app: {
    categories: App["categories"];
    dirName: string;
  };
  key: Prisma.JsonValue;
}

export const getEventTypesFromDB = async (eventTypeId: number) => {
  const eventType = await prisma.eventType.findUniqueOrThrow({
    where: {
      id: eventTypeId,
    },
    select: {
      id: true,
      customInputs: true,
      disableGuests: true,
      users: {
        select: {
          credentials: {
            select: credentialForCalendarServiceSelect,
          },
          ...userSelect.select,
        },
      },
      slug: true,
      team: {
        select: {
          id: true,
          name: true,
          parentId: true,
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
      lockTimeZoneToggleOnBookingPage: true,
      requiresConfirmation: true,
      requiresBookerEmailVerification: true,
      minimumBookingNotice: true,
      userId: true,
      price: true,
      currency: true,
      metadata: true,
      destinationCalendar: true,
      hideCalendarNotes: true,
      seatsPerTimeSlot: true,
      recurringEvent: true,
      seatsShowAttendees: true,
      seatsShowAvailabilityCount: true,
      bookingLimits: true,
      durationLimits: true,
      assignAllTeamMembers: true,
      parentId: true,
      useEventTypeDestinationCalendarEmail: true,
      owner: {
        select: {
          hideBranding: true,
        },
      },
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
          id: true,
          availability: true,
          timeZone: true,
        },
      },
      hosts: {
        select: {
          isFixed: true,
          priority: true,
          user: {
            select: {
              credentials: {
                select: credentialForCalendarServiceSelect,
              },
              ...userSelect.select,
            },
          },
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
      secondaryEmailId: true,
      secondaryEmail: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return {
    ...eventType,
    metadata: EventTypeMetaDataSchema.parse(eventType?.metadata || {}),
    recurringEvent: parseRecurringEvent(eventType?.recurringEvent),
    customInputs: customInputSchema.array().parse(eventType?.customInputs || []),
    locations: (eventType?.locations ?? []) as LocationObject[],
    bookingFields: getBookingFieldsWithSystemFields(eventType || {}),
    isDynamic: false,
  };
};

type IsFixedAwareUser = User & {
  isFixed: boolean;
  credentials: CredentialPayload[];
  organization: { slug: string };
  priority?: number;
};

const loadUsers = async (eventType: NewBookingEventType, dynamicUserList: string[], req: IncomingMessage) => {
  try {
    if (!eventType.id) {
      if (!Array.isArray(dynamicUserList) || dynamicUserList.length === 0) {
        throw new Error("dynamicUserList is not properly defined or empty.");
      }
      const { isValidOrgDomain, currentOrgDomain } = orgDomainConfig(req);
      const users = await findUsersByUsername({
        usernameList: dynamicUserList,
        orgSlug: isValidOrgDomain ? currentOrgDomain : null,
      });
      return users;
    }
    const hosts = eventType.hosts || [];

    if (!Array.isArray(hosts)) {
      throw new Error("eventType.hosts is not properly defined.");
    }

    const users = hosts.map(({ user, isFixed, priority }) => ({
      ...user,
      isFixed,
      priority,
    }));

    return users.length ? users : eventType.users;
  } catch (error) {
    if (error instanceof HttpError || error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new HttpError({ statusCode: 400, message: error.message });
    }
    throw new HttpError({ statusCode: 500, message: "Unable to load users" });
  }
};

export async function ensureAvailableUsers(
  eventType: Awaited<ReturnType<typeof getEventTypesFromDB>> & {
    users: IsFixedAwareUser[];
  },
  input: { dateFrom: string; dateTo: string; timeZone: string; originalRescheduledBooking?: BookingType },
  loggerWithEventDetails: Logger<unknown>
) {
  const availableUsers: IsFixedAwareUser[] = [];
  const getStartDateTimeUtc = (startDateTimeInput: string, timeZone?: string) => {
    return timeZone === "Etc/GMT"
      ? dayjs.utc(startDateTimeInput)
      : dayjs(startDateTimeInput).tz(timeZone).utc();
  };

  const startDateTimeUtc = getStartDateTimeUtc(input.dateFrom, input.timeZone);
  const endDateTimeUtc =
    input.timeZone === "Etc/GMT" ? dayjs.utc(input.dateTo) : dayjs(input.dateTo).tz(input.timeZone).utc();

  const duration = dayjs(input.dateTo).diff(input.dateFrom, "minute");
  const originalBookingDuration = input.originalRescheduledBooking
    ? dayjs(input.originalRescheduledBooking.endTime).diff(
        dayjs(input.originalRescheduledBooking.startTime),
        "minutes"
      )
    : undefined;

  const bookingLimits = parseBookingLimit(eventType?.bookingLimits);
  const durationLimits = parseDurationLimit(eventType?.durationLimits);
  let busyTimesFromLimitsBookingsAllUsers: Awaited<ReturnType<typeof getBusyTimesForLimitChecks>> = [];

  if (eventType && (bookingLimits || durationLimits)) {
    busyTimesFromLimitsBookingsAllUsers = await getBusyTimesForLimitChecks({
      userIds: eventType.users.map((u) => u.id),
      eventTypeId: eventType.id,
      startDate: startDateTimeUtc.format(),
      endDate: endDateTimeUtc.format(),
      rescheduleUid: input.originalRescheduledBooking?.uid ?? null,
      bookingLimits,
      durationLimits,
    });
  }

  (
    await getUsersAvailability({
      users: eventType.users,
      query: {
        ...input,
        eventTypeId: eventType.id,
        duration: originalBookingDuration,
        returnDateOverrides: false,
        dateFrom: startDateTimeUtc.format(),
        dateTo: endDateTimeUtc.format(),
      },
      initialData: {
        eventType,
        rescheduleUid: input.originalRescheduledBooking?.uid ?? null,
        busyTimesFromLimitsBookings: busyTimesFromLimitsBookingsAllUsers,
      },
    })
  ).forEach(({ oooExcludedDateRanges: dateRanges, busy: bufferedBusyTimes }, index) => {
    const user = eventType.users[index];

    log.debug(
      "calendarBusyTimes==>>>",
      JSON.stringify({ bufferedBusyTimes, dateRanges, isRecurringEvent: eventType.recurringEvent })
    );

    if (!dateRanges.length) {
      loggerWithEventDetails.error(
        `User does not have availability at this time.`,
        safeStringify({
          startDateTimeUtc,
          endDateTimeUtc,
          input,
        })
      );
      return;
    }

    let foundConflict = false;

    let dateRangeForBooking = false;

    //check if event time is within the date range
    for (const dateRange of dateRanges) {
      if (
        (startDateTimeUtc.isAfter(dateRange.start) || startDateTimeUtc.isSame(dateRange.start)) &&
        (endDateTimeUtc.isBefore(dateRange.end) || endDateTimeUtc.isSame(dateRange.end))
      ) {
        dateRangeForBooking = true;
        break;
      }
    }

    if (!dateRangeForBooking) {
      loggerWithEventDetails.error(
        `No date range for booking.`,
        safeStringify({
          startDateTimeUtc,
          endDateTimeUtc,
          input,
        })
      );
      return;
    }

    try {
      foundConflict = checkForConflicts(bufferedBusyTimes, startDateTimeUtc, duration);
    } catch (error) {
      loggerWithEventDetails.error("Unable set isAvailableToBeBooked. Using true. ", error);
    }
    // no conflicts found, add to available users.
    if (!foundConflict) {
      availableUsers.push(user);
    }
  });

  if (!availableUsers.length) {
    loggerWithEventDetails.error(
      `No available users found.`,
      safeStringify({
        startDateTimeUtc,
        endDateTimeUtc,
        input,
      })
    );
    throw new Error(ErrorCode.NoAvailableUsersFound);
  }
  return availableUsers;
}

async function getOriginalRescheduledBooking(uid: string, seatsEventType?: boolean) {
  return prisma.booking.findFirst({
    where: {
      uid: uid,
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
          ...(seatsEventType && { bookingSeat: true, id: true }),
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          locale: true,
          timeZone: true,
          destinationCalendar: true,
          credentials: {
            select: {
              id: true,
              userId: true,
              key: true,
              type: true,
              teamId: true,
              appId: true,
              invalid: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      },
      destinationCalendar: true,
      payment: true,
      references: true,
      workflowReminders: true,
    },
  });
}

export async function getBookingData<T extends z.ZodType>({
  req,
  eventType,
  schema,
}: {
  req: NextApiRequest;
  eventType: Awaited<ReturnType<typeof getEventTypesFromDB>>;
  schema: T;
}) {
  const reqBody = await schema.parseAsync(req.body);
  const reqBodyWithEnd = (reqBody: ReqBodyWithoutEnd): reqBody is ReqBodyWithEnd => {
    // Use the event length to auto-set the event end time.
    if (!Object.prototype.hasOwnProperty.call(reqBody, "end")) {
      reqBody.end = dayjs.utc(reqBody.start).add(eventType.length, "minutes").format();
    }
    return true;
  };
  if (!reqBodyWithEnd(reqBody)) {
    throw new Error(ErrorCode.RequestBodyWithouEnd);
  }
  // reqBody.end is no longer an optional property.
  if (reqBody.customInputs) {
    // Check if required custom inputs exist
    handleCustomInputs(eventType.customInputs as EventTypeCustomInput[], reqBody.customInputs);
    const reqBodyWithLegacyProps = bookingCreateSchemaLegacyPropsForApi.parse(reqBody);
    return {
      ...reqBody,
      name: reqBodyWithLegacyProps.name,
      email: reqBodyWithLegacyProps.email,
      guests: reqBodyWithLegacyProps.guests,
      location: reqBodyWithLegacyProps.location || "",
      smsReminderNumber: reqBodyWithLegacyProps.smsReminderNumber,
      notes: reqBodyWithLegacyProps.notes,
      rescheduleReason: reqBodyWithLegacyProps.rescheduleReason,
      // So TS doesn't complain about unknown properties
      calEventUserFieldsResponses: undefined,
      calEventResponses: undefined,
      customInputs: undefined,
    };
  }
  if (!reqBody.responses) {
    throw new Error("`responses` must not be nullish");
  }
  const responses = reqBody.responses;

  const { userFieldsResponses: calEventUserFieldsResponses, responses: calEventResponses } =
    getCalEventResponses({
      bookingFields: eventType.bookingFields,
      responses,
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
    // So TS doesn't complain about unknown properties
    customInputs: undefined,
  };
}

async function createBooking({
  originalRescheduledBooking,
  evt,
  eventTypeId,
  eventTypeSlug,
  reqBodyUser,
  reqBodyMetadata,
  reqBodyRecurringEventId,
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
}: {
  originalRescheduledBooking: OriginalRescheduledBooking;
  evt: CalendarEvent;
  eventType: NewBookingEventType;
  eventTypeId: EventTypeId;
  eventTypeSlug: AwaitedBookingData["eventTypeSlug"];
  reqBodyUser: ReqBodyWithEnd["user"];
  reqBodyMetadata: ReqBodyWithEnd["metadata"];
  reqBodyRecurringEventId: ReqBodyWithEnd["recurringEventId"];
  uid: short.SUUID;
  responses: ReqBodyWithEnd["responses"] | null;
  isConfirmedByDefault: IsConfirmedByDefault;
  smsReminderNumber: AwaitedBookingData["smsReminderNumber"];
  organizerUser: Awaited<ReturnType<typeof loadUsers>>[number] & {
    isFixed?: boolean;
    metadata?: Prisma.JsonValue;
  };
  rescheduleReason: Awaited<ReturnType<typeof getBookingData>>["rescheduleReason"];
  bookerEmail: Awaited<ReturnType<typeof getBookingData>>["email"];
  paymentAppData: ReturnType<typeof getPaymentAppData>;
  changedOrganizer: boolean;
}) {
  if (originalRescheduledBooking) {
    evt.title = originalRescheduledBooking?.title || evt.title;
    evt.description = originalRescheduledBooking?.description || evt.description;
    evt.location = originalRescheduledBooking?.location || evt.location;
    evt.location = changedOrganizer ? evt.location : originalRescheduledBooking?.location || evt.location;
  }

  const eventTypeRel = !eventTypeId
    ? {}
    : {
        connect: {
          id: eventTypeId,
        },
      };

  const dynamicEventSlugRef = !eventTypeId ? eventTypeSlug : null;
  const dynamicGroupSlugRef = !eventTypeId ? (reqBodyUser as string).toLowerCase() : null;

  const attendeesData = evt.attendees.map((attendee) => {
    //if attendee is team member, it should fetch their locale not booker's locale
    //perhaps make email fetch request to see if his locale is stored, else
    return {
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      locale: attendee.language.locale,
    };
  });

  if (evt.team?.members) {
    attendeesData.push(
      ...evt.team.members.map((member) => ({
        email: member.email,
        name: member.name,
        timeZone: member.timeZone,
        locale: member.language.locale,
      }))
    );
  }

  const newBookingData: Prisma.BookingCreateInput = {
    uid,
    userPrimaryEmail: evt.organizer.email,
    responses: responses === null || evt.seatsPerTimeSlot ? Prisma.JsonNull : responses,
    title: evt.title,
    startTime: dayjs.utc(evt.startTime).toDate(),
    endTime: dayjs.utc(evt.endTime).toDate(),
    description: evt.seatsPerTimeSlot ? null : evt.additionalNotes,
    customInputs: isPrismaObjOrUndefined(evt.customInputs),
    status: isConfirmedByDefault ? BookingStatus.ACCEPTED : BookingStatus.PENDING,
    location: evt.location,
    eventType: eventTypeRel,
    smsReminderNumber,
    metadata: reqBodyMetadata,
    attendees: {
      createMany: {
        data: attendeesData,
      },
    },
    dynamicEventSlugRef,
    dynamicGroupSlugRef,
    iCalUID: evt.iCalUID ?? "",
    user: {
      connect: {
        id: organizerUser.id,
      },
    },
    destinationCalendar:
      evt.destinationCalendar && evt.destinationCalendar.length > 0
        ? {
            connect: { id: evt.destinationCalendar[0].id },
          }
        : undefined,
  };

  if (reqBodyRecurringEventId) {
    newBookingData.recurringEventId = reqBodyRecurringEventId;
  }
  if (originalRescheduledBooking) {
    newBookingData.metadata = {
      ...(typeof originalRescheduledBooking.metadata === "object" && originalRescheduledBooking.metadata),
    };
    newBookingData["paid"] = originalRescheduledBooking.paid;
    newBookingData["fromReschedule"] = originalRescheduledBooking.uid;
    if (originalRescheduledBooking.uid) {
      newBookingData.cancellationReason = rescheduleReason;
    }
    if (newBookingData.attendees?.createMany?.data) {
      // Reschedule logic with booking with seats
      if (eventType?.seatsPerTimeSlot && bookerEmail) {
        newBookingData.attendees.createMany.data = attendeesData.filter(
          (attendee) => attendee.email === bookerEmail
        );
      }
    }
    if (originalRescheduledBooking.recurringEventId) {
      newBookingData.recurringEventId = originalRescheduledBooking.recurringEventId;
    }
  }

  const createBookingObj = {
    include: {
      user: {
        select: { email: true, name: true, timeZone: true, username: true },
      },
      attendees: true,
      payment: true,
      references: true,
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
    /* Validate if there is any payment app credential for this user */
    await prisma.credential.findFirstOrThrow({
      where: {
        appId: paymentAppData.appId,
        ...(paymentAppData.credentialId ? { id: paymentAppData.credentialId } : { userId: organizerUser.id }),
      },
      select: {
        id: true,
      },
    });
  }

  return prisma.booking.create(createBookingObj);
}

export function getCustomInputsResponses(
  reqBody: {
    responses?: Record<string, object>;
    customInputs?: z.infer<typeof bookingCreateSchemaLegacyPropsForApi>["customInputs"];
  },
  eventTypeCustomInputs: Awaited<ReturnType<typeof getEventTypesFromDB>>["customInputs"]
) {
  const customInputsResponses = {} as NonNullable<CalendarEvent["customInputs"]>;
  if (reqBody.customInputs && (reqBody.customInputs.length || 0) > 0) {
    reqBody.customInputs.forEach(({ label, value }) => {
      customInputsResponses[label] = value;
    });
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

/** Updates the evt object with video call data found from booking references
 *
 * @param bookingReferences
 * @param evt
 *
 * @returns updated evt with video call data
 */
export const addVideoCallDataToEvent = (bookingReferences: BookingReference[], evt: CalendarEvent) => {
  const videoCallReference = bookingReferences.find((reference) => reference.type.includes("_video"));

  if (videoCallReference) {
    evt.videoCallData = {
      type: videoCallReference.type,
      id: videoCallReference.meetingId,
      password: videoCallReference?.meetingPassword,
      url: videoCallReference.meetingUrl,
    };
  }

  return evt;
};

export const createLoggerWithEventDetails = (
  eventTypeId: number,
  reqBodyUser: string | string[] | undefined,
  eventTypeSlug: string | undefined
) => {
  return logger.getSubLogger({
    prefix: ["book:user", `${eventTypeId}:${reqBodyUser}/${eventTypeSlug}`],
  });
};

export function handleAppsStatus(
  results: EventResult<AdditionalInformation>[],
  booking: (Booking & { appsStatus?: AppsStatus[] }) | null,
  reqAppsStatus: ReqAppsStatus
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
    return resultStatus;
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
  return Object.values(calcAppsStatus);
}

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

export const findBookingQuery = async (bookingId: number) => {
  const foundBooking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    select: {
      uid: true,
      location: true,
      startTime: true,
      endTime: true,
      title: true,
      description: true,
      status: true,
      responses: true,
      metadata: true,
      user: {
        select: {
          name: true,
          email: true,
          timeZone: true,
          username: true,
        },
      },
      eventType: {
        select: {
          title: true,
          description: true,
          currency: true,
          length: true,
          lockTimeZoneToggleOnBookingPage: true,
          requiresConfirmation: true,
          requiresBookerEmailVerification: true,
          price: true,
        },
      },
    },
  });

  // This should never happen but it's just typescript safe
  if (!foundBooking) {
    throw new Error("Internal Error. Couldn't find booking");
  }

  // Don't leak any sensitive data
  return foundBooking;
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

  // handle dynamic user
  let eventType =
    !req.body.eventTypeId && !!req.body.eventTypeSlug
      ? getDefaultEvent(req.body.eventTypeSlug)
      : await getEventTypesFromDB(req.body.eventTypeId);

  eventType = {
    ...eventType,
    bookingFields: getBookingFieldsWithSystemFields(eventType),
  };

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

  let timeOutOfBounds = false;
  try {
    timeOutOfBounds = isOutOfBounds(
      reqBody.start,
      {
        periodType: eventType.periodType,
        periodDays: eventType.periodDays,
        periodEndDate: eventType.periodEndDate,
        periodStartDate: eventType.periodStartDate,
        periodCountCalendarDays: eventType.periodCountCalendarDays,
      },
      eventType.minimumBookingNotice
    );
  } catch (error) {
    loggerWithEventDetails.warn({
      message: "NewBooking: Unable set timeOutOfBounds. Using false. ",
    });
    if (error instanceof BookingDateInPastError) {
      // TODO: HttpError should not bleed through to the console.
      loggerWithEventDetails.info(`Booking eventType ${eventTypeId} failed`, JSON.stringify({ error }));
      throw new HttpError({ statusCode: 400, message: error.message });
    }
  }

  if (timeOutOfBounds) {
    const error = {
      errorCode: "BookingTimeOutOfBounds",
      message: `EventType '${eventType.eventName}' cannot be booked at this time.`,
    };
    loggerWithEventDetails.warn({
      message: `NewBooking: EventType '${eventType.eventName}' cannot be booked at this time.`,
    });
    throw new HttpError({ statusCode: 400, message: error.message });
  }

  const reqEventLength = dayjs(reqBody.end).diff(dayjs(reqBody.start), "minutes");
  const validEventLengths = eventType.metadata?.multipleDuration?.length
    ? eventType.metadata.multipleDuration
    : [eventType.length];
  if (!validEventLengths.includes(reqEventLength)) {
    loggerWithEventDetails.warn({ message: "NewBooking: Invalid event length" });
    throw new HttpError({ statusCode: 400, message: "Invalid event length" });
  }

  // loadUsers allows type inferring
  let users: (Awaited<ReturnType<typeof loadUsers>>[number] & {
    isFixed?: boolean;
    metadata?: Prisma.JsonValue;
  })[] = await loadUsers(eventType, dynamicUserList, req);

  const isDynamicAllowed = !users.some((user) => !user.allowDynamicBooking);
  if (!isDynamicAllowed && !eventTypeId) {
    loggerWithEventDetails.warn({
      message: "NewBooking: Some of the users in this group do not allow dynamic booking",
    });
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
      select: {
        credentials: {
          select: credentialForCalendarServiceSelect,
        }, // Don't leak to client
        ...userSelect.select,
      },
    });
    if (!eventTypeUser) {
      loggerWithEventDetails.warn({ message: "NewBooking: eventTypeUser.notFound" });
      throw new HttpError({ statusCode: 404, message: "eventTypeUser.notFound" });
    }
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

  loggerWithEventDetails.debug(
    "Concerned users",
    safeStringify({
      users: users.map(getPiiFreeUser),
    })
  );

  let locationBodyString = location;

  // TODO: It's definition should be moved to getLocationValueForDb
  let organizerOrFirstDynamicGroupMemberDefaultLocationUrl = undefined;

  if (dynamicUserList.length > 1) {
    users = users.sort((a, b) => {
      const aIndex = (a.username && dynamicUserList.indexOf(a.username)) || 0;
      const bIndex = (b.username && dynamicUserList.indexOf(b.username)) || 0;
      return aIndex - bIndex;
    });
    const firstUsersMetadata = userMetadataSchema.parse(users[0].metadata);
    locationBodyString = firstUsersMetadata?.defaultConferencingApp?.appLink || locationBodyString;
    organizerOrFirstDynamicGroupMemberDefaultLocationUrl =
      firstUsersMetadata?.defaultConferencingApp?.appLink;
  }

  let rescheduleUid = reqBody.rescheduleUid;

  if (
    Object.prototype.hasOwnProperty.call(eventType, "bookingLimits") ||
    Object.prototype.hasOwnProperty.call(eventType, "durationLimits")
  ) {
    const startAsDate = dayjs(reqBody.start).toDate();
    if (
      eventType.bookingLimits &&
      /* Empty object is truthy */ Object.keys(eventType.bookingLimits).length > 0
    ) {
      await checkBookingLimits(
        eventType.bookingLimits as IntervalLimit,
        startAsDate,
        eventType.id,
        rescheduleUid,
        eventType.schedule?.timeZone
      );
    }
    if (eventType.durationLimits) {
      await checkDurationLimits(eventType.durationLimits as IntervalLimit, startAsDate, eventType.id);
    }
  }

  let bookingSeat: BookingSeat = null;

  let originalRescheduledBooking: BookingType = null;

  //this gets the original rescheduled booking
  if (rescheduleUid) {
    // rescheduleUid can be bookingUid and bookingSeatUid
    bookingSeat = await prisma.bookingSeat.findUnique({
      where: {
        referenceUid: rescheduleUid,
      },
      include: {
        booking: true,
        attendee: true,
      },
    });
    if (bookingSeat) {
      rescheduleUid = bookingSeat.booking.uid;
    }
    originalRescheduledBooking = await getOriginalRescheduledBooking(
      rescheduleUid,
      !!eventType.seatsPerTimeSlot
    );
    if (!originalRescheduledBooking) {
      throw new HttpError({ statusCode: 404, message: "Could not find original booking" });
    }

    if (
      originalRescheduledBooking.status === BookingStatus.CANCELLED &&
      !originalRescheduledBooking.rescheduled
    ) {
      throw new HttpError({ statusCode: 403, message: ErrorCode.CancelledBookingsCannotBeRescheduled });
    }
  }

  let luckyUserResponse;

  //checks what users are available
  if (!eventType.seatsPerTimeSlot) {
    const eventTypeWithUsers: Awaited<ReturnType<typeof getEventTypesFromDB>> & {
      users: IsFixedAwareUser[];
    } = {
      ...eventType,
      users: users as IsFixedAwareUser[],
      ...(eventType.recurringEvent && {
        recurringEvent: {
          ...eventType.recurringEvent,
          count: recurringCount || eventType.recurringEvent.count,
        },
      }),
    };
    if (req.body.allRecurringDates && req.body.isFirstRecurringSlot) {
      const isTeamEvent =
        eventType.schedulingType === SchedulingType.COLLECTIVE ||
        eventType.schedulingType === SchedulingType.ROUND_ROBIN;

      const fixedUsers = isTeamEvent
        ? eventTypeWithUsers.users.filter((user: IsFixedAwareUser) => user.isFixed)
        : [];

      for (
        let i = 0;
        i < req.body.allRecurringDates.length && i < req.body.numSlotsToCheckForAvailability;
        i++
      ) {
        const start = req.body.allRecurringDates[i].start;
        const end = req.body.allRecurringDates[i].end;
        if (isTeamEvent) {
          // each fixed user must be available
          for (const key in fixedUsers) {
            await ensureAvailableUsers(
              { ...eventTypeWithUsers, users: [fixedUsers[key]] },
              {
                dateFrom: dayjs(start).tz(reqBody.timeZone).format(),
                dateTo: dayjs(end).tz(reqBody.timeZone).format(),
                timeZone: reqBody.timeZone,
                originalRescheduledBooking,
              },
              loggerWithEventDetails
            );
          }
        } else {
          await ensureAvailableUsers(
            eventTypeWithUsers,
            {
              dateFrom: dayjs(start).tz(reqBody.timeZone).format(),
              dateTo: dayjs(end).tz(reqBody.timeZone).format(),
              timeZone: reqBody.timeZone,
              originalRescheduledBooking,
            },
            loggerWithEventDetails
          );
        }
      }
    }

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
      const luckyUserPool = availableUsers.filter((user) => !user.isFixed);
      const notAvailableLuckyUsers: typeof users = [];

      loggerWithEventDetails.debug(
        "Computed available users",
        safeStringify({
          availableUsers: availableUsers.map((user) => user.id),
          luckyUserPool: luckyUserPool.map((user) => user.id),
        })
      );
      // loop through all non-fixed hosts and get the lucky users
      while (luckyUserPool.length > 0 && luckyUsers.length < 1 /* TODO: Add variable */) {
        const newLuckyUser = await getLuckyUser("MAXIMIZE_AVAILABILITY", {
          // find a lucky user that is not already in the luckyUsers array
          availableUsers: luckyUserPool.filter(
            (user) => !luckyUsers.concat(notAvailableLuckyUsers).find((existing) => existing.id === user.id)
          ),
          eventTypeId: eventType.id,
        });
        if (!newLuckyUser) {
          break; // prevent infinite loop
        }
        if (req.body.isFirstRecurringSlot && eventType.schedulingType === SchedulingType.ROUND_ROBIN) {
          // for recurring round robin events check if lucky user is available for next slots
          try {
            for (
              let i = 0;
              i < req.body.allRecurringDates.length && i < req.body.numSlotsToCheckForAvailability;
              i++
            ) {
              const start = req.body.allRecurringDates[i].start;
              const end = req.body.allRecurringDates[i].end;

              await ensureAvailableUsers(
                { ...eventTypeWithUsers, users: [newLuckyUser] },
                {
                  dateFrom: dayjs(start).tz(reqBody.timeZone).format(),
                  dateTo: dayjs(end).tz(reqBody.timeZone).format(),
                  timeZone: reqBody.timeZone,
                  originalRescheduledBooking,
                },
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
      if (
        availableUsers.filter((user) => user.isFixed).length !== users.filter((user) => user.isFixed).length
      ) {
        throw new Error(ErrorCode.HostsUnavailableForBooking);
      }
      // Pushing fixed user before the luckyUser guarantees the (first) fixed user as the organizer.
      users = [...availableUsers.filter((user) => user.isFixed), ...luckyUsers];
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

  const [organizerUser] = users;

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

  const isManagedEventType = !!eventType.parentId;

  // use host default
  if ((isManagedEventType || isTeamEventType) && locationBodyString === OrganizerDefaultConferencingAppType) {
    const metadataParseResult = userMetadataSchema.safeParse(organizerUser.metadata);
    const organizerMetadata = metadataParseResult.success ? metadataParseResult.data : undefined;
    if (organizerMetadata?.defaultConferencingApp?.appSlug) {
      const app = getAppFromSlug(organizerMetadata?.defaultConferencingApp?.appSlug);
      locationBodyString = app?.appData?.location?.type || locationBodyString;
      organizerOrFirstDynamicGroupMemberDefaultLocationUrl =
        organizerMetadata?.defaultConferencingApp?.appLink;
    } else {
      locationBodyString = "integrations:daily";
    }
  }

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

  const guests = (reqGuests || []).reduce((guestArray, guest) => {
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

  const seed = `${organizerUser.username}:${dayjs(reqBody.start).utc().format()}:${new Date().getTime()}`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));

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
  const teamMemberPromises = users.slice(1).map(async (user) => {
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

  const destinationCalendar = eventType.destinationCalendar
    ? [eventType.destinationCalendar]
    : organizerUser.destinationCalendar
    ? [organizerUser.destinationCalendar]
    : null;

  let organizerEmail = organizerUser.email || "Email-less";
  if (eventType.useEventTypeDestinationCalendarEmail && destinationCalendar?.[0]?.primaryEmail) {
    organizerEmail = destinationCalendar[0].primaryEmail;
  } else if (eventType.secondaryEmailId && eventType.secondaryEmail?.email) {
    organizerEmail = eventType.secondaryEmail.email;
  }

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
    length: reqEventLength,
  };

  const teamId = await getTeamIdFromEventType({ eventType });

  const triggerForUser = !teamId || (teamId && eventType.parentId);

  const subscriberOptions: GetSubscriberOptions = {
    userId: triggerForUser ? organizerUser.id : null,
    eventTypeId,
    triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
    teamId,
  };

  const eventTrigger: WebhookTriggerEvents = rescheduleUid
    ? WebhookTriggerEvents.BOOKING_RESCHEDULED
    : WebhookTriggerEvents.BOOKING_CREATED;

  subscriberOptions.triggerEvent = eventTrigger;

  const subscriberOptionsMeetingEnded = {
    userId: triggerForUser ? organizerUser.id : null,
    eventTypeId,
    triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
    teamId,
  };

  const subscriberOptionsMeetingStarted = {
    userId: triggerForUser ? organizerUser.id : null,
    eventTypeId,
    triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
    teamId,
  };

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
      eventTrigger,
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
      };

      return {
        ...bookingResponse,
        ...luckyUserResponse,
      };
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
  if (originalRescheduledBooking?.uid) {
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

          if (googleCalResult?.createdEvent?.hangoutLink) {
            results.push({
              ...googleMeetResult,
              success: true,
            });

            // Add google_meet to referencesToCreate in the same index as google_calendar
            updateManager.referencesToCreate[googleCalIndex] = {
              ...updateManager.referencesToCreate[googleCalIndex],
              meetingUrl: googleCalResult.createdEvent.hangoutLink,
            };

            // Also create a new referenceToCreate with type video for google_meet
            updateManager.referencesToCreate.push({
              type: "google_meet_video",
              meetingUrl: googleCalResult.createdEvent.hangoutLink,
              uid: googleCalResult.uid,
              credentialId: updateManager.referencesToCreate[googleCalIndex].credentialId,
            });
          } else if (googleCalResult && !googleCalResult.createdEvent?.hangoutLink) {
            results.push({
              ...googleMeetResult,
              success: false,
            });
          }
        }

        metadata.hangoutLink = results[0].createdEvent?.hangoutLink;
        metadata.conferenceData = results[0].createdEvent?.conferenceData;
        metadata.entryPoints = results[0].createdEvent?.entryPoints;
        evt.appsStatus = handleAppsStatus(results, booking, reqAppsStatus);
        videoCallUrl =
          metadata.hangoutLink ||
          results[0].createdEvent?.url ||
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
    const bookingReponse = {
      ...booking,
      user: {
        ...booking.user,
        email: null,
      },
    };

    return {
      ...bookingReponse,
      ...luckyUserResponse,
      message: "Payment required",
      paymentUid: payment?.uid,
      paymentId: payment?.id,
    };
  }

  loggerWithEventDetails.debug(`Booking ${organizerUser.username} completed`);

  // We are here so, booking doesn't require payment and booking is also created in DB already, through createBooking call
  if (isConfirmedByDefault) {
    try {
      const subscribersMeetingEnded = await getWebhooks(subscriberOptionsMeetingEnded);
      const subscribersMeetingStarted = await getWebhooks(subscriberOptionsMeetingStarted);

      subscribersMeetingEnded.forEach((subscriber) => {
        if (rescheduleUid && originalRescheduledBooking) {
          cancelScheduledJobs(originalRescheduledBooking, undefined, true);
        }
        if (booking && booking.status === BookingStatus.ACCEPTED) {
          scheduleTrigger(booking, subscriber.subscriberUrl, subscriber, WebhookTriggerEvents.MEETING_ENDED);
        }
      });

      subscribersMeetingStarted.forEach((subscriber) => {
        if (rescheduleUid && originalRescheduledBooking) {
          cancelScheduledJobs(originalRescheduledBooking, undefined, true);
        }
        if (booking && booking.status === BookingStatus.ACCEPTED) {
          scheduleTrigger(
            booking,
            subscriber.subscriberUrl,
            subscriber,
            WebhookTriggerEvents.MEETING_STARTED
          );
        }
      });
    } catch (error) {
      loggerWithEventDetails.error(
        "Error while running scheduledJobs for booking",
        JSON.stringify({ error })
      );
    }

    // Send Webhook call if hooked to BOOKING_CREATED & BOOKING_RESCHEDULED
    await handleWebhookTrigger({ subscriberOptions, eventTrigger, webhookData });
  } else {
    // if eventType requires confirmation we will trigger the BOOKING REQUESTED Webhook
    const eventTrigger: WebhookTriggerEvents = WebhookTriggerEvents.BOOKING_REQUESTED;
    subscriberOptions.triggerEvent = eventTrigger;
    webhookData.status = "PENDING";
    await handleWebhookTrigger({ subscriberOptions, eventTrigger, webhookData });
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
      isFirstRecurringEvent: true,
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
  };

  return {
    ...bookingResponse,
    ...luckyUserResponse,
    references: referencesToCreate,
    seatReferenceUid: evt.attendeeSeatId,
  };
}

export default handler;

function getVideoCallDetails({
  results,
}: {
  results: EventResult<AdditionalInformation & { url?: string | undefined; iCalUID?: string | undefined }>[];
}) {
  const firstVideoResult = results.find((result) => result.type.includes("_video"));
  const metadata: AdditionalInformation = {};
  let updatedVideoEvent = null;

  if (firstVideoResult && firstVideoResult.success) {
    updatedVideoEvent = Array.isArray(firstVideoResult.updatedEvent)
      ? firstVideoResult.updatedEvent[0]
      : firstVideoResult.updatedEvent;

    if (updatedVideoEvent) {
      metadata.hangoutLink = updatedVideoEvent.hangoutLink;
      metadata.conferenceData = updatedVideoEvent.conferenceData;
      metadata.entryPoints = updatedVideoEvent.entryPoints;
    }
  }
  const videoCallUrl = metadata.hangoutLink || updatedVideoEvent?.url;

  return { videoCallUrl, metadata, updatedVideoEvent };
}

function getRequiresConfirmationFlags({
  eventType,
  bookingStartTime,
  userId,
  paymentAppData,
  originalRescheduledBookingOrganizerId,
}: {
  eventType: Pick<Awaited<ReturnType<typeof getEventTypesFromDB>>, "metadata" | "requiresConfirmation">;
  bookingStartTime: string;
  userId: number | undefined;
  paymentAppData: { price: number };
  originalRescheduledBookingOrganizerId: number | undefined;
}) {
  let requiresConfirmation = eventType?.requiresConfirmation;
  const rcThreshold = eventType?.metadata?.requiresConfirmationThreshold;
  if (rcThreshold) {
    if (dayjs(dayjs(bookingStartTime).utc().format()).diff(dayjs(), rcThreshold.unit) > rcThreshold.time) {
      requiresConfirmation = false;
    }
  }

  // If the user is not the owner of the event, new booking should be always pending.
  // Otherwise, an owner rescheduling should be always accepted.
  // Before comparing make sure that userId is set, otherwise undefined === undefined
  const userReschedulingIsOwner = !!(userId && originalRescheduledBookingOrganizerId === userId);
  const isConfirmedByDefault = (!requiresConfirmation && !paymentAppData.price) || userReschedulingIsOwner;
  return {
    /**
     * Organizer of the booking is rescheduling
     */
    userReschedulingIsOwner,
    /**
     * Booking won't need confirmation to be ACCEPTED
     */
    isConfirmedByDefault,
  };
}

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

/**
 * This method is mostly same as the one in UserRepository but it includes a lot more relations which are specific requirement here
 * TODO: Figure out how to keep it in UserRepository and use it here
 */
export const findUsersByUsername = async ({
  usernameList,
  orgSlug,
}: {
  orgSlug: string | null;
  usernameList: string[];
}) => {
  log.debug("findUsersByUsername", { usernameList, orgSlug });
  const { where, profiles } = await UserRepository._getWhereClauseForFindingUsersByUsername({
    orgSlug,
    usernameList,
  });
  return (
    await prisma.user.findMany({
      where,
      select: {
        ...userSelect.select,
        credentials: {
          select: credentialForCalendarServiceSelect,
        },
        metadata: true,
      },
    })
  ).map((user) => {
    const profile = profiles?.find((profile) => profile.user.id === user.id) ?? null;
    return {
      ...user,
      organizationId: profile?.organizationId ?? null,
      profile,
    };
  });
};
