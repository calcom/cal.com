import React from "react";

import dayjs from "@calcom/dayjs";

import { useSchedulerStore } from "../../state/store";
import { SchedulerEvent } from "../../types/events";
import { Event } from "./Event";

type Props = {
  events: SchedulerEvent[];
  days: dayjs.Dayjs[];
  numberOfGridStopsPerCell: number;
};

export function EventList({ events, days, numberOfGridStopsPerCell }: Props) {
  const { startHour, currentlySelectedEvent, eventsDisabled } = useSchedulerStore((state) => ({
    startHour: state.startHour,
    currentlySelectedEvent: state.selectedEvent,
    eventsDisabled: state.eventsDisabled,
  }));
  return (
    <>
      {events.map((event) => {
        const foundDay = days.findIndex((day) => day.isSame(event.start, "day"));
        if (foundDay === -1) return null;

        // Calculate the start and the percentage of the day
        const eventStart = dayjs(event.start);
        const eventEnd = dayjs(event.end);
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
              <Event
                event={event}
                eventDuration={eventDuration}
                currentlySelectedEventId={currentlySelectedEvent?.id}
                disabled={eventsDisabled}
              />
            </li>
          </>
        );
      })}
    </>
  );
}
