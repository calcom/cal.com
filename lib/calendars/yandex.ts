import { v4 as uuidv4 } from "uuid";
import { parseStringPromise } from "xml2js";
import { EventAttributes, Component } from "ics";
import { BasicTokenProvider } from "../tokenProvider";
import { CalDavClient } from "../calDav";
import { IntegrationCalendar, CalendarApiAdapter } from "../calendarClient";

type EventBusyDate = Record<"start" | "end", Date>;

export class YandexCalendar implements CalendarApiAdapter {
  private readonly calDav: CalDavClient;
  private readonly integrationName: string = "yandex_calendar";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(credential: unknown) {
    const tokenProvider: TokenProvider = new BasicTokenProvider({
      user: process.env.YANDEX_CALDAV_USER,
      password: process.env.YANDEX_CALDAV_PASSWORD,
    });

    this.calDav = new CalDavClient("https://caldav.yandex.ru", process.env.YANDEX_CALDAV_USER, tokenProvider);
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    const result = await this.calDav.propfind(
      "",
      `
      <d:propfind xmlns:d="DAV:" xmlns:cs="http://calendarserver.org/ns/">
        <allprop/>
      </d:propfind>
    `
    );

    const data = await parseStringPromise(result, { explicitArray: false });

    const calendars = data["D:multistatus"]["D:response"].reduce((accum, item) => {
      if (item["D:propstat"]["D:prop"]["D:resourcetype"]["C:calendar"]) {
        const hrefParts = (item?.href?._ ?? "").split("/").filter(Boolean);
        const id = hrefParts[hrefParts.length - 1];

        if (id) {
          accum.push({
            id,
            name: item["D:propstat"]["D:prop"]["D:displayname"],
          });
        }
      }

      return accum;
    }, []);

    return calendars.map(({ id, name }, index) => ({
      externalId: id,
      name,
      primary: index === 0,
      integration: this.integrationName,
    }));
  }

  private async findPrimaryCalendar() {
    const calendars = await this.listCalendars();

    const primaryCalendar = calendars.find(({ primary }) => primary);

    if (!primaryCalendar) {
      throw new Error("Can't find primary email");
    }

    return primaryCalendar;
  }

  private stripHtml(str: string) {
    return str
      .replace(/<br\s?\/>/g, "\n")
      .replace(/<a.+?href="mailto:.+?>(.+?)<\/a>/g, "$1")
      .replace(/<strong>|<\/strong>/g, "")
      .replace(/<br\s{0,}}]\/>/g, "")
      .replace(/<p.+?>|<\/p>/g, "");
  }

  private eventFromIcal(event: EventAttributes, vcalendar: Component) {
    return {
      uid: event.uid,
      summary: event.summary,
      description: event.description,
      location: event.location,
      sequence: event.sequence,
      startDate: event.startDate.toJSDate(),
      endDate: event.endDate.toJSDate(),
      duration: {
        weeks: event.duration.weeks,
        days: event.duration.days,
        hours: event.duration.hours,
        minutes: event.duration.minutes,
        seconds: event.duration.seconds,
        isNegative: event.duration.isNegative,
      },
      organizer: event.organizer,
      attendees: event.attendees.map((a) => a.getValues()),
      recurrenceId: event.recurrenceId,
      timezone: vcalendar.getFirstSubcomponent("vtimezone")
        ? vcalendar.getFirstSubcomponent("vtimezone").getFirstPropertyValue("tzid")
        : "",
    };
  }

  async getEvents(calId: string, dateFrom: string, dateTo: string): Promise<string, unknown> {
    const start = dateFrom.toString().replace(/-|:/g, "");
    const end = dateTo.toString().replace(/-|:/g, "");

    const body = `<?xml version="1.0" encoding="utf-8" ?>
      <C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
        <D:prop>
          <D:getetag/>
          <C:calendar-data>
            <C:comp name="">
              <C:comp name="VEVENT">
                <C:prop name="SUMMARY"/>
                <C:prop name="UID"/>
                <C:prop name="DTSTART"/>
                <C:prop name="DTEND"/>
                <C:prop name="DURATION"/>
                <C:prop name="RRULE"/>
                <C:prop name="RDATE"/>
                <C:prop name="EXRULE"/>
                <C:prop name="EXDATE"/>
                <C:prop name="RECURRENCE-ID"/>
              </C:comp>
              <C:comp name="VTIMEZONE"/>
            </C:comp>
          </C:calendar-data>
        </D:prop>
        <C:filter>
          <C:comp-filter name="VCALENDAR">
            <C:comp-filter name="VEVENT">
              <C:time-range start="${start}" end="${end}"/>
            </C:comp-filter>
          </C:comp-filter>
        </C:filter>
      </C:calendar-query>`;

    const eventsData = await this.calDav.report(calId, body);
    const data = await parseStringPromise(eventsData, { explicitArray: false });
    const eData = data["D:multistatus"]["D:response"];

    return (Array.isArray(eData) ? eData : [eData]).filter(Boolean).reduce((allEvents, item) => {
      const calData = item["D:propstat"]["D:prop"]["C:calendar-data"]._;
      const jcalData = ICAL.parse(calData);
      const vcalendar = new ICAL.Component(jcalData);
      const vevent = vcalendar.getFirstSubcomponent("vevent");
      const event = new ICAL.Event(vevent);

      const baseEventData = this.eventFromIcal(event, vcalendar);

      if (event.isRecurring()) {
        const foundEvents = CalDavClient.findRecurrentEventsBetweenDates(event, dateFrom, dateTo);

        for (const foundEvent of foundEvents) {
          allEvents.push({
            ...baseEventData,
            startDate: foundEvent.startDate,
            endDate: foundEvent.endDate,
          });
        }
      } else {
        allEvents.push(baseEventData);
      }

      return allEvents;
    }, []);
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    const selectedCalendarIds = selectedCalendars
      .filter((e) => e.integration === this.integrationName)
      .map((e) => e.externalId);

    const events = [];

    for (const calId of selectedCalendarIds) {
      const calEvents = await this.getEvents(calId, dateFrom, dateTo);

      for (const ev of calEvents) {
        events.push({ start: ev.startDate, end: ev.endDate });
      }
    }

    return events;
  }

  async createEvent(event: CalendarEvent): Promis<Record<string, unknown>> {
    const calendar = await this.findPrimaryCalendar();

    const uid = uuidv4();
    const body = await CalDavClient.buildIcs({
      uid,
      startInputType: "utc",
      start: CalDavClient.convertDate(event.startTime),
      duration: CalDavClient.getDutarion(event.startTime, event.endTime),
      title: event.title,
      description: this.stripHtml(event.description),
      location: event.location,
      organizer: { email: event.organizer.email, name: event.organizer.name },
      attendees: CalDavClient.getAttendees(event.attendees),
    });

    const response = await this.calDav.put(calendar.externalId, uid, body);

    return {
      ...response,
      disableConfirmationEmail: true,
    };
  }

  async updateEvent(uid: string, event: CalendarEvent): Promis<Record<string, unknown>> {
    const calendar = await this.findPrimaryCalendar();

    const body = await CalDavClient.buildIcs({
      uid,
      startInputType: "utc",
      start: CalDavClient.convertDate(event.startTime),
      duration: CalDavClient.getDutarion(event.startTime, event.endTime),
      title: event.title,
      description: event.description,
      location: event.location,
      organizer: { email: event.organizer.email, name: event.organizer.name },
      attendees: CalDavClient.getAttendees(event.attendees),
    });

    const response = await this.calDav.put(calendar.externalId, uid, body);

    return {
      ...response,
      disableConfirmationEmail: true,
    };
  }

  async deleteEvent(uid: string): Promise<void> {
    const calendar = await this.findPrimaryCalendar();

    await this.calDav.delete(calendar.externalId, uid);
  }
}
