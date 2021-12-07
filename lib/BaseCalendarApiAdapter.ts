import dayjs from "dayjs";
import { Attendee, DateArray, DurationObject } from "ics";

export type Person = { name: string; email: string; timeZone: string };

export class BaseCalendarApiAdapter {
  convertDate(date: string): DateArray {
    return dayjs(date)
      .utc()
      .toArray()
      .slice(0, 6)
      .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray;
  }

  getDuration(start: string, end: string): DurationObject {
    return {
      minutes: dayjs(end).diff(dayjs(start), "minute"),
    };
  }

  getAttendees(attendees: Person[]): Attendee[] {
    return attendees.map(({ email, name }) => ({ name, email, partstat: "NEEDS-ACTION" }));
  }
}
