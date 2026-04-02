import dayjs from "@calcom/dayjs";
import type { TimeRange } from "@calcom/types/schedule";
import type { CalendarEvent } from "./types/events";

const startDate = dayjs().set("hour", 11).set("minute", 0);

export const events: CalendarEvent[] = [
  {
    id: 1,
    title: "Event 1",
    start: startDate.add(10, "minutes").toDate(),
    end: startDate.add(45, "minutes").toDate(),
    options: {
      allDay: false,
      color: "#ff0000",
      status: "ACCEPTED",
    },
    source: "Booking",
  },
  {
    id: 2,
    title: "Event 2",
    start: startDate.add(1, "day").toDate(),
    end: startDate.add(1, "day").add(30, "minutes").toDate(),
    source: "Booking",
    options: {
      status: "ACCEPTED",
      allDay: false,
    },
  },
  {
    id: 2,
    title: "Event 3",
    start: startDate.add(2, "day").toDate(),
    end: startDate.add(2, "day").add(60, "minutes").toDate(),
    source: "Booking",
    options: {
      status: "PENDING",
      color: "#ff0000",
      allDay: false,
    },
  },
  {
    id: 3,
    title: "Event 4",
    start: startDate.add(3, "day").toDate(),
    end: startDate.add(3, "day").add(2, "hour").add(30, "minutes").toDate(),
    source: "Booking",
    options: {
      status: "ACCEPTED",
      allDay: false,
    },
  },
  {
    id: 5,
    title: "Event 4 Overlap",
    start: startDate.add(3, "day").add(30, "minutes").toDate(),
    end: startDate.add(3, "day").add(2, "hour").add(45, "minutes").toDate(),
    source: "Booking",
    options: {
      status: "ACCEPTED",
      allDay: false,
    },
  },
];

export const blockingDates: TimeRange[] = [
  {
    start: startDate.add(1, "day").hour(10).toDate(),
    end: startDate.add(1, "day").hour(13).toDate(),
  },
];
