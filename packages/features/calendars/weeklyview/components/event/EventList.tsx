import { useMemo, useState } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import classNames from "@calcom/ui/classNames";

import { useCalendarStore } from "../../state/store";
import { calculateEventLayouts, createLayoutMap } from "../../utils/overlap";
import { Event } from "./Event";

type Props = {
  day: dayjs.Dayjs;
};

export function EventList({ day }: Props) {
  const { startHour, events, eventOnClick, timezone } = useCalendarStore(
    (state) => ({
      startHour: state.startHour,
      events: state.events,
      eventOnClick: state.onEventClick,
      timezone: state.timezone,
    }),
    shallow
  );

  const [hoveredEventId, setHoveredEventId] = useState<number | null>(null);

  const dayEvents = useMemo(() => {
    return events.filter((event) => {
      const eventStart = timezone ? dayjs(event.start).tz(timezone) : dayjs(event.start);
      return eventStart.isSame(day, "day") && !event.options?.allDay;
    });
  }, [events, day, timezone]);

  const layoutMap = useMemo(() => {
    const layouts = calculateEventLayouts(dayEvents);
    return createLayoutMap(layouts);
  }, [dayEvents]);

  const eventCalculations = useMemo(() => {
    return new Map(
      dayEvents.map((event) => {
        // Use timezone for consistent time calculations
        const eventStart = timezone ? dayjs(event.start).tz(timezone) : dayjs(event.start);
        const eventEnd = timezone ? dayjs(event.end).tz(timezone) : dayjs(event.end);
        const eventDuration = eventEnd.diff(eventStart, "minutes");
        const eventStartHour = eventStart.hour();
        const eventStartDiff = (eventStartHour - (startHour || 0)) * 60 + eventStart.minute();

        return [
          event.id,
          {
            eventStart,
            eventDuration,
            eventStartDiff,
          },
        ];
      })
    );
  }, [dayEvents, startHour, timezone]);

  // Find which overlap group the hovered event belongs to
  const hoveredEventLayout = hoveredEventId ? layoutMap.get(hoveredEventId) : null;
  const hoveredGroupIndex = hoveredEventLayout?.groupIndex ?? null;

  return (
    <>
      {dayEvents.map((event) => {
        const layout = layoutMap.get(event.id);
        if (!layout) return null;

        const calc = eventCalculations.get(event.id);
        if (!calc) return null;

        const { eventStart, eventDuration, eventStartDiff } = calc;

        const isHovered = hoveredEventId === event.id;
        const isInHoveredGroup = hoveredGroupIndex !== null && layout.groupIndex === hoveredGroupIndex;
        const zIndex = isHovered ? 100 : layout.baseZIndex;

        return (
          <div
            key={`${event.id}-${eventStart.toISOString()}`}
            className={classNames(
              "absolute transition-all duration-100 ease-out",
              event.options?.borderOnly && "pointer-events-none"
            )}
            data-testid={event.options?.["data-test-id"]}
            onMouseEnter={() => setHoveredEventId(event.id)}
            onMouseLeave={() => setHoveredEventId(null)}
            style={{
              left: `${layout.leftOffsetPercent}%`,
              width: `${layout.widthPercent}%`,
              zIndex,
              top: `calc(${eventStartDiff}*var(--one-minute-height))`,
              height: `max(15px, calc(${eventDuration}*var(--one-minute-height)))`,
              transform: isHovered ? "scale(1.02)" : "scale(1)",
              opacity: hoveredGroupIndex !== null && !isHovered && isInHoveredGroup ? 0.6 : 1,
            }}>
            <Event
              event={event}
              eventDuration={eventDuration}
              onEventClick={eventOnClick}
              isHovered={isHovered}
              timezone={timezone}
            />
          </div>
        );
      })}
    </>
  );
}
