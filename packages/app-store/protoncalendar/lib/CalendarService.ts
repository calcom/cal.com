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

const log = logger.getSubLogger({ prefix: ["ProtonCalendarService"] });

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

const ALLOWED_HOSTNAMES = ["calendar.proton.me", "calendar.protonmail.com"];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_HOSTNAMES.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

/**
 * Redact ICS feed URL for logging to avoid leaking sensitive calendar data.
 */
function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}/***`;
  } catch {
    return "[invalid-url]";
  }
}

/**
 * Collect EXDATE values from a VEVENT component.
 * Proton Calendar uses EXDATE to mark cancelled occurrences of recurring events
 * rather than removing them from the feed.
 */
function getExdates(vevent: ICAL.Component): Set<string> {
  const exdates = new Set<string>();
  const props = vevent.getAllProperties("exdate");
  for (const prop of props) {
    const values = prop.getValues();
    for (const val of values) {
      if (val && typeof val.toJSDate === "function") {
        exdates.add(val.toJSDate().toISOString());
      }
    }
  }
  return exdates;
}

/**
 * Check if a VEVENT has STATUS:CANCELLED.
 * Proton Calendar keeps cancelled events in the ICS feed with STATUS:CANCELLED
 * instead of removing them. These should be filtered out to prevent phantom busy slots.
 */
function isCancelledEvent(vevent: ICAL.Component): boolean {
  const status = vevent.getFirstPropertyValue("status");
  return typeof status === "string" && status.toUpperCase() === "CANCELLED";
}

class ProtonCalendarService implements Calendar {
  private urls: string[] = [];
  protected integrationName = "proton-calendar_calendar";

  constructor(credential: CredentialPayload) {
    const { urls } = JSON.parse(symmetricDecrypt(credential.key as string, CALENDSO_ENCRYPTION_KEY));
    // Validate URLs at construction time as well
    this.urls = urls.filter((url: string) => {
      if (!isAllowedUrl(url)) {
        log.warn(`Rejecting non-Proton URL at construction: ${redactUrl(url)}`);
        return false;
      }
      return true;
    });
  }

  createEvent(_event: CalendarEvent, _credentialId: number): Promise<NewCalendarEventType> {
    log.warn("createEvent called on Proton Calendar (read-only) feed");
    return Promise.resolve({
      uid: _event.uid || "",
      type: this.integrationName,
      id: "",
      password: "",
      url: "",
      additionalInfo: { calWarnings: ["Proton Calendar feed is read-only"] },
    });
  }

  deleteEvent(_uid: string, _event: CalendarEvent, _externalCalendarId?: string): Promise<unknown> {
    log.warn("deleteEvent called on Proton Calendar (read-only) feed");
    return Promise.resolve();
  }

  updateEvent(
    _uid: string,
    _event: CalendarEvent,
    _externalCalendarId?: string
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    log.warn("updateEvent called on Proton Calendar (read-only) feed");
    return Promise.resolve({
      uid: _event.uid || "",
      type: this.integrationName,
      id: "",
      password: "",
      url: "",
      additionalInfo: { calWarnings: ["Proton Calendar feed is read-only"] },
    });
  }

  fetchCalendars = async (): Promise<{ url: string; vcalendar: ICAL.Component }[]> => {
    const reqPromises = await Promise.allSettled(this.urls.map((x) => fetch(x).then((y) => [x, y])));
    const reqs = reqPromises
      .filter((x) => x.status === "fulfilled")
      .map((x) => (x as PromiseFulfilledResult<[string, Response]>).value);

    for (const reqPromise of reqPromises) {
      if (reqPromise.status === "rejected") {
        log.error(`Failed to fetch Proton Calendar feed: ${reqPromise.reason}`);
      }
    }

    const res = await Promise.all(reqs.map((x) => x[1].text().then((y) => [x[0], y])));
    return res
      .map((x) => {
        try {
          const jcalData = ICAL.parse(x[1]);
          return {
            url: x[0],
            vcalendar: new ICAL.Component(jcalData),
          };
        } catch (e) {
          log.error(`Error parsing Proton Calendar ICS from ${redactUrl(x[0])}: ${e}`);
          return null;
        }
      })
      .filter((x) => x !== null) as { url: string; vcalendar: ICAL.Component }[];
  };

  getUserTimezoneFromDB = async (id: number): Promise<string | undefined> => {
    const prisma = await import("@calcom/prisma").then((mod) => mod.default);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { timeZone: true },
    });
    return user?.timeZone;
  };

  getUserId = (selectedCalendars: IntegrationCalendar[]): number | null => {
    if (selectedCalendars.length === 0) return null;
    return selectedCalendars[0].userId || null;
  };

  async getAvailability(params: GetAvailabilityParams): Promise<EventBusyDate[]> {
    const { dateFrom, dateTo, selectedCalendars } = params;
    const startISOString = new Date(dateFrom).toISOString();

    const calendars = await this.fetchCalendars();

    const userId = this.getUserId(selectedCalendars);
    const userTimeZone = userId ? await this.getUserTimezoneFromDB(userId) : "Europe/London";
    const events: { start: string; end: string; title: string }[] = [];

    calendars.forEach(({ vcalendar }) => {
      const vevents = vcalendar.getAllSubcomponents("vevent");
      vevents.forEach((vevent) => {
        // Proton-specific: filter out cancelled events (ghost events)
        if (isCancelledEvent(vevent)) return;

        const event = new ICAL.Event(vevent);
        const title = String(vevent.getFirstPropertyValue("summary"));
        const dtstartProperty = vevent.getFirstProperty("dtstart");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tzidFromDtstart = dtstartProperty ? (dtstartProperty as any).jCal[1].tzid : undefined;

        const dtstart: { [key: string]: string } | undefined = vevent?.getFirstPropertyValue("dtstart");
        const timezone = dtstart ? dtstart["timezone"] : undefined;
        const isUTC = timezone === "Z";

        const tzid: string | undefined =
          tzidFromDtstart || vevent?.getFirstPropertyValue("tzid") || (isUTC ? "UTC" : timezone);

        if (!vcalendar.getFirstSubcomponent("vtimezone")) {
          const timezoneToUse = tzid || userTimeZone;
          if (timezoneToUse) {
            try {
              const timezoneComp = new ICAL.Component("vtimezone");
              timezoneComp.addPropertyWithValue("tzid", timezoneToUse);
              const standard = new ICAL.Component("standard");

              const tzoffsetfrom = dayjs(event.startDate.toJSDate()).tz(timezoneToUse).format("Z");
              const tzoffsetto = dayjs(event.endDate.toJSDate()).tz(timezoneToUse).format("Z");

              standard.addPropertyWithValue("tzoffsetfrom", tzoffsetfrom);
              standard.addPropertyWithValue("tzoffsetto", tzoffsetto);
              standard.addPropertyWithValue("dtstart", "1601-01-01T00:00:00");
              timezoneComp.addSubcomponent(standard);
              vcalendar.addSubcomponent(timezoneComp);
            } catch (e) {
              log.debug("Error adding vtimezone", e);
            }
          } else {
            log.error("No timezone found for Proton Calendar event");
          }
        }

        let vtimezone = null;
        if (tzid) {
          const allVtimezones = vcalendar.getAllSubcomponents("vtimezone");
          vtimezone = allVtimezones.find((vtz) => vtz.getFirstPropertyValue("tzid") === tzid);
        }

        if (!vtimezone) {
          vtimezone = vcalendar.getFirstSubcomponent("vtimezone");
        }

        if (event.isRecurring()) {
          // Proton-specific: collect EXDATE values to skip cancelled occurrences
          const exdates = getExdates(vevent);

          let maxIterations = 365;
          if (["HOURLY", "SECONDLY", "MINUTELY"].includes(event.getRecurrenceTypes())) {
            log.error(`Won't handle [${event.getRecurrenceTypes()}] recurrence`);
            return;
          }

          const start = dayjs(dateFrom);
          const end = dayjs(dateTo);
          const startDate = ICAL.Time.fromDateTimeString(startISOString);
          startDate.hour = event.startDate.hour;
          startDate.minute = event.startDate.minute;
          startDate.second = event.startDate.second;
          const iterator = event.iterator(startDate);
          let current: ICAL.Time;
          let currentEvent;
          let currentStart = null;
          let currentError;

          while (
            maxIterations > 0 &&
            (currentStart === null || currentStart.isAfter(end) === false) &&
            (current = iterator.next())
          ) {
            maxIterations -= 1;

            try {
              currentEvent = event.getOccurrenceDetails(current);
            } catch (error) {
              if (error instanceof Error && error.message !== currentError) {
                currentError = error.message;
              }
            }
            if (!currentEvent) return;

            if (vtimezone) {
              const zone = new ICAL.Timezone(vtimezone);
              currentEvent.startDate = currentEvent.startDate.convertToZone(zone);
              currentEvent.endDate = currentEvent.endDate.convertToZone(zone);
            }

            currentStart = dayjs(currentEvent.startDate.toJSDate());

            // Proton-specific: skip occurrences that match an EXDATE
            const occurrenceISO = currentEvent.startDate.toJSDate().toISOString();
            if (exdates.has(occurrenceISO)) continue;

            if (currentStart.isBetween(start, end) === true) {
              events.push({
                start: currentStart.toISOString(),
                end: dayjs(currentEvent.endDate.toJSDate()).toISOString(),
                title,
              });
            }
          }
          if (maxIterations <= 0) {
            log.warn("Could not find any occurrence for recurring event in 365 iterations");
          }
          return;
        }

        if (vtimezone) {
          const zone = new ICAL.Timezone(vtimezone);
          event.startDate = event.startDate.convertToZone(zone);
          event.endDate = event.endDate.convertToZone(zone);
        }

        const finalStartISO = dayjs(event.startDate.toJSDate()).toISOString();
        const finalEndISO = dayjs(event.endDate.toJSDate()).toISOString();
        events.push({
          start: finalStartISO,
          end: finalEndISO,
          title,
        });
      });
    });

    return Promise.resolve(events);
  }

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
 */
export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new ProtonCalendarService(credential);
}
