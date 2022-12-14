import dayjs from "@calcom/dayjs";
import { TimeRange } from "@calcom/types/schedule";

import { CalendarEvent } from "./types/events";

const startDate = dayjs().set("hour", 11).set("minute", 0);

export const events: CalendarEvent[] = [
  {
    id: 1,
    title: "Event 1",
    start: startDate.add(10, "minutes").toDate(),
    end: startDate.add(45, "minutes").toDate(),
    allDay: false,
    source: "Booking",
    status: "ACCEPTED",
  },
  {
    id: 2,
    title: "Event 2",
    start: startDate.add(1, "day").toDate(),
    end: startDate.add(1, "day").add(30, "minutes").toDate(),
    allDay: false,
    source: "Booking",
    status: "ACCEPTED",
  },
  {
    id: 2,
    title: "Event 3",
    start: startDate.add(2, "day").toDate(),
    end: startDate.add(2, "day").add(60, "minutes").toDate(),
    allDay: false,
    source: "Booking",
    status: "ACCEPTED",
  },
  {
    id: 3,
    title: "Event 4",
    start: startDate.add(3, "day").toDate(),
    end: startDate.add(3, "day").add(2, "hour").add(30, "minutes").toDate(),
    allDay: false,
    source: "Booking",
    status: "ACCEPTED",
  },
  {
    id: 5,
    title: "Event 4 Overlap",
    start: startDate.add(3, "day").add(30, "minutes").toDate(),
    end: startDate.add(3, "day").add(2, "hour").add(45, "minutes").toDate(),
    allDay: false,
    source: "Booking",
    status: "ACCEPTED",
  },
  {
    id: 4,
    title: "Event 1 Overlap",
    start: startDate.toDate(),
    end: startDate.add(30, "minutes").toDate(),
    allDay: false,
    source: "Booking",
    status: "ACCEPTED",
  },
  {
    id: 6,
    title: "Event 1 Overlap Two",
    start: startDate.toDate(),
    end: startDate.add(30, "minutes").toDate(),
    allDay: false,
    source: "Booking",
    status: "ACCEPTED",
  },
];

export const blockingDates: TimeRange[] = [
  {
    start: startDate.add(1, "day").hour(10).toDate(),
    end: startDate.add(1, "day").hour(13).toDate(),
  },
];
