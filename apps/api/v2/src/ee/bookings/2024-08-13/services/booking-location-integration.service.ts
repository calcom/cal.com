import type { BookingWithUserAndEventDetails, CalendarEvent } from "@calcom/platform-libraries";
import { BookingReferenceRepository, updateEvent } from "@calcom/platform-libraries";
import { makeUserActor } from "@calcom/platform-libraries/bookings";
import { createMeeting, FAKE_DAILY_CREDENTIAL } from "@calcom/platform-libraries/conferencing";
import type { Integration_2024_08_13 } from "@calcom/platform-types";
import type {
  BookingOutput_2024_08_13,
  GetRecurringSeatedBookingOutput_2024_08_13,
  GetSeatedBookingOutput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
} from "@calcom/platform-types/bookings/2024-08-13/outputs/booking.output";
import type { Booking, Prisma } from "@calcom/prisma/client";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { BookingLocationCalendarSyncService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/booking-location-calendar-sync.service";
import { BookingLocationCredentialService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/booking-location-credential.service";
import { BookingVideoService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/booking-video.service";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { InputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/input.service";
import { apiToInternalintegrationsMapping } from "@/ee/event-types/event-types_2024_06_14/transformers/api-to-internal/locations";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { BookingEventHandlerService } from "@/lib/services/booking-event-handler.service";
import type { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";

export type BookingLocationResponse =
  | BookingOutput_2024_08_13
  | RecurringBookingOutput_2024_08_13
  | RecurringBookingOutput_2024_08_13[]
  | GetSeatedBookingOutput_2024_08_13
  | GetRecurringSeatedBookingOutput_2024_08_13
  | GetRecurringSeatedBookingOutput_2024_08_13[];

export type BookingForLocationUpdate = Pick<
  Booking,
  "id" | "uid" | "userId" | "eventTypeId" | "location" | "responses" | "metadata"
>;

type BookingWithRequiredUser = Omit<BookingWithUserAndEventDetails, "user"> & {
  user: NonNullable<BookingWithUserAndEventDetails["user"]>;
};

function bookingHasUser(booking: BookingWithUserAndEventDetails | null): booking is BookingWithRequiredUser {
  return booking !== null && booking.user !== null;
}

export type IntegrationHandlerContext = {
  existingBooking: BookingForLocationUpdate;
  booking: BookingWithRequiredUser;
  integrationSlug: string;
  internalLocation: string;
  user: ApiAuthGuardUser;
  existingBookingHost: { organizationId: number | null } | null;
  inputLocation: { type: "integration"; integration: Integration_2024_08_13 };
};

@Injectable()
export class BookingLocationIntegrationService_2024_08_13 {
  private readonly logger = new Logger("BookingLocationIntegrationService_2024_08_13");

  constructor(
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly bookingsService: BookingsService_2024_08_13,
    private readonly inputService: InputBookingsService_2024_08_13,
    private readonly bookingVideoService: BookingVideoService_2024_08_13,
    private readonly bookingEventHandlerService: BookingEventHandlerService,
    private readonly featuresRepository: PrismaFeaturesRepository,
    private readonly calendarSyncService: BookingLocationCalendarSyncService_2024_08_13,
    private readonly credentialService: BookingLocationCredentialService_2024_08_13
  ) {}

  async handleIntegrationLocationUpdate(
    existingBooking: BookingForLocationUpdate,
    inputLocation: { type: "integration"; integration: Integration_2024_08_13 },
    user: ApiAuthGuardUser,
    existingBookingHost: { organizationId: number | null } | null
  ): Promise<BookingLocationResponse> {
    if (!existingBookingHost) {
      throw new NotFoundException(`No user found for booking with uid=${existingBooking.uid}`);
    }

    const integrationSlug = inputLocation.integration;
    const internalLocation =
      apiToInternalintegrationsMapping[integrationSlug as keyof typeof apiToInternalintegrationsMapping];

    if (!internalLocation) {
      throw new BadRequestException(`Unsupported integration: ${integrationSlug}`);
    }

    const booking = await this.bookingsRepository.getBookingByIdWithUserAndEventDetails(existingBooking.id);
    if (!bookingHasUser(booking)) {
      throw new NotFoundException(`Could not load booking details for uid=${existingBooking.uid}`);
    }

    const ctx: IntegrationHandlerContext = {
      existingBooking,
      booking,
      integrationSlug,
      internalLocation,
      user,
      existingBookingHost,
      inputLocation,
    };

    switch (integrationSlug) {
      case "google-meet":
        return this.handleGoogleMeetLocation(ctx);
      case "office365-video":
        return this.handleMSTeamsLocation(ctx);
      case "cal-video":
        return this.handleCalVideoLocation(ctx);
      default:
        // all other integrations (Zoom, Webex, etc.) use VideoApiAdapter
        return this.handleVideoApiIntegration(ctx);
    }
  }

  private async handleGoogleMeetLocation(ctx: IntegrationHandlerContext): Promise<BookingLocationResponse> {
    const hasGoogleCalendar = ctx.booking.references.some(
      (ref) => ref.type.includes("google_calendar") && !ref.deleted
    );

    if (!hasGoogleCalendar) {
      this.logger.log(`Google Meet requested but no Google Calendar found. Falling back to Cal Video.`);
      return this.handleCalVideoLocation({
        ...ctx,
        integrationSlug: "cal-video",
        internalLocation: "integrations:daily",
      });
    }

    return this.handleCalendarBasedIntegration(ctx, "google_calendar");
  }

  private async handleMSTeamsLocation(ctx: IntegrationHandlerContext): Promise<BookingLocationResponse> {
    const hasOffice365Calendar = ctx.booking.references.some(
      (ref) => ref.type.includes("office365_calendar") && !ref.deleted
    );

    if (hasOffice365Calendar) {
      return this.handleCalendarBasedIntegration(ctx, "office365_calendar");
    }

    return this.handleVideoApiIntegration(ctx);
  }

  private async handleCalVideoLocation(ctx: IntegrationHandlerContext): Promise<BookingLocationResponse> {
    const credential = { ...FAKE_DAILY_CREDENTIAL };

    await this.bookingVideoService.deleteOldVideoMeetingIfNeeded(ctx.existingBooking.id);

    const evt = await this.calendarSyncService.buildCalEventFromBookingData(
      ctx.booking,
      ctx.internalLocation,
      credential.id
    );
    const meetingResult = await createMeeting(credential, evt);

    if (!meetingResult.createdEvent) {
      this.logger.error(
        `Failed to create Cal Video meeting`,
        JSON.stringify({ success: meetingResult.success, type: meetingResult.type })
      );
      throw new BadRequestException(
        `Failed to create Cal Video meeting. Please ensure DAILY_API_KEY is set and the daily-video app is enabled.`
      );
    }

    const createdEvent = meetingResult.createdEvent;
    const videoCallUrl = createdEvent.url;
    const bookingLocation = videoCallUrl || ctx.internalLocation;

    // FAKE_DAILY_CREDENTIAL has id: 0, so we don't include credentialId
    const newReference = {
      type: credential.type,
      uid: createdEvent.id?.toString() || "",
      meetingId: createdEvent.id?.toString(),
      meetingPassword: createdEvent.password,
      meetingUrl: createdEvent.url,
    };

    await BookingReferenceRepository.replaceBookingReferences({
      bookingId: ctx.existingBooking.id,
      newReferencesToCreate: [newReference],
    });

    if (videoCallUrl) {
      await this.calendarSyncService.syncCalendarEvent(ctx.existingBooking.id, bookingLocation);
    }

    return this.updateBookingWithVideoLocation(ctx, videoCallUrl, bookingLocation, evt);
  }

  private async handleVideoApiIntegration(ctx: IntegrationHandlerContext): Promise<BookingLocationResponse> {
    const credential = await this.bookingVideoService.findVideoCredentialForIntegration(
      ctx.integrationSlug,
      ctx.booking.user?.credentials || []
    );

    if (!credential) {
      throw new BadRequestException(
        `Video integration "${ctx.integrationSlug}" is not connected. Please connect the integration in your settings first.`
      );
    }

    await this.bookingVideoService.deleteOldVideoMeetingIfNeeded(ctx.existingBooking.id);

    const evt = await this.calendarSyncService.buildCalEventFromBookingData(
      ctx.booking,
      ctx.internalLocation,
      credential.id
    );
    const meetingResult = await createMeeting(credential, evt);

    if (!meetingResult.createdEvent) {
      this.logger.error(
        `Failed to create video meeting with ${ctx.integrationSlug}`,
        JSON.stringify({ success: meetingResult.success, type: meetingResult.type })
      );
      throw new BadRequestException(
        `Failed to create video meeting with ${ctx.integrationSlug}. Please ensure the integration is properly configured.`
      );
    }

    const createdEvent = meetingResult.createdEvent;
    const videoCallUrl = createdEvent.url;
    const bookingLocation = videoCallUrl || ctx.internalLocation;

    const newReference = {
      type: credential.type,
      uid: createdEvent.id?.toString() || "",
      meetingId: createdEvent.id?.toString(),
      meetingPassword: createdEvent.password,
      meetingUrl: createdEvent.url,
      // only include credentialId if it's a valid ID (not 0)
      ...(credential.id > 0 ? { credentialId: credential.id } : {}),
    };

    await BookingReferenceRepository.replaceBookingReferences({
      bookingId: ctx.existingBooking.id,
      newReferencesToCreate: [newReference],
    });

    if (videoCallUrl) {
      await this.calendarSyncService.syncCalendarEvent(ctx.existingBooking.id, bookingLocation);
    }

    return this.updateBookingWithVideoLocation(ctx, videoCallUrl, bookingLocation, evt);
  }

  private async handleCalendarBasedIntegration(
    ctx: IntegrationHandlerContext,
    requiredCalendarType: string
  ): Promise<BookingLocationResponse> {
    const calendarReference = ctx.booking.references.find(
      (ref) => ref.type.includes(requiredCalendarType) && !ref.deleted
    );

    if (!calendarReference) {
      throw new BadRequestException(
        `No ${requiredCalendarType.replace("_", " ")} event found for this booking. ${ctx.integrationSlug} requires a ${requiredCalendarType.replace("_", " ")} event to generate the meeting link.`
      );
    }

    const calendarCredential = await this.credentialService.getCredentialForReference(
      calendarReference,
      ctx.booking.user?.credentials || []
    );

    if (!calendarCredential) {
      throw new BadRequestException(
        `Could not find calendar credentials for ${ctx.integrationSlug}. Please reconnect your calendar.`
      );
    }

    const evt = await this.calendarSyncService.buildCalEventFromBookingData(
      ctx.booking,
      ctx.internalLocation,
      null
    );

    if (ctx.integrationSlug === "google-meet") {
      evt.conferenceData = {
        createRequest: {
          requestId: `${ctx.booking.uid}-meet`,
        },
      };
    }

    const updateResult = await updateEvent(
      calendarCredential,
      evt,
      calendarReference.uid,
      calendarReference.externalCalendarId
    );

    let meetingUrl: string | undefined;
    if (updateResult.updatedEvent) {
      const updatedEvent = Array.isArray(updateResult.updatedEvent)
        ? updateResult.updatedEvent[0]
        : updateResult.updatedEvent;
      meetingUrl = updatedEvent?.hangoutLink || updatedEvent?.url;
    }

    const bookingLocation = meetingUrl || ctx.internalLocation;

    const updatedMetadata = this.buildUpdatedMetadata(ctx.existingBooking.metadata, meetingUrl);

    const updatedBooking = await this.bookingsRepository.updateBooking(ctx.existingBooking.uid, {
      location: bookingLocation,
      metadata: updatedMetadata as Prisma.InputJsonValue,
    });

    await this.emitLocationChangeEvents(ctx, bookingLocation, evt);

    return this.bookingsService.getBooking(updatedBooking.uid, ctx.user);
  }

  private async updateBookingWithVideoLocation(
    ctx: IntegrationHandlerContext,
    videoCallUrl: string | undefined,
    bookingLocation: string,
    evt: CalendarEvent
  ): Promise<BookingLocationResponse> {
    const updatedMetadata = this.buildUpdatedMetadata(ctx.existingBooking.metadata, videoCallUrl);

    const bookingFieldsLocation = this.inputService.transformLocation(ctx.inputLocation);
    const responses = (ctx.existingBooking.responses || {}) as Record<string, unknown>;
    const { location: _existingLocation, ...rest } = responses;

    const updatedBooking = await this.bookingsRepository.updateBooking(ctx.existingBooking.uid, {
      location: bookingLocation,
      responses: { ...rest, location: bookingFieldsLocation },
      metadata: updatedMetadata as Prisma.InputJsonValue,
    });

    await this.emitLocationChangeEvents(ctx, bookingLocation, evt);

    return this.bookingsService.getBooking(updatedBooking.uid, ctx.user);
  }

  private buildUpdatedMetadata(
    existingMetadata: unknown,
    videoCallUrl: string | undefined
  ): Record<string, unknown> {
    return {
      ...((existingMetadata || {}) as Record<string, unknown>),
      videoCallUrl,
    };
  }

  private async emitLocationChangeEvents(
    ctx: IntegrationHandlerContext,
    bookingLocation: string,
    evt: CalendarEvent
  ): Promise<void> {
    const organizationId = ctx.existingBookingHost?.organizationId ?? null;
    const isBookingAuditEnabled = organizationId
      ? await this.featuresRepository.checkIfTeamHasFeature(organizationId, "booking-audit")
      : false;

    await this.bookingEventHandlerService.onLocationChanged({
      bookingUid: ctx.existingBooking.uid,
      actor: makeUserActor(ctx.user.uuid),
      organizationId,
      source: "API_V2",
      auditData: {
        location: {
          old: ctx.existingBooking.location,
          new: bookingLocation,
        },
      },
      isBookingAuditEnabled,
    });

    await this.calendarSyncService.sendLocationChangeNotifications(
      evt,
      ctx.existingBooking.uid,
      bookingLocation,
      ctx.booking.eventType?.metadata as Record<string, unknown> | undefined
    );
  }
}
