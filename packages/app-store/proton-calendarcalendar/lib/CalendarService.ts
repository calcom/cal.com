/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../../../types/ical.d.ts"/>

import process from "node:process";
import dayjs from "@calcom/dayjs";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
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
const MAX_RECURRENCE_ITERATIONS = 365;
const FETCH_TIMEOUT_MS = 10_000;

const log = logger.getSubLogger({ prefix: ["app:proton-calendar"] });

const getTravelDurationInSeconds = (vevent: ICAL.Component) => {
  const travelDuration: ICAL.Duration = vevent.getFirstPropertyValue("x-apple-travel-duration");
  if (!travelDuration) return 0;
  try {
    const travelSeconds = travelDuration.toSeconds();
    if (!Number.isInteger(travelSeconds)) return 0;
    return travelSeconds;
  } catch {
    return 0;
  }
};

const applyTravelDuration = (event: ICAL.Event, seconds: number) => {
  if (seconds <= 0) return event;
  event.startDate.adjust(0, 0, 0, -seconds);
  return event;
};

class ProtonCalendarService implements Calendar {
  private urls: string[] = [];
  protected integrationName = "proton-calendar_calendar";

  constructor(credential: CredentialPayload) {
    if (!credential.key) {
      throw new ErrorWithCode(ErrorCode.InternalServerError, "Missing Proton Calendar credential key");
    }
    try {
      const parsed = JSON.parse(symmetricDecrypt(credential.key as string, CALENDSO_ENCRYPTION_KEY));
      const { urls } = parsed;
      if (!Array.isArray(urls) || !urls.every((u: unknown) => typeof u === "string")) {
        throw new Error("urls must be a string array");
      }
      this.urls = urls;
    } catch (error) {
      log.error("Failed to parse Proton Calendar credential key", error);
      this.urls = [];
    }
  }

  createEvent(_event: CalendarEvent, _credentialId: number): Promise<NewCalendarEventType> {
    log.warn("createEvent called on read-only Proton Calendar");
    return Promise.resolve({
      uid: _event.uid || "",
      type: this.integrationName,
      id: "",
      password: "",
      url: "",
      additionalInfo: { calWarnings: ["Proton Calendar is read-only"] },
    });
  }

  deleteEvent(_uid: string, _event: CalendarEvent, _externalCalendarId?: string): Promise<unknown> {
    log.warn("deleteEvent called on read-only Proton Calendar");
    return Promise.resolve({
      additionalInfo: { calWarnings: ["Proton Calendar is read-only"] },
    });
  }

  updateEvent(
    _uid: string,
    _event: CalendarEvent,
    _externalCalendarId?: string
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    log.warn("updateEvent called on read-only Proton Calendar");
    return Promise.resolve({
      uid: _event.uid || "",
      type: this.integrationName,
      id: "",
      password: "",
      url: "",
      additionalInfo: { calWarnings: ["Proton Calendar is read-only"] },
    });
  }

  fetchCalendars = async (): Promise<{ url: string; vcalendar: ICAL.Component }[]> => {
    const results: { url: string; vcalendar: ICAL.Component }[] = [];

    const settled = await Promise.allSettled(
      this.urls.map(async (url) => {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          redirect: "error",
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const text = await response.text();
        return { url, text };
      })
    );

    for (const result of settled) {
      if (result.status !== "fulfilled") {
        log.error("Failed to fetch Proton Calendar feed");
        continue;
      }
      try {
        const jcalData = ICAL.parse(result.value.text);
        results.push({
          url: result.value.url,
          vcalendar: new ICAL.Component(jcalData),
        });
      } catch {
        log.error("Failed to parse Proton Calendar ICS data");
      }
    }

    return results;
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
    const userTimeZone = (userId ? await this.getUserTimezoneFromDB(userId) : undefined) ?? "Europe/London";
    const events: { start: string; end: string; title: string }[] = [];

    calendars.forEach(({ vcalendar }) => {
      const cancelledInstances = new Set<string>();
      const vevents = vcalendar.getAllSubcomponents("vevent");

      for (const vevent of vevents) {
        const status = vevent.getFirstPropertyValue("status");
        if (typeof status === "string" && status.toUpperCase() === "CANCELLED") {
          const uid = vevent.getFirstPropertyValue("uid");
          const recurrenceId = vevent.getFirstPropertyValue("recurrence-id");
          if (uid && recurrenceId) {
            cancelledInstances.add(`${uid}:${recurrenceId}`);
          } else if (uid) {
            cancelledInstances.add(`${uid}`);
          }
        }
      }

      for (const vevent of vevents) {
        const status = vevent.getFirstPropertyValue("status");
        if (typeof status === "string" && status.toUpperCase() === "CANCELLED") continue;

        const uid = vevent.getFirstPropertyValue("uid");
        if (uid && cancelledInstances.has(`${uid}`)) continue;

        const event = new ICAL.Event(vevent);
        const title = String(vevent.getFirstPropertyValue("summary") || "Busy");
        const dtstartProperty = vevent.getFirstProperty("dtstart");
        const tzidFromDtstart = dtstartProperty ? dtstartProperty.getParameter("tzid") : undefined;

        const dtstart = vevent.getFirstPropertyValue<ICAL.Time | undefined>("dtstart");
        const timezone = dtstart?.timezone;
        const isUTC = timezone === "Z";

        const tzid: string | undefined = tzidFromDtstart || (isUTC ? "UTC" : timezone);

        const timezoneToUse = tzid || userTimeZone;
        if (timezoneToUse) {
          const allVtimezones = vcalendar.getAllSubcomponents("vtimezone");
          const hasMatchingTz = allVtimezones.some(
            (vtz) => vtz.getFirstPropertyValue("tzid") === timezoneToUse
          );
          if (!hasMatchingTz) {
            try {
              const timezoneComp = new ICAL.Component("vtimezone");
              timezoneComp.addPropertyWithValue("tzid", timezoneToUse);
              const standard = new ICAL.Component("standard");

              const utcOffset = dayjs(event.startDate.toJSDate()).tz(timezoneToUse).format("Z");
              standard.addPropertyWithValue("tzoffsetfrom", utcOffset);
              standard.addPropertyWithValue("tzoffsetto", utcOffset);
              standard.addPropertyWithValue("dtstart", "1601-01-01T00:00:00");
              timezoneComp.addSubcomponent(standard);
              vcalendar.addSubcomponent(timezoneComp);
            } catch {
              // Non-standard TZIDs from some providers
            }
          }
        }

        let vtimezone = null;
        if (tzid) {
          const allVtimezones = vcalendar.getAllSubcomponents("vtimezone");
          vtimezone = allVtimezones.find((vtz) => vtz.getFirstPropertyValue("tzid") === tzid);
        }

        applyTravelDuration(event, getTravelDurationInSeconds(vevent));

        if (event.isRecurring()) {
          let iterations = MAX_RECURRENCE_ITERATIONS;
          const dominated = ["HOURLY", "SECONDLY", "MINUTELY"];
          const recurrenceTypes = event.getRecurrenceTypes();
          if (Object.keys(recurrenceTypes).some((freq) => dominated.includes(freq))) {
            continue;
          }

          const start = dayjs(dateFrom);
          const end = dayjs(dateTo);
          const startDate = ICAL.Time.fromDateTimeString(startISOString);
          startDate.hour = event.startDate.hour;
          startDate.minute = event.startDate.minute;
          startDate.second = event.startDate.second;
          const iterator = event.iterator(startDate);
          let current: ICAL.Time;
          let currentEvent: ReturnType<ICAL.Event["getOccurrenceDetails"]> | undefined;
          let currentStart: ReturnType<typeof dayjs> | null = null;
          let currentError: string | undefined;

          while (
            iterations > 0 &&
            (currentStart === null || currentStart.isAfter(end) === false) &&
            (current = iterator.next())
          ) {
            iterations -= 1;

            currentEvent = undefined;
            try {
              currentEvent = event.getOccurrenceDetails(current);
            } catch (error) {
              if (error instanceof Error && error.message !== currentError) {
                currentError = error.message;
                log.error("Recurrence expansion error", error);
              }
            }
            if (!currentEvent) continue;

            const instanceKey = `${uid}:${currentEvent.startDate}`;
            if (cancelledInstances.has(instanceKey)) continue;

            if (vtimezone) {
              const zone = new ICAL.Timezone(vtimezone);
              currentEvent.startDate = currentEvent.startDate.convertToZone(zone);
              currentEvent.endDate = currentEvent.endDate.convertToZone(zone);
            }
            currentStart = dayjs(currentEvent.startDate.toJSDate());

            if (currentStart.isBetween(start, end, null, "[)") === true) {
              events.push({
                start: currentStart.toISOString(),
                end: dayjs(currentEvent.endDate.toJSDate()).toISOString(),
                title,
              });
            }
          }
          continue;
        }

        if (vtimezone) {
          const zone = new ICAL.Timezone(vtimezone);
          event.startDate = event.startDate.convertToZone(zone);
          event.endDate = event.endDate.convertToZone(zone);
        }

        events.push({
          start: dayjs(event.startDate.toJSDate()).toISOString(),
          end: dayjs(event.endDate.toJSDate()).toISOString(),
          title,
        });
      }
    });

    return events;
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    const vcals = await this.fetchCalendars();

    return vcals.map(({ url, vcalendar }) => {
      const name: string = vcalendar.getFirstPropertyValue("x-wr-calname") || "Proton Calendar";
      return {
        name,
        readOnly: true,
        externalId: url,
        integration: this.integrationName,
      };
    });
  }
}

export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new ProtonCalendarService(credential);
}
