import {
  ClockIcon,
  CreditCardIcon,
  InformationCircleIcon,
  UserIcon,
  UsersIcon,
} from "@heroicons/react/solid";
import { SchedulingType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import React from "react";
import { FormattedNumber, IntlProvider } from "react-intl";

import classNames from "@lib/classNames";

const eventTypeData = Prisma.validator<Prisma.EventTypeArgs>()({
  select: {
    id: true,
    length: true,
    price: true,
    currency: true,
    schedulingType: true,
    description: true,
  },
});

type EventType = Prisma.EventTypeGetPayload<typeof eventTypeData>;

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
      {eventType.price > 0 && (
        <li className="flex whitespace-nowrap">
          <CreditCardIcon className="inline mt-0.5 mr-1.5 h-4 w-4 text-neutral-400" aria-hidden="true" />
          <IntlProvider locale="en">
            <FormattedNumber
              value={eventType.price / 100.0}
              style="currency"
              currency={eventType.currency.toUpperCase()}
            />
          </IntlProvider>
        </li>
      )}
      {eventType.description && (
        <li className="flex">
          <InformationCircleIcon
            className="flex-none inline mr-1.5 mt-0.5 h-4 w-4 text-neutral-400"
            aria-hidden="true"
          />
          <span className="truncate max-w-[200px] sm:max-w-full">
            {eventType.description.substring(0, 100)}
          </span>
        </li>
      )}
    </ul>
  );
};

export default EventTypeDescription;
