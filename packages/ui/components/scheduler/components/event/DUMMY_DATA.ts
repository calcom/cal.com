import dayjs from "@calcom/dayjs";

import { SchedulerEvent } from "../../types/events";

export const DUMMY_DATA: SchedulerEvent[] = [
  {
    id: 1,
    title: "Event 1",
    start: new Date(),
    end: dayjs().add(1, "hour").toDate(),
    status: "ACCEPTED",
  },
];
