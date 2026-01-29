import type { calendar_v3 } from "@googleapis/calendar";

import type {
  BookingForBackfill,
  BookingReferenceForBackfill,
} from "@calcom/features/bookingReference/repositories/BookingReferenceRepository";
import { BookingReferenceRepository } from "@calcom/features/bookingReference/repositories/BookingReferenceRepository";
import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import type { PrismaClient } from "@calcom/prisma";

interface GoogleCalendarBackfillServiceDependencies {
  prisma: PrismaClient;
  logger: ITaskerDependencies["logger"];
}

export class GoogleCalendarBackfillService {
  private bookingReferenceRepository: BookingReferenceRepository;
  private logger: ITaskerDependencies["logger"];

  constructor(deps: GoogleCalendarBackfillServiceDependencies) {
    this.bookingReferenceRepository = new BookingReferenceRepository({ prismaClient: deps.prisma });
    this.logger = deps.logger;
  }

  async syncAffectedBookings(startTime: string, endTime: string): Promise<void> {
    this.logger.info("Starting sync for affected Google Calendar bookings", { startTime, endTime });

    const quotaExceededStartUTC = new Date(startTime);
    const quotaExceededEndUTC = new Date(endTime);

    this.logger.info(
      `Analyzing bookings affected between ${quotaExceededStartUTC.toISOString()} UTC and ${quotaExceededEndUTC.toISOString()} UTC`
    );

    await this.syncUnsyncedAcceptedBookings(quotaExceededStartUTC, quotaExceededEndUTC);
    await this.syncUnremovedCancelledBookings(quotaExceededStartUTC, quotaExceededEndUTC);

    this.logger.info("Completed sync for affected Google Calendar bookings");
  }

  private async syncUnsyncedAcceptedBookings(
    quotaExceededStartUTC: Date,
    quotaExceededEndUTC: Date
  ): Promise<void> {
    this.logger.info("Processing unsynced accepted bookings");

    const unsyncedAcceptedBookings =
      await this.bookingReferenceRepository.findUnsyncedGoogleCalendarReferencesIncludeBookingAndCredential(
        quotaExceededStartUTC,
        quotaExceededEndUTC
      );

    if (unsyncedAcceptedBookings.length === 0) {
      this.logger.info("No unsynced accepted bookings found");
      return;
    }

    this.logger.info(`Found ${unsyncedAcceptedBookings.length} unsynced accepted bookings`);

    for (const br of unsyncedAcceptedBookings) {
      await this.processUnsyncedBooking(br);
    }
  }

  private async processUnsyncedBooking(br: BookingReferenceForBackfill): Promise<void> {
    const booking = br.booking;
    const credential = br.credential;
    const googleCalendarId = br.externalCalendarId || "primary";

    let calendarClient: calendar_v3.Calendar;
    try {
      calendarClient = await this.getGoogleCalendarClient(credential.key);
    } catch (authError) {
      this.logger.error(`Authentication failed for credential ${credential.id}`, {
        bookingUid: booking.uid,
        bookingId: booking.id,
        error: authError instanceof Error ? authError.message : "Unknown error",
      });
      return;
    }

    try {
      const existingGoogleEvent = await this.findGoogleCalendarEventByDetails(
        calendarClient,
        googleCalendarId,
        booking.title,
        booking.startTime,
        booking.endTime
      );

      if (existingGoogleEvent) {
        this.logger.info(`Found existing event for booking ${booking.uid}, updating BookingReference`, {
          googleEventId: existingGoogleEvent.id,
        });

        await this.bookingReferenceRepository.updateWithGoogleEventData(br.id, {
          uid: existingGoogleEvent.id || "",
          externalCalendarId: googleCalendarId,
          meetingId:
            existingGoogleEvent.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri ||
            null,
          meetingUrl: existingGoogleEvent.hangoutLink || existingGoogleEvent.htmlLink || null,
        });

        this.logger.info(`Updated BookingReference ${br.id} with Google Event ID ${existingGoogleEvent.id}`);
      } else {
        this.logger.info(`No existing event found for booking ${booking.uid}, creating new event`);

        const createdEvent = await this.createGoogleCalendarEvent(calendarClient, googleCalendarId, booking);

        this.logger.info(`Created Google Calendar event: ${createdEvent.id}`, {
          htmlLink: createdEvent.htmlLink,
        });

        await this.bookingReferenceRepository.updateWithGoogleEventData(br.id, {
          uid: createdEvent.id || "",
          externalCalendarId: googleCalendarId,
          meetingId:
            createdEvent.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri || null,
          meetingUrl: createdEvent.hangoutLink || createdEvent.htmlLink || null,
        });

        this.logger.info(`Updated BookingReference ${br.id} with new Google Event ID ${createdEvent.id}`);
      }
    } catch (opError) {
      this.logger.error(`Failed to process booking ${booking.uid} for creation`, {
        bookingId: booking.id,
        error: opError instanceof Error ? opError.message : "Unknown error",
      });
    }
  }

  private async syncUnremovedCancelledBookings(
    quotaExceededStartUTC: Date,
    quotaExceededEndUTC: Date
  ): Promise<void> {
    this.logger.info("Processing unremoved cancelled bookings");

    const unremovedCancelledBookings =
      await this.bookingReferenceRepository.findUnremovedCancelledGoogleCalendarReferencesIncludeBookingAndCredential(
        quotaExceededStartUTC,
        quotaExceededEndUTC
      );

    if (unremovedCancelledBookings.length === 0) {
      this.logger.info("No unremoved cancelled bookings found for deletion");
      return;
    }

    this.logger.info(`Found ${unremovedCancelledBookings.length} unremoved cancelled bookings`);

    for (const br of unremovedCancelledBookings) {
      await this.processCancelledBooking(br);
    }
  }

  private async processCancelledBooking(br: BookingReferenceForBackfill): Promise<void> {
    const booking = br.booking;
    const credential = br.credential;
    const googleEventId = br.uid;
    const googleCalendarId = br.externalCalendarId || "primary";

    let calendarClient: calendar_v3.Calendar;
    try {
      calendarClient = await this.getGoogleCalendarClient(credential.key);
    } catch (authError) {
      this.logger.error(`Authentication failed for credential ${credential.id}`, {
        bookingUid: booking.uid,
        bookingId: booking.id,
        error: authError instanceof Error ? authError.message : "Unknown error",
      });
      return;
    }

    try {
      const googleEvent = await this.getGoogleCalendarEvent(calendarClient, googleCalendarId, googleEventId);

      if (googleEvent && googleEvent.status !== "cancelled") {
        this.logger.info(`Deleting Google Calendar event for booking ${booking.uid}`, {
          googleEventId,
          googleCalendarId,
        });

        const deleted = await this.deleteGoogleCalendarEvent(calendarClient, googleCalendarId, googleEventId);

        if (deleted) {
          this.logger.info(`Successfully deleted Google Calendar event ${googleEventId}`);

          await this.bookingReferenceRepository.markAsDeleted(br.id);

          this.logger.info(`Updated BookingReference ${br.id} to mark as deleted`);
        }
      } else {
        this.logger.info(`Google event ${googleEventId} not found or already cancelled, marking as deleted`);

        await this.bookingReferenceRepository.markAsDeleted(br.id);

        this.logger.info(`Updated BookingReference ${br.id} to mark as deleted`);
      }
    } catch (opError) {
      this.logger.error(`Failed to delete/verify event ${googleEventId}`, {
        bookingUid: booking.uid,
        bookingId: booking.id,
        error: opError instanceof Error ? opError.message : "Unknown error",
      });
    }
  }

  private async getGoogleCalendarClient(credentialKey: unknown): Promise<calendar_v3.Calendar> {
    const { getGoogleAppKeys } = await import("@calcom/app-store/googlecalendar/lib/getGoogleAppKeys");
    const { OAuth2Client } = await import("googleapis-common");
    const { calendar_v3 } = await import("@googleapis/calendar");

    const { client_id, client_secret, redirect_uris } = await getGoogleAppKeys();

    const credential = credentialKey as { refresh_token?: string };
    if (!credential.refresh_token) {
      throw new Error("Refresh token not found in credential key");
    }

    const oauth2Client = new OAuth2Client(client_id, client_secret, redirect_uris[0]);
    oauth2Client.setCredentials({ refresh_token: credential.refresh_token });

    const { token } = await oauth2Client.getAccessToken();
    oauth2Client.setCredentials({ access_token: token });

    return new calendar_v3.Calendar({ auth: oauth2Client });
  }

  private async createGoogleCalendarEvent(
    calendar: calendar_v3.Calendar,
    calendarId: string,
    booking: BookingForBackfill
  ): Promise<calendar_v3.Schema$Event> {
    const bookingResponses = (booking.responses || {}) as Record<string, unknown>;

    const attendees: calendar_v3.Schema$EventAttendee[] = [];

    const email = bookingResponses["email"] as string | undefined;
    const name = bookingResponses["name"] as string | undefined;
    const guests = bookingResponses["guests"] as string[] | undefined;

    if (email) {
      attendees.push({
        email,
        displayName: name,
      });
    }

    if (guests && Array.isArray(guests)) {
      guests.forEach((guestEmail) => {
        attendees.push({ email: guestEmail });
      });
    }

    if (booking.userPrimaryEmail && !attendees.some((a) => a.email === booking.userPrimaryEmail)) {
      attendees.push({ email: booking.userPrimaryEmail, organizer: true });
    }

    const processedLocation = this.processLocation(booking);

    const eventDetails: calendar_v3.Schema$Event = {
      summary: booking.title,
      description: `Please find this booking details here: https://app.cal.com/booking/${booking.uid}`,
      start: {
        dateTime: booking.startTime.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: booking.endTime.toISOString(),
        timeZone: "UTC",
      },
      location: processedLocation,
      iCalUID: booking.iCalUID || undefined,
      attendees,
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: eventDetails,
      conferenceDataVersion: eventDetails.conferenceData ? 1 : undefined,
      sendUpdates: "all",
    });

    if (!response.data) {
      throw new Error("Failed to create Google Calendar event");
    }

    return response.data;
  }

  private processLocation(booking: BookingForBackfill): string | undefined {
    const location = booking.location;
    if (!location) return undefined;

    const bookingMetadata = (booking.metadata || {}) as Record<string, unknown>;
    const videoCallUrl = bookingMetadata["videoCallUrl"] as string | undefined;

    if (location === "integrations:daily") {
      return videoCallUrl || `https://app.cal.com/video/${booking.uid}`;
    }

    if (location.includes("integrations:")) {
      const provider = location.split(":")[1];
      if (provider === "daily") {
        return videoCallUrl || `https://app.cal.com/video/${booking.uid}`;
      }
      return provider.charAt(0).toUpperCase() + provider.slice(1);
    }

    if (location.startsWith("http")) {
      return location;
    }

    return location;
  }

  private async findGoogleCalendarEventByDetails(
    calendar: calendar_v3.Calendar,
    calendarId: string,
    title: string,
    startTime: Date,
    endTime: Date
  ): Promise<calendar_v3.Schema$Event | null> {
    const timeMin = new Date(startTime.getTime() - 30 * 60 * 1000).toISOString();
    const timeMax = new Date(endTime.getTime() + 30 * 60 * 1000).toISOString();

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      q: title,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 5,
    });

    const items = response.data.items || [];

    const matchingEvents = items.filter((event) => {
      const eventStart = new Date(event.start?.dateTime || event.start?.date || "");
      const eventEnd = new Date(event.end?.dateTime || event.end?.date || "");

      const titleMatches = event.summary && event.summary.toLowerCase().includes(title.toLowerCase());
      const timeOverlaps = startTime < eventEnd && endTime > eventStart;

      const bookingDuration = (endTime.getTime() - startTime.getTime()) / 60000;
      const eventDuration = (eventEnd.getTime() - eventStart.getTime()) / 60000;
      const durationMatches = Math.abs(bookingDuration - eventDuration) <= 5;

      return titleMatches && timeOverlaps && durationMatches;
    });

    return matchingEvents.length > 0 ? matchingEvents[0] : null;
  }

  private async getGoogleCalendarEvent(
    calendar: calendar_v3.Calendar,
    calendarId: string,
    eventId: string
  ): Promise<calendar_v3.Schema$Event | null> {
    try {
      const response = await calendar.events.get({
        calendarId,
        eventId,
      });
      return response.data;
    } catch (error) {
      const err = error as { code?: number };
      if (err.code === 404) {
        return null;
      }
      throw error;
    }
  }

  private async deleteGoogleCalendarEvent(
    calendar: calendar_v3.Calendar,
    calendarId: string,
    eventId: string
  ): Promise<boolean> {
    try {
      await calendar.events.delete({ calendarId, eventId });
      return true;
    } catch (error) {
      const err = error as { code?: number };
      if (err.code === 404) {
        this.logger.warn(`Event ${eventId} was already deleted from calendar ${calendarId}`);
        return true;
      }
      throw error;
    }
  }
}
