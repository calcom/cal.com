import React from "react";

import dayjs from "@calcom/dayjs";

import { useSchedulerStore } from "../../state/store";
import { SchedulerEvent } from "../../types/events";
import { Event } from "./Event";

type Props = {
  events: SchedulerEvent[];
  dayIdx: number;
  days: dayjs.Dayjs[];
  numberOfGridStopsPerCell: number;
  numberOfGridStopsPerDay: number;
};

export function EventList({ events, dayIdx, numberOfGridStopsPerCell, days }: Props) {
  const { startHour, currentlySelectedEvent, eventsDisabled, onEventClick } = useSchedulerStore((state) => ({
    startHour: state.startHour,
    currentlySelectedEvent: state.selectedEvent,
    eventsDisabled: state.eventsDisabled,
    onEventClick: state.onEventClick,
  }));
  return (
    <>
      {events
        .filter((event) =>
          dayjs(event.start).isBetween(days[dayIdx].startOf("day"), days[dayIdx].endOf("day"))
        )
        .map((event) => {
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
              <div
                className="sm:col-start-1s relative flex "
                style={{
                  gridRow: `${gridRowStart + 2} / span ${gridSpan}`,
                  // Need to figure out how to put this in a media query
                  gridColumnStart: dayIdx + 1,
                }}>
                <Event
                  onEventClick={onEventClick}
                  event={event}
                  eventDuration={eventDuration}
                  currentlySelectedEventId={currentlySelectedEvent?.id}
                  disabled={eventsDisabled}
                />
              </div>
            </>
          );
        })}
    </>
  );
}
