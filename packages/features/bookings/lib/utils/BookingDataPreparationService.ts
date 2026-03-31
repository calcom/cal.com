import { verifyCodeUnAuthenticated } from "@calcom/features/auth/lib/verifyCodeUnAuthenticated";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { getSpamCheckService } from "@calcom/features/di/watchlist/containers/SpamCheckService.container";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { shouldIgnoreContactOwner } from "@calcom/lib/bookings/routing/utils";
import { ErrorWithCode } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import type { BookingDataSchemaGetter, CreateBookingMeta, CreateRegularBookingData } from "../dto/types";
import { checkActiveBookingsLimitForBooker } from "../handleNewBooking/checkActiveBookingsLimitForBooker";
import { checkIfBookerEmailIsBlocked } from "../handleNewBooking/checkIfBookerEmailIsBlocked";
import { getBookingData } from "../handleNewBooking/getBookingData";
import { getEventType } from "../handleNewBooking/getEventType";
import { validateBookingTimeIsNotOutOfBounds } from "../handleNewBooking/validateBookingTimeIsNotOutOfBounds";
import { validateEventLength } from "../handleNewBooking/validateEventLength";
import { validateRescheduleRestrictions } from "../handleNewBooking/validateRescheduleRestrictions";
import type {
  BookingData,
  BookingFormData,
  EnrichedEventType,
  IBookingDataPreparationServiceDependencies,
  PreparedBookingData,
} from "./BookingDataPreparationService.types";

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
}): Promise<number | null> {
  let eventOrganizationId: number | null = null;
  const team = eventType.team ?? eventType.parent?.team ?? null;
  eventOrganizationId = team?.parentId ?? null;

  if (eventOrganizationId) {
    return eventOrganizationId;
  }

  if (eventType.userId) {
    const profile = await ProfileRepository.findFirstForUserId({
      userId: eventType.userId,
    });
    eventOrganizationId = profile?.organizationId ?? null;
    return eventOrganizationId;
  }

  return eventOrganizationId;
}

export type {
  BookingData,
  BookingFormData,
  EnrichedEventType,
  EnrichmentInput,
  EnrichmentOutput,
  IBookingDataPreparationServiceDependencies,
  PreparedBookingData,
  ValidationInputContext,
} from "./BookingDataPreparationService.types";

export class BookingDataPreparationService {
  private readonly log: IBookingDataPreparationServiceDependencies["log"];
  private readonly bookingRepository: BookingRepository;
  private readonly userRepository: UserRepository;

  constructor(deps: IBookingDataPreparationServiceDependencies) {
    this.log = deps.log;
    this.bookingRepository = deps.bookingRepository;
    this.userRepository = deps.userRepository;
  }

  private async fetch(context: {
    eventTypeId: number;
    eventTypeSlug: string | undefined;
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
      throw new HttpError({ statusCode: 404, message: "event_type_not_found" });
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

    const [bookingData, eventOrganizationId] = await Promise.all([
      getBookingData({
        reqBody: rawBookingData,
        eventType: enrichedEventType,
        schema: bookingDataSchema,
      }),
      getEventOrganizationId({
        eventType: enrichedEventType,
      }),
    ]);

    return {
      eventType: enrichedEventType,
      bookingData,
      eventOrganizationId,
    };
  }

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
      bookingData,
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
        skipBookingTimeOutOfBoundsCheck: rawBookingMeta.skipBookingTimeOutOfBoundsCheck ?? false,
        skipCalendarSyncTaskCreation: rawBookingMeta.skipCalendarSyncTaskCreation ?? false,
      },
      config: {
        isDryRun: !!bookingData._isDryRun,
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

  async enrich(
    context: {
      rawBookingData: CreateRegularBookingData;
      rawBookingMeta: CreateBookingMeta;
      eventType: {
        id: number;
        slug: string | undefined;
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

  async validate(preparedData: PreparedBookingData, rawBookingData: CreateRegularBookingData): Promise<void> {
    const { eventType, bookingFormData, loggedInUser } = preparedData;
    const {
      booker: { email: bookerEmail, timeZone: bookerTimeZone },
      startTime,
      endTime,
    } = bookingFormData;

    if (eventType.teamId) {
      const { getDunningGuard } = await import("@calcom/features/ee/billing/di/containers/Billing");
      const dunningGuard = getDunningGuard();
      const billingTeamId = eventType.team?.parentId ?? eventType.teamId;
      const dunningCheck = await dunningGuard.canPerformAction(billingTeamId, "CREATE_BOOKING");
      if (!dunningCheck.allowed) {
        throw ErrorWithCode.Factory.Forbidden("team_is_unpublished");
      }
    }

    await validateRescheduleRestrictions({
      rescheduleUid: rawBookingData.rescheduleUid,
      userId: loggedInUser.id,
      eventType: {
        seatsPerTimeSlot: eventType.seatsPerTimeSlot,
        minimumRescheduleNotice: eventType.minimumRescheduleNotice ?? null,
      },
    });

    if (eventType.seatsPerTimeSlot && eventType.recurringEvent) {
      throw new HttpError({ statusCode: 400, message: "recurring_event_seats_error" });
    }

    try {
      await checkIfBookerEmailIsBlocked({
        loggedInUserId: loggedInUser.id ?? undefined,
        bookerEmail,
        verificationCode: rawBookingData.verificationCode,
        isReschedule: !!rawBookingData.rescheduleUid,
        userRepository: this.userRepository,
      });
    } catch (error) {
      if (error instanceof ErrorWithCode) {
        throw new HttpError({ statusCode: 403, message: error.message });
      }
      throw error;
    }

    if (!rawBookingData.rescheduleUid) {
      await checkActiveBookingsLimitForBooker({
        eventTypeId: eventType.id,
        maxActiveBookingsPerBooker: eventType.maxActiveBookingsPerBooker,
        bookerEmail,
        offerToRescheduleLastBooking: eventType.maxActiveBookingPerBookerOfferReschedule,
        bookingRepository: this.bookingRepository,
      });
    }

    if (eventType.requiresBookerEmailVerification && !rawBookingData.rescheduleUid) {
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

    if (!preparedData.bookingMeta.skipBookingTimeOutOfBoundsCheck) {
      await validateBookingTimeIsNotOutOfBounds<typeof eventType>(
        startTime,
        bookerTimeZone,
        eventType,
        eventType.timeZone,
        this.log
      );
    }

    validateEventLength({
      reqBodyStart: startTime,
      reqBodyEnd: endTime,
      eventTypeMultipleDuration: eventType.metadata?.multipleDuration,
      eventTypeLength: eventType.length,
      logger: this.log,
    });
  }

  async prepare(
    context: {
      rawBookingData: CreateRegularBookingData;
      rawBookingMeta: CreateBookingMeta;
      eventType: {
        id: number;
        slug: string | undefined;
      };
      loggedInUserId: number | null;
    },
    bookingDataSchemaGetter: BookingDataSchemaGetter
  ): Promise<PreparedBookingData> {
    const enrichedData = await this.enrich(context, bookingDataSchemaGetter);

    enrichedData.spamCheckService.startCheck({
      email: enrichedData.bookingFormData.booker.email,
      organizationId: enrichedData.eventOrganizationId,
    });

    await this.validate(enrichedData, context.rawBookingData);
    return enrichedData;
  }
}
