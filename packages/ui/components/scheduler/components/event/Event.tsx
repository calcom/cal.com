import React from "react";

import { SchedulerEvent } from "../../types/events";

type EventProps = {
  event: SchedulerEvent;
};

export function Event({ event }: EventProps) {
  return <div>Event</div>;
}
