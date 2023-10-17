import { cva } from "class-variance-authority";

import dayjs from "@calcom/dayjs";

import type { CalendarEvent } from "../../types/events";

type EventProps = {
  event: CalendarEvent;
  currentlySelectedEventId?: number;
  eventDuration: number;
  onEventClick?: (event: CalendarEvent) => void;
  disabled?: boolean;
};

const eventClasses = cva(
  "group flex h-full w-full flex-col overflow-y-auto rounded-[4px] px-[6px] py-1 text-xs font-semibold  leading-5 ",
  {
    variants: {
      status: {
        ACCEPTED: "bg-subtle hover:bg-emphasis text-emphasis border-[1px] border-gray-900",
        PENDING: "bg-default text-emphasis border-[1px] border-dashed border-gray-900",
        REJECTED: "",
        CANCELLED: "",
      },
      disabled: {
        true: "hover:cursor-default",
        false: "hover:cursor-pointer",
      },
      selected: {
        true: "bg-inverted text-inverted border-[1px] border-transparent",
        false: "",
      },
      borderColor: {
        ACCEPTED: "border-gray-900",
        PENDING: "border-gray-900",
        REJECTED: "border-gray-900",
        CANCELLED: "border-gray-900",
        custom: "",
      },
    },
  }
);

export function Event({
  event,
  currentlySelectedEventId,
  eventDuration,
  disabled,
  onEventClick,
}: EventProps) {
  const selected = currentlySelectedEventId === event.id;
  const { options } = event;

  const borderColor = options?.borderColor ? "custom" : options?.status;

  const styles = options?.borderColor
    ? {
        borderColor: options?.borderColor,
      }
    : {};

  const Component = onEventClick ? "button" : "div";

  return (
    <Component
      onClick={() => onEventClick?.(event)} // Note this is not the button event. It is the calendar event.
      className={eventClasses({
        status: options?.status,
        disabled,
        selected,
        borderColor,
      })}
      style={styles}>
      <div className="w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-left leading-4">
        {event.title}
      </div>
      {eventDuration > 30 && (
        <p className="text-subtle text-left text-[10px] leading-none">
          {dayjs(event.start).format("HH:mm")} - {dayjs(event.end).format("HH:mm")}
        </p>
      )}
    </Component>
  );
}
