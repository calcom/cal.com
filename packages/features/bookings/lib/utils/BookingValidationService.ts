import { shouldIgnoreContactOwner } from "@calcom/lib/bookings/routing/utils";
import type logger from "@calcom/lib/logger";

import type { BookingDataSchemaGetter, CreateBookingMeta, CreateRegularBookingData } from "../dto/types";
import { checkActiveBookingsLimitForBooker } from "../handleNewBooking/checkActiveBookingsLimitForBooker";
import { checkIfBookerEmailIsBlocked } from "../handleNewBooking/checkIfBookerEmailIsBlocked";
import { getBookingData } from "../handleNewBooking/getBookingData";
import { getEventType } from "../handleNewBooking/getEventType";
import type { getEventTypeResponse } from "../handleNewBooking/getEventTypesFromDB";
import { createLoggerWithEventDetails } from "../handleNewBooking/logger";
import { validateBookingTimeIsNotOutOfBounds } from "../handleNewBooking/validateBookingTimeIsNotOutOfBounds";
import { validateEventLength } from "../handleNewBooking/validateEventLength";

export type EnrichmentInput = {
  eventTypeId: number;
  eventTypeSlug: string;
};

export type EnrichmentOutput = {
  eventType: getEventTypeResponse;
};

export type ValidationInputContext = EnrichmentInput & {
  rawBookingData: CreateRegularBookingData;
  userId?: number;
  eventTimeZone?: string;
};

export type BookingFormData = {
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
  responses: CreateRegularBookingData["responses"];
  rescheduleData: {
    reason: string | null;
    rawUid: string | null;
    rescheduledBy: string | null;
  };
  customInputs: CreateRegularBookingData["customInputs"];
  calEventResponses: CreateRegularBookingData["calEventResponses"];
  calEventUserFieldsResponses: CreateRegularBookingData["calEventUserFieldsResponses"];
  metadata: CreateRegularBookingData["metadata"];
  creationSource: CreateRegularBookingData["creationSource"];
  tracking: CreateRegularBookingData["tracking"];
};
export type ValidationOutput = {
  eventType: getEventTypeResponse;
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
    platform: {
      clientId: string | null;
      rescheduleUrl: string | null;
      cancelUrl: string | null;
      bookingUrl: string | null;
      bookingLocation: string | null;
    } | null;
  };
  config: {
    isDryRun: boolean;
    useCacheIfEnabled: boolean;
    noEmail: boolean;
    hostname: string | null;
    forcedSlug: string | null;
  };
  hashedBookingLinkData: {
    hasHashedBookingLink: boolean;
    hashedLink: string | null;
  } | null;
  recurringBookingData: {
    luckyUsers: number[];
    recurringCount: number;
    allRecurringDates: { start: string; end: string }[] | null;
    isFirstRecurringSlot: boolean;
    numSlotsToCheckForAvailability: number;
    recurringEventId: string | null;
    thirdPartyRecurringEventId: string | null;
  };
  teamOrUserSlug: string | string[] | null;
  seatsData: {
    bookingUid: string | null;
  };
};

export interface IBookingValidationServiceDependencies {
  log: typeof logger;
}

export class BookingValidationService {
  constructor(private readonly deps: IBookingValidationServiceDependencies) {
    this.deps = deps;
  }

  private async enrich({ eventTypeId, eventTypeSlug }: EnrichmentInput): Promise<EnrichmentOutput> {
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

    return {
      eventType: {
        ...eventType,
        timeZone: eventTimeZone,
      },
    };
  }

  async validate(
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
  ): Promise<ValidationOutput> {
    const { rawBookingData, eventType: _eventType, loggedInUserId, rawBookingMeta } = context;
    const { eventType } = await this.enrich({
      eventTypeId: _eventType.id,
      eventTypeSlug: _eventType.slug,
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

    const {
      booker: { email: bookerEmail, timeZone: bookerTimeZone },
      startTime,
      endTime,
    } = bookingFormData;

    const loggerWithEventDetails = createLoggerWithEventDetails(
      eventType.id,
      bookingEventUserOrTeamSlug,
      eventType.slug
    );

    await validateBookingTimeIsNotOutOfBounds<typeof eventType>(
      startTime,
      bookerTimeZone,
      eventType,
      eventType.timeZone,
      loggerWithEventDetails
    );

    validateEventLength({
      reqBodyStart: startTime,
      reqBodyEnd: endTime,
      eventTypeMultipleDuration: eventType.metadata?.multipleDuration,
      eventTypeLength: eventType.length,
      logger: loggerWithEventDetails,
    });

    await checkIfBookerEmailIsBlocked({ loggedInUserId: loggedInUserId ?? undefined, bookerEmail });

    if (!rawBookingData.rescheduleUid) {
      await checkActiveBookingsLimitForBooker({
        eventTypeId: eventType.id,
        maxActiveBookingsPerBooker: eventType.maxActiveBookingsPerBooker,
        bookerEmail,
        offerToRescheduleLastBooking: eventType.maxActiveBookingPerBookerOfferReschedule,
      });
    }

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
        areCalendarEventsEnabled: !!rawBookingMeta.areCalendarEventsEnabled,
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
    };
  }
}
