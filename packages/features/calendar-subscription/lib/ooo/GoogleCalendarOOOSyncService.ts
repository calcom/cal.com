import type { calendar_v3 } from "@googleapis/calendar";
import { v4 as uuid } from "uuid";

import { CalendarAuth } from "@calcom/app-store/googlecalendar/lib/CalendarAuth";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { CredentialForCalendarServiceWithEmail } from "@calcom/types/Credential";

const log = logger.getSubLogger({ prefix: ["GoogleCalendarOOOSyncService"] });

// Default OOO reason for synced entries
const SYNCED_OOO_REASON = "synced_from_google_calendar";
const SYNCED_OOO_EMOJI = "🔄";

// How far ahead to sync OOO events (6 months)
const SYNC_MONTHS_AHEAD = 6;

export interface GoogleOOOEvent {
  id: string;
  start: Date;
  end: Date;
  summary?: string;
  outOfOfficeProperties?: {
    autoDeclineMode?: string;
    declineMessage?: string;
  };
  status: string;
}

export interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
}

export class GoogleCalendarOOOSyncService {
  private credentialId: number;
  private userId: number;
  private calendarId: string;

  constructor(credentialId: number, userId: number, calendarId: string = "primary") {
    this.credentialId = credentialId;
    this.userId = userId;
    this.calendarId = calendarId;
  }

  /**
   * Fetch the credential and create a Google Calendar client
   */
  private async getCalendarClient(): Promise<calendar_v3.Calendar> {
    const credential = await prisma.credential.findUnique({
      where: { id: this.credentialId },
      select: {
        ...credentialForCalendarServiceSelect,
        delegationCredential: {
          select: {
            serviceAccountKey: true,
          },
        },
      },
    });

    if (!credential) {
      throw new Error(`Credential not found: ${this.credentialId}`);
    }

    // Build the credential object for CalendarAuth
    const credentialForService: CredentialForCalendarServiceWithEmail = {
      ...credential,
      delegatedToId: credential.delegationCredentialId,
      delegatedTo: credential.delegationCredential
        ? {
            serviceAccountKey: credential.delegationCredential.serviceAccountKey as {
              client_email: string;
              client_id: string;
              private_key: string;
            },
          }
        : null,
    };

    const auth = new CalendarAuth(credentialForService);
    return auth.getClient();
  }

  /**
   * Fetch OOO events from Google Calendar using eventTypes filter
   */
  async fetchOOOEvents(timeMin: Date, timeMax: Date): Promise<GoogleOOOEvent[]> {
    let calendar: calendar_v3.Calendar;
    try {
      calendar = await this.getCalendarClient();
    } catch (error) {
      log.error("Failed to get Google Calendar client", { error });
      throw new Error("Failed to authenticate with Google Calendar");
    }

    const events: GoogleOOOEvent[] = [];
    let pageToken: string | undefined;

    log.debug("Fetching OOO events from Google Calendar", {
      calendarId: this.calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
    });

    try {
      do {
        const response = await calendar.events.list({
          calendarId: this.calendarId,
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          eventTypes: ["outOfOffice"], // Key parameter for OOO events
          singleEvents: true,
          pageToken,
        });

        for (const event of response.data.items || []) {
          if (event.id && event.start && event.end) {
            const startDateStr = event.start.dateTime || event.start.date;
            const endDateStr = event.end.dateTime || event.end.date;

            // Skip events with invalid dates
            if (!startDateStr || !endDateStr) {
              log.warn("Skipping event with missing dates", { eventId: event.id });
              continue;
            }

            const startDate = new Date(startDateStr);
            const endDate = new Date(endDateStr);

            // Validate dates are valid
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              log.warn("Skipping event with invalid dates", { eventId: event.id, startDateStr, endDateStr });
              continue;
            }

            // Validate start is before end
            if (startDate >= endDate) {
              log.warn("Skipping event with invalid date range", { eventId: event.id });
              continue;
            }

            events.push({
              id: event.id,
              start: startDate,
              end: endDate,
              summary: event.summary || undefined,
              outOfOfficeProperties: event.outOfOfficeProperties as GoogleOOOEvent["outOfOfficeProperties"],
              status: event.status || "confirmed",
            });
          }
        }

        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);
    } catch (error) {
      log.error("Failed to fetch events from Google Calendar", { error });
      throw new Error("Failed to fetch Out of Office events from Google Calendar");
    }

    log.info("Fetched OOO events from Google Calendar", { count: events.length });
    return events;
  }

  /**
   * Get or create the "Synced from Google Calendar" OOO reason
   */
  private async getOrCreateSyncedOOOReason(): Promise<{ id: number }> {
    let reason = await prisma.outOfOfficeReason.findFirst({
      where: { reason: SYNCED_OOO_REASON },
      select: { id: true },
    });

    if (!reason) {
      reason = await prisma.outOfOfficeReason.create({
        data: {
          emoji: SYNCED_OOO_EMOJI,
          reason: SYNCED_OOO_REASON,
          enabled: true,
        },
        select: { id: true },
      });
      log.info("Created synced OOO reason", { reasonId: reason.id });
    }

    return reason;
  }

  /**
   * Sync OOO events from Google Calendar to OutOfOfficeEntry table
   */
  async syncOOOEntries(): Promise<SyncResult> {
    const now = new Date();

    // Look back 7 days to catch ongoing OOO events that started in the past
    const lookBackDays = 7;
    const timeMin = new Date(now);
    timeMin.setDate(timeMin.getDate() - lookBackDays);

    // Look ahead for future events
    const timeMax = new Date(now);
    timeMax.setMonth(timeMax.getMonth() + SYNC_MONTHS_AHEAD);

    // Fetch OOO events from Google Calendar
    const googleOOOEvents = await this.fetchOOOEvents(timeMin, timeMax);

    // Get existing synced entries for this user from this credential
    // Only fetch entries that haven't ended yet (ongoing or future)
    const existingSyncedEntries = await prisma.outOfOfficeEntry.findMany({
      where: {
        userId: this.userId,
        syncedFromGoogleCalendar: true,
        credentialId: this.credentialId,
        // Only consider entries that are still active or future
        end: { gte: now },
      },
    });

    const existingByGoogleId = new Map(
      existingSyncedEntries.map((e) => [e.googleCalendarEventId, e])
    );

    let created = 0;
    let updated = 0;
    let deleted = 0;

    // Get default OOO reason for synced entries
    const defaultReason = await this.getOrCreateSyncedOOOReason();

    // Process each Google Calendar OOO event
    for (const googleEvent of googleOOOEvents) {
      // Handle cancelled events - delete from Cal.com
      if (googleEvent.status === "cancelled") {
        const existing = existingByGoogleId.get(googleEvent.id);
        if (existing) {
          await prisma.outOfOfficeEntry.delete({
            where: { id: existing.id },
          });
          deleted++;
          log.debug("Deleted cancelled OOO entry", { googleEventId: googleEvent.id });
        }
        existingByGoogleId.delete(googleEvent.id);
        continue;
      }

      const existing = existingByGoogleId.get(googleEvent.id);

      if (existing) {
        // Check if dates changed and update
        const startChanged = existing.start.getTime() !== googleEvent.start.getTime();
        const endChanged = existing.end.getTime() !== googleEvent.end.getTime();

        if (startChanged || endChanged) {
          await prisma.outOfOfficeEntry.update({
            where: { id: existing.id },
            data: {
              start: googleEvent.start,
              end: googleEvent.end,
              notes: googleEvent.outOfOfficeProperties?.declineMessage || existing.notes,
            },
          });
          updated++;
          log.debug("Updated OOO entry", { googleEventId: googleEvent.id });
        }
        // Remove from map to track what's been processed
        existingByGoogleId.delete(googleEvent.id);
      } else {
        // Create new entry
        await prisma.outOfOfficeEntry.create({
          data: {
            uuid: uuid(),
            start: googleEvent.start,
            end: googleEvent.end,
            userId: this.userId,
            notes: googleEvent.outOfOfficeProperties?.declineMessage || null,
            reasonId: defaultReason.id,
            googleCalendarEventId: googleEvent.id,
            googleCalendarId: this.calendarId,
            credentialId: this.credentialId,
            syncedFromGoogleCalendar: true,
          },
        });
        created++;
        log.debug("Created OOO entry", { googleEventId: googleEvent.id });
      }
    }

    // Delete entries that no longer exist in Google Calendar
    // Only delete if the entry's end date is in the future (not historical records)
    for (const [googleEventId, entry] of existingByGoogleId) {
      // Only delete if this was an active/future entry that was removed from Google Calendar
      if (entry.end >= now) {
        await prisma.outOfOfficeEntry.delete({
          where: { id: entry.id },
        });
        deleted++;
        log.debug("Deleted removed OOO entry", { googleEventId });
      }
    }

    log.info("OOO sync completed", {
      userId: this.userId,
      credentialId: this.credentialId,
      created,
      updated,
      deleted,
    });

    return { created, updated, deleted };
  }

  /**
   * Delete all synced OOO entries for this user/credential
   */
  async deleteSyncedEntries(): Promise<number> {
    const result = await prisma.outOfOfficeEntry.deleteMany({
      where: {
        userId: this.userId,
        syncedFromGoogleCalendar: true,
        credentialId: this.credentialId,
      },
    });

    log.info("Deleted synced OOO entries", {
      userId: this.userId,
      credentialId: this.credentialId,
      count: result.count,
    });

    return result.count;
  }
}
