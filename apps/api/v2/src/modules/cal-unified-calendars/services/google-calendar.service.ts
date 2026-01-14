import { BookingReferencesRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/booking-references.repository";
import { GoogleCalendarService as GCalService } from "@/ee/calendars/services/gcal.service";
import { GoogleCalendarEventResponse } from "@/modules/cal-unified-calendars/pipes/get-calendar-event-details-output-pipe";
import { calendar_v3 } from "@googleapis/calendar";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { NotFoundException } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { JWT } from "googleapis-common";

import { DelegationCredentialRepository, OAuth2UniversalSchema } from "@calcom/platform-libraries/app-store";
import type { Prisma } from "@calcom/prisma/client";

import { UpdateUnifiedCalendarEventInput } from "../inputs/update-unified-calendar-event.input";
import { GoogleCalendarEventInputPipe } from "../pipes/google-calendar-event-input-pipe";

@Injectable()
export class GoogleCalendarService {
  private logger = new Logger("GoogleCalendarService");
  constructor(
    private readonly bookingReferencesRepository: BookingReferencesRepository_2024_08_13,
    private readonly gCalService: GCalService
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
}
