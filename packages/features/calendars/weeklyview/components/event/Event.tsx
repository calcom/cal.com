import { cva } from "class-variance-authority";

import dayjs from "@calcom/dayjs";
import classNames from "@calcom/ui/classNames";
import { Tooltip } from "@calcom/ui/components/tooltip";

import type { CalendarEvent } from "../../types/events";

type EventProps = {
  event: CalendarEvent;
  currentlySelectedEventId?: number;
  eventDuration: number;
  onEventClick?: (event: CalendarEvent) => void;
  disabled?: boolean;
  isHovered?: boolean;
};

const eventClasses = cva(
  "group flex h-full w-full overflow-x-hidden overflow-y-auto rounded-[6px] px-[6px] text-xs leading-5 opacity-80 border-default font-medium",
  {
    variants: {
      status: {
        ACCEPTED: "bg-subtle hover:bg-emphasis text-emphasis border-[1px] border-default",
        PENDING: "bg-muted text-emphasis border-[1px] border-dashed border-default",
        REJECTED: "bg-muted border-[1px] text-subtle line-through",
        CANCELLED: "bg-muted border-[1px] text-subtle line-through",
        AWAITING_HOST: "bg-muted text-emphasis border-[1px] border-dashed border-default",
      },
      disabled: {
        true: "hover:cursor-default",
        false: "hover:cursor-pointer",
      },
      selected: {
        true: "bg-inverted text-inverted border-[1px] border-transparent",
        false: "",
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
  isHovered = false,
}: EventProps) {
  const selected = currentlySelectedEventId === event.id;
  const { options } = event;

  const Component = onEventClick ? "button" : "div";

  const dayOfWeek = dayjs(event.start).day();
  const tooltipSide = dayOfWeek >= 1 && dayOfWeek <= 4 ? "right" : "left";

  const tooltipContent = (
    <div className="flex min-w-[200px] max-w-[300px] flex-col gap-1 py-1">
      <div className="flex items-start gap-2">
        {options?.color && (
          <div className="mt-1 h-3 w-1 shrink-0 rounded-sm" style={{ backgroundColor: options.color }}></div>
        )}
        <div className="flex-1">
          <div className="font-semibold leading-tight">{event.title}</div>
          {!event.options?.hideTime && (
            <div className="text-inverted-muted mt-1 text-xs">
              {dayjs(event.start).format("HH:mm")} - {dayjs(event.end).format("HH:mm")}
            </div>
          )}
          {event.description && (
            <div className="text-inverted-muted mt-1 text-xs leading-snug">{event.description}</div>
          )}
          {options?.status && options.status !== "ACCEPTED" && (
            <div className="text-inverted-muted mt-1 text-xs capitalize">
              {options.status.toLowerCase().replace("_", " ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent} className="max-w-none" side={tooltipSide}>
      <Component
        onClick={() => onEventClick?.(event)} // Note this is not the button event. It is the calendar event.
        className={classNames(
          eventClasses({
            status: options?.status,
            disabled,
            selected,
          }),
          options?.className,
          isHovered && "ring-brand-default shadow-lg ring-2 ring-offset-0"
        )}
        style={{
          transition: "all 100ms ease-out",
        }}>
        {options?.color && (
          <div
            className="-ml-1.5 mr-1.5 h-full w-[3px] shrink-0"
            style={{ backgroundColor: options.color }}></div>
        )}
        <div className={classNames("flex", eventDuration > 30 && "flex-col py-1")}>
          <div
            className={classNames(
              "flex w-full gap-2 overflow-hidden overflow-ellipsis whitespace-nowrap text-left leading-4",
              eventDuration <= 30 && "items-center"
            )}>
            <span>{event.title}</span>
            {eventDuration <= 30 && !event.options?.hideTime && (
              <p className="text-subtle mt-1 w-full whitespace-nowrap text-left text-[10px] leading-none">
                {dayjs(event.start).format("HH:mm")} - {dayjs(event.end).format("HH:mm")}
              </p>
            )}
          </div>
          {eventDuration > 30 && !event.options?.hideTime && (
            <p className="text-subtle mt-1 text-left text-[10px] leading-none">
              {dayjs(event.start).format("HH:mm")} - {dayjs(event.end).format("HH:mm")}
            </p>
          )}
          {eventDuration > 45 && event.description && (
            <p className="text-subtle mt-1 text-left text-[10px] leading-none">{event.description}</p>
          )}
        </div>
      </Component>
    </Tooltip>
  );
}
