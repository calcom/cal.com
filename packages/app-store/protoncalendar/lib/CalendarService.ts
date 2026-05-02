/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../../../types/ical.d.ts"/>

import process from "node:process";
import dayjs from "@calcom/dayjs";
import { symmetricDecrypt } from "@calcom/lib/crypto";
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

// Proton Calendar only provides read-only ICS feeds
// Proton keeps cancelled events in the feed with STATUS:CANCELLED
// and uses EXDATE for cancelled occurrences of recurring events

const CALENDSO_ENCRYPTION_KEY: string = process.env.CALENDSO_ENCRYPTION_KEY || "";

class ProtonCalendarService implements Calendar {
  private urls: string[] = [];
  protected integrationName = "proton_calendar";

  constructor(credential: CredentialPayload) {
    const { urls } = JSON.parse(symmetricDecrypt(credential.key as string, CALENDSO_ENCRYPTION_KEY));
    this.urls = urls;
  }

  createEvent(_event: CalendarEvent, _credentialId: number): Promise<NewCalendarEventType> {
    console.warn("createEvent called on Proton Calendar (read-only)");
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
    console.warn("deleteEvent called on Proton Calendar (read-only)");
    return Promise.resolve();
  }

  updateEvent(
    _uid: string,
    _event: CalendarEvent,
    _externalCalendarId?: string
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    console.warn("updateEvent called on Proton Calendar (read-only)");
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
    const reqPromises = await Promise.allSettled(this.urls.map((x) => fetch(x).then((y) => [x, y])));
    const reqs = reqPromises
      .filter((x) => x.status === "fulfilled")
      .map((x) => (x as PromiseFulfilledResult<[string, Response]>).value);
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
          console.error("Error parsing calendar object: ", e);
          return null;
        }
      })
      .filter((x) => x !== null) as { url: string; vcalendar: ICAL.Component }[];
  };

  /**
   * Get cancelled EXDATE values for a recurring event
   */
  getExdates(vevent: ICAL.Component): string[] {
    const exdates: string[] = [];
    const exdateProps = vevent.getAllProperties("exdate");
    exdateProps.forEach((prop) => {
      const exdateTime = prop.getFirstValue();
      if (exdateTime) {
        exdates.push(exdateTime.toString());
      }
    });
    return exdates;
  }

  /**
   * Check if an event is cancelled (Proton keeps cancelled events with STATUS:CANCELLED)
   */
  isEventCancelled(vevent: ICAL.Component): boolean {
    const status = vevent.getFirstPropertyValue("status");
    return status === "CANCELLED";
  }

  /**
   * Check if a recurring event occurrence is cancelled via EXDATE
   */
  isOccurrenceCancelled(occurrenceDate: string, exdates: string[]): boolean {
    return exdates.includes(occurrenceDate);
  }

  getUserTimezoneFromDB = async (id: number): Promise<string | undefined> => {
    const prisma = await import("@calcom/prisma").then((mod) => mod.default);
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        timeZone: true,
      },
    });
    return user?.timeZone;
  };

  getUserId = (selectedCalendars: IntegrationCalendar[]): number | null => {
    if (selectedCalendars.length === 0) {
      return null;
    }
    return selectedCalendars[0].userId || null;
  };

  async getAvailability(params: GetAvailabilityParams): Promise<EventBusyDate[]> {
    const { dateFrom, dateTo, selectedCalendars } = params;
    const startISOString = new Date(dateFrom).toISOString();

    const calendars = await this.fetchCalendars();

    const userId = this.getUserId(selectedCalendars);
    let userTimeZone: string;
    if (userId) {
      const tz = await this.getUserTimezoneFromDB(userId);
      userTimeZone = tz || "Europe/London";
    } else {
      userTimeZone = "Europe/London";
    }
    const events: { start: string; end: string; title: string }[] = [];

    calendars.forEach(({ vcalendar }) => {
      const vevents = vcalendar.getAllSubcomponents("vevent");
      vevents.forEach((vevent) => {
        // Skip cancelled events (Proton-specific: keeps them with STATUS:CANCELLED)
        if (this.isEventCancelled(vevent)) {
          return;
        }

        const event = new ICAL.Event(vevent);
        const title = String(vevent.getFirstPropertyValue("summary"));
        const dtstartProperty = vevent.getFirstProperty("dtstart");
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
              console.log("error in adding vtimezone", e);
            }
          } else {
            console.error("No timezone found");
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

        // Get EXDATE values for recurring events
        const exdates = this.getExdates(vevent);

        if (event.isRecurring()) {
          let maxIterations = 365;
          if (["HOURLY", "SECONDLY", "MINUTELY"].includes(event.getRecurrenceTypes())) {
            console.error(`Won't handle [${event.getRecurrenceTypes()}] recurrence`);
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
              continue;
            }
            if (!currentEvent) return;

            // Check if this occurrence is cancelled via EXDATE
            const occurrenceDateStr = current.toString();
            if (this.isOccurrenceCancelled(occurrenceDateStr, exdates)) {
              continue;
            }

            if (vtimezone) {
              const zone = new ICAL.Timezone(vtimezone);
              currentEvent.startDate = currentEvent.startDate.convertToZone(zone);
              currentEvent.endDate = currentEvent.endDate.convertToZone(zone);
            }
            currentStart = dayjs(currentEvent.startDate.toJSDate());

            if (currentStart.isBetween(start, end) === true) {
              events.push({
                start: currentStart.toISOString(),
                end: dayjs(currentEvent.endDate.toJSDate()).toISOString(),
                title,
              });
            }
          }
          if (maxIterations <= 0) {
            console.warn("could not find any occurrence for recurring event in 365 iterations");
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
