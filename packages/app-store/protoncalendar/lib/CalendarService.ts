/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../../../types/ical.d.ts"/>

import process from "node:process";
import dayjs from "@calcom/dayjs";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  GetAvailabilityParams,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import ICAL from "ical.js";

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

/**
 * Proton Calendar integration for Cal.com.
 *
 * Supports two connection modes:
 * 1. ICS Feed (read-only) — users provide ICS export URLs from Proton Calendar settings
 * 2. CalDAV (read-write) — users provide CalDAV bridge credentials
 *
 * Proton Calendar is an end-to-end encrypted calendar by Proton AG.
 */

interface ProtonCalendarCredential {
  /** ICS feed URLs (read-only mode) */
  urls?: string[];
  /** CalDAV server URL (read-write mode) */
  caldavUrl?: string;
  /** CalDAV username (typically Proton email) */
  caldavUsername?: string;
  /** CalDAV app password */
  caldavPassword?: string;
}

class ProtonCalendarService implements Calendar {
  private urls: string[] = [];
  private caldavUrl: string | null = null;
  private caldavUsername: string | null = null;
  private caldavPassword: string | null = null;
  protected integrationName = "proton_calendar";
  private log = logger.getChildLogger({ prefix: ["ProtonCalendarService"] });

  constructor(credential: CredentialPayload) {
    try {
      const decrypted = symmetricDecrypt(
        credential.key as string,
        CALENDSO_ENCRYPTION_KEY
      );
      const data: ProtonCalendarCredential = JSON.parse(decrypted);

      if (data.urls && Array.isArray(data.urls)) {
        this.urls = data.urls.filter(Boolean);
      }

      if (data.caldavUrl) {
        this.caldavUrl = data.caldavUrl;
        this.caldavUsername = data.caldavUsername || null;
        this.caldavPassword = data.caldavPassword || null;
      }
    } catch (error) {
      this.log.error("Failed to decrypt Proton Calendar credential", error);
    }
  }

  /**
   * ICS feed is read-only — warn and return empty result.
   * For CalDAV mode, this would create events, but Proton's CalDAV bridge is currently
   * limited to read operations in most configurations.
   */
  createEvent(
    _event: CalendarEvent,
    _credentialId: number
  ): Promise<NewCalendarEventType> {
    this.log.warn("createEvent called on Proton Calendar (read-only via ICS)");
    return Promise.resolve({
      uid: _event.uid || "",
      type: this.integrationName,
      id: "",
      password: "",
      url: "",
      additionalInfo: {
        calWarnings: [
          "Proton Calendar ICS feed is read-only. Use Proton's CalDAV bridge for two-way sync.",
        ],
      },
    });
  }

  /**
   * Delete event — not supported in ICS mode.
   */
  deleteEvent(
    _uid: string,
    _event: CalendarEvent,
    _externalCalendarId?: string
  ): Promise<unknown> {
    this.log.warn("deleteEvent called on Proton Calendar (read-only via ICS)");
    return Promise.resolve();
  }

  /**
   * Update event — not supported in ICS mode.
   */
  updateEvent(
    _uid: string,
    _event: CalendarEvent,
    _externalCalendarId?: string
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    this.log.warn("updateEvent called on Proton Calendar (read-only via ICS)");
    return Promise.resolve({
      uid: _event.uid || "",
      type: this.integrationName,
      id: "",
      password: "",
      url: "",
      additionalInfo: {
        calWarnings: [
          "Proton Calendar ICS feed is read-only. Use Proton's CalDAV bridge for two-way sync.",
        ],
      },
    });
  }

  /**
   * Fetch ICS calendar data from all configured URLs.
   * Returns parsed iCalendar components with their source URLs.
   */
  private fetchCalendars = async (): Promise<
    { url: string; vcalendar: ICAL.Component }[]
  > => {
    if (this.urls.length === 0) {
      this.log.warn(
        "No ICS feed URLs configured for Proton Calendar. Did the user add calendar URLs?"
      );
      return [];
    }

    const fetchPromises = await Promise.allSettled(
      this.urls.map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch ICS feed from ${url}: ${response.status} ${response.statusText}`
          );
        }
        const text = await response.text();
        return { url, text };
      })
    );

    const results: { url: string; vcalendar: ICAL.Component }[] = [];

    for (const result of fetchPromises) {
      if (result.status === "fulfilled") {
        const { url, text } = result.value;
        try {
          const jcalData = ICAL.parse(text);
          const vcalendar = new ICAL.Component(jcalData);
          results.push({ url, vcalendar });
        } catch (error) {
          this.log.error(
            `Error parsing ICS calendar from ${url}:`,
            error
          );
        }
      } else {
        this.log.error(
          "Failed to fetch ICS feed:",
          result.reason
        );
      }
    }

    return results;
  };

  /**
   * Retrieve user timezone from the database.
   */
  private getUserTimezoneFromDB = async (
    id: number
  ): Promise<string | undefined> => {
    try {
      const prisma = (await import("@calcom/prisma")).default;
      const user = await prisma.user.findUnique({
        where: { id },
        select: { timeZone: true },
      });
      return user?.timeZone;
    } catch (error) {
      this.log.error("Failed to fetch user timezone:", error);
      return undefined;
    }
  };

  /**
   * Extract user ID from the first selected calendar.
   */
  private getUserId = (
    selectedCalendars: IntegrationCalendar[]
  ): number | null => {
    if (selectedCalendars.length === 0) return null;
    return selectedCalendars[0].userId || null;
  };

  /**
   * Get availability/busy time from Proton Calendar.
   *
   * Fetches ICS feed(s), parses all events in the given date range,
   * and returns them as busy time slots. Handles both single and
   * recurring events with proper timezone support.
   */
  async getAvailability(
    params: GetAvailabilityParams
  ): Promise<EventBusyDate[]> {
    const { dateFrom, dateTo, selectedCalendars } = params;
    const startISOString = new Date(dateFrom).toISOString();
    const calendars = await this.fetchCalendars();

    if (calendars.length === 0) {
      this.log.warn("No Proton Calendar ICS feeds available to fetch events");
      return [];
    }

    const userId = this.getUserId(selectedCalendars);
    const userTimeZone = userId
      ? (await this.getUserTimezoneFromDB(userId)) || "Europe/London"
      : "Europe/London";

    const events: EventBusyDate[] = [];

    for (const { vcalendar } of calendars) {
      const vevents = vcalendar.getAllSubcomponents("vevent");

      for (const vevent of vevents) {
        // Skip transparent (free) events
        if (vevent.getFirstPropertyValue("transp") === "TRANSPARENT") continue;

        const icalEvent = new ICAL.Event(vevent);
        const dtstartProperty = vevent.getFirstProperty("dtstart");
        const tzidFromDtstart = dtstartProperty
          ? (dtstartProperty as unknown as { jCal: [string, Record<string, string>] }).jCal[1]?.tzid
          : undefined;
        const dtstart = vevent.getFirstPropertyValue("dtstart") as
          | Record<string, string>
          | undefined;
        const tzidFromProp = dtstart?.timezone;
        const isUTC = tzidFromProp === "Z";
        const tzid =
          tzidFromDtstart ||
          tzidFromProp ||
          vevent.getFirstPropertyValue("tzid") ||
          (isUTC ? "UTC" : undefined);

        // Ensure vtimezone component exists
        if (tzid && !vcalendar.getFirstSubcomponent("vtimezone")) {
          try {
            const vtimezoneComp = new ICAL.Component("vtimezone");
            vtimezoneComp.addPropertyWithValue("tzid", tzid);
            const standard = new ICAL.Component("standard");
            const tzoffsetfrom = dayjs
              .tz(icalEvent.startDate.toJSDate(), tzid)
              .format("Z");
            const tzoffsetto = dayjs
              .tz(icalEvent.endDate.toJSDate(), tzid)
              .format("Z");
            standard.addPropertyWithValue("tzoffsetfrom", tzoffsetfrom);
            standard.addPropertyWithValue("tzoffsetto", tzoffsetto);
            standard.addPropertyWithValue("dtstart", "1601-01-01T00:00:00");
            vtimezoneComp.addSubcomponent(standard);
            vcalendar.addSubcomponent(vtimezoneComp);
          } catch (error) {
            this.log.error("Error adding vtimezone:", error);
          }
        }

        // Resolve vtimezone for the event's timezone
        let vtimezone = null;
        if (tzid) {
          vtimezone = vcalendar
            .getAllSubcomponents("vtimezone")
            .find((vtz) => vtz.getFirstPropertyValue("tzid") === tzid);
        }
        if (!vtimezone) {
          vtimezone = vcalendar.getFirstSubcomponent("vtimezone");
        }

        if (icalEvent.isRecurring()) {
          let maxIterations = 365;
          if (
            ["HOURLY", "SECONDLY", "MINUTELY"].includes(
              icalEvent.getRecurrenceTypes()
            )
          ) {
            this.log.error(
              `Won't handle [${icalEvent.getRecurrenceTypes()}] recurrence`
            );
            continue;
          }

          const start = dayjs(dateFrom);
          const end = dayjs(dateTo);
          const searchStart = ICAL.Time.fromDateTimeString(startISOString);
          searchStart.hour = icalEvent.startDate.hour;
          searchStart.minute = icalEvent.startDate.minute;
          searchStart.second = icalEvent.startDate.second;

          const iterator = icalEvent.iterator(searchStart);
          let occurrence: ICAL.Time | null;
          let iterationCount = 0;

          while (
            maxIterations > 0 &&
            (occurrence = iterator.next()) !== null
          ) {
            maxIterations -= 1;
            iterationCount += 1;

            try {
              const occurrenceDetails =
                icalEvent.getOccurrenceDetails(occurrence);
              let occurrenceStart = occurrenceDetails.startDate;
              let occurrenceEnd = occurrenceDetails.endDate;

              // Apply timezone
              if (vtimezone) {
                const zone = new ICAL.Timezone(vtimezone);
                occurrenceStart = occurrenceStart.convertToZone(zone);
                occurrenceEnd = occurrenceEnd.convertToZone(zone);
              }

              const startDayjs = dayjs(occurrenceStart.toJSDate());
              const endDayjs = dayjs(occurrenceEnd.toJSDate());

              if (
                startDayjs.isAfter(start) &&
                startDayjs.isBefore(end)
              ) {
                events.push({
                  start: startDayjs.toISOString(),
                  end: endDayjs.toISOString(),
                });
              }

              // Stop if we've passed the end date
              if (startDayjs.isAfter(end)) break;
            } catch (error) {
              if (
                error instanceof Error &&
                !error.message.includes(iterationCount.toString())
              ) {
                this.log.error(
                  `Error processing recurring event occurrence #${iterationCount}:`,
                  error.message
                );
              }
            }
          }

          if (maxIterations <= 0) {
            this.log.warn(
              "Exceeded max iterations for recurring event in Proton Calendar"
            );
          }
          continue;
        }

        // Non-recurring event
        if (vtimezone) {
          const zone = new ICAL.Timezone(vtimezone);
          icalEvent.startDate.forEach((date) => {
            date.convertToZone(zone);
          });
          icalEvent.endDate.forEach((date) => {
            date.convertToZone(zone);
          });
        }

        events.push({
          start: dayjs(icalEvent.startDate.toJSDate()).toISOString(),
          end: dayjs(icalEvent.endDate.toJSDate()).toISOString(),
        });
      }
    }

    return Promise.resolve(events);
  }

  /**
   * List all Proton Calendar ICS feeds as calendars.
   * Uses the calendar name from the ICS feed (x-wr-calname) if available.
   */
  async listCalendars(): Promise<IntegrationCalendar[]> {
    const vcals = await this.fetchCalendars();

    return vcals.map(({ url, vcalendar }) => {
      const name: string =
        vcalendar.getFirstPropertyValue("x-wr-calname") || "Proton Calendar";
      return {
        name,
        readOnly: true,
        externalId: url,
        integration: this.integrationName,
      };
    });
  }
}

/**
 * Factory function that creates a Proton Calendar service instance.
 * Exported as a function instead of the class to prevent internal types
 * from leaking into the emitted .d.ts file.
 */
export default function BuildCalendarService(
  credential: CredentialPayload
): Calendar {
  return new ProtonCalendarService(credential);
}
