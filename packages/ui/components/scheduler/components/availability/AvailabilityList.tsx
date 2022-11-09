import React from "react";

import dayjs from "@calcom/dayjs";

import { useSchedulerStore } from "../../state/store";
import { Availability } from "./Availability";

type Props = {
  days: dayjs.Dayjs[];
  numberOfGridStopsPerCell: number;
};

export function AvailabilityList({ days, numberOfGridStopsPerCell }: Props) {
  const { startHour, availability } = useSchedulerStore((state) => ({
    startHour: state.startHour,
    availability: state.availability,
  }));
  return (
    <>
      {availability &&
        availability.map((event, i) => {
          const foundDay = days.findIndex((day) => day.get("d") === i);
          if (foundDay === -1) return null;
          // Only supports on availbility for now? TODO: support multiple
          // TODO: This logic is repeated for anyhing we need to put on the calendar extract it
          if (!(event[0] || event[0])) return null;

          const eventStart = dayjs(event[0].start);
          const eventEnd = dayjs(event[0].end);
          const eventStartHour = eventStart.hour();
          const eventStartDiff = eventStartHour - (startHour || 0);

          // if (eventStart.isBefore(calendarDayStart) || eventEnd.isAfter(calendarDayEnd)) return null;

          const eventDuration = eventEnd.diff(eventStart, "minutes");
          const gridSpan = Math.round(eventDuration / (60 / numberOfGridStopsPerCell));
          const gridRowStart = eventStartDiff * numberOfGridStopsPerCell;

          return (
            <>
              <li
                className="sm:col-start-1s relative flex "
                style={{
                  gridRow: `${gridRowStart + 2} / span ${gridSpan}`,
                  // Need to figure out how to put this in a media query
                  gridColumnStart: foundDay + 1,
                }}>
                <Availability eventDuration={eventDuration} />
              </li>
            </>
          );
        })}
    </>
  );
}
