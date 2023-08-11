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

  return (
    <>
      {events
        .filter((event) => {
          return dayjs(event.start).isSame(day, "day") && !event.allDay; // Filter all events that are not allDay and that are on the current day
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

          // Check for overlapping events since this is sorted it should just work.
          if (nextEvent) {
            const nextEventStart = dayjs(nextEvent.start);
            const nextEventEnd = dayjs(nextEvent.end);
            // check if next event starts before this event ends
            if (nextEventStart.isBefore(eventEnd)) {
              // figure out which event has the longest duration
              const nextEventDuration = nextEventEnd.diff(nextEventStart, "minutes");
              if (nextEventDuration > eventDuration) {
                zIndex = 65;

                marginLeft = "auto";
                // 8 looks like a really random number but we need to take into account the bordersize on the event.
                // Logically it should be 5% but this causes a bit of a overhang which we don't want.
                right = 8;
                width = width / 2;
              }
            }

            if (nextEventStart.isSame(eventStart)) {
              zIndex = 66;

              marginLeft = "auto";
              right = 8;
              width = width / 2;
            }
          } else if (prevEvent) {
            const prevEventStart = dayjs(prevEvent.start);
            const prevEventEnd = dayjs(prevEvent.end);
            // check if next event starts before this event ends
            if (prevEventEnd.isAfter(eventStart)) {
              // figure out which event has the longest duration
              const prevEventDuration = prevEventEnd.diff(prevEventStart, "minutes");
              if (prevEventDuration > eventDuration) {
                zIndex = 65;
                marginLeft = "auto";
                right = 8;
                width = width / 2;
                if (eventDuration >= 30) {
                  width = 80;
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
              <Event event={event} eventDuration={eventDuration} onEventClick={eventOnClick} />
            </div>
          );
        })}
    </>
  );
}
