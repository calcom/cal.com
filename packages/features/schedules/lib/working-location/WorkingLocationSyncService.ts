import { CalendarAuth } from "@calcom/app-store/googlecalendar/lib/CalendarAuth";
import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import { Prisma, type PrismaClient, type Schedule } from "@calcom/prisma/client";
import type { CredentialForCalendarServiceWithEmail } from "@calcom/types/Credential";
import type { calendar_v3 } from "@googleapis/calendar";

import type {
  GoogleWorkingLocationEvent,
  GoogleWorkingLocationSyncConfig,
  GoogleWorkingLocationType,
} from "./types";
import { GOOGLE_WORKING_LOCATION_SYNC_SOURCE } from "./types";

const log = logger.getSubLogger({ prefix: ["WorkingLocationSyncService"] });

/**
 * How many months ahead to sync working location events
 */
const SYNC_MONTHS_AHEAD = 3;

/**
 * Service for syncing Google Calendar Working Location events to Cal.com schedules
 */
export class WorkingLocationSyncService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Fetch working location events from Google Calendar
   */
  async fetchWorkingLocationEvents(
    credential: CredentialForCalendarServiceWithEmail,
    calendarId: string,
    locationTypes?: GoogleWorkingLocationType[]
  ): Promise<GoogleWorkingLocationEvent[]> {
    log.debug("Fetching working location events", { credentialId: credential.id, calendarId, locationTypes });

    const auth = new CalendarAuth(credential);
    const client = await auth.getClient();

    const now = dayjs().startOf("day");
    const endDate = now.add(SYNC_MONTHS_AHEAD, "month").endOf("day");

    const events: GoogleWorkingLocationEvent[] = [];
    let pageToken: string | undefined;

    do {
      const params: calendar_v3.Params$Resource$Events$List = {
        calendarId,
        timeMin: now.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        eventTypes: ["workingLocation"],
        pageToken,
      };

      const { data } = await client.events.list(params);

      if (data.items) {
        for (const event of data.items) {
          const workingLocation = this.parseWorkingLocationEvent(event);
          if (workingLocation) {
            // Filter by location types if specified
            if (!locationTypes || locationTypes.includes(workingLocation.locationType)) {
              events.push(workingLocation);
            }
          }
        }
      }

      pageToken = data.nextPageToken ?? undefined;
    } while (pageToken);

    log.debug("Fetched working location events", { count: events.length });
    return events;
  }

  /**
   * Parse a Google Calendar event into a working location event
   */
  private parseWorkingLocationEvent(event: calendar_v3.Schema$Event): GoogleWorkingLocationEvent | null {
    if (!event.id || event.eventType !== "workingLocation" || !event.workingLocationProperties) {
      return null;
    }

    const props = event.workingLocationProperties;
    let locationType: GoogleWorkingLocationType;
    let locationLabel: string | undefined;
    let buildingId: string | undefined;

    if (props.type === "homeOffice") {
      locationType = "homeOffice";
    } else if (props.type === "officeLocation" && props.officeLocation) {
      locationType = "officeLocation";
      locationLabel = props.officeLocation.label ?? undefined;
      buildingId = props.officeLocation.buildingId ?? undefined;
    } else if (props.type === "customLocation" && props.customLocation) {
      locationType = "customLocation";
      locationLabel = props.customLocation.label ?? undefined;
    } else {
      return null;
    }

    // Determine start and end dates
    const isAllDay = !!event.start?.date && !event.start?.dateTime;
    const start = event.start?.dateTime
      ? new Date(event.start.dateTime)
      : event.start?.date
        ? new Date(event.start.date)
        : null;
    const end = event.end?.dateTime
      ? new Date(event.end.dateTime)
      : event.end?.date
        ? new Date(event.end.date)
        : null;

    if (!start || !end) {
      return null;
    }

    return {
      id: event.id,
      start,
      end,
      isAllDay,
      locationType,
      locationLabel,
      buildingId,
    };
  }

  /**
   * Convert working location events to availability date overrides
   * All-day events become full day availability (e.g., 9 AM - 5 PM based on schedule timezone)
   * Timed events become specific time range availability
   */
  convertToDateOverrides(
    events: GoogleWorkingLocationEvent[],
    defaultStartHour: number = 9,
    defaultEndHour: number = 17,
    timeZone: string = "UTC"
  ): Array<{ date: Date; startTime: Date; endTime: Date }> {
    const overrides: Array<{ date: Date; startTime: Date; endTime: Date }> = [];

    for (const event of events) {
      if (event.isAllDay) {
        // For all-day events, create availability for the default working hours
        // Note: Google Calendar all-day events end on the next day at midnight
        // So we need to subtract one day from the end date
        const startDay = dayjs(event.start).tz(timeZone);
        const endDay = dayjs(event.end).tz(timeZone).subtract(1, "day");

        // Create an override for each day in the range
        let currentDay = startDay;
        while (currentDay.isBefore(endDay) || currentDay.isSame(endDay, "day")) {
          const date = currentDay.startOf("day").toDate();
          // Create time as UTC time representing the hour of day
          const startTime = new Date(Date.UTC(1970, 0, 1, defaultStartHour, 0, 0));
          const endTime = new Date(Date.UTC(1970, 0, 1, defaultEndHour, 0, 0));

          overrides.push({ date, startTime, endTime });
          currentDay = currentDay.add(1, "day");
        }
      } else {
        // For timed events, use the specific time range
        const start = dayjs(event.start).tz(timeZone);
        const end = dayjs(event.end).tz(timeZone);

        // If the event spans multiple days, create multiple overrides
        let currentDay = start.startOf("day");
        const endDay = end.startOf("day");

        while (currentDay.isBefore(endDay) || currentDay.isSame(endDay, "day")) {
          const date = currentDay.startOf("day").toDate();

          // Calculate start and end times for this day
          const dayStart = currentDay.isSame(start, "day") ? start : currentDay.hour(0).minute(0);
          const dayEnd = currentDay.isSame(end, "day") ? end : currentDay.hour(23).minute(59);

          // Convert to UTC time format used by Availability model
          const startTime = new Date(Date.UTC(1970, 0, 1, dayStart.hour(), dayStart.minute(), 0));
          const endTime = new Date(Date.UTC(1970, 0, 1, dayEnd.hour(), dayEnd.minute(), 0));

          overrides.push({ date, startTime, endTime });
          currentDay = currentDay.add(1, "day");
        }
      }
    }

    return overrides;
  }

  /**
   * Sync a schedule with Google Calendar Working Location events
   * This will fetch events and update the schedule's availability (date overrides)
   */
  async syncSchedule(scheduleId: number): Promise<{ success: boolean; error?: string }> {
    log.info("Starting schedule sync", { scheduleId });

    try {
      // Fetch the schedule with its sync configuration
      const schedule = await this.prisma.schedule.findUnique({
        where: { id: scheduleId },
        select: {
          id: true,
          userId: true,
          timeZone: true,
          syncSource: true,
          syncConfig: true,
          syncCredentialId: true,
          syncCredential: {
            select: {
              id: true,
              type: true,
              key: true,
              userId: true,
              teamId: true,
              appId: true,
              invalid: true,
              delegationCredentialId: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!schedule) {
        return { success: false, error: "Schedule not found" };
      }

      if (schedule.syncSource !== GOOGLE_WORKING_LOCATION_SYNC_SOURCE) {
        return { success: false, error: "Schedule is not configured for Google Working Location sync" };
      }

      if (!schedule.syncCredential) {
        return { success: false, error: "No sync credential configured" };
      }

      if (schedule.syncCredential.invalid) {
        return { success: false, error: "Sync credential is invalid" };
      }

      const config = schedule.syncConfig as GoogleWorkingLocationSyncConfig | null;
      if (!config) {
        return { success: false, error: "No sync configuration found" };
      }

      // Fetch working location events from Google Calendar
      const events = await this.fetchWorkingLocationEvents(
        {
          ...schedule.syncCredential,
          delegatedTo: null, // Working location sync doesn't use delegation
        } as CredentialForCalendarServiceWithEmail,
        config.calendarId,
        config.locationTypes
      );

      // Filter by location label if specified
      const filteredEvents = config.locationLabel
        ? events.filter((e) => e.locationLabel === config.locationLabel)
        : events;

      // Convert to date overrides
      const timeZone = schedule.timeZone || "UTC";
      const dateOverrides = this.convertToDateOverrides(filteredEvents, 9, 17, timeZone);

      // Update the schedule's availability
      // First, delete existing date-based availability (overrides) for this schedule
      await this.prisma.availability.deleteMany({
        where: {
          scheduleId: schedule.id,
          date: { not: null }, // Only delete date overrides, not weekly availability
        },
      });

      // Create new date overrides from working location events
      if (dateOverrides.length > 0) {
        await this.prisma.availability.createMany({
          data: dateOverrides.map((override) => ({
            scheduleId: schedule.id,
            userId: schedule.userId,
            date: override.date,
            startTime: override.startTime,
            endTime: override.endTime,
            days: [],
          })),
        });
      }

      // Update sync timestamp
      await this.prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          syncLastAt: new Date(),
          syncError: null,
        },
      });

      log.info("Schedule sync completed", { scheduleId, overrideCount: dateOverrides.length });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      log.error("Schedule sync failed", { scheduleId, error: errorMessage });

      // Update sync error
      await this.prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          syncError: errorMessage,
        },
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Create a new schedule that syncs with Google Calendar Working Location
   */
  async createSyncedSchedule(params: {
    userId: number;
    name: string;
    timeZone: string;
    credentialId: number;
    config: GoogleWorkingLocationSyncConfig;
  }): Promise<Schedule> {
    log.info("Creating synced schedule", { userId: params.userId, name: params.name });

    // Validate the credential belongs to the user and is a Google Calendar credential
    const credential = await this.prisma.credential.findFirst({
      where: {
        id: params.credentialId,
        userId: params.userId,
        type: "google_calendar",
        invalid: { not: true },
      },
    });

    if (!credential) {
      throw new Error("Invalid or unauthorized Google Calendar credential");
    }

    // Create the schedule with sync configuration
    const schedule = await this.prisma.schedule.create({
      data: {
        userId: params.userId,
        name: params.name,
        timeZone: params.timeZone,
        syncSource: GOOGLE_WORKING_LOCATION_SYNC_SOURCE,
        syncCredentialId: params.credentialId,
        syncConfig: params.config as unknown as Prisma.InputJsonValue,
      },
    });

    // Perform initial sync
    await this.syncSchedule(schedule.id);

    return schedule;
  }

  /**
   * Disconnect a schedule from Google Working Location sync
   * This will remove the sync configuration but keep the availability data
   */
  async disconnectSync(scheduleId: number): Promise<void> {
    await this.prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        syncSource: null,
        syncCredentialId: null,
        syncConfig: Prisma.JsonNull,
        syncLastAt: null,
        syncError: null,
      },
    });
  }
}
