import { useRef } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";

import { useCalendarStore } from "../../state/store";
import { Event } from "./Event";

type Props = {
  day: dayjs.Dayjs;
};

export function EventList({ day }: Props) {
  const { startHour, events, eventOnClick } = useCalendarStore(
    (state) => ({
      startHour: state.startHour,
      events: state.events,
      eventOnClick: state.onEventClick,
    }),
    shallow
  );

  // Use a ref so we dont trigger a re-render
  const longestRef = useRef<{
    start: Date;
    end: Date;
    duration: number;
    idx: number;
  } | null>(null);

  return (
    <>
      {events
        .filter((event) => {
          return dayjs(event.start).isSame(day, "day") && !event.options?.allDay; // Filter all events that are not allDay and that are on the current day
        })
        .map((event, idx, eventsArray) => {
          let width = 90;
          let marginLeft: string | number = 0;
          let right = 0;
          let zIndex = 61;

          const eventStart = dayjs(event.start);
          const eventEnd = dayjs(event.end);

          const eventDuration = eventEnd.diff(eventStart, "minutes");

          const eventStartHour = eventStart.hour();
          const eventStartDiff = (eventStartHour - (startHour || 0)) * 60 + eventStart.minute();
          const nextEvent = eventsArray[idx + 1];
          const prevEvent = eventsArray[idx - 1];

          if (!longestRef.current) {
            longestRef.current = {
              idx,
              start: eventStart.toDate(),
              end: eventEnd.toDate(),
              duration: eventDuration,
            };
          } else if (
            eventDuration > longestRef.current.duration &&
            eventStart.isBetween(longestRef.current.start, longestRef.current.end)
          ) {
            longestRef.current = {
              idx,
              start: eventStart.toDate(),
              end: eventEnd.toDate(),
              duration: eventDuration,
            };
          }

          if (longestRef.current.idx !== idx) {
            if (nextEvent) {
              const nextStart = dayjs(nextEvent.start);
              if (nextStart.isBetween(longestRef.current.start, longestRef.current.end)) {
                zIndex = 65;
                marginLeft = "auto";
                right = 4;
                width = width / 2;
              } else if (nextStart.isSame(longestRef.current.start, "hour")) {
                const minDiff = nextStart.diff(longestRef.current.start, "minutes");
                if (minDiff < 5 || minDiff > -5) {
                  zIndex = 65;
                  marginLeft = "auto";
                  right = 4;
                  width = width / 2;
                }
              }
            } else if (prevEvent) {
              const prevStart = dayjs(prevEvent.start);
              if (prevStart.isBetween(longestRef.current.start, longestRef.current.end)) {
                zIndex = 65;
                marginLeft = "auto";
                right = 4;
                width = width / 2;
              } else if (prevStart.isSame(longestRef.current.start, "hour")) {
                const minDiff = prevStart.diff(longestRef.current.start, "minutes");
                if (minDiff < 5 || minDiff > -5) {
                  zIndex = 65;
                  marginLeft = "auto";
                  right = 4;
                  width = width / 2;
                }
              }
            }
          }

          return (
            <div
              key={`${event.id}-${eventStart.toISOString()}`}
              className="absolute inset-x-1 "
              style={{
                marginLeft,
                zIndex,
                right: `calc(${right}% - 1px)`,
                width: `${width}%`,
                top: `calc(${eventStartDiff}*var(--one-minute-height))`,
                height: `calc(${eventDuration}*var(--one-minute-height))`,
              }}>
              <Event
                event={{
                  ...event,
                  description: longestRef.current.duration.toLocaleString(),
                }}
                eventDuration={eventDuration}
                onEventClick={eventOnClick}
              />
            </div>
          );
        })}
    </>
  );
}
