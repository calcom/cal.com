import { ClockIcon, CreditCardIcon, RefreshIcon, UserIcon, UsersIcon } from "@heroicons/react/solid";
import { SchedulingType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import React, { useMemo } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RecurringEvent } from "@calcom/types/Calendar";

import classNames from "@lib/classNames";

const eventTypeData = Prisma.validator<Prisma.EventTypeArgs>()({
  select: {
    id: true,
    length: true,
    price: true,
    currency: true,
    schedulingType: true,
    recurringEvent: true,
    description: true,
  },
});

type EventType = Prisma.EventTypeGetPayload<typeof eventTypeData>;

export type EventTypeDescriptionProps = {
  eventType: EventType;
  className?: string;
};

export const EventTypeDescription = ({ eventType, className }: EventTypeDescriptionProps) => {
  const { t } = useLocale();

  const recurringEvent: RecurringEvent = useMemo(
    () => (eventType.recurringEvent as RecurringEvent) || [],
    [eventType.recurringEvent]
  );

  return (
    <>
      <div className={classNames("text-neutral-500 dark:text-white", className)}>
        {eventType.description && (
          <h2 className="max-w-[280px] overflow-hidden text-ellipsis opacity-60 sm:max-w-[500px]">
            {eventType.description.substring(0, 100)}
            {eventType.description.length > 100 && "..."}
          </h2>
        )}
        <ul className="mt-2 flex space-x-4 rtl:space-x-reverse ">
          <li className="flex whitespace-nowrap">
            <ClockIcon className="mt-0.5 mr-1.5 inline h-4 w-4 text-neutral-400" aria-hidden="true" />
            {eventType.length}m
          </li>
          {eventType.schedulingType ? (
            <li className="flex whitespace-nowrap">
              <UsersIcon className="mt-0.5 mr-1.5 inline h-4 w-4 text-neutral-400" aria-hidden="true" />
              {eventType.schedulingType === SchedulingType.ROUND_ROBIN && t("round_robin")}
              {eventType.schedulingType === SchedulingType.COLLECTIVE && t("collective")}
            </li>
          ) : (
            <li className="flex whitespace-nowrap">
              <UserIcon className="mt-0.5 mr-1.5 inline h-4 w-4 text-neutral-400" aria-hidden="true" />
              {t("1_on_1")}
            </li>
          )}
          {recurringEvent?.count && recurringEvent.count > 0 && (
            <li className="flex whitespace-nowrap">
              <RefreshIcon className="mt-0.5 mr-1.5 inline h-4 w-4 text-neutral-400" aria-hidden="true" />
              {t("repeats_up_to", { count: recurringEvent.count })}
            </li>
          )}
          {eventType.price > 0 && (
            <li className="flex whitespace-nowrap">
              <CreditCardIcon className="mt-0.5 mr-1.5 inline h-4 w-4 text-neutral-400" aria-hidden="true" />
              <IntlProvider locale="en">
                <FormattedNumber
                  value={eventType.price / 100.0}
                  style="currency"
                  currency={eventType.currency.toUpperCase()}
                />
              </IntlProvider>
            </li>
          )}
        </ul>
      </div>
    </>
  );
};

export default EventTypeDescription;
