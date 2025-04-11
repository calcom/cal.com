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
          const eventStart = dayjs(event.start);
          const eventEnd = dayjs(event.end);
          const beforeEventBuffer = event.options?.beforeEventBuffer || 0;
          const afterEventBuffer = event.options?.afterEventBuffer || 0;

          if (beforeEventBuffer === 0 && afterEventBuffer === 0) {
            let width = 90;
            let marginLeft: string | number = 0;
            let right = 0;
            let zIndex = 61;

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
            // By default longest event doesnt have any styles applied
            if (longestRef.current.idx !== idx) {
              if (nextEvent) {
                // If we have a next event
                const nextStart = dayjs(nextEvent.start);
                // If the next event is inbetween the longest start and end make 65% width
                if (nextStart.isBetween(longestRef.current.start, longestRef.current.end)) {
                  zIndex = 65;
                  marginLeft = "auto";
                  right = 4;
                  width = width / 2;

                  // If not - we check to see if the next starts within 5 mins of this event - allowing us to do side by side events whenwe have
                  // close start times
                } else if (nextStart.isBetween(eventStart.add(-5, "minutes"), eventStart.add(5, "minutes"))) {
                  zIndex = 65;
                  marginLeft = "auto";
                  right = 4;
                  width = width / 2;
                }
              } else if (prevEvent) {
                const prevStart = dayjs(prevEvent.start);

                // If the next event is inbetween the longest start and end make 65% width

                if (prevStart.isBetween(longestRef.current.start, longestRef.current.end)) {
                  zIndex = 65;
                  marginLeft = "auto";
                  right = 4;
                  // If not - we check to see if the next starts within 5 mins of this event - allowing us to do side by side events whenwe have
                  // close start times (Inverse of above )
                } else if (eventStart.isBetween(prevStart.add(5, "minutes"), prevStart.add(-5, "minutes"))) {
                  zIndex = 65;
                  right = 4;
                  width = width / 2;
                }
              }
            }

            return (
              <div
                key={`${event.id}-${eventStart.toISOString()}`}
                className="absolute inset-x-1 "
                data-testid={event.options?.["data-test-id"]}
                style={{
                  marginLeft,
                  zIndex,
                  right: `calc(${right}% - 1px)`,
                  width: `${width}%`,
                  top: `calc(${eventStartDiff}*var(--one-minute-height))`,
                  height: `calc(${eventDuration}*var(--one-minute-height))`,
                }}>
                <Event event={event} eventDuration={eventDuration} onEventClick={eventOnClick} />
              </div>
            );
          }

          const actualEventStart = eventStart.add(beforeEventBuffer, "minutes");
          const actualEventEnd = eventEnd.subtract(afterEventBuffer, "minutes");

          const segments = [];

          if (beforeEventBuffer > 0) {
            const preBufferStartDiff = (eventStart.hour() - (startHour || 0)) * 60 + eventStart.minute();
            segments.push(
              <div
                key={`${event.id}-pre-buffer-${eventStart.toISOString()}`}
                className="absolute inset-x-1"
                data-testid="pre-buffer-time"
                style={{
                  zIndex: 60,
                  width: "90%",
                  top: `calc(${preBufferStartDiff}*var(--one-minute-height))`,
                  height: `calc(${beforeEventBuffer}*var(--one-minute-height))`,
                }}>
                <Event
                  event={{
                    ...event,
                    title: `${event.title} (Pre-buffer)`,
                    options: {
                      ...event.options,
                      className: "opacity-50",
                      isBuffer: true,
                      isPreBuffer: true,
                    },
                  }}
                  eventDuration={beforeEventBuffer}
                />
              </div>
            );
          }

          const actualEventStartDiff =
            (actualEventStart.hour() - (startHour || 0)) * 60 + actualEventStart.minute();
          const actualEventDuration = actualEventEnd.diff(actualEventStart, "minutes");
          segments.push(
            <div
              key={`${event.id}-actual-${actualEventStart.toISOString()}`}
              className="absolute inset-x-1"
              data-testid={event.options?.["data-test-id"]}
              style={{
                zIndex: 62,
                width: "90%",
                top: `calc(${actualEventStartDiff}*var(--one-minute-height))`,
                height: `calc(${actualEventDuration}*var(--one-minute-height))`,
              }}>
              <Event event={event} eventDuration={actualEventDuration} onEventClick={eventOnClick} />
            </div>
          );

          if (afterEventBuffer > 0) {
            const postBufferStartDiff =
              (actualEventEnd.hour() - (startHour || 0)) * 60 + actualEventEnd.minute();
            segments.push(
              <div
                key={`${event.id}-post-buffer-${actualEventEnd.toISOString()}`}
                className="absolute inset-x-1"
                data-testid="post-buffer-time"
                style={{
                  zIndex: 60,
                  width: "90%",
                  top: `calc(${postBufferStartDiff}*var(--one-minute-height))`,
                  height: `calc(${afterEventBuffer}*var(--one-minute-height))`,
                }}>
                <Event
                  event={{
                    ...event,
                    title: `${event.title} (Post-buffer)`,
                    options: {
                      ...event.options,
                      className: "opacity-50",
                      isBuffer: true,
                      isPostBuffer: true,
                    },
                  }}
                  eventDuration={afterEventBuffer}
                />
              </div>
            );
          }

          return segments;
        })}
    </>
  );
}
