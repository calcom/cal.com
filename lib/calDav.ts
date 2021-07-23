import ICAL from "ical.js";
import { createEvent, EventAttributes, DurationObject, Attendee } from "ics";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import localizedFormat from "dayjs/plugin/localizedFormat";

import { TokenProvider } from "./tokenProvider";

const RECURRENT_EVENTS_SEARCH_MAX_ITERATIONS = 1000;

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(toArray);
dayjs.extend(localizedFormat);

type NextRecurrentEvent = Record<"startDate" | "endDate", Date> | null;

export class CalDavClient {
  constructor(
    private readonly url: string,
    private readonly user: string,
    private readonly tokenProvider: TokenProvider
  ) {}

  static async buildIcs(inputEvent: EventAttributes): Promise<string> {
    return new Promise((resolve, reject) => {
      createEvent(inputEvent, (error, value) => {
        if (error) {
          return reject(error);
        }

        resolve(value);
      });
    });
  }

  static convertDate(date: string): number[] {
    return dayjs(date)
      .utc()
      .toArray()
      .slice(0, 6)
      .map((v, i) => (i === 1 ? v + 1 : v));
  }

  static getDutarion(start: string, end: string): DurationObject {
    return {
      minutes: dayjs(end).diff(dayjs(start), "minute"),
    };
  }

  static getAttendees(attendees: Record<"email" | "name", string>[]): Attendee[] {
    return attendees.map(({ email, name }) => ({ name, email, partstat: "NEEDS-ACTION" }));
  }

  static findNextRecurrentEvent(
    event: Record<string, unknown>,
    dateFrom: string,
    dateTo: string
  ): NextRecurrentEvent {
    const start = ICAL.Time.fromJSDate(new Date(dayjs(dateFrom).add(1, "day")));
    const end = ICAL.Time.fromJSDate(new Date(dateTo));

    const iter = event.iterator();

    let i = 0;
    let matched = null;

    while (i < RECURRENT_EVENTS_SEARCH_MAX_ITERATIONS) {
      const occurrence = event.getOccurrenceDetails(iter.next());

      if (occurrence.startDate.compare(start) > -1 && occurrence.endDate.compare(end) < 1) {
        matched = occurrence;
        break;
      }
      i++;
    }

    return matched
      ? {
          startDate: new Date(matched.startDate.toUnixTime() * 1000),
          endDate: new Date(matched.endDate.toUnixTime() * 1000),
        }
      : null;
  }

  async propfind(calId: string, body: string): Promise<string> {
    const { Authorization } = await this.tokenProvider.getAuthHeader();
    const response = await fetch(`${this.url}/calendars/${this.user}/${calId}`, {
      method: "PROPFIND",
      headers: {
        "Content-Type": "text/xml",
        Depth: "infinity",
        Prefer: "return-minimal",
        Authorization,
      },
      body,
    });

    if (response.status >= 300) {
      throw new Error("[CalDav] Failed to exec propfind");
    }

    return await response.text();
  }

  async put(calId: string, uid: string, iCalData: string): Promise<Record<"id" | "uid", number>> {
    const { Authorization } = await this.tokenProvider.getAuthHeader();

    const response = await fetch(`${this.url}/calendars/${this.user}/${calId}/${uid}.ics`, {
      method: "PUT",
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        Authorization,
      },
      body: iCalData,
    });

    if (response.status >= 300) {
      throw new Error("[CalDav] Failed to put object");
    }

    return { id: uid, uid };
  }

  async delete(calId: string, uid: string): Promise<void> {
    const { Authorization } = await this.tokenProvider.getAuthHeader();

    const response = await fetch(`${this.url}/calendars/${this.user}/${calId}/${uid}.ics`, {
      method: "DELETE",
      headers: {
        Authorization,
      },
    });

    if (response.status >= 300) {
      throw new Error("[CalDav] Failed to delete object");
    }
  }

  async report(calId: string, body: string): Promise<string> {
    const { Authorization } = await this.tokenProvider.getAuthHeader();

    const response = await fetch(`${this.url}/calendars/${this.user}/${calId}`, {
      method: "REPORT",
      headers: {
        "Content-Type": "text/xml",
        Depth: "infinity",
        Prefer: "return-minimal",
        Authorization,
      },
      body,
    });

    if (response.status >= 300) {
      throw new Error("[CalDav] Failed to exec report");
    }

    return await response.text();
  }
}
