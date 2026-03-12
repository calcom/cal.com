import { BookingReferencesRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/booking-references.repository";
import { GoogleCalendarService as GCalService } from "@/ee/calendars/services/gcal.service";
import { GoogleCalendarEventResponse } from "@/modules/cal-unified-calendars/pipes/get-calendar-event-details-output-pipe";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { calendar_v3 } from "@googleapis/calendar";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Logger, NotFoundException } from "@nestjs/common";
import { JWT } from "googleapis-common";

import { GOOGLE_CALENDAR_TYPE } from "@calcom/platform-constants";
import { DelegationCredentialRepository, OAuth2UniversalSchema } from "@calcom/platform-libraries/app-store";
import type { Prisma } from "@calcom/prisma/client";

import type { CreateUnifiedCalendarEventInput } from "../inputs/create-unified-calendar-event.input";
import { UpdateUnifiedCalendarEventInput } from "../inputs/update-unified-calendar-event.input";
import { GoogleCalendarEventInputPipe } from "../pipes/google-calendar-event-input-pipe";

@Injectable()
export class GoogleCalendarService {
  private logger = new Logger("GoogleCalendarService");
  constructor(
    private readonly bookingReferencesRepository: BookingReferencesRepository_2024_08_13,
    private readonly gCalService: GCalService,
    private readonly credentialsRepository: CredentialsRepository
  ) {}

  async getEventDetails(eventUid: string): Promise<GoogleCalendarEventResponse> {
    const bookingReference =
      await this.bookingReferencesRepository.getBookingReferencesIncludeSensitiveCredentials(eventUid);

    if (!bookingReference) {
      throw new NotFoundException("Booking reference not found");
    }

    const ownerUserEmail = bookingReference?.booking?.user?.email;

    // Get authenticated calendar instance
    const calendar = await this.getAuthorizedCalendarInstance(
      ownerUserEmail,
      bookingReference.credential?.key,
      bookingReference.delegationCredential
    );

    try {
      const event = await calendar.events.get({
        calendarId: bookingReference?.externalCalendarId ?? "primary",
        eventId: bookingReference?.uid,
        // fields: "id,status,created,updated,summary,description,location,creator,organizer,start,end,attendees,conferenceData"
      });

      if (!event.data) {
        throw new NotFoundException("Meeting not found");
      }
      return event.data as GoogleCalendarEventResponse;
    } catch (error) {
      throw new NotFoundException("Failed to retrieve meeting details");
    }
  }

  async updateEventDetails(
    eventUid: string,
    updateData: UpdateUnifiedCalendarEventInput
  ): Promise<GoogleCalendarEventResponse> {
    const bookingReference =
      await this.bookingReferencesRepository.getBookingReferencesIncludeSensitiveCredentials(eventUid);

    if (!bookingReference) {
      throw new NotFoundException("Booking reference not found");
    }

    const ownerUserEmail = bookingReference?.booking?.user?.email;

    const calendar = await this.getAuthorizedCalendarInstance(
      ownerUserEmail,
      bookingReference.credential?.key,
      bookingReference.delegationCredential
    );

    const updatePayload = new GoogleCalendarEventInputPipe().transform(updateData);

    try {
      const event = await calendar.events.patch({
        calendarId: bookingReference?.externalCalendarId ?? "primary",
        eventId: bookingReference?.uid,
        requestBody: updatePayload,
      });

      if (!event.data) {
        throw new NotFoundException("Failed to update meeting");
      }
      return event.data as GoogleCalendarEventResponse;
    } catch (error) {
      throw new NotFoundException("Failed to update meeting details");
    }
  }

  /**
   * Gets an authorized Google Calendar instance
   * Tries delegation credentials first, falls back to direct OAuth
   */
  private async getAuthorizedCalendarInstance(
    userEmail?: string,
    oAuthCredentials?: Prisma.JsonValue | undefined,
    delegationCredential?: { id: string } | null
  ): Promise<calendar_v3.Calendar> {
    if (userEmail && delegationCredential?.id) {
      const delegatedCalendar = await this.getDelegatedCalendarInstance(delegationCredential, userEmail);
      if (delegatedCalendar) {
        return delegatedCalendar;
      }
    }

    // Fall back to direct OAuth authentication
    if (!oAuthCredentials) {
      throw new UnauthorizedException("No valid credentials available for Google Calendar");
    }
    const parsedOAuthCredentials = OAuth2UniversalSchema.parse(oAuthCredentials);
    const oAuth2Client = await this.gCalService.getOAuthClient(this.gCalService.redirectUri);
    oAuth2Client.setCredentials(parsedOAuthCredentials);

    return new calendar_v3.Calendar({ auth: oAuth2Client });
  }

  private async getDelegatedCalendarInstance(
    delegationCredential: { id: string },
    emailToImpersonate: string
  ): Promise<calendar_v3.Calendar | null> {
    try {
      const oauthClientIdAliasRegex = /\+[a-zA-Z0-9]{25}/;
      const cleanEmail = emailToImpersonate.replace(oauthClientIdAliasRegex, "");

      const serviceAccountCreds =
        await DelegationCredentialRepository.findByIdIncludeSensitiveServiceAccountKey({
          id: delegationCredential.id,
        });

      if (
        !serviceAccountCreds?.serviceAccountKey?.client_email ||
        !serviceAccountCreds?.serviceAccountKey?.private_key
      ) {
        this.logger.error("Missing service account credentials for delegation", {
          delegationCredentialId: delegationCredential.id,
        });
        return null;
      }

      const authClient = new JWT({
        email: serviceAccountCreds.serviceAccountKey.client_email,
        key: serviceAccountCreds.serviceAccountKey.private_key,
        scopes: ["https://www.googleapis.com/auth/calendar"],
        subject: cleanEmail,
      });

      await authClient.authorize();
      return new calendar_v3.Calendar({ auth: authClient });
    } catch (error) {
      return null;
    }
  }

  /**
   * Gets an authorized Google Calendar instance for the given user (for user-scoped list/create/delete).
   */
  async getCalendarClientForUser(userId: number): Promise<calendar_v3.Calendar> {
    const credential = await this.credentialsRepository.findCredentialByTypeAndUserId(
      GOOGLE_CALENDAR_TYPE,
      userId
    );
    if (!credential?.key) {
      throw new UnauthorizedException("Google Calendar is not connected for this user");
    }
    if (credential.invalid) {
      throw new UnauthorizedException("Google Calendar credentials are invalid. Please reconnect.");
    }
    const parsed = OAuth2UniversalSchema.parse(credential.key);
    const oAuth2Client = await this.gCalService.getOAuthClient(this.gCalService.redirectUri);
    oAuth2Client.setCredentials(parsed);
    return new calendar_v3.Calendar({ auth: oAuth2Client });
  }

  /**
   * Gets an authorized Google Calendar instance for a specific credential (connection).
   */
  async getCalendarClientByCredentialId(
    userId: number,
    credentialId: number
  ): Promise<calendar_v3.Calendar> {
    const credential = await this.credentialsRepository.findCredentialByIdAndUserId(
      credentialId,
      userId
    );
    if (!credential) {
      throw new NotFoundException("Calendar connection not found");
    }
    if (credential.type !== GOOGLE_CALENDAR_TYPE) {
      throw new BadRequestException(
        "Event operations for this connection are currently only available for Google Calendar"
      );
    }
    if (!credential.key) {
      throw new UnauthorizedException("Calendar credentials are not available for this connection");
    }
    if (credential.invalid) {
      throw new UnauthorizedException("Calendar credentials are invalid. Please reconnect.");
    }
    const parsed = OAuth2UniversalSchema.parse(credential.key);
    const oAuth2Client = await this.gCalService.getOAuthClient(this.gCalService.redirectUri);
    oAuth2Client.setCredentials(parsed);
    return new calendar_v3.Calendar({ auth: oAuth2Client });
  }

  // ─── Shared private helpers (DRY calendar CRUD) ──────────────────────

  private async listEventsWithClient(
    calendar: calendar_v3.Calendar,
    calendarId: string,
    timeMin: string,
    timeMax: string
  ): Promise<GoogleCalendarEventResponse[]> {
    const effectiveCalendarId = calendarId || "primary";
    const response = await calendar.events.list({
      calendarId: effectiveCalendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });
    const items = (response.data.items || []) as GoogleCalendarEventResponse[];
    // Include both timed events (start.dateTime) and all-day events (start.date)
    return items.filter((e) => e.start?.dateTime != null || e.start?.date != null) as GoogleCalendarEventResponse[];
  }

  private async createEventWithClient(
    calendar: calendar_v3.Calendar,
    calendarId: string,
    body: CreateUnifiedCalendarEventInput
  ): Promise<GoogleCalendarEventResponse> {
    const effectiveCalendarId = calendarId || "primary";
    const requestBody: calendar_v3.Schema$Event = {
      summary: body.title,
      description: body.description ?? undefined,
      start: {
        dateTime: body.start.time,
        timeZone: body.start.timeZone,
      },
      end: {
        dateTime: body.end.time,
        timeZone: body.end.timeZone,
      },
      attendees: body.attendees?.map((a) => ({
        email: a.email,
        displayName: a.name,
      })),
    };
    const response = await calendar.events.insert({
      calendarId: effectiveCalendarId,
      requestBody,
      sendUpdates: "none",
    });
    if (!response.data) {
      throw new BadRequestException("Failed to create calendar event");
    }
    return response.data as GoogleCalendarEventResponse;
  }

  private async getEventWithClient(
    calendar: calendar_v3.Calendar,
    calendarId: string,
    eventId: string
  ): Promise<GoogleCalendarEventResponse> {
    const effectiveCalendarId = calendarId || "primary";
    const event = await calendar.events.get({
      calendarId: effectiveCalendarId,
      eventId,
    });
    if (!event.data) {
      throw new NotFoundException("Event not found");
    }
    return event.data as GoogleCalendarEventResponse;
  }

  private async updateEventWithClient(
    calendar: calendar_v3.Calendar,
    calendarId: string,
    eventId: string,
    updateData: UpdateUnifiedCalendarEventInput
  ): Promise<GoogleCalendarEventResponse> {
    const effectiveCalendarId = calendarId || "primary";
    const updatePayload = new GoogleCalendarEventInputPipe().transform(updateData);
    const event = await calendar.events.patch({
      calendarId: effectiveCalendarId,
      eventId,
      requestBody: updatePayload,
    });
    if (!event.data) {
      throw new NotFoundException("Failed to update event");
    }
    return event.data as GoogleCalendarEventResponse;
  }

  private async deleteEventWithClient(
    calendar: calendar_v3.Calendar,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    const effectiveCalendarId = calendarId || "primary";
    await calendar.events.delete({
      calendarId: effectiveCalendarId,
      eventId,
      sendUpdates: "none",
    });
  }

  // ─── Public user-scoped methods ──────────────────────────────────────

  /**
   * Lists events in a date range for the user's Google Calendar.
   * Only returns events with dateTime (skips all-day events for consistent response shape).
   */
  async listEventsForUser(
    userId: number,
    calendarId: string,
    timeMin: string,
    timeMax: string
  ): Promise<GoogleCalendarEventResponse[]> {
    const calendar = await this.getCalendarClientForUser(userId);
    return this.listEventsWithClient(calendar, calendarId, timeMin, timeMax);
  }

  /**
   * Creates a new event on the user's Google Calendar.
   */
  async createEventForUser(
    userId: number,
    calendarId: string,
    body: CreateUnifiedCalendarEventInput
  ): Promise<GoogleCalendarEventResponse> {
    const calendar = await this.getCalendarClientForUser(userId);
    return this.createEventWithClient(calendar, calendarId, body);
  }

  /**
   * Deletes/cancels an event on the user's Google Calendar by provider event ID.
   */
  async deleteEventForUser(
    userId: number,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    const calendar = await this.getCalendarClientForUser(userId);
    return this.deleteEventWithClient(calendar, calendarId, eventId);
  }

  // ─── Public connection-scoped methods ─────────────────────────────────

  async listEventsForUserByConnectionId(
    userId: number,
    credentialId: number,
    calendarId: string,
    timeMin: string,
    timeMax: string
  ): Promise<GoogleCalendarEventResponse[]> {
    const calendar = await this.getCalendarClientByCredentialId(userId, credentialId);
    return this.listEventsWithClient(calendar, calendarId, timeMin, timeMax);
  }

  async createEventForUserByConnectionId(
    userId: number,
    credentialId: number,
    calendarId: string,
    body: CreateUnifiedCalendarEventInput
  ): Promise<GoogleCalendarEventResponse> {
    const calendar = await this.getCalendarClientByCredentialId(userId, credentialId);
    return this.createEventWithClient(calendar, calendarId, body);
  }

  async getEventByConnectionId(
    userId: number,
    credentialId: number,
    calendarId: string,
    eventId: string
  ): Promise<GoogleCalendarEventResponse> {
    const calendar = await this.getCalendarClientByCredentialId(userId, credentialId);
    return this.getEventWithClient(calendar, calendarId, eventId);
  }

  async updateEventByConnectionId(
    userId: number,
    credentialId: number,
    calendarId: string,
    eventId: string,
    updateData: UpdateUnifiedCalendarEventInput
  ): Promise<GoogleCalendarEventResponse> {
    const calendar = await this.getCalendarClientByCredentialId(userId, credentialId);
    return this.updateEventWithClient(calendar, calendarId, eventId, updateData);
  }

  async deleteEventForUserByConnectionId(
    userId: number,
    credentialId: number,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    const calendar = await this.getCalendarClientByCredentialId(userId, credentialId);
    return this.deleteEventWithClient(calendar, calendarId, eventId);
  }
}
