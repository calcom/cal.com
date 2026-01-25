import type { CalendarEvent, CredentialForCalendarService } from "@calcom/platform-libraries";
import {
  BookingReferenceRepository,
  buildCalEventFromBooking,
  CredentialRepository,
  updateEvent,
} from "@calcom/platform-libraries";
import { makeUserActor } from "@calcom/platform-libraries/bookings";
import { createMeeting, deleteMeeting, FAKE_DAILY_CREDENTIAL } from "@calcom/platform-libraries/conferencing";
import type {
  BookingInputLocation_2024_08_13,
  Integration_2024_08_13,
  UpdateBookingInputLocation_2024_08_13,
  UpdateBookingLocationInput_2024_08_13,
} from "@calcom/platform-types";
import type {
  BookingOutput_2024_08_13,
  GetRecurringSeatedBookingOutput_2024_08_13,
  GetSeatedBookingOutput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
} from "@calcom/platform-types/bookings/2024-08-13/outputs/booking.output";
import type { Booking, Prisma } from "@calcom/prisma/client";

type BookingLocationResponse =
  | BookingOutput_2024_08_13
  | RecurringBookingOutput_2024_08_13
  | RecurringBookingOutput_2024_08_13[]
  | GetSeatedBookingOutput_2024_08_13
  | GetRecurringSeatedBookingOutput_2024_08_13
  | GetRecurringSeatedBookingOutput_2024_08_13[];

type BookingWithDetails = {
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  userPrimaryEmail: string | null;
  uid: string;
  destinationCalendar: { id: number; integration: string; externalId: string } | null;
  iCalUID: string | null;
  iCalSequence: number | null;
  user: {
    email: string;
    name: string | null;
    timeZone: string;
    locale: string | null;
    destinationCalendar: { id: number; integration: string; externalId: string } | null;
    credentials: Array<{
      id: number;
      type: string;
      delegationCredentialId: string | null;
    }>;
    profiles?: Array<{ organizationId: number | null }>;
  } | null;
  attendees: Array<{
    email: string;
    name: string;
    timeZone: string;
    locale: string | null;
  }>;
  eventType: {
    title: string;
    recurringEvent: unknown;
    seatsPerTimeSlot: number | null;
    seatsShowAttendees: boolean | null;
    hideOrganizerEmail: boolean | null;
    customReplyToEmail: string | null;
  } | null;
  references: Array<{
    id: number;
    type: string;
    uid: string;
    deleted: boolean | null;
    credentialId: number | null;
    delegationCredentialId: string | null;
    externalCalendarId: string | null;
  }>;
};

type IntegrationHandlerContext = {
  existingBooking: Booking;
  booking: BookingWithDetails;
  integrationSlug: string;
  internalLocation: string;
  user: ApiAuthGuardUser;
  existingBookingHost: { organizationId: number | null } | null;
  inputLocation: { type: "integration"; integration: Integration_2024_08_13 };
};

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { InputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/input.service";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { apiToInternalintegrationsMapping } from "@/ee/event-types/event-types_2024_06_14/transformers/api-to-internal/locations";
import { BookingEventHandlerService } from "@/lib/services/booking-event-handler.service";
import type { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { EventTypeAccessService } from "@/modules/event-types/services/event-type-access.service";
import { UsersRepository } from "@/modules/users/users.repository";

@Injectable()
export class BookingLocationService_2024_08_13 {
  private readonly logger = new Logger("BookingLocationService_2024_08_13");

  constructor(
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly bookingsService: BookingsService_2024_08_13,
    private readonly usersRepository: UsersRepository,
    private readonly inputService: InputBookingsService_2024_08_13,
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly eventTypeAccessService: EventTypeAccessService,
    private readonly bookingEventHandlerService: BookingEventHandlerService
  ) {}

  /**
   * builds a CalendarEvent from booking data for use with video/calendar integrations.
   */
  private async buildCalEventForIntegration(
    booking: BookingWithDetails,
    location: string,
    conferenceCredentialId: number | null
  ): Promise<CalendarEvent> {
    return buildCalEventFromBooking({
      booking: {
        title: booking.title,
        description: booking.description,
        startTime: booking.startTime,
        endTime: booking.endTime,
        userPrimaryEmail: booking.userPrimaryEmail,
        uid: booking.uid,
        destinationCalendar: booking.destinationCalendar,
        user: booking.user
          ? {
              destinationCalendar: booking.user.destinationCalendar,
            }
          : null,
        attendees: booking.attendees.map((attendee) => ({
          email: attendee.email,
          name: attendee.name,
          timeZone: attendee.timeZone,
          locale: attendee.locale,
        })),
        eventType: booking.eventType
          ? {
              title: booking.eventType.title,
              recurringEvent: booking.eventType.recurringEvent,
              seatsPerTimeSlot: booking.eventType.seatsPerTimeSlot,
              seatsShowAttendees: booking.eventType.seatsShowAttendees,
              hideOrganizerEmail: booking.eventType.hideOrganizerEmail,
              customReplyToEmail: booking.eventType.customReplyToEmail,
            }
          : null,
        iCalUID: booking.iCalUID,
        iCalSequence: booking.iCalSequence,
      },
      organizer: {
        email: booking.user?.email || "",
        name: booking.user?.name,
        timeZone: booking.user?.timeZone || "UTC",
        locale: booking.user?.locale,
      },
      location,
      conferenceCredentialId,
      organizationId: booking.user?.profiles?.[0]?.organizationId ?? null,
    });
  }

  /**
   * updates booking with video location data and emits location changed event.
   * returns the updated booking response.
   */
  private async updateBookingWithVideoLocation(
    ctx: IntegrationHandlerContext,
    videoCallUrl: string | undefined,
    bookingLocation: string
  ): Promise<BookingLocationResponse> {
    const existingMetadata = (ctx.existingBooking.metadata || {}) as Record<string, unknown>;
    const updatedMetadata = {
      ...existingMetadata,
      videoCallUrl,
    };

    const bookingFieldsLocation = this.inputService.transformLocation(
      ctx.inputLocation as BookingInputLocation_2024_08_13
    );

    const responses = (ctx.existingBooking.responses || {}) as Record<string, unknown>;
    const { location: _existingLocation, ...rest } = responses;

    const updatedBookingResponses = {
      ...rest,
      location: bookingFieldsLocation,
    };

    const updatedBooking = await this.bookingsRepository.updateBooking(ctx.existingBooking.uid, {
      location: bookingLocation,
      responses: updatedBookingResponses,
      metadata: updatedMetadata as Prisma.InputJsonValue,
    });

    await this.bookingEventHandlerService.onLocationChanged({
      bookingUid: ctx.existingBooking.uid,
      actor: makeUserActor(ctx.user.uuid),
      organizationId: ctx.existingBookingHost?.organizationId ?? null,
      source: "API_V2",
      auditData: {
        location: {
          old: ctx.existingBooking.location,
          new: bookingLocation,
        },
      },
    });

    return this.bookingsService.getBooking(updatedBooking.uid, ctx.user);
  }

  async updateBookingLocation(
    bookingUid: string,
    input: UpdateBookingLocationInput_2024_08_13,
    user: ApiAuthGuardUser
  ): Promise<
    | BookingOutput_2024_08_13
    | RecurringBookingOutput_2024_08_13
    | RecurringBookingOutput_2024_08_13[]
    | GetSeatedBookingOutput_2024_08_13
    | GetRecurringSeatedBookingOutput_2024_08_13
    | GetRecurringSeatedBookingOutput_2024_08_13[]
  > {
    const existingBooking = await this.bookingsRepository.getBookingByUidWithUserAndEventDetails(bookingUid);
    if (!existingBooking) {
      throw new NotFoundException(`Booking with uid=${bookingUid} not found`);
    }

    if (existingBooking.eventTypeId && existingBooking.eventType) {
      const eventType = await this.eventTypesRepository.getEventTypeByIdWithOwnerAndTeam(
        existingBooking.eventTypeId
      );
      if (eventType) {
        const isAllowed = await this.eventTypeAccessService.userIsEventTypeAdminOrOwner(user, eventType);
        if (!isAllowed) {
          throw new ForbiddenException(
            "User is not authorized to update this booking location. User must be the event type owner, host, team admin or owner, or org admin or owner."
          );
        }
      }
    }

    const { location } = input;

    if (location) {
      // for integration locations, skip the sync here as it's handled in handleIntegrationLocationUpdate
      if (location.type !== "integration") {
        const locationValue = this.getLocationValue(location);
        if (locationValue) {
          await this.syncCalendarEvent(existingBooking.id, locationValue);
        }
      }
      return await this.updateLocation(existingBooking, location, user);
    }

    return this.bookingsService.getBooking(existingBooking.uid, user);
  }

  private async updateLocation(
    existingBooking: Booking,
    inputLocation: UpdateBookingInputLocation_2024_08_13,
    user: ApiAuthGuardUser
  ): Promise<
    | BookingOutput_2024_08_13
    | RecurringBookingOutput_2024_08_13
    | RecurringBookingOutput_2024_08_13[]
    | GetSeatedBookingOutput_2024_08_13
    | GetRecurringSeatedBookingOutput_2024_08_13
    | GetRecurringSeatedBookingOutput_2024_08_13[]
  > {
    const bookingUid = existingBooking.uid;
    const oldLocation = existingBooking.location;

    if (!existingBooking.userId) {
      throw new NotFoundException(`No user found for booking with uid=${bookingUid}`);
    }

    if (!existingBooking.eventTypeId) {
      throw new NotFoundException(`No event type found for booking with uid=${bookingUid}`);
    }

    const existingBookingHost = await this.usersRepository.findById(existingBooking.userId);

    if (!existingBookingHost) {
      throw new NotFoundException(`No user found for booking with uid=${bookingUid}`);
    }

    if (inputLocation.type === "integration") {
      return this.handleIntegrationLocationUpdate(existingBooking, inputLocation, user, existingBookingHost);
    }

    const bookingLocation = this.getLocationValue(inputLocation) ?? existingBooking.location;

    const bookingFieldsLocation = this.inputService.transformLocation(
      inputLocation as BookingInputLocation_2024_08_13
    );

    const responses = (existingBooking.responses || {}) as Record<string, unknown>;
    const { location: _existingLocation, ...rest } = responses;

    const updatedBookingResponses = {
      ...rest,
      location: bookingFieldsLocation,
    };

    // clear videoCallUrl from metadata when explicitly setting a new non-integration location.
    // this ensures the frontend shows the new location instead of the old integration URL.
    const existingMetadata = (existingBooking.metadata || {}) as Record<string, unknown>;
    const { videoCallUrl: _removedVideoUrl, ...metadataWithoutVideoUrl } = existingMetadata;

    await this.deleteOldVideoMeetingIfNeeded(existingBooking.id);

    const updatedBooking = await this.bookingsRepository.updateBooking(bookingUid, {
      location: bookingLocation,
      responses: updatedBookingResponses,
      metadata: metadataWithoutVideoUrl as Prisma.InputJsonValue,
    });

    await this.bookingEventHandlerService.onLocationChanged({
      bookingUid: existingBooking.uid,
      actor: makeUserActor(user.uuid),
      organizationId: existingBookingHost.organizationId ?? null,
      source: "API_V2",
      auditData: {
        location: {
          old: oldLocation,
          new: bookingLocation,
        },
      },
    });

    return this.bookingsService.getBooking(updatedBooking.uid, user);
  }

  /**
   * router for integration location updates.
   * dispatches to the appropriate handler based on integration type.
   */
  private async handleIntegrationLocationUpdate(
    existingBooking: Booking,
    inputLocation: { type: "integration"; integration: Integration_2024_08_13 },
    user: ApiAuthGuardUser,
    existingBookingHost: Awaited<ReturnType<typeof this.usersRepository.findById>>
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
    if (!booking || !booking.user) {
      throw new NotFoundException(`Could not load booking details for uid=${existingBooking.uid}`);
    }

    const ctx: IntegrationHandlerContext = {
      existingBooking,
      booking: booking as BookingWithDetails,
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

  /**
   * since google Meet is NOT a dedicated integration - it only works via Google Calendar.
   * if the user doesn't have Google Calendar, falls back to Cal Video.
   */
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

  /**
   * MS Teams IS a dedicated integration, but when paired with Office365 Calendar,
   * the meeting link is created through the calendar (like Google Meet).
   * without Office365 Calendar, it uses VideoApiAdapter.
   */
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

    await this.deleteOldVideoMeetingIfNeeded(ctx.existingBooking.id);

    const evt = await this.buildCalEventForIntegration(ctx.booking, ctx.internalLocation, credential.id);
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
      await this.syncCalendarEvent(ctx.existingBooking.id, bookingLocation);
    }

    return this.updateBookingWithVideoLocation(ctx, videoCallUrl, bookingLocation);
  }

  /**
   * handle video integrations that use VideoApiAdapter (Zoom, Webex, MS Teams without O365 Calendar, etc.).
   * these integrations have user-connected credentials and create meetings via their APIs, they dont have any additonal complex logic like google meet or office365 calendar.
   * hence we can group them under VideoApiAdapter.
   */
  private async handleVideoApiIntegration(ctx: IntegrationHandlerContext): Promise<BookingLocationResponse> {
    const credential = await this.findVideoCredentialForIntegration(
      ctx.integrationSlug,
      ctx.booking.user?.credentials || []
    );

    if (!credential) {
      throw new BadRequestException(
        `Video integration "${ctx.integrationSlug}" is not connected. Please connect the integration in your settings first.`
      );
    }

    await this.deleteOldVideoMeetingIfNeeded(ctx.existingBooking.id);

    const evt = await this.buildCalEventForIntegration(ctx.booking, ctx.internalLocation, credential.id);
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
      await this.syncCalendarEvent(ctx.existingBooking.id, bookingLocation);
    }

    return this.updateBookingWithVideoLocation(ctx, videoCallUrl, bookingLocation);
  }

  /**
   * handle calendar-based integrations (Google Meet via Google Calendar, MS Teams via Office365 Calendar).
   * the meeting link is created when updating the calendar event with conferenceData.
   */
  private async handleCalendarBasedIntegration(
    ctx: IntegrationHandlerContext,
    requiredCalendarType: string
  ): Promise<BookingLocationResponse> {
    const calendarReference = ctx.booking.references.find(
      (ref) => ref.type.includes("_calendar") && !ref.deleted
    );

    if (!calendarReference) {
      throw new BadRequestException(
        `No calendar event found for this booking. ${ctx.integrationSlug} requires a calendar event to generate the meeting link.`
      );
    }

    if (!calendarReference.type.includes(requiredCalendarType.replace("_calendar", ""))) {
      throw new BadRequestException(
        `${ctx.integrationSlug} requires a ${requiredCalendarType.replace("_", " ")} event. This booking has a ${calendarReference.type} event.`
      );
    }

    const calendarCredential = await this.getCredentialForReference(
      calendarReference,
      ctx.booking.user?.credentials || []
    );

    if (!calendarCredential) {
      throw new BadRequestException(
        `Could not find calendar credentials for ${ctx.integrationSlug}. Please reconnect your calendar.`
      );
    }

    const evt = await this.buildCalEventForIntegration(ctx.booking, ctx.internalLocation, null);

    // add conferenceData for Google Meet link generation
    if (ctx.integrationSlug === "google-meet") {
      evt.conferenceData = {
        createRequest: {
          requestId: `${ctx.booking.uid}-meet`,
        },
      };
    }

    // update the calendar event - this will generate the meet link
    const updateResult = await updateEvent(
      calendarCredential,
      evt,
      calendarReference.uid,
      calendarReference.externalCalendarId
    );

    // extract the hangout/meet link from the response
    let meetingUrl: string | undefined;
    if (updateResult.updatedEvent) {
      const updatedEvent = Array.isArray(updateResult.updatedEvent)
        ? updateResult.updatedEvent[0]
        : updateResult.updatedEvent;
      meetingUrl = updatedEvent?.hangoutLink || updatedEvent?.url;
    }

    const bookingLocation = meetingUrl || ctx.internalLocation;

    // for calendar-based integrations, we update booking directly without replacing references
    const existingMetadata = (ctx.existingBooking.metadata || {}) as Record<string, unknown>;
    const updatedMetadata = {
      ...existingMetadata,
      videoCallUrl: meetingUrl,
    };

    const updatedBooking = await this.bookingsRepository.updateBooking(ctx.existingBooking.uid, {
      location: bookingLocation,
      metadata: updatedMetadata as Prisma.InputJsonValue,
    });

    await this.bookingEventHandlerService.onLocationChanged({
      bookingUid: ctx.existingBooking.uid,
      actor: makeUserActor(ctx.user.uuid),
      organizationId: ctx.existingBookingHost?.organizationId ?? null,
      source: "API_V2",
      auditData: {
        location: {
          old: ctx.existingBooking.location,
          new: bookingLocation,
        },
      },
    });

    return this.bookingsService.getBooking(updatedBooking.uid, ctx.user);
  }

  private async findVideoCredentialForIntegration(
    integrationSlug: string,
    userCredentials: Array<{
      id: number;
      type: string;
      delegationCredentialId: string | null;
    }>
  ): Promise<CredentialForCalendarService | null> {
    if (integrationSlug === "cal-video") {
      return { ...FAKE_DAILY_CREDENTIAL };
    }

    const integrationToCredentialTypeMap: Record<string, string> = {
      zoom: "zoom_video",
      "whereby-video": "whereby_video",
      "webex-video": "webex_video",
      tandem: "tandem_video",
      jitsi: "jitsi_video",
      huddle: "huddle01_video",
      "office365-video": "office365_video", // MS Teams via VideoApiAdapter (when no O365 Calendar)
    };

    const credentialType = integrationToCredentialTypeMap[integrationSlug];

    // for integrations not in the map, try to match by looking for _video suffix pattern
    const matchingCred = userCredentials.find((cred) => {
      if (credentialType) {
        return cred.type === credentialType;
      }
      // fallback: try to match integration slug in credential type
      // e.g., "discord-video" matches "discord_video"
      const normalizedSlug = integrationSlug.replace(/-/g, "_");
      return cred.type.includes(normalizedSlug) || cred.type.includes(normalizedSlug.replace("_video", ""));
    });

    if (!matchingCred) {
      return null;
    }

    return CredentialRepository.findCredentialForCalendarServiceById({
      id: matchingCred.id,
    });
  }

  private async deleteOldVideoMeetingIfNeeded(bookingId: number): Promise<void> {
    const booking = await this.bookingsRepository.getBookingByIdWithUserAndEventDetails(bookingId);
    if (!booking || !booking.user) {
      return;
    }

    const videoReferences = booking.references.filter(
      (ref) => (ref.type.endsWith("_video") || ref.type.endsWith("_conferencing")) && !ref.deleted && ref.uid
    );

    for (const reference of videoReferences) {
      const credential = await this.findCredentialForVideoReference(reference, booking.user.credentials);

      if (credential && reference.uid) {
        try {
          await deleteMeeting(credential, reference.uid);
          this.logger.log(
            `deleteOldVideoMeetingIfNeeded - Deleted video meeting for reference id=${reference.id}, type=${reference.type}`
          );
        } catch (error) {
          this.logger.warn(
            `deleteOldVideoMeetingIfNeeded - Failed to delete video meeting for reference id=${reference.id}`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    }
  }

  private async findCredentialForVideoReference(
    reference: {
      credentialId: number | null;
      delegationCredentialId: string | null;
      type: string;
    },
    userCredentials: Array<{
      id: number;
      delegationCredentialId: string | null;
      type: string;
    }>
  ): Promise<CredentialForCalendarService | null> {
    if (reference.credentialId && reference.credentialId > 0) {
      const localCred = userCredentials.find(
        (cred) =>
          cred.id === reference.credentialId &&
          (cred.type.endsWith("_video") || cred.type.endsWith("_conferencing"))
      );
      if (localCred) {
        return CredentialRepository.findCredentialForCalendarServiceById({
          id: localCred.id,
        });
      }

      return CredentialRepository.findCredentialForCalendarServiceById({
        id: reference.credentialId,
      });
    }

    const typeCred = userCredentials.find((cred) => cred.type === reference.type);
    if (typeCred) {
      return CredentialRepository.findCredentialForCalendarServiceById({
        id: typeCred.id,
      });
    }

    return null;
  }

  /*
  1. fetch booking references via booking id or uid
  2. if booking reference not present, return
  3. if reference present, use credentials from in there to retreive calendar event and then update it accordingly
  */
  private async syncCalendarEvent(bookingId: number, newLocation: string): Promise<void> {
    // 1. Fetch booking with references and user credentials
    const booking = await this.bookingsRepository.getBookingByIdWithUserAndEventDetails(bookingId);

    if (!booking || !booking.user) {
      this.logger.log(`syncCalendarEvent - No booking or user found for id=${bookingId}`);
      return;
    }

    const calendarReferences = booking.references.filter(
      (ref) => ref.type.includes("_calendar") && !ref.deleted
    );

    if (calendarReferences.length === 0) {
      this.logger.log(`syncCalendarEvent - No calendar references for booking id=${bookingId}`);
      return;
    }

    const evt = await buildCalEventFromBooking({
      booking: {
        title: booking.title,
        description: booking.description,
        startTime: booking.startTime,
        endTime: booking.endTime,
        userPrimaryEmail: booking.userPrimaryEmail,
        uid: booking.uid,
        destinationCalendar: booking.destinationCalendar,
        user: booking.user
          ? {
              destinationCalendar: booking.user.destinationCalendar,
            }
          : null,
        attendees: booking.attendees.map((attendee) => ({
          email: attendee.email,
          name: attendee.name,
          timeZone: attendee.timeZone,
          locale: attendee.locale,
        })),
        eventType: booking.eventType
          ? {
              title: booking.eventType.title,
              recurringEvent: booking.eventType.recurringEvent,
              seatsPerTimeSlot: booking.eventType.seatsPerTimeSlot,
              seatsShowAttendees: booking.eventType.seatsShowAttendees,
              hideOrganizerEmail: booking.eventType.hideOrganizerEmail,
              customReplyToEmail: booking.eventType.customReplyToEmail,
            }
          : null,
        iCalUID: booking.iCalUID,
        iCalSequence: booking.iCalSequence,
      },
      organizer: {
        email: booking.user.email,
        name: booking.user.name,
        timeZone: booking.user.timeZone,
        locale: booking.user.locale,
      },
      location: newLocation,
      conferenceCredentialId: null,
      organizationId: booking.user.profiles?.[0]?.organizationId ?? null,
    });

    for (const reference of calendarReferences) {
      const credential = await this.getCredentialForReference(reference, booking.user.credentials);

      if (!credential) {
        this.logger.warn(
          `syncCalendarEvent - No credential found for reference id=${reference.id}, credentialId=${reference.credentialId}`
        );
        continue;
      }

      try {
        await updateEvent(credential, evt, reference.uid, reference.externalCalendarId);
        this.logger.log(
          `syncCalendarEvent - Successfully updated calendar event for reference id=${reference.id}`
        );
      } catch (error) {
        this.logger.error(
          `syncCalendarEvent - Failed to update calendar for reference id=${reference.id}`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  /**
   * Get the credential for a booking reference, following the pattern from EventManager.
   * Tries to find in local credentials first, then falls back to DB lookup.
   */
  private async getCredentialForReference(
    reference: {
      credentialId: number | null;
      delegationCredentialId: string | null;
      type: string;
    },
    userCredentials: Array<{
      id: number;
      delegationCredentialId: string | null;
      type: string;
    }>
  ): Promise<CredentialForCalendarService | null> {
    if (reference.delegationCredentialId) {
      const delegationCred = userCredentials.find(
        (cred) => cred.delegationCredentialId === reference.delegationCredentialId
      );
      if (delegationCred) {
        const credFromDB = await CredentialRepository.findCredentialForCalendarServiceById({
          id: delegationCred.id,
        });
        return credFromDB;
      }
    }

    if (reference.credentialId && reference.credentialId > 0) {
      const localCred = userCredentials.find((cred) => cred.id === reference.credentialId);
      if (localCred) {
        const credFromDB = await CredentialRepository.findCredentialForCalendarServiceById({
          id: localCred.id,
        });
        return credFromDB;
      }

      const credFromDB = await CredentialRepository.findCredentialForCalendarServiceById({
        id: reference.credentialId,
      });
      return credFromDB;
    }

    const typeCred = userCredentials.find((cred) => cred.type === reference.type);
    if (typeCred) {
      const credFromDB = await CredentialRepository.findCredentialForCalendarServiceById({
        id: typeCred.id,
      });
      return credFromDB;
    }

    return null;
  }

  private getLocationValue(loc: UpdateBookingInputLocation_2024_08_13): string | undefined {
    if (loc.type === "address") return loc.address;
    if (loc.type === "link") return loc.link;
    if (loc.type === "phone") return loc.phone;
    if (loc.type === "attendeeAddress") return loc.address;
    if (loc.type === "attendeePhone") return loc.phone;
    if (loc.type === "attendeeDefined") return loc.location;

    // integration type is handled separately in handleIntegrationLocationUpdate
    if (loc.type === "integration") return undefined;

    this.logger.log(
      `Booking location service getLocationValue - loc ${JSON.stringify(
        loc
      )} was passed but the type is not supported.`
    );

    return undefined;
  }
}
