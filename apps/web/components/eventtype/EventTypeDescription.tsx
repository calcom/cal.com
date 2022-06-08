import {
  ClipboardCheckIcon,
  ClockIcon,
  CreditCardIcon,
  RefreshIcon,
  UserIcon,
  UsersIcon,
} from "@heroicons/react/solid";
import { Prisma, SchedulingType } from "@prisma/client";
import { useMemo } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { baseEventTypeSelect } from "@calcom/prisma/selects";
import { RecurringEvent } from "@calcom/types/Calendar";

import classNames from "@lib/classNames";

const eventTypeData = Prisma.validator<Prisma.EventTypeArgs>()({
  select: baseEventTypeSelect,
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
        <ul className="mt-2 flex flex-wrap sm:flex-nowrap">
          <li className="mr-4 flex items-center whitespace-nowrap">
            <ClockIcon className="mr-1.5 inline h-4 w-4 text-neutral-400" aria-hidden="true" />
            {eventType.length}m
          </li>
          {eventType.schedulingType ? (
            <li className="mr-4 flex items-center whitespace-nowrap">
              <UsersIcon className="mr-1.5 inline h-4 w-4 text-neutral-400" aria-hidden="true" />
              {eventType.schedulingType === SchedulingType.ROUND_ROBIN && t("round_robin")}
              {eventType.schedulingType === SchedulingType.COLLECTIVE && t("collective")}
            </li>
          ) : (
            <li className="mr-4 flex items-center whitespace-nowrap">
              <UserIcon className="mr-1.5 inline h-4 w-4 text-neutral-400" aria-hidden="true" />
              {t("1_on_1")}
            </li>
          )}
          {recurringEvent?.count && recurringEvent.count > 0 && (
            <li className="mr-4 flex items-center whitespace-nowrap">
              <RefreshIcon className="mr-1.5 inline h-4 w-4 text-neutral-400" aria-hidden="true" />
              {t("repeats_up_to", { count: recurringEvent.count })}
            </li>
          )}
          {eventType.price > 0 && (
            <li className="mr-4 flex items-center whitespace-nowrap">
              <CreditCardIcon className="mr-1.5 inline h-4 w-4 text-neutral-400" aria-hidden="true" />
              <IntlProvider locale="en">
                <FormattedNumber
                  value={eventType.price / 100.0}
                  style="currency"
                  currency={eventType.currency.toUpperCase()}
                />
              </IntlProvider>
            </li>
          )}
          {eventType.requiresConfirmation && (
            <li className="mr-4 flex items-center whitespace-nowrap">
              <ClipboardCheckIcon className="mr-1.5 inline h-4 w-4 text-neutral-400" aria-hidden="true" />
              {t("requires_confirmation")}
            </li>
          )}
        </ul>
      </div>
    </>
  );
};

export default EventTypeDescription;
