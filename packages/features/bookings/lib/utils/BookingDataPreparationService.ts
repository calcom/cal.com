import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { getSpamCheckService } from "@calcom/features/di/watchlist/containers/SpamCheckService.container";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { shouldIgnoreContactOwner } from "@calcom/lib/bookings/routing/utils";
import { HttpError } from "@calcom/lib/http-error";
import type logger from "@calcom/lib/logger";
import { verifyCodeUnAuthenticated } from "@calcom/trpc/server/routers/viewer/auth/util";
import type { AppsStatus } from "@calcom/types/Calendar";

import type {
  BookingDataSchemaGetter,
  BookingFlowConfig,
  CreateBookingMeta,
  CreateRegularBookingData,
} from "../dto/types";
import { checkActiveBookingsLimitForBooker } from "../handleNewBooking/checkActiveBookingsLimitForBooker";
import { checkIfBookerEmailIsBlocked } from "../handleNewBooking/checkIfBookerEmailIsBlocked";
import { getBookingData } from "../handleNewBooking/getBookingData";
import { getEventType } from "../handleNewBooking/getEventType";
import type { getEventTypeResponse } from "../handleNewBooking/getEventTypesFromDB";
import { validateBookingTimeIsNotOutOfBounds } from "../handleNewBooking/validateBookingTimeIsNotOutOfBounds";
import { validateEventLength } from "../handleNewBooking/validateEventLength";

type BookingData = Awaited<ReturnType<typeof getBookingData>>;
export type EnrichmentInput = {
  eventTypeId: number;
  eventTypeSlug: string;
};

type EnrichedEventType = getEventTypeResponse & {
  isTeamEventType: boolean;
};

export type EnrichmentOutput = {
  eventType: EnrichedEventType;
};

export type ValidationInputContext = EnrichmentInput & {
  rawBookingData: CreateRegularBookingData;
  userId?: number;
  eventTimeZone?: string;
};

type BookingFormData = {
  booker: {
    name: string | { firstName: string; lastName?: string };
    phoneNumber: string | null;
    email: string;
    timeZone: string;
    smsReminderNumber: string | null;
    language: string | null;
  };
  rawBookingLocation: string;
  additionalNotes: string;
  startTime: string;
  endTime: string;
  rawGuests: string[] | null;
  responses: BookingData["responses"];
  rescheduleData: {
    reason: string | null;
    rawUid: string | null;
    rescheduledBy: string | null;
  };
  customInputs: CreateRegularBookingData["customInputs"];
  calEventResponses: BookingData["calEventResponses"];
  calEventUserFieldsResponses: BookingData["calEventUserFieldsResponses"];
  metadata: CreateRegularBookingData["metadata"];
  creationSource: CreateRegularBookingData["creationSource"];
  tracking: CreateRegularBookingData["tracking"];
};

type PreparedBookingData = {
  eventType: EnrichedEventType;
  bookingFormData: BookingFormData;
  loggedInUser: {
    id: number | null;
  };
  routingData: {
    routedTeamMemberIds: number[] | null;
    reroutingFormResponses: CreateRegularBookingData["reroutingFormResponses"] | null;
    routingFormResponseId: number | null;
    rawTeamMemberEmail: string | null;
    crmRecordId: string | null;
    crmOwnerRecordType: string | null;
    crmAppSlug: string | null;
    skipContactOwner: boolean | null;
    contactOwnerEmail: string | null;
  };
  bookingMeta: {
    areCalendarEventsEnabled: boolean;
    skipAvailabilityCheck: boolean;
    skipEventLimitsCheck: boolean;
    skipCalendarSyncTaskCreation: boolean;
    appsStatus: AppsStatus[] | undefined;
    platform: {
      clientId: string | null;
      rescheduleUrl: string | null;
      cancelUrl: string | null;
      bookingUrl: string | null;
      bookingLocation: string | null;
    } | null;
  };
  config: BookingFlowConfig;
  hashedBookingLinkData: {
    hasHashedBookingLink: boolean;
    hashedLink: string | null;
  } | null;
  recurringBookingData: {
    luckyUsers: number[];
    recurringCount: number;
    allRecurringDates: { start: string; end?: string }[] | null;
    isFirstRecurringSlot: boolean;
    numSlotsToCheckForAvailability: number;
    recurringEventId: string | null;
    thirdPartyRecurringEventId: string | null;
  };
  teamOrUserSlug: string | string[] | null;
  seatsData: {
    bookingUid: string | null;
  };
  spamCheckService: ReturnType<typeof getSpamCheckService>;
  eventOrganizationId: number | null;
};

/**
 * TODO: Ideally we should send organizationId directly to handleNewBooking.
 * webapp can derive from domain and API V2 knows it already through its endpoint URL
 */
async function getEventOrganizationId({
  eventType,
}: {
  eventType: {
    userId: number | null;
    team: {
      parentId: number | null;
    } | null;
    parent: {
      team: {
        parentId: number | null;
      } | null;
    } | null;
  };
}) {
  let eventOrganizationId: number | null = null;
  const team = eventType.team ?? eventType.parent?.team ?? null;
  eventOrganizationId = team?.parentId ?? null;

  if (eventOrganizationId) {
    return eventOrganizationId;
  }

  if (eventType.userId) {
    // TODO: Moving it to instance based access through DI in a followup
    const profile = await ProfileRepository.findFirstForUserId({
      userId: eventType.userId,
    });
    eventOrganizationId = profile?.organizationId ?? null;
    return eventOrganizationId;
  }

  return eventOrganizationId;
}

export interface IBookingDataPreparationServiceDependencies {
  log: typeof logger;
  bookingRepository: BookingRepository;
  userRepository: UserRepository;
}

export class BookingDataPreparationService {
  private readonly log: typeof logger;
  private readonly bookingRepository: BookingRepository;
  private readonly userRepository: UserRepository;

  constructor(deps: IBookingDataPreparationServiceDependencies) {
    this.log = deps.log;
    this.bookingRepository = deps.bookingRepository;
    this.userRepository = deps.userRepository;
  }

  /**
   * Fetches external data required for booking preparation.
   * This includes event type data and organization information.
   */
  private async fetch(context: {
    eventTypeId: number;
    eventTypeSlug: string;
    rawBookingData: CreateRegularBookingData;
    bookingDataSchemaGetter: BookingDataSchemaGetter;
  }): Promise<{
    eventType: EnrichedEventType;
    bookingData: BookingData;
    eventOrganizationId: number | null;
  }> {
    const { eventTypeId, eventTypeSlug, rawBookingData, bookingDataSchemaGetter } = context;

    const eventType = await getEventType({
      eventTypeId,
      eventTypeSlug,
    });

    if (!eventType) {
      throw new Error("Event type not found");
    }

    const user = eventType.users.find((user) => user.id === eventType.userId);
    const userSchedule = user?.schedules.find((schedule) => schedule.id === user?.defaultScheduleId);
    const eventTimeZone = eventType.schedule?.timeZone ?? userSchedule?.timeZone ?? null;

    const enrichedEventType: EnrichedEventType = {
      ...eventType,
      isTeamEventType:
        !!eventType.schedulingType && ["COLLECTIVE", "ROUND_ROBIN"].includes(eventType.schedulingType),
      timeZone: eventTimeZone,
    };

    const bookingDataSchema = bookingDataSchemaGetter({
      view: rawBookingData.rescheduleUid ? "reschedule" : "booking",
      bookingFields: enrichedEventType.bookingFields,
    });

    const bookingData = await getBookingData({
      reqBody: rawBookingData,
      eventType: enrichedEventType,
      schema: bookingDataSchema,
    });

    const eventOrganizationId = await getEventOrganizationId({
      eventType: enrichedEventType,
    });

    return {
      eventType: enrichedEventType,
      bookingData,
      eventOrganizationId,
    };
  }

  /**
   * Transforms fetched data into the structured PreparedBookingData format.
   * This is a pure transformation with no side effects or external data fetching.
   */
  private transform(context: {
    eventType: EnrichedEventType;
    bookingData: BookingData;
    eventOrganizationId: number | null;
    rawBookingMeta: CreateBookingMeta;
    loggedInUserId: number | null;
  }): PreparedBookingData {
    const { eventType, bookingData, eventOrganizationId, rawBookingMeta, loggedInUserId } = context;

    const bookingFormData: BookingFormData = {
      booker: {
        name: bookingData.name,
        email: bookingData.email,
        phoneNumber: bookingData.attendeePhoneNumber ?? null,
        timeZone: bookingData.timeZone,
        smsReminderNumber: bookingData.smsReminderNumber ?? null,
        language: bookingData.language ?? null,
      },
      rawBookingLocation: bookingData.location,
      additionalNotes: bookingData.notes ?? "",
      startTime: bookingData.start,
      endTime: bookingData.end,
      rawGuests: bookingData.guests ?? null,
      rescheduleData: {
        reason: bookingData.rescheduleReason ?? null,
        rawUid: bookingData.rescheduleUid ?? null,
        rescheduledBy: bookingData.rescheduledBy ?? null,
      },
      responses: bookingData.responses,
      calEventResponses: bookingData.calEventResponses,
      calEventUserFieldsResponses: bookingData.calEventUserFieldsResponses,
      customInputs: bookingData.customInputs,
      metadata: bookingData.metadata,
      creationSource: bookingData.creationSource,
      tracking: bookingData.tracking,
    };

    const bookingEventUserOrTeamSlug = bookingData.user;

    const spamCheckService = getSpamCheckService();

    const _shouldIgnoreContactOwner = shouldIgnoreContactOwner({
      skipContactOwner: bookingData.skipContactOwner ?? null,
      rescheduleUid: bookingData.rescheduleUid ?? null,
      routedTeamMemberIds: bookingData.routedTeamMemberIds ?? null,
    });
    const contactOwnerEmail = _shouldIgnoreContactOwner ? null : bookingData.teamMemberEmail;

    return {
      eventType,
      bookingFormData,
      loggedInUser: {
        id: loggedInUserId,
      },
      routingData: {
        routedTeamMemberIds: bookingData.routedTeamMemberIds ?? null,
        reroutingFormResponses: bookingData.reroutingFormResponses,
        routingFormResponseId: bookingData.routingFormResponseId ?? null,
        rawTeamMemberEmail: bookingData.teamMemberEmail ?? null,
        crmRecordId: bookingData.crmRecordId ?? null,
        crmOwnerRecordType: bookingData.crmOwnerRecordType ?? null,
        crmAppSlug: bookingData.crmAppSlug ?? null,
        skipContactOwner: bookingData.skipContactOwner ?? null,
        contactOwnerEmail: contactOwnerEmail ?? null,
      },
      bookingMeta: {
        appsStatus: bookingData.appsStatus,
        areCalendarEventsEnabled: rawBookingMeta.areCalendarEventsEnabled ?? true,
        platform:
          rawBookingMeta.platformClientId ||
          rawBookingMeta.platformRescheduleUrl ||
          rawBookingMeta.platformCancelUrl ||
          rawBookingMeta.platformBookingUrl ||
          rawBookingMeta.platformBookingLocation
            ? {
                clientId: rawBookingMeta.platformClientId ?? null,
                rescheduleUrl: rawBookingMeta.platformRescheduleUrl ?? null,
                cancelUrl: rawBookingMeta.platformCancelUrl ?? null,
                bookingUrl: rawBookingMeta.platformBookingUrl ?? null,
                bookingLocation: rawBookingMeta.platformBookingLocation ?? null,
              }
            : null,
        skipAvailabilityCheck: rawBookingMeta.skipAvailabilityCheck ?? false,
        skipEventLimitsCheck: rawBookingMeta.skipEventLimitsCheck ?? false,
        skipCalendarSyncTaskCreation: rawBookingMeta.skipCalendarSyncTaskCreation ?? false,
      },
      config: {
        isDryRun: !!bookingData._isDryRun,
        noEmail: !!rawBookingMeta.noEmail,
        hostname: rawBookingMeta.hostname ?? null,
        forcedSlug: rawBookingMeta.forcedSlug ?? null,
        useCacheIfEnabled: bookingData._shouldServeCache ?? false,
      },
      hashedBookingLinkData: {
        hasHashedBookingLink: bookingData.hasHashedBookingLink ?? false,
        hashedLink: bookingData.hashedLink ?? null,
      },
      recurringBookingData: {
        luckyUsers: bookingData.luckyUsers ?? [],
        allRecurringDates: bookingData.allRecurringDates ?? null,
        recurringCount: bookingData.recurringCount ?? 0,
        isFirstRecurringSlot: bookingData.isFirstRecurringSlot ?? false,
        numSlotsToCheckForAvailability: bookingData.numSlotsToCheckForAvailability ?? 0,
        recurringEventId: bookingData.recurringEventId ?? null,
        thirdPartyRecurringEventId: bookingData.thirdPartyRecurringEventId ?? null,
      },
      seatsData: {
        bookingUid: bookingData.bookingUid ?? null,
      },
      teamOrUserSlug: bookingEventUserOrTeamSlug ?? null,
      spamCheckService,
      eventOrganizationId,
    };
  }

  /**
   * Enriches the booking data by fetching event type and transforming raw data into a structured format.
   * This method orchestrates the fetch and transform phases.
   */
  async enrich(
    context: {
      rawBookingData: CreateRegularBookingData;
      rawBookingMeta: CreateBookingMeta;
      eventType: {
        id: number;
        slug: string;
      };
      loggedInUserId: number | null;
    },
    bookingDataSchemaGetter: BookingDataSchemaGetter
  ): Promise<PreparedBookingData> {
    const { rawBookingData, eventType: _eventType, loggedInUserId, rawBookingMeta } = context;

    const fetchedData = await this.fetch({
      eventTypeId: _eventType.id,
      eventTypeSlug: _eventType.slug,
      rawBookingData,
      bookingDataSchemaGetter,
    });

    return this.transform({
      eventType: fetchedData.eventType,
      bookingData: fetchedData.bookingData,
      eventOrganizationId: fetchedData.eventOrganizationId,
      rawBookingMeta,
      loggedInUserId,
    });
  }

  /**
   * Validates the enriched booking data and initiates side effects like spam checking.
   */
  async validate(preparedData: PreparedBookingData, rawBookingData: CreateRegularBookingData): Promise<void> {
    const { eventType, bookingFormData, loggedInUser, spamCheckService, eventOrganizationId } = preparedData;
    const {
      booker: { email: bookerEmail, timeZone: bookerTimeZone },
      startTime,
      endTime,
    } = bookingFormData;

    spamCheckService.startCheck({ email: bookerEmail, organizationId: eventOrganizationId });

    await checkIfBookerEmailIsBlocked({
      loggedInUserId: loggedInUser.id ?? undefined,
      bookerEmail,
      verificationCode: rawBookingData.verificationCode,
      userRepository: this.userRepository,
    });

    if (!rawBookingData.rescheduleUid) {
      await checkActiveBookingsLimitForBooker({
        eventTypeId: eventType.id,
        maxActiveBookingsPerBooker: eventType.maxActiveBookingsPerBooker,
        bookerEmail,
        offerToRescheduleLastBooking: eventType.maxActiveBookingPerBookerOfferReschedule,
        bookingRepository: this.bookingRepository,
      });
    }

    if (eventType.requiresBookerEmailVerification) {
      const verificationCode = rawBookingData.verificationCode;
      if (!verificationCode) {
        throw new HttpError({
          statusCode: 400,
          message: "email_verification_required",
        });
      }

      try {
        await verifyCodeUnAuthenticated(bookerEmail, verificationCode);
      } catch {
        throw new HttpError({
          statusCode: 400,
          message: "invalid_verification_code",
        });
      }
    }

    await validateBookingTimeIsNotOutOfBounds<typeof eventType>(
      startTime,
      bookerTimeZone,
      eventType,
      eventType.timeZone,
      this.log
    );

    validateEventLength({
      reqBodyStart: startTime,
      reqBodyEnd: endTime,
      eventTypeMultipleDuration: eventType.metadata?.multipleDuration,
      eventTypeLength: eventType.length,
      logger: this.log,
    });
  }

  /**
   * Validates and enriches the booking data and returns in a well defined format.
   */
  async prepare(
    context: {
      rawBookingData: CreateRegularBookingData;
      rawBookingMeta: CreateBookingMeta;
      eventType: {
        id: number;
        slug: string;
      };
      loggedInUserId: number | null;
    },
    bookingDataSchemaGetter: BookingDataSchemaGetter
  ): Promise<PreparedBookingData> {
    const enrichedData = await this.enrich(context, bookingDataSchemaGetter);
    await this.validate(enrichedData, context.rawBookingData);
    return enrichedData;
  }
}
