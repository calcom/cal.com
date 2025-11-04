import { useMemo, useState } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";

import { useCalendarStore } from "../../state/store";
import { calculateEventLayouts, createLayoutMap } from "../../utils/overlap";
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

  const [hoveredEventId, setHoveredEventId] = useState<number | null>(null);

  const dayEvents = useMemo(() => {
    return events.filter((event) => {
      return dayjs(event.start).isSame(day, "day") && !event.options?.allDay;
    });
  }, [events, day]);

  const layoutMap = useMemo(() => {
    const layouts = calculateEventLayouts(dayEvents);
    return createLayoutMap(layouts);
  }, [dayEvents]);

  return (
    <>
      {dayEvents.map((event) => {
        const layout = layoutMap.get(event.id);
        if (!layout) return null;

        const eventStart = dayjs(event.start);
        const eventEnd = dayjs(event.end);
        const eventDuration = eventEnd.diff(eventStart, "minutes");
        const eventStartHour = eventStart.hour();
        const eventStartDiff = (eventStartHour - (startHour || 0)) * 60 + eventStart.minute();

        const isHovered = hoveredEventId === event.id;
        const zIndex = isHovered ? 100 : layout.baseZIndex;

        return (
          <div
            key={`${event.id}-${eventStart.toISOString()}`}
            className="absolute"
            data-testid={event.options?.["data-test-id"]}
            onMouseEnter={() => setHoveredEventId(event.id)}
            onMouseLeave={() => setHoveredEventId(null)}
            style={{
              left: `${layout.leftOffsetPercent}%`,
              width: `${layout.widthPercent}%`,
              zIndex,
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
