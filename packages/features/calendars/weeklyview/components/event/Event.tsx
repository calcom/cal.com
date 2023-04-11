import dayjs from "@calcom/dayjs";
import { classNames } from "@calcom/lib";

import type { CalendarEvent } from "../../types/events";

type EventProps = {
  event: CalendarEvent;
  currentlySelectedEventId?: number;
  eventDuration: number;
  onEventClick?: (event: CalendarEvent) => void;
  disabled?: boolean;
};

export function Event({
  event,
  currentlySelectedEventId,
  eventDuration,
  disabled,
  onEventClick,
}: EventProps) {
  const selected = currentlySelectedEventId === event.id;

  const Component = onEventClick ? "button" : "div";

  return (
    <Component
      onClick={() => onEventClick?.(event)} // Note this is not the button event. It is the calendar event.
      className={classNames(
        "group  flex h-full w-full flex-col overflow-y-auto rounded-[4px]  py-1 px-[6px] text-xs font-semibold  leading-5 ",
        event.status === "ACCEPTED" &&
          !selected &&
          "bg-subtle hover:bg-emphasis text-emphasis border-[1px] border-gray-900",
        event.status === "PENDING" &&
          !selected &&
          "bg-default text-emphasis border-[1px] border-dashed border-gray-900",
        selected && "bg-inverted text-inverted border-[1px] border-transparent",
        disabled ? "hover:cursor-default" : "hover:cursor-pointer"
      )}>
      <div className="w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-left leading-4">
        {event.title}
      </div>
      {eventDuration >= 30 && (
        <p className="text-subtle text-left text-[10px] leading-none">
          {dayjs(event.start).format("HH:mm")} - {dayjs(event.end).format("HH:mm")}
        </p>
      )}
    </Component>
  );
}
