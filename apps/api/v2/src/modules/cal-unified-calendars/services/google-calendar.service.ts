import { BookingReferencesRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/booking-references.repository";
import { GoogleCalendarService as GCalService } from "@/ee/calendars/services/gcal.service";
import { GoogleCalendarEventResponse } from "@/modules/cal-unified-calendars/pipes/get-calendar-event-details-output-pipe";
import { calendar_v3 } from "@googleapis/calendar";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { NotFoundException } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { JWT } from "googleapis-common";

import { DelegationCredentialRepository, OAuth2UniversalSchema } from "@calcom/platform-libraries/app-store";

import { UpdateUnifiedCalendarEventInput } from "../inputs/update-unified-calendar-event.input";
import { UnifiedCalendarEventOutput } from "../outputs/get-unified-calendar-event";

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

    const updatePayload: any = {};

    if (updateData.title !== undefined) {
      updatePayload.summary = updateData.title;
    }

    if (updateData.description !== undefined) {
      updatePayload.description = updateData.description;
    }

    if (updateData.start) {
      updatePayload.start = {
        dateTime: updateData.start.time,
        timeZone: updateData.start.timeZone,
      };
    }

    if (updateData.end) {
      updatePayload.end = {
        dateTime: updateData.end.time,
        timeZone: updateData.end.timeZone,
      };
    }

    if (updateData.attendees !== undefined) {
      updatePayload.attendees = updateData.attendees.map((attendee) => ({
        email: attendee.email,
        displayName: attendee.name,
        responseStatus: this.mapResponseStatusToGoogle(attendee.responseStatus),
        optional: attendee.optional,
      }));
    }

    if (updateData.locations !== undefined) {
      const nonVideoLocations = updateData.locations.filter((loc) => loc.type !== "video");
      if (nonVideoLocations.length > 0) {
        updatePayload.location = nonVideoLocations[0].url || nonVideoLocations[0].label;
      }

      const videoLocation = updateData.locations.find((loc) => loc.type === "video");
      if (videoLocation) {
        updatePayload.conferenceData = {
          entryPoints: updateData.locations.map((location) => ({
            entryPointType: location.type,
            uri: location.url,
            label: location.label,
            pin: (location as any).pin,
            regionCode: (location as any).regionCode,
          })),
        };
      }
    }

    if (updateData.status !== undefined) {
      updatePayload.status = this.mapEventStatusToGoogle(updateData.status);
    }

    try {
      const event = await calendar.events.patch({
        calendarId: bookingReference?.externalCalendarId ?? "primary",
        eventId: bookingReference?.uid,
        requestBody: updatePayload,
        conferenceDataVersion: updateData.locations ? 1 : undefined,
      });

      if (!event.data) {
        throw new NotFoundException("Failed to update meeting");
      }
      return event.data as GoogleCalendarEventResponse;
    } catch (error) {
      throw new NotFoundException("Failed to update meeting details");
    }
  }

  private mapResponseStatusToGoogle(responseStatus?: string | null): string {
    if (!responseStatus) return "needsAction";

    switch (responseStatus.toLowerCase()) {
      case "accepted":
        return "accepted";
      case "pending":
        return "tentative";
      case "declined":
        return "declined";
      case "needsaction":
        return "needsAction";
      default:
        return "needsAction";
    }
  }

  private mapEventStatusToGoogle(status?: string | null): string {
    if (!status) return "confirmed";

    switch (status.toLowerCase()) {
      case "accepted":
        return "confirmed";
      case "pending":
        return "tentative";
      case "cancelled":
        return "cancelled";
      case "declined":
        return "cancelled";
      default:
        return "confirmed";
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
