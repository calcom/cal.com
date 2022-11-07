import dayjs from "@calcom/dayjs";

import { SchedulerEvent } from "./types/events";

const startDate = dayjs().add(2, "D").set("hour", 11).set("minute", 0);

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
];
