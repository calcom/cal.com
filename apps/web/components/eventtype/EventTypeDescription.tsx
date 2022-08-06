import { Prisma, SchedulingType } from "@prisma/client";
import { useMemo } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";

import { parseRecurringEvent } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { baseEventTypeSelect } from "@calcom/prisma/selects";
import { Icon } from "@calcom/ui/Icon";

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

  const recurringEvent = useMemo(
    () => parseRecurringEvent(eventType.recurringEvent),
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
        <ul className="mt-2 flex flex-wrap space-x-1 sm:flex-nowrap ">
          <li className="mb-1 flex items-center whitespace-nowrap rounded-sm bg-gray-100 px-1 py-px text-xs text-gray-800 dark:bg-gray-900 dark:text-white">
            <Icon.Clock className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
            {eventType.length} {t("minutes")}
          </li>
          {eventType.schedulingType ? (
            <li className="mb-1 flex items-center whitespace-nowrap rounded-sm bg-gray-100 px-1 py-px text-xs text-gray-800 dark:bg-gray-900 dark:text-white">
              <Icon.Users className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
              {eventType.schedulingType === SchedulingType.ROUND_ROBIN && t("round_robin")}
              {eventType.schedulingType === SchedulingType.COLLECTIVE && t("collective")}
            </li>
          ) : (
            <li className="mb-1 flex items-center whitespace-nowrap rounded-sm bg-gray-100 px-1 py-px text-xs text-gray-800 dark:bg-gray-900 dark:text-white">
              <Icon.User className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
              {t("1_on_1")}
            </li>
          )}
          {recurringEvent?.count && recurringEvent.count > 0 && (
            <li className="mb-1 flex items-center whitespace-nowrap rounded-sm bg-gray-100 px-1 py-px text-xs text-gray-800 dark:bg-gray-900 dark:text-white">
              <Icon.RefreshCw className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
              {t("repeats_up_to", {
                count: recurringEvent.count,
              })}
            </li>
          )}
          {eventType.price > 0 && (
            <li className="mb-1 flex items-center whitespace-nowrap rounded-sm bg-gray-100 px-1 py-px text-xs text-gray-800 dark:bg-gray-900 dark:text-white">
              <Icon.CreditCard className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
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
            <li className="mb-1 flex items-center whitespace-nowrap rounded-sm bg-gray-100 px-1 py-px text-xs text-gray-800 dark:bg-gray-900 dark:text-white">
              <Icon.CheckSquare className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
              {t("requires_confirmation")}
            </li>
          )}
        </ul>
      </div>
    </>
  );
};

export default EventTypeDescription;
