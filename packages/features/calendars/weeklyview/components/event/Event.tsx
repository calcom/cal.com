import dayjs from "@calcom/dayjs";
import { classNames } from "@calcom/lib";

import { CalendarEvent } from "../../types/events";

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
          "border-[1px] border-gray-900 bg-gray-100 text-gray-900 hover:bg-gray-200",
        event.status === "PENDING" &&
          !selected &&
          "border-[1px] border-dashed border-gray-900 bg-white text-gray-900",
        selected && "border-[1px] border-transparent bg-gray-900 text-white",
        disabled ? "hover:cursor-default" : "hover:cursor-pointer"
      )}>
      <div className="w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-left leading-4">
        {event.title}
      </div>
      {eventDuration >= 30 && (
        <p className="text-left text-[10px] leading-none text-gray-500">
          {dayjs(event.start).format("HH:mm")} - {dayjs(event.end).format("HH:mm")}
        </p>
      )}
    </Component>
  );
}
