import dayjs from "@calcom/dayjs";
import { Schedule, TimeRange } from "@calcom/types/schedule";

import { SchedulerEvent } from "./types/events";

const startDate = dayjs().add(1, "days").set("hour", 11).set("minute", 0);

export const Events: SchedulerEvent[] = [
  {
    id: 1,
    title: "Event 1",
    start: startDate.toDate(),
    end: startDate.add(15, "minutes").toDate(),
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
];

export const defaultDayRange: TimeRange = {
  start: new Date(new Date().setUTCHours(9, 0, 0, 0)),
  end: new Date(new Date().setUTCHours(17, 0, 0, 0)),
};

export const DEFAULT_SCHEDULE: Schedule = [
  [],
  [defaultDayRange],
  [defaultDayRange],
  [defaultDayRange],
  [defaultDayRange],
  [defaultDayRange],
  [],
];
