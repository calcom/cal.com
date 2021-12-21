import dayjs from "dayjs";
import { Attendee, DateArray, DurationObject, Person } from "ics";

import { ATTENDEE_NEEDS_ACTION } from "../constants/generals";

export const convertDate = (date: string): DateArray =>
  dayjs(date)
    .utc()
    .toArray()
    .slice(0, 6)
    .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray;

export const getDuration = (start: string, end: string): DurationObject => ({
  minutes: dayjs(end).diff(dayjs(start), "minute"),
});

export const getAttendees = (attendees: Person[]): Attendee[] =>
  attendees.map(({ email, name }) => ({ name, email, partstat: ATTENDEE_NEEDS_ACTION }));
