import short, { uuid } from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import processExternalId from "@calcom/app-store/_utils/calendars/processExternalId";
import { getPaymentAppData } from "@calcom/app-store/_utils/payments/getPaymentAppData";
import {
  enrichHostsWithDelegationCredentials,
  getFirstDelegationConferencingCredentialAppLocation,
} from "@calcom/app-store/delegationCredential";
import { metadata as GoogleMeetMetadata } from "@calcom/app-store/googlevideo/_metadata";
import {
  getLocationValueForDB,
  MeetLocationType,
  OrganizerDefaultConferencingAppType,
} from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import {
  eventTypeMetaDataSchemaWithTypedApps,
  eventTypeAppMetadataOptionalSchema,
} from "@calcom/app-store/zod-utils";
import dayjs from "@calcom/dayjs";
import { scheduleMandatoryReminder } from "@calcom/ee/workflows/lib/reminders/scheduleMandatoryReminder";
import getICalUID from "@calcom/emails/lib/getICalUID";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import EventManager, { placeholderCreatedEvent } from "@calcom/features/bookings/lib/EventManager";
import type { CheckBookingAndDurationLimitsService } from "@calcom/features/bookings/lib/handleNewBooking/checkBookingAndDurationLimits";
import { handlePayment } from "@calcom/features/bookings/lib/handlePayment";
import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import { isEventTypeLoggingEnabled } from "@calcom/features/bookings/lib/isEventTypeLoggingEnabled";
import { BookingEventHandlerService } from "@calcom/features/bookings/lib/onBookingEvents/BookingEventHandlerService";
import type { CacheService } from "@calcom/features/calendar-cache/lib/getShouldServeCache";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import AssignmentReasonRecorder from "@calcom/features/ee/round-robin/assignmentReason/AssignmentReasonRecorder";
import { WorkflowService } from "@calcom/features/ee/workflows/lib/service/WorkflowService";
import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import { getUsernameList } from "@calcom/features/eventtypes/lib/defaultEvents";
import { getEventName, updateHostInEventName } from "@calcom/features/eventtypes/lib/eventNaming";
import { getFullName } from "@calcom/features/form-builder/utils";
import type { HashedLinkService } from "@calcom/features/hashedLink/lib/service/HashedLinkService";
import { handleAnalyticsEvents } from "@calcom/features/tasker/tasks/analytics/handleAnalyticsEvents";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { UsersRepository } from "@calcom/features/users/users.repository";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import {
  deleteWebhookScheduledTriggers,
  cancelNoShowTasksForBooking,
  scheduleTrigger,
} from "@calcom/features/webhooks/lib/scheduleTrigger";
import type { EventPayloadType, EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import { groupHostsByGroupId } from "@calcom/lib/bookings/hostGroupUtils";
import { DEFAULT_GROUP_ID } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { extractBaseEmail } from "@calcom/lib/extract-base-email";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { getPiiFreeCalendarEvent, getPiiFreeEventType } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import type { PrismaClient } from "@calcom/prisma";
import type { DestinationCalendar, Prisma, User, AssignmentReasonEnum } from "@calcom/prisma/client";
import {
  BookingStatus,
  SchedulingType,
  WebhookTriggerEvents,
  WorkflowTriggerEvents,
  CreationSource,
} from "@calcom/prisma/enums";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import { getAllWorkflowsFromEventType } from "@calcom/trpc/server/routers/viewer/workflows/util";
import type {
  AdditionalInformation,
  AppsStatus,
  CalendarEvent,
  CalEventResponses,
} from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";
import type { EventResult, PartialReference } from "@calcom/types/EventManager";

import type { BookingRepository } from "../../repositories/BookingRepository";
import { BookingActionMap, BookingEmailSmsHandler } from "../BookingEmailSmsHandler";
import type {
  CreateRegularBookingData,
  BookingHandlerInput,
  CreateBookingMeta,
  BookingDataSchemaGetter,
} from "../dto/types";
import { getAllCredentialsIncludeServiceAccountKey } from "../getAllCredentialsForUsersOnEvent/getAllCredentials";
import { refreshCredentials } from "../getAllCredentialsForUsersOnEvent/refreshCredentials";
import getBookingDataSchema from "../getBookingDataSchema";
import { LuckyUserService } from "../getLuckyUser";
import { addVideoCallDataToEvent } from "../handleNewBooking/addVideoCallDataToEvent";
import { createBooking } from "../handleNewBooking/createBooking";
import type { Booking } from "../handleNewBooking/createBooking";
import { ensureAvailableUsers } from "../handleNewBooking/ensureAvailableUsers";
import { getCustomInputsResponses } from "../handleNewBooking/getCustomInputsResponses";
import type { getEventTypeResponse } from "../handleNewBooking/getEventTypesFromDB";
import { getLocationValuesForDb } from "../handleNewBooking/getLocationValuesForDb";
import { getRequiresConfirmationFlags } from "../handleNewBooking/getRequiresConfirmationFlags";
import { getSeatedBooking } from "../handleNewBooking/getSeatedBooking";
import { getVideoCallDetails } from "../handleNewBooking/getVideoCallDetails";
import { handleAppsStatus } from "../handleNewBooking/handleAppsStatus";
import { loadAndValidateUsers } from "../handleNewBooking/loadAndValidateUsers";
import { createLoggerWithEventDetails } from "../handleNewBooking/logger";
import { getOriginalRescheduledBooking } from "../handleNewBooking/originalRescheduledBookingUtils";
import type { BookingType } from "../handleNewBooking/originalRescheduledBookingUtils";
import { scheduleNoShowTriggers } from "../handleNewBooking/scheduleNoShowTriggers";
import type { IEventTypePaymentCredentialType, Invitee, IsFixedAwareUser } from "../handleNewBooking/types";
import handleSeats from "../handleSeats/handleSeats";
import type { IBookingService } from "../interfaces/IBookingService";
import { BookingDataPreparationService } from "../utils/BookingDataPreparationService";

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

type CreatedBooking = Booking & {
  isShortCircuitedBooking?: boolean;
} & { appsStatus?: AppsStatus[]; paymentUid?: string; paymentId?: number };
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

const buildDryRunEventManager = () => {
  return {
    create: async () => ({ results: [], referencesToCreate: [] }),
    reschedule: async () => ({ results: [], referencesToCreate: [] }),
  };
};

export const buildEventForTeamEventType = async ({
  existingEvent: evt,
  users,
  organizerUser,
  schedulingType,
  team,
}: {
  existingEvent: Partial<CalendarEvent>;
  users: (Pick<User, "id" | "name" | "timeZone" | "locale" | "email"> & {
    destinationCalendar: DestinationCalendar | null;
    isFixed?: boolean;
  })[];
  organizerUser: { email: string };
  schedulingType: SchedulingType | null;
  team?: {
    id: number;
    name: string;
  } | null;
}) => {
  // not null assertion.
  if (!schedulingType) {
    throw new Error("Scheduling type is required for team event type");
  }
  const teamDestinationCalendars: DestinationCalendar[] = [];
  const fixedUsers = users.filter((user) => user.isFixed);
  const nonFixedUsers = users.filter((user) => !user.isFixed);
  const filteredUsers =
    schedulingType === SchedulingType.ROUND_ROBIN ? [...fixedUsers, ...nonFixedUsers] : users;

  // Organizer or user owner of this event type it's not listed as a team member.
  const teamMemberPromises = filteredUsers
    .filter((user) => user.email !== organizerUser.email)
    .map(async (user) => {
      // TODO: Add back once EventManager tests are ready https://github.com/calcom/cal.com/pull/14610#discussion_r1567817120
      // push to teamDestinationCalendars if it's a team event but collective only
      if (schedulingType === "COLLECTIVE" && user.destinationCalendar) {
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

  const updatedEvt = CalendarEventBuilder.fromEvent(evt)
    ?.withDestinationCalendar([...(evt.destinationCalendar ?? []), ...teamDestinationCalendars])
    .build();

  if (!updatedEvt) {
    throw new HttpError({
      statusCode: 400,
      message: "Failed to build event with destination calendar due to missing required fields",
    });
  }

  evt = updatedEvt;

  const teamEvt = CalendarEventBuilder.fromEvent(evt)
    ?.withTeam({
      members: teamMembers,
      name: team?.name || "Nameless",
      id: team?.id ?? 0,
    })
    .build();

  if (!teamEvt) {
    throw new HttpError({
      statusCode: 400,
      message: "Failed to build team event due to missing required fields",
    });
  }

  return teamEvt;
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

function formatAvailabilitySnapshot(data: {
  dateRanges: { start: dayjs.Dayjs; end: dayjs.Dayjs }[];
  oooExcludedDateRanges: { start: dayjs.Dayjs; end: dayjs.Dayjs }[];
}) {
  return {
    ...data,
    dateRanges: data.dateRanges.map(({ start, end }) => ({
      start: start.toISOString(),
      end: end.toISOString(),
    })),
    oooExcludedDateRanges: data.oooExcludedDateRanges.map(({ start, end }) => ({
      start: start.toISOString(),
      end: end.toISOString(),
    })),
  };
}

export interface IBookingServiceDependencies {
  cacheService: CacheService;
  checkBookingAndDurationLimitsService: CheckBookingAndDurationLimitsService;
  prismaClient: PrismaClient;
  bookingRepository: BookingRepository;
  luckyUserService: LuckyUserService;
  userRepository: UserRepository;
  hashedLinkService: HashedLinkService;
}

async function handler(
  input: BookingHandlerInput,
  deps: IBookingServiceDependencies,
  bookingDataSchemaGetter: BookingDataSchemaGetter = getBookingDataSchema
) {
  const { bookingData: rawBookingData, bookingMeta: rawBookingMeta } = input;

  const {
    /**
     * TODO: In a followup PR, we aim to remove prisma dependency and instead inject the repositories as dependencies.
     * This would require moving multiple queries to appropriate repositories.
     */
    prismaClient: prisma,
    userRepository,
    cacheService,
    checkBookingAndDurationLimitsService,
    luckyUserService,
    bookingRepository,
  } = deps;

  const loggerWithEventDetails = createLoggerWithEventDetails(
    rawBookingData.eventTypeId,
    rawBookingData.user,
    rawBookingData.eventTypeSlug || ""
  );

  const bookingDataPreparationService = new BookingDataPreparationService({
    log: loggerWithEventDetails,
    bookingRepository: deps.bookingRepository,
    userRepository: deps.userRepository,
  });

  const {
    eventType,
    bookingFormData,
    recurringBookingData,
    config: bookingFlowConfig,
    loggedInUser,
    bookingMeta,
    hashedBookingLinkData,
    teamOrUserSlug,
    routingData,
    seatsData,
    spamCheckService,
  } = await bookingDataPreparationService.prepare(
    {
      rawBookingData,
      rawBookingMeta,
      eventType: {
        id: rawBookingData.eventTypeId,
        slug: rawBookingData.eventTypeSlug || "",
      },
      loggedInUserId: rawBookingMeta.userId ?? null,
    },
    bookingDataSchemaGetter
  );

  const { isDryRun, useCacheIfEnabled, hostname, forcedSlug, noEmail } = bookingFlowConfig;
  const { appsStatus: reqAppsStatus } = bookingMeta;

  const {
    booker,
    rawBookingLocation,
    additionalNotes: additionalNotes,
    startTime: startTime,
    endTime: endTime,
    rawGuests: reqGuests,
    rescheduleData,
  } = bookingFormData;

  const luckyUsers = recurringBookingData.luckyUsers;
  const isPlatformBooking = !!bookingMeta.platform?.clientId;
  const { id: eventTypeId, slug: eventTypeSlug } = eventType;

  let troubleshooterData = buildTroubleshooterData({
    eventType,
  });

  const emailsAndSmsHandler = new BookingEmailSmsHandler({ logger: loggerWithEventDetails });

  if (isEventTypeLoggingEnabled({ eventTypeId, usernameOrTeamName: teamOrUserSlug ?? "" })) {
    logger.settings.minLevel = 0;
  }

  const fullName = getFullName(booker.name);
  // Why are we only using "en" locale
  const tGuests = await getTranslation("en", "common");

  const dynamicUserList = Array.isArray(teamOrUserSlug)
    ? teamOrUserSlug
    : getUsernameList(teamOrUserSlug ?? "");
  if (!eventType) throw new HttpError({ statusCode: 404, message: "event_type_not_found" });

  // This is purely eventType validation and should ideally be done when creating the eventType.
  if (eventType.seatsPerTimeSlot && eventType.recurringEvent) {
    throw new HttpError({
      statusCode: 400,
      message: "recurring_event_seats_error",
    });
  }

  const bookingSeat = rescheduleData.rawUid ? await getSeatedBooking(rescheduleData.rawUid) : null;
  const rescheduleUid = bookingSeat ? bookingSeat.booking.uid : rescheduleData.rawUid ?? undefined;
  const isNormalBookingOrFirstRecurringSlot = recurringBookingData.allRecurringDates
    ? !!recurringBookingData.isFirstRecurringSlot
    : true;

  let originalRescheduledBooking = rescheduleUid
    ? await getOriginalRescheduledBooking(rescheduleUid, !!eventType.seatsPerTimeSlot)
    : null;

  const paymentAppData = getPaymentAppData({
    ...eventType,
    metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
  });

  const { userReschedulingIsOwner, isConfirmedByDefault } = await getRequiresConfirmationFlags({
    eventType,
    bookingStartTime: startTime,
    userId: loggedInUser.id ?? undefined,
    originalRescheduledBookingOrganizerId: originalRescheduledBooking?.user?.id,
    paymentAppData,
    bookerEmail: booker.email,
  });

  // For unconfirmed bookings or round robin bookings with the same attendee and timeslot, return the original booking
  if (
    (!isConfirmedByDefault && !userReschedulingIsOwner) ||
    eventType.schedulingType === SchedulingType.ROUND_ROBIN
  ) {
    const requiresPayment = !Number.isNaN(paymentAppData.price) && paymentAppData.price > 0;

    const existingBooking = await bookingRepository.getValidBookingFromEventTypeForAttendee({
      eventTypeId,
      bookerEmail: booker.email,
      bookerPhoneNumber: booker.phoneNumber ?? undefined,
      startTime: new Date(dayjs(startTime).utc().format()),
      filterForUnconfirmed: !isConfirmedByDefault,
    });

    if (existingBooking) {
      const hasPayments = existingBooking.payment.length > 0;
      const isPaidBooking = existingBooking.paid || !hasPayments;

      const shouldShowPaymentForm = requiresPayment && !isPaidBooking;

      const firstPayment = shouldShowPaymentForm ? existingBooking.payment[0] : undefined;

      const bookingResponse = {
        ...existingBooking,
        user: {
          ...existingBooking.user,
          email: null,
        },
        paymentRequired: shouldShowPaymentForm,
        seatReferenceUid: "",
      };

      return {
        ...bookingResponse,
        luckyUsers: bookingResponse.userId ? [bookingResponse.userId] : [],
        isDryRun,
        ...(isDryRun ? { troubleshooterData } : {}),
        paymentUid: firstPayment?.uid,
        paymentId: firstPayment?.id,
      };
    }
  }

  const shouldServeCache = await cacheService.getShouldServeCache(useCacheIfEnabled, eventType.team?.id);

  loggerWithEventDetails.info(
    `Booking eventType ${eventTypeId} started`,
    safeStringify({
      reqBody: {
        user: teamOrUserSlug,
        eventTypeId,
        eventTypeSlug,
        startTime,
        endTime,
        rescheduleUid: rescheduleData.rawUid,
        location: rawBookingLocation,
        timeZone: booker.timeZone,
      },
      isTeamEventType: eventType.isTeamEventType,
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

  const crmRecordId: string | undefined = routingData.crmRecordId ?? undefined;

  let routingFormResponse = null;

  if (routingData.routedTeamMemberIds) {
    //routingFormResponseId could be 0 for dry run. So, we just avoid undefined value
    if (routingData.routingFormResponseId === null) {
      throw new HttpError({ statusCode: 400, message: "Missing routingFormResponseId" });
    }
    routingFormResponse = await prisma.app_RoutingForms_FormResponse.findUnique({
      where: {
        id: routingData.routingFormResponseId,
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
    hostname: hostname ?? undefined,
    forcedSlug: forcedSlug ?? undefined,
    isPlatform: isPlatformBooking,
    eventType,
    eventTypeId,
    dynamicUserList,
    logger: loggerWithEventDetails,
    routedTeamMemberIds: routingData.routedTeamMemberIds ?? null,
    contactOwnerEmail: routingData.contactOwnerEmail ?? null,
    rescheduleUid: rescheduleUid ?? null,
    routingFormResponse,
  });

  // We filter out users but ensure allHostUsers remain same.
  let users = [...qualifiedRRUsers, ...additionalFallbackRRUsers, ...fixedUsers];

  const firstUser = users[0];

  let { locationBodyString, organizerOrFirstDynamicGroupMemberDefaultLocationUrl } = getLocationValuesForDb({
    dynamicUserList,
    users,
    location: rawBookingLocation,
  });

  if (!bookingMeta.skipEventLimitsCheck) {
    // This one fetches a lot of bookings to determine the limits being crossed, so it can't be part of validation phase
    await checkBookingAndDurationLimitsService.checkBookingAndDurationLimits({
      eventType,
      reqBodyStart: startTime,
      reqBodyRescheduleUid: rescheduleUid,
    });
  }
  let luckyUserResponse;
  let isFirstSeat = true;
  let availableUsers: IsFixedAwareUser[] = [];

  if (eventType.seatsPerTimeSlot) {
    const booking = await prisma.booking.findFirst({
      where: {
        eventTypeId: eventType.id,
        startTime: new Date(dayjs(startTime).utc().format()),
        status: BookingStatus.ACCEPTED,
      },
      select: {
        userId: true,
        attendees: { select: { email: true } },
      },
    });

    if (booking) {
      isFirstSeat = false;
      if (eventType.schedulingType === SchedulingType.ROUND_ROBIN) {
        const fixedHosts = users.filter((user) => user.isFixed);
        const originalNonFixedHost = users.find((user) => !user.isFixed && user.id === booking.userId);

        if (originalNonFixedHost) {
          users = [...fixedHosts, originalNonFixedHost];
        } else {
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
          count: recurringBookingData.recurringCount || eventType.recurringEvent.count,
        },
      }),
    };
    if (
      recurringBookingData.allRecurringDates &&
      recurringBookingData.isFirstRecurringSlot &&
      recurringBookingData.numSlotsToCheckForAvailability
    ) {
      const isTeamEvent =
        eventType.schedulingType === SchedulingType.COLLECTIVE ||
        eventType.schedulingType === SchedulingType.ROUND_ROBIN;

      const fixedUsers = isTeamEvent
        ? eventTypeWithUsers.users.filter((user: IsFixedAwareUserWithCredentials) => user.isFixed)
        : [];

      for (
        let i = 0;
        i < recurringBookingData.allRecurringDates.length &&
        i < recurringBookingData.numSlotsToCheckForAvailability;
        i++
      ) {
        const start = recurringBookingData.allRecurringDates[i].start;
        const end = recurringBookingData.allRecurringDates[i].end;
        if (isTeamEvent) {
          // each fixed user must be available
          for (const key in fixedUsers) {
            if (!bookingMeta.skipAvailabilityCheck) {
              await ensureAvailableUsers(
                { ...eventTypeWithUsers, users: [fixedUsers[key]] },
                {
                  dateFrom: dayjs(start).tz(booker.timeZone).format(),
                  dateTo: dayjs(end).tz(booker.timeZone).format(),
                  timeZone: booker.timeZone,
                  originalRescheduledBooking: originalRescheduledBooking ?? null,
                },
                loggerWithEventDetails,
                shouldServeCache
              );
            }
          }
        } else {
          if (!bookingMeta.skipAvailabilityCheck) {
            await ensureAvailableUsers(
              eventTypeWithUsers,
              {
                dateFrom: dayjs(start).tz(booker.timeZone).format(),
                dateTo: dayjs(end).tz(booker.timeZone).format(),
                timeZone: booker.timeZone,
                originalRescheduledBooking,
              },
              loggerWithEventDetails,
              shouldServeCache
            );
          }
        }
      }
    }

    if (!recurringBookingData.allRecurringDates || recurringBookingData.isFirstRecurringSlot) {
      try {
        if (!bookingMeta.skipAvailabilityCheck) {
          availableUsers = await ensureAvailableUsers(
            { ...eventTypeWithUsers, users: [...qualifiedRRUsers, ...fixedUsers] as IsFixedAwareUser[] },
            {
              dateFrom: dayjs(startTime).tz(booker.timeZone).format(),
              dateTo: dayjs(endTime).tz(booker.timeZone).format(),
              timeZone: booker.timeZone,
              originalRescheduledBooking,
            },
            loggerWithEventDetails,
            shouldServeCache
          );
        } else {
          availableUsers = [...qualifiedRRUsers, ...fixedUsers] as IsFixedAwareUser[];
        }
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
          if (!bookingMeta.skipAvailabilityCheck) {
            availableUsers = await ensureAvailableUsers(
              {
                ...eventTypeWithUsers,
                users: [...additionalFallbackRRUsers, ...fixedUsers] as IsFixedAwareUser[],
              },
              {
                dateFrom: dayjs(startTime).tz(booker.timeZone).format(),
                dateTo: dayjs(endTime).tz(booker.timeZone).format(),
                timeZone: booker.timeZone,
                originalRescheduledBooking,
              },
              loggerWithEventDetails,
              shouldServeCache
            );
          } else {
            availableUsers = [...additionalFallbackRRUsers, ...fixedUsers] as IsFixedAwareUser[];
          }
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

      const fixedUserPool: IsFixedAwareUser[] = [];
      const nonFixedUsers: IsFixedAwareUser[] = [];

      availableUsers.forEach((user) => {
        if (user.isFixed) {
          fixedUserPool.push(user);
        } else {
          nonFixedUsers.push(user);
        }
      });

      // Group non-fixed users by their group IDs
      const luckyUserPools = groupHostsByGroupId({
        hosts: nonFixedUsers,
        hostGroups: eventType.hostGroups,
      });

      const notAvailableLuckyUsers: typeof users = [];

      loggerWithEventDetails.debug(
        "Computed available users",
        safeStringify({
          availableUsers: availableUsers.map((user) => user.id),
          luckyUserPools: Object.fromEntries(
            Object.entries(luckyUserPools).map(([groupId, users]) => [groupId, users.map((user) => user.id)])
          ),
        })
      );

      const luckyUsers: typeof users = [];
      // loop through all non-fixed hosts and get the lucky users
      // This logic doesn't run when contactOwner is used because in that case, luckUsers.length === 1
      for (const [groupId, luckyUserPool] of Object.entries(luckyUserPools)) {
        let luckUserFound = false;
        while (luckyUserPool.length > 0 && !luckUserFound) {
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
          const newLuckyUser = await luckyUserService.getLuckyUser({
            // find a lucky user that is not already in the luckyUsers array
            availableUsers: freeUsers,
            // only hosts from the same group
            allRRHosts: (
              await enrichHostsWithDelegationCredentials({
                orgId: firstUserOrgId ?? null,
                hosts: eventTypeWithUsers.hosts,
              })
            ).filter(
              (host) =>
                !host.isFixed &&
                userIdsSet.has(host.user.id) &&
                (host.groupId === groupId || (!host.groupId && groupId === DEFAULT_GROUP_ID))
            ),
            eventType,
            routingFormResponse,
            meetingStartTime: new Date(startTime),
          });
          if (!newLuckyUser) {
            break; // prevent infinite loop
          }
          if (
            recurringBookingData.isFirstRecurringSlot &&
            eventType.schedulingType === SchedulingType.ROUND_ROBIN &&
            recurringBookingData.numSlotsToCheckForAvailability &&
            recurringBookingData.allRecurringDates
          ) {
            // for recurring round robin events check if lucky user is available for next slots
            try {
              for (
                let i = 0;
                i < recurringBookingData.allRecurringDates.length &&
                i < recurringBookingData.numSlotsToCheckForAvailability;
                i++
              ) {
                const start = recurringBookingData.allRecurringDates[i].start;
                const end = recurringBookingData.allRecurringDates[i].end;

                if (!bookingMeta.skipAvailabilityCheck) {
                  await ensureAvailableUsers(
                    { ...eventTypeWithUsers, users: [newLuckyUser] },
                    {
                      dateFrom: dayjs(start).tz(booker.timeZone).format(),
                      dateTo: dayjs(end).tz(booker.timeZone).format(),
                      timeZone: booker.timeZone,
                      originalRescheduledBooking,
                    },
                    loggerWithEventDetails,
                    shouldServeCache
                  );
                }
              }
              // if no error, then lucky user is available for the next slots
              luckyUsers.push(newLuckyUser);
              luckUserFound = true;
            } catch {
              notAvailableLuckyUsers.push(newLuckyUser);
              loggerWithEventDetails.info(
                `Round robin host ${newLuckyUser.name} not available for first two slots. Trying to find another host.`
              );
            }
          } else {
            luckyUsers.push(newLuckyUser);
            luckUserFound = true;
          }
        }
      }

      // ALL fixed users must be available
      if (fixedUserPool.length !== users.filter((user) => user.isFixed).length) {
        throw new Error(ErrorCode.FixedHostsUnavailableForBooking);
      }

      const roundRobinHosts = eventType.hosts.filter((host) => !host.isFixed);

      const hostGroups = groupHostsByGroupId({
        hosts: roundRobinHosts,
        hostGroups: eventType.hostGroups,
      });

      // Filter out host groups that have no hosts in them
      const nonEmptyHostGroups = Object.fromEntries(
        Object.entries(hostGroups).filter(([, hosts]) => hosts.length > 0)
      );
      // If there are RR hosts, we need to find a lucky user
      if (
        [...qualifiedRRUsers, ...additionalFallbackRRUsers].length > 0 &&
        luckyUsers.length !== (Object.keys(nonEmptyHostGroups).length || 1)
      ) {
        throw new Error(ErrorCode.RoundRobinHostsUnavailableForBooking);
      }

      // Pushing fixed user before the luckyUser guarantees the (first) fixed user as the organizer.
      users = [...fixedUserPool, ...luckyUsers];
      luckyUserResponse = { luckyUsers: luckyUsers.map((u) => u.id) };
      troubleshooterData = {
        ...troubleshooterData,
        luckyUsers: luckyUsers.map((u) => u.id),
        fixedUsers: fixedUserPool.map((u) => u.id),
        luckyUserPool: Object.values(luckyUserPools)
          .flat()
          .map((u) => u.id),
      };
    } else if (
      recurringBookingData.allRecurringDates &&
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
    throw new Error(ErrorCode.RoundRobinHostsUnavailableForBooking);
  }

  // If the team member is requested then they should be the organizer
  const organizerUser = routingData.rawTeamMemberEmail
    ? users.find((user) => user.email === routingData.rawTeamMemberEmail) ?? users[0]
    : users[0];

  const tOrganizer = await getTranslation(organizerUser?.locale ?? "en", "common");
  const allCredentials = await getAllCredentialsIncludeServiceAccountKey(organizerUser, eventType);

  // If the Organizer himself is rescheduling, the booker should be sent the communication in his timezone and locale.
  const attendeeInfoOnReschedule =
    userReschedulingIsOwner && originalRescheduledBooking
      ? originalRescheduledBooking.attendees.find((attendee) => attendee.email === booker.email)
      : null;

  const attendeeLanguage = attendeeInfoOnReschedule ? attendeeInfoOnReschedule.locale : booker.language;
  const attendeeTimezone = attendeeInfoOnReschedule ? attendeeInfoOnReschedule.timeZone : booker.timeZone;

  const tAttendees = await getTranslation(attendeeLanguage ?? "en", "common");

  const isManagedEventType = !!eventType.parentId;

  // If location passed is empty , use default location of event
  // If location of event is not set , use host default
  if (locationBodyString.trim().length == 0) {
    if (eventType.locations.length > 0) {
      locationBodyString = eventType.locations[0].type;
    } else {
      locationBodyString = OrganizerDefaultConferencingAppType;
    }
  }

  const organizationDefaultLocation = getFirstDelegationConferencingCredentialAppLocation({
    credentials: firstUser.credentials,
  });

  // use host default
  if (locationBodyString == OrganizerDefaultConferencingAppType) {
    const metadataParseResult = userMetadataSchema.safeParse(organizerUser.metadata);
    const organizerMetadata = metadataParseResult.success ? metadataParseResult.data : undefined;
    if (organizerMetadata?.defaultConferencingApp?.appSlug) {
      const app = getAppFromSlug(organizerMetadata?.defaultConferencingApp?.appSlug);
      locationBodyString = app?.appData?.location?.type || locationBodyString;
      if (isManagedEventType || eventType.isTeamEventType) {
        organizerOrFirstDynamicGroupMemberDefaultLocationUrl =
          organizerMetadata?.defaultConferencingApp?.appLink;
      }
    } else if (organizationDefaultLocation) {
      locationBodyString = organizationDefaultLocation;
    } else {
      locationBodyString = "integrations:daily";
    }
  }

  const invitee: Invitee = [
    {
      email: booker.email,
      name: fullName,
      phoneNumber: booker.phoneNumber ?? undefined,
      firstName: (typeof booker.name === "object" && booker.name.firstName) || "",
      lastName: (typeof booker.name === "object" && booker.name.lastName) || "",
      timeZone: attendeeTimezone,
      language: { translate: tAttendees, locale: attendeeLanguage ?? "en" },
    },
  ];

  const blacklistedGuestEmails = process.env.BLACKLISTED_GUEST_EMAILS
    ? process.env.BLACKLISTED_GUEST_EMAILS.split(",")
    : [];

  const guestEmails = (reqGuests || []).map((email) => extractBaseEmail(email).toLowerCase());
  const guestUsers = await userRepository.findManyByEmailsWithEmailVerificationSettings({
    emails: guestEmails,
  });

  const emailToRequiresVerification = new Map<string, boolean>();
  for (const user of guestUsers) {
    const matchedBase = extractBaseEmail(user.matchedEmail ?? user.email).toLowerCase();
    emailToRequiresVerification.set(matchedBase, user.requiresBookerEmailVerification === true);
  }

  const guestsRemoved: string[] = [];
  const guests = (reqGuests || []).reduce((guestArray: Invitee, guest: string) => {
    const baseGuestEmail = extractBaseEmail(guest).toLowerCase();

    if (blacklistedGuestEmails.some((e) => e.toLowerCase() === baseGuestEmail)) {
      guestsRemoved.push(guest);
      return guestArray;
    }

    if (emailToRequiresVerification.get(baseGuestEmail)) {
      guestsRemoved.push(guest);
      return guestArray;
    }

    // If it's a team event, remove the team member from guests
    if (eventType.isTeamEventType && users.some((user) => user.email === guest)) {
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

  const seed = `${organizerUser.username}:${dayjs(startTime).utc().format()}:${new Date().getTime()}`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));

  // For static link based video apps, it would have the static URL value instead of it's type(e.g. integrations:campfire_video)
  // This ensures that createMeeting isn't called for static video apps as bookingLocation becomes just a regular value for them.
  const { bookingLocation, conferenceCredentialId } = organizerOrFirstDynamicGroupMemberDefaultLocationUrl
    ? {
        bookingLocation: organizerOrFirstDynamicGroupMemberDefaultLocationUrl,
        conferenceCredentialId: undefined,
      }
    : getLocationValueForDB(locationBodyString, eventType.locations);

  log.info("locationBodyString", locationBodyString);
  log.info("event type locations", eventType.locations);

  const customInputs = getCustomInputsResponses(bookingFormData, eventType.customInputs);
  const attendeesList = [...invitee, ...guests];

  const responses = bookingFormData.responses || null;
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
    eventDuration: dayjs(endTime).diff(startTime, "minutes"),
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

  //update cal event responses with latest location value , later used by webhook
  if (bookingFormData.calEventResponses)
    bookingFormData.calEventResponses["location"].value = {
      value: bookingMeta.platform?.bookingLocation ?? bookingLocation,
      optionValue: "",
    };

  const eventName = getEventName(eventNameObject);

  const builtEvt = new CalendarEventBuilder()
    .withBasicDetails({
      bookerUrl,
      title: eventName,
      startTime: dayjs(startTime).utc().format(),
      endTime: dayjs(endTime).utc().format(),
      additionalNotes,
    })
    .withEventType({
      slug: eventType.slug,
      description: eventType.description,
      id: eventType.id,
      hideCalendarNotes: eventType.hideCalendarNotes,
      hideCalendarEventDetails: eventType.hideCalendarEventDetails,
      hideOrganizerEmail: eventType.hideOrganizerEmail,
      schedulingType: eventType.schedulingType,
      seatsPerTimeSlot: eventType.seatsPerTimeSlot,
      // if seats are not enabled we should default true
      seatsShowAttendees: eventType.seatsPerTimeSlot ? eventType.seatsShowAttendees : true,
      seatsShowAvailabilityCount: eventType.seatsPerTimeSlot ? eventType.seatsShowAvailabilityCount : true,
      customReplyToEmail: eventType.customReplyToEmail,
      disableRescheduling: eventType.disableRescheduling ?? false,
      disableCancelling: eventType.disableCancelling ?? false,
    })
    .withOrganizer({
      id: organizerUser.id,
      name: organizerUser.name || "Nameless",
      email: organizerEmail,
      username: organizerUser.username || undefined,
      usernameInOrg: organizerOrganizationProfile?.username || undefined,
      timeZone: organizerUser.timeZone,
      language: { translate: tOrganizer, locale: organizerUser.locale ?? "en" },
      timeFormat: getTimeFormatStringFromUserTimeFormat(organizerUser.timeFormat),
    })
    .withAttendees(attendeesList)
    .withMetadataAndResponses({
      additionalNotes,
      customInputs,
      responses: bookingFormData.calEventResponses || null,
      userFieldsResponses: bookingFormData.calEventUserFieldsResponses || null,
    })
    .withLocation({
      location: bookingMeta.platform?.bookingLocation ?? bookingLocation, // Will be processed by the EventManager later.
      conferenceCredentialId,
    })
    .withDestinationCalendar(destinationCalendar)
    .withIdentifiers({ iCalUID, iCalSequence })
    .withConfirmation({
      requiresConfirmation: !isConfirmedByDefault,
      isConfirmedByDefault,
    })
    .withPlatformVariables({
      platformClientId: bookingMeta.platform?.clientId,
      platformRescheduleUrl: bookingMeta.platform?.rescheduleUrl,
      platformCancelUrl: bookingMeta.platform?.cancelUrl,
      platformBookingUrl: bookingMeta.platform?.bookingUrl,
    })
    .build();

  if (!builtEvt) {
    throw new HttpError({
      statusCode: 400,
      message: "Failed to build calendar event due to missing required fields",
    });
  }

  let evt: CalendarEvent = builtEvt;

  if (recurringBookingData?.thirdPartyRecurringEventId) {
    const updatedEvt = CalendarEventBuilder.fromEvent(evt)
      ?.withRecurringEventId(recurringBookingData?.thirdPartyRecurringEventId)
      .build();

    if (!updatedEvt) {
      throw new HttpError({
        statusCode: 400,
        message: "Failed to build event with recurring event ID due to missing required fields",
      });
    }

    evt = updatedEvt;
  }

  if (eventType.isTeamEventType) {
    const teamEvt = await buildEventForTeamEventType({
      existingEvent: evt,
      schedulingType: eventType.schedulingType,
      users,
      team: eventType.team,
      organizerUser,
    });

    if (!teamEvt) {
      throw new HttpError({ statusCode: 400, message: "Failed to build team event" });
    }

    evt = teamEvt;
  }

  // data needed for triggering webhooks
  const eventTypeInfo: EventTypeInfo = {
    eventTitle: eventType.title,
    eventDescription: eventType.description,
    price: paymentAppData.price,
    currency: eventType.currency,
    length: dayjs(endTime).diff(startTime, "minutes"),
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
    oAuthClientId: bookingMeta.platform?.clientId,
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
    orgId,
    oAuthClientId: bookingMeta.platform?.clientId,
  };

  const subscriberOptionsMeetingStarted = {
    userId: triggerForUser ? organizerUser.id : null,
    eventTypeId,
    triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
    teamId,
    orgId,
    oAuthClientId: bookingMeta.platform?.clientId,
  };

  const workflows = await getAllWorkflowsFromEventType(
    {
      ...eventType,
      metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
    },
    organizerUser.id
  );

  const spamCheckResult = await spamCheckService.waitForCheck();

  if (spamCheckResult.isBlocked) {
    const DECOY_ORGANIZER_NAMES = ["Alex Smith", "Jordan Taylor", "Sam Johnson", "Chris Morgan"];
    const randomOrganizerName =
      DECOY_ORGANIZER_NAMES[Math.floor(Math.random() * DECOY_ORGANIZER_NAMES.length)];

    const eventName = getEventName({
      ...eventNameObject,
      host: randomOrganizerName,
    });

    return {
      id: 0,
      uid,
      iCalUID: "",
      status: BookingStatus.ACCEPTED,
      eventTypeId: eventType.id,
      user: {
        name: randomOrganizerName,
        timeZone: "UTC",
        email: null,
      },
      userId: null,
      title: eventName,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      createdAt: new Date(),
      updatedAt: new Date(),
      attendees: [
        {
          id: 0,
          email: booker.email,
          name: fullName,
          timeZone: booker.timeZone,
          locale: null,
          phoneNumber: null,
          bookingId: null,
          noShow: null,
        },
      ],
      oneTimePassword: null,
      smsReminderNumber: null,
      metadata: {},
      idempotencyKey: null,
      userPrimaryEmail: null,
      description: eventType.description || null,
      customInputs: null,
      responses: null,
      location: bookingLocation,
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
      isDryRun: false,
      paymentRequired: false,
      paymentUid: undefined,
      luckyUsers: [],
      paymentId: undefined,
      seatReferenceUid: undefined,
      isShortCircuitedBooking: true, // Renamed from isSpamDecoy to avoid exposing spam detection to blocked users
    };
  }

  // For seats, if the booking already exists then we want to add the new attendee to the existing booking
  if (eventType.seatsPerTimeSlot) {
    const newBooking = await handleSeats({
      rescheduleUid: rescheduleUid,
      reqBookingUid: seatsData.bookingUid ?? undefined,
      eventType,
      evt: { ...evt, bookerUrl },
      invitee,
      allCredentials,
      organizerUser,
      originalRescheduledBooking,
      bookerEmail: booker.email,
      bookerPhoneNumber: booker.phoneNumber,
      tAttendees,
      bookingSeat,
      reqUserId: loggedInUser.id ?? undefined,
      rescheduleReason: rescheduleData.reason,
      reqBodyUser: teamOrUserSlug ?? undefined,
      noEmail,
      isConfirmedByDefault,
      additionalNotes,
      reqAppsStatus,
      attendeeLanguage,
      paymentAppData,
      fullName,
      smsReminderNumber: booker.smsReminderNumber ?? undefined,
      eventTypeInfo,
      uid,
      eventTypeId,
      reqBodyMetadata: bookingFormData.metadata,
      subscriberOptions,
      eventTrigger,
      responses,
      workflows,
      rescheduledBy: rescheduleData.rescheduledBy ?? undefined,
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
      const updatedEvt = CalendarEventBuilder.fromEvent(evt)
        ?.withIdentifiers({
          iCalUID: getICalUID({
            attendeeId: bookingSeat?.attendeeId,
          }),
        })
        .build();

      if (!updatedEvt) {
        throw new HttpError({
          statusCode: 400,
          message: "Failed to build event with new identifiers due to missing required fields",
        });
      }

      evt = updatedEvt;
    }
  }

  if (recurringBookingData?.recurringEventId && eventType.recurringEvent) {
    // Overriding the recurring event configuration count to be the actual number of events booked for
    // the recurring event (equal or less than recurring event configuration count)
    eventType.recurringEvent = Object.assign({}, eventType.recurringEvent, {
      count: recurringBookingData.recurringCount,
    });
    evt.recurringEvent = eventType.recurringEvent;
  }

  const changedOrganizer =
    !!originalRescheduledBooking &&
    (eventType.schedulingType === SchedulingType.ROUND_ROBIN ||
      eventType.schedulingType === SchedulingType.COLLECTIVE) &&
    originalRescheduledBooking.userId !== evt.organizer.id;

  const skipDeleteEventsAndMeetings = changedOrganizer;

  const isBookingRequestedReschedule =
    !!originalRescheduledBooking &&
    !!originalRescheduledBooking.rescheduled &&
    originalRescheduledBooking.status === BookingStatus.CANCELLED;

  if (
    changedOrganizer &&
    originalRescheduledBooking &&
    originalRescheduledBooking?.user?.name &&
    organizerUser?.name
  ) {
    evt.title = updateHostInEventName(
      originalRescheduledBooking.title,
      originalRescheduledBooking.user.name,
      organizerUser.name
    );
  }

  let results: EventResult<AdditionalInformation & { url?: string; iCalUID?: string }>[] = [];
  let referencesToCreate: PartialReference[] = [];

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

  let assignmentReason: { reasonEnum: AssignmentReasonEnum; reasonString: string } | undefined;

  try {
    if (!isDryRun) {
      booking = await createBooking({
        uid,
        rescheduledBy: rescheduleData.rescheduledBy ?? undefined,
        routingFormResponseId: routingData.routingFormResponseId ?? undefined,
        reroutingFormResponses: routingData.reroutingFormResponses ?? null,
        reqBody: {
          user: teamOrUserSlug ?? undefined,
          metadata: bookingFormData.metadata,
          recurringEventId: recurringBookingData.recurringEventId ?? undefined,
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
          bookerEmail: booker.email,
          rescheduleReason: rescheduleData.reason ?? undefined,
          smsReminderNumber: booker.smsReminderNumber ?? undefined,
          responses,
        },
        evt,
        originalRescheduledBooking,
        creationSource: bookingFormData.creationSource,
        tracking: bookingFormData.tracking,
      });

      if (booking?.userId) {
        const usersRepository = new UsersRepository();
        await usersRepository.updateLastActiveAt(booking.userId);
        const organizerUserAvailability = availableUsers.find((user) => user.id === booking?.userId);

        logger.info(`Booking created`, {
          bookingUid: booking.uid,
          selectedCalendarIds: organizerUser.allSelectedCalendars?.map((c) => c.id) ?? [],
          availabilitySnapshot: organizerUserAvailability?.availabilityData
            ? formatAvailabilitySnapshot(organizerUserAvailability.availabilityData)
            : null,
        });
      }

      // If it's a round robin event, record the reason for the host assignment
      if (eventType.schedulingType === SchedulingType.ROUND_ROBIN) {
        if (
          routingData.crmOwnerRecordType &&
          routingData.crmAppSlug &&
          routingData.contactOwnerEmail &&
          routingData.routingFormResponseId
        ) {
          assignmentReason = await AssignmentReasonRecorder.CRMOwnership({
            bookingId: booking.id,
            crmAppSlug: routingData.crmAppSlug,
            teamMemberEmail: routingData.contactOwnerEmail,
            recordType: routingData.crmOwnerRecordType,
            routingFormResponseId: routingData.routingFormResponseId,
            recordId: crmRecordId,
          });
        } else if (routingData.routingFormResponseId && teamId) {
          assignmentReason = await AssignmentReasonRecorder.routingFormRoute({
            bookingId: booking.id,
            routingFormResponseId: routingData.routingFormResponseId,
            organizerId: organizerUser.id,
            teamId,
            isRerouting: !!routingData.reroutingFormResponses,
            reroutedByEmail: rescheduleData.rescheduledBy ?? undefined,
          });
        }
      }

      const updatedEvtWithUid = CalendarEventBuilder.fromEvent(evt)
        ?.withUid(booking.uid ?? null)
        .build();

      if (!updatedEvtWithUid) {
        throw new HttpError({
          statusCode: 400,
          message: "Failed to build event with UID due to missing required fields",
        });
      }

      evt = updatedEvtWithUid;

      const updatedEvtWithPassword = CalendarEventBuilder.fromEvent(evt)
        ?.withOneTimePassword(booking.oneTimePassword ?? null)
        .build();

      if (!updatedEvtWithPassword) {
        throw new HttpError({
          statusCode: 400,
          message: "Failed to build event with one-time password due to missing required fields",
        });
      }

      evt = updatedEvtWithPassword;

      if (booking && booking.id && eventType.seatsPerTimeSlot) {
        const currentAttendee = booking.attendees.find(
          (attendee) =>
            attendee.email === bookingFormData.responses.email ||
            (bookingFormData.responses.attendeePhoneNumber &&
              attendee.phoneNumber === bookingFormData.responses.attendeePhoneNumber)
        );

        // Save description to bookingSeat
        const uniqueAttendeeId = uuid();
        await prisma.bookingSeat.create({
          data: {
            referenceUid: uniqueAttendeeId,
            data: {
              description: additionalNotes,
              responses: bookingFormData.responses,
            },
            metadata: bookingFormData.metadata,
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
        startTime: startTime,
        endTime: endTime,
        contactOwnerFromReq: routingData.rawTeamMemberEmail ?? null,
        contactOwnerEmail: routingData.contactOwnerEmail ?? null,
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
  const apps = eventTypeAppMetadataOptionalSchema.parse(eventType?.metadata?.apps);
  const eventManager =
    !isDryRun && !bookingMeta.skipCalendarSyncTaskCreation
      ? new EventManager({ ...organizerUser, credentials }, apps)
      : buildDryRunEventManager();

  let videoCallUrl;

  // this is the actual rescheduling logic
  if (!eventType.seatsPerTimeSlot && originalRescheduledBooking?.uid) {
    log.silly("Rescheduling booking", originalRescheduledBooking.uid);
    // cancel workflow reminders from previous rescheduled booking
    await WorkflowRepository.deleteAllWorkflowReminders(originalRescheduledBooking.workflowReminders);

    evt = addVideoCallDataToEvent(originalRescheduledBooking.references, evt);
    evt.rescheduledBy = rescheduleData.rescheduledBy ?? undefined;

    // If organizer is changed in RR event then we need to delete the previous host destination calendar events
    const previousHostDestinationCalendar = originalRescheduledBooking?.destinationCalendar
      ? [originalRescheduledBooking?.destinationCalendar]
      : [];

    if (changedOrganizer) {
      // location might changed and will be new created in eventManager.create (organizer default location)
      evt.videoCallData = undefined;
      // To prevent "The requested identifier already exists" error while updating event, we need to remove iCalUID
      evt.iCalUID = undefined;
    }

    if (changedOrganizer && originalRescheduledBooking?.user) {
      const originalHostCredentials = await getAllCredentialsIncludeServiceAccountKey(
        originalRescheduledBooking.user,
        eventType
      );
      const refreshedOriginalHostCredentials = await refreshCredentials(originalHostCredentials);

      // Create EventManager with original host's credentials for deletion operations
      const originalHostEventManager = new EventManager(
        { ...originalRescheduledBooking.user, credentials: refreshedOriginalHostCredentials },
        apps
      );
      log.debug("RescheduleOrganizerChanged: Deleting Event and Meeting for previous booking");
      // Create deletion event with original host's organizer info and original booking properties
      const deletionEvent = {
        ...evt,
        organizer: {
          id: originalRescheduledBooking.user.id,
          name: originalRescheduledBooking.user.name || "",
          email: originalRescheduledBooking.user.email,
          username: originalRescheduledBooking.user.username || undefined,
          timeZone: originalRescheduledBooking.user.timeZone,
          language: { translate: tOrganizer, locale: originalRescheduledBooking.user.locale ?? "en" },
          timeFormat: getTimeFormatStringFromUserTimeFormat(originalRescheduledBooking.user.timeFormat),
        },
        destinationCalendar: previousHostDestinationCalendar,
        // Override with original booking properties used by deletion operations
        startTime: originalRescheduledBooking.startTime.toISOString(),
        endTime: originalRescheduledBooking.endTime.toISOString(),
        uid: originalRescheduledBooking.uid,
        location: originalRescheduledBooking.location,
        responses: originalRescheduledBooking.responses
          ? (originalRescheduledBooking.responses as CalEventResponses)
          : evt.responses,
      };

      if (!bookingMeta.skipCalendarSyncTaskCreation) {
        await originalHostEventManager.deleteEventsAndMeetings({
          event: deletionEvent,
          bookingReferences: originalRescheduledBooking.references,
        });
      }
    }
    const updateManager = !bookingMeta.skipCalendarSyncTaskCreation
      ? await eventManager.reschedule(
          evt,
          originalRescheduledBooking.uid,
          undefined,
          changedOrganizer,
          previousHostDestinationCalendar,
          isBookingRequestedReschedule,
          skipDeleteEventsAndMeetings
        )
      : placeholderCreatedEvent;
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

    if (!noEmail && isConfirmedByDefault && !isDryRun) {
      await emailsAndSmsHandler.send({
        action: BookingActionMap.rescheduled,
        data: {
          evt,
          eventType,
          additionalInformation: metadata,
          additionalNotes,
          iCalUID,
          originalRescheduledBooking,
          rescheduleReason: rescheduleData.reason ?? undefined,
          isRescheduledByBooker: rescheduleData.rescheduledBy === booker.email,
          users,
          changedOrganizer,
        },
      });
    }
    // If it's not a reschedule, doesn't require confirmation and there's no price,
    // Create a booking
  } else if (isConfirmedByDefault) {
    // Use EventManager to conditionally use all needed integrations.
    const createManager =
      bookingMeta.areCalendarEventsEnabled && !bookingMeta.skipCalendarSyncTaskCreation
        ? await eventManager.create(evt)
        : placeholderCreatedEvent;
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
      const additionalInformation: AdditionalInformation = {};

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
        additionalInformation.hangoutLink = results[0].createdEvent?.hangoutLink;
        additionalInformation.conferenceData = results[0].createdEvent?.conferenceData;
        additionalInformation.entryPoints = results[0].createdEvent?.entryPoints;
        evt.appsStatus = handleAppsStatus(results, booking, reqAppsStatus);
        videoCallUrl =
          additionalInformation.hangoutLink ||
          organizerOrFirstDynamicGroupMemberDefaultLocationUrl ||
          videoCallUrl;

        if (!isDryRun && evt.iCalUID !== booking.iCalUID) {
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
      if (!noEmail) {
        if (!isDryRun && !(eventType.seatsPerTimeSlot && rescheduleUid)) {
          await emailsAndSmsHandler.send({
            action: BookingActionMap.confirmed,
            data: {
              eventType: {
                metadata: eventType.metadata,
                schedulingType: eventType.schedulingType,
              },
              eventNameObject,
              workflows,
              evt,
              additionalInformation,
              additionalNotes,
              customInputs,
            },
          });
        }
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
    if (!isDryRun) {
      await emailsAndSmsHandler.send({
        action: BookingActionMap.requested,
        data: { evt, attendees: attendeesList, eventType, additionalNotes },
      });
    }
  }

  if (booking.location?.startsWith("http")) {
    videoCallUrl = booking.location;
  }

  const metadata = videoCallUrl
    ? {
        videoCallUrl: getVideoCallUrlFromCalEvent(evt) || videoCallUrl,
      }
    : undefined;

  const bookingCreatedPayload = {
    config: bookingFlowConfig,
    bookingFormData: {
      // FIXME: It looks like hasHashedBookingLink is set to true based on the value of hashedLink when sending the request. So, technically we could remove hasHashedBookingLink usage completely
      hashedLink: hashedBookingLinkData?.hasHashedBookingLink
        ? hashedBookingLinkData.hashedLink ?? null
        : null,
    },
  };

  // Add more fields here when needed
  const bookingRescheduledPayload = bookingCreatedPayload;

  const bookingEventHandler = new BookingEventHandlerService({
    log: loggerWithEventDetails,
    hashedLinkService: deps.hashedLinkService,
  });

  // TODO: Incrementally move all stuff that happens after a booking is created to these handlers
  if (originalRescheduledBooking) {
    await bookingEventHandler.onBookingRescheduled(bookingRescheduledPayload);
  } else {
    await bookingEventHandler.onBookingCreated(bookingCreatedPayload);
  }
  const webhookData: EventPayloadType = {
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
    metadata: { ...metadata, ...bookingFormData.metadata },
    eventTypeId,
    status: "ACCEPTED",
    smsReminderNumber: booking?.smsReminderNumber || undefined,
    rescheduledBy: rescheduleData.rescheduledBy ?? undefined,
    ...(assignmentReason ? { assignmentReason: [assignmentReason] } : {}),
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
    const payment = await handlePayment({
      evt,
      selectedEventType: {
        ...eventType,
        metadata: eventType.metadata
          ? {
              ...eventType.metadata,
              apps: eventType.metadata?.apps as Prisma.JsonValue,
            }
          : {},
      },
      paymentAppCredentials: eventTypePaymentAppCredential as IEventTypePaymentCredentialType,
      booking,
      bookerName: fullName,
      bookerEmail: booker.email,
      bookerPhoneNumber: booker.phoneNumber,
      isDryRun,
      bookingFields: eventType.bookingFields,
      locale: booker.language ?? undefined,
    });
    const subscriberOptionsPaymentInitiated: GetSubscriberOptions = {
      userId: triggerForUser ? organizerUser.id : null,
      eventTypeId,
      triggerEvent: WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
      teamId,
      orgId,
      oAuthClientId: bookingMeta.platform?.clientId,
    };
    await handleWebhookTrigger({
      subscriberOptions: subscriberOptionsPaymentInitiated,
      eventTrigger: WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
      webhookData: {
        ...webhookData,
        paymentId: payment?.id,
      },
      isDryRun,
    });

    try {
      const calendarEventForWorkflow = {
        ...evt,
        rescheduleReason: rescheduleData.reason ?? undefined,
        metadata,
        eventType: {
          slug: eventType.slug,
          schedulingType: eventType.schedulingType,
          hosts: eventType.hosts,
        },
        bookerUrl,
      };

      if (isNormalBookingOrFirstRecurringSlot) {
        await WorkflowService.scheduleWorkflowsFilteredByTriggerEvent({
          workflows,
          smsReminderNumber: booker.smsReminderNumber,
          calendarEvent: calendarEventForWorkflow,
          hideBranding: !!eventType.owner?.hideBranding,
          seatReferenceUid: evt.attendeeSeatId,
          isDryRun,
          triggers: [WorkflowTriggerEvents.BOOKING_PAYMENT_INITIATED],
        });
      }
    } catch (error) {
      loggerWithEventDetails.error(
        "Error while scheduling workflow reminders for booking payment initiated",
        JSON.stringify({ error })
      );
    }

    // TODO: Refactor better so this booking object is not passed
    // all around and instead the individual fields are sent as args.
    const bookingResponse = {
      ...booking,
      user: {
        ...booking.user,
        email: null,
      },
      videoCallUrl: metadata?.videoCallUrl,
      // Ensure seatReferenceUid is properly typed as string|null
      seatReferenceUid: evt.attendeeSeatId,
    };

    return {
      ...bookingResponse,
      ...luckyUserResponse,
      message: "Payment required",
      paymentRequired: true,
      paymentUid: payment?.uid,
      paymentId: payment?.id,
      isDryRun,
      ...(isDryRun ? { troubleshooterData } : {}),
    };
  }

  loggerWithEventDetails.debug(`Booking ${organizerUser.username} completed`);

  // We are here so, booking doesn't require payment and booking is also created in DB already, through createBooking call
  if (isConfirmedByDefault) {
    const subscribersMeetingEnded = await getWebhooks(subscriberOptionsMeetingEnded);
    const subscribersMeetingStarted = await getWebhooks(subscriberOptionsMeetingStarted);

    const deleteWebhookScheduledTriggerPromises: Promise<unknown>[] = [];
    const scheduleTriggerPromises = [];

    if (rescheduleUid && originalRescheduledBooking) {
      //delete all scheduled triggers for meeting ended and meeting started of booking
      deleteWebhookScheduledTriggerPromises.push(
        deleteWebhookScheduledTriggers({
          booking: originalRescheduledBooking,
          isDryRun,
        })
      );
      deleteWebhookScheduledTriggerPromises.push(
        cancelNoShowTasksForBooking({
          bookingUid: originalRescheduledBooking.uid,
        })
      );
    }

    if (booking && booking.status === BookingStatus.ACCEPTED) {
      const bookingWithCalEventResponses = {
        ...booking,
        responses: bookingFormData.calEventResponses,
      };
      for (const subscriber of subscribersMeetingEnded) {
        scheduleTriggerPromises.push(
          scheduleTrigger({
            booking: bookingWithCalEventResponses,
            subscriberUrl: subscriber.subscriberUrl,
            subscriber,
            triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
            isDryRun,
          })
        );
      }

      for (const subscriber of subscribersMeetingStarted) {
        scheduleTriggerPromises.push(
          scheduleTrigger({
            booking: bookingWithCalEventResponses,
            subscriberUrl: subscriber.subscriberUrl,
            subscriber,
            triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
            isDryRun,
          })
        );
      }
    }

    const scheduledTriggerResults = await Promise.allSettled([
      ...deleteWebhookScheduledTriggerPromises,
      ...scheduleTriggerPromises,
    ]);
    const failures = scheduledTriggerResults.filter((result) => result.status === "rejected");

    if (failures.length > 0) {
      loggerWithEventDetails.error(
        "Error while scheduling or canceling webhook triggers",
        safeStringify({
          errors: failures.map((f) => f.reason),
        })
      );
    }

    // Send Webhook call if hooked to BOOKING_CREATED & BOOKING_RESCHEDULED
    await handleWebhookTrigger({
      subscriberOptions,
      eventTrigger,
      webhookData,
      isDryRun,
    });
  } else {
    // if eventType requires confirmation we will trigger the BOOKING REQUESTED Webhook
    const eventTrigger: WebhookTriggerEvents = WebhookTriggerEvents.BOOKING_REQUESTED;
    subscriberOptions.triggerEvent = eventTrigger;
    webhookData.status = "PENDING";
    await handleWebhookTrigger({
      subscriberOptions,
      eventTrigger,
      webhookData,
      isDryRun,
    });
  }

  if (!booking) throw new HttpError({ statusCode: 400, message: "Booking failed" });

  try {
    if (!isDryRun) {
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
    }
  } catch (error) {
    loggerWithEventDetails.error("Error while creating booking references", JSON.stringify({ error }));
  }

  const evtWithMetadata = {
    ...evt,
    rescheduleReason: rescheduleData.reason ?? undefined,
    metadata,
    eventType: { slug: eventType.slug, schedulingType: eventType.schedulingType, hosts: eventType.hosts },
    bookerUrl,
  };

  if (!eventType.metadata?.disableStandardEmails?.all?.attendee) {
    await scheduleMandatoryReminder({
      evt: evtWithMetadata,
      workflows,
      requiresConfirmation: !isConfirmedByDefault,
      hideBranding: !!eventType.owner?.hideBranding,
      seatReferenceUid: evt.attendeeSeatId,
      isPlatformNoEmail: noEmail && Boolean(bookingMeta.platform?.clientId),
      isDryRun,
    });
  }

  try {
    await WorkflowService.scheduleWorkflowsForNewBooking({
      workflows,
      smsReminderNumber: booker.smsReminderNumber,
      calendarEvent: evtWithMetadata,
      hideBranding: !!eventType.owner?.hideBranding,
      seatReferenceUid: evt.attendeeSeatId,
      isDryRun,
      isConfirmedByDefault,
      isNormalBookingOrFirstRecurringSlot,
      isRescheduleEvent: !!rescheduleUid,
    });
  } catch (error) {
    loggerWithEventDetails.error("Error while scheduling workflow reminders", JSON.stringify({ error }));
  }

  try {
    if (isConfirmedByDefault) {
      await scheduleNoShowTriggers({
        booking: {
          startTime: booking.startTime,
          id: booking.id,
          location: booking.location,
          uid: booking.uid,
        },
        triggerForUser,
        organizerUser: { id: organizerUser.id },
        eventTypeId,
        teamId,
        orgId,
        isDryRun,
      });
    }
  } catch (error) {
    loggerWithEventDetails.error("Error while scheduling no show triggers", JSON.stringify({ error }));
  }

  if (!isDryRun) {
    await handleAnalyticsEvents({
      credentials: allCredentials,
      rawBookingData,
      bookingInfo: {
        name: fullName,
        email: booker.email,
        eventName: "Cal.com lead",
      },
      isTeamEventType: eventType.isTeamEventType,
    });
  }

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
    isDryRun,
    ...(isDryRun ? { troubleshooterData } : {}),
    references: referencesToCreate,
    seatReferenceUid: evt.attendeeSeatId,
    videoCallUrl: metadata?.videoCallUrl,
  };
}

/**
 * Takes care of creating/rescheduling non-recurring, non-instant bookings. Such bookings could be TeamBooking, UserBooking, SeatedUserBooking, SeatedTeamBooking, etc.
 * We can't name it CoreBookingService because non-instant booking also creates a booking but it is entirely different from the regular booking.
 * We are open to renaming it to something more descriptive.
 */
export class RegularBookingService implements IBookingService {
  constructor(private readonly deps: IBookingServiceDependencies) {}

  async createBooking(input: { bookingData: CreateRegularBookingData; bookingMeta?: CreateBookingMeta }) {
    return handler({ bookingData: input.bookingData, bookingMeta: input.bookingMeta ?? {} }, this.deps);
  }

  async rescheduleBooking(input: { bookingData: CreateRegularBookingData; bookingMeta?: CreateBookingMeta }) {
    return handler({ bookingData: input.bookingData, bookingMeta: input.bookingMeta ?? {} }, this.deps);
  }

  /**
   * @deprecated Exists only till API v1 is removed.
   */
  async createBookingForApiV1(input: {
    bookingData: CreateRegularBookingData;
    bookingMeta?: CreateBookingMeta;
    bookingDataSchemaGetter: BookingDataSchemaGetter;
  }) {
    return handler(
      {
        bookingData: input.bookingData,
        bookingMeta: input.bookingMeta ?? {},
      },
      this.deps,
      input.bookingDataSchemaGetter
    );
  }
}
