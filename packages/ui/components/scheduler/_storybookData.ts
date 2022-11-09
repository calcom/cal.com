import dayjs from "@calcom/dayjs";

import { SchedulerEvent } from "./types/events";

const startDate = dayjs().add(2, "days").set("hour", 11).set("minute", 0);

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
];
