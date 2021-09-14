import { EventType, SchedulingType } from "@prisma/client";
import { ClockIcon, InformationCircleIcon, UserIcon, UsersIcon } from "@heroicons/react/solid";
import React from "react";
import classNames from "@lib/classNames";

export type EventTypeDescriptionProps = {
  eventType: EventType;
  className?: string;
};

export const EventTypeDescription = ({ eventType, className }: EventTypeDescriptionProps) => {
  return (
    <ul className={classNames("mt-2 space-x-4 text-neutral-500 dark:text-white flex", className)}>
      <li className="flex whitespace-nowrap">
        <ClockIcon className="inline mt-0.5 mr-1.5 h-4 w-4 text-neutral-400" aria-hidden="true" />
        {eventType.length}m
      </li>
      {eventType.schedulingType ? (
        <li className="flex whitespace-nowrap">
          <UsersIcon className="inline mt-0.5 mr-1.5 h-4 w-4 text-neutral-400" aria-hidden="true" />
          {eventType.schedulingType === SchedulingType.ROUND_ROBIN && "Round Robin"}
          {eventType.schedulingType === SchedulingType.COLLECTIVE && "Collective"}
        </li>
      ) : (
        <li className="flex whitespace-nowrap">
          <UserIcon className="inline mt-0.5 mr-1.5 h-4 w-4 text-neutral-400" aria-hidden="true" />
          1-on-1
        </li>
      )}
      {eventType.description && (
        <li className="flex">
          <InformationCircleIcon
            className="flex-none inline mr-1.5 mt-0.5 h-4 w-4 text-neutral-400"
            aria-hidden="true"
          />
          <span>{eventType.description.substring(0, 100)}</span>
        </li>
      )}
    </ul>
  );
};

export default EventTypeDescription;
