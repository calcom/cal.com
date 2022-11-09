import dayjs from "@calcom/dayjs";

import { SchedulerEvent } from "./types/events";

const startDate = dayjs().add(2, "days").set("hour", 11).set("minute", 0);

export const Events: SchedulerEvent[] = [
  {
    id: 1,
    title: "Event 1",
    start: startDate.toDate(),
    end: startDate.add(1, "hour").toDate(),
    allDay: false,
    source: "Booking",
    status: "ACCEPTED",
  },
  {
    id: 2,
    title: "Event 2",
    start: startDate.add(1, "day").add(1, "hours").toDate(),
    end: startDate.add(1, "day").add(2, "hour").toDate(),
    allDay: false,
    source: "Booking",
    status: "ACCEPTED",
  },
];
