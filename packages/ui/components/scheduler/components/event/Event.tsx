import { classNames } from "@calcom/lib";

import { SchedulerEvent } from "../../types/events";

type EventProps = {
  event: SchedulerEvent;
  currentlySelectedEventId?: number;
  eventDuration: number;
  disabled?: boolean;
};

export function Event({ event, currentlySelectedEventId, eventDuration, disabled }: EventProps) {
  const selected = currentlySelectedEventId === event.id;

  return (
    <a
      className={classNames(
        "group absolute inset-1 flex h-full flex-col overflow-y-auto rounded-[4px]  py-1 px-[6px] text-xs font-semibold  leading-5 ",
        event.status === "ACCEPTED" &&
          !selected &&
          "border-[1px] border-gray-900 bg-gray-100 text-gray-900 hover:bg-gray-200",
        event.status === "PENDING" &&
          !selected &&
          "border-[1px] border-dashed border-gray-900 bg-white text-gray-900",
        selected && "border-[1px] border-transparent bg-gray-900 text-white",
        disabled ? "hover:cursor-default" : "hover:cursor-pointer"
      )}>
      {event.title}
      <br />
      {eventDuration} minutes
    </a>
  );
}

export function EventCell({}) {
  return <div className="h-7 w-28  bg-white" />;
}

export function CalendarRow({}) {
  return (
    <div className="flex flex-row ">
      {Array.from({ length: 7 }).map((key, i) => (
        <div className="border-y-[1px] border-r-[1px] border-gray-300" key={i}>
          <EventCell />
          <EventCell />
        </div>
      ))}
    </div>
  );
}
