import { Prisma, SchedulingType } from "@prisma/client";
import { useMemo } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";

import { classNames, parseRecurringEvent } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { baseEventTypeSelect } from "@calcom/prisma/selects";
import { Icon } from "@calcom/ui";
import { Badge } from "@calcom/ui/v2";

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
          <h2 className="dark:text-darkgray-800 max-w-[280px] overflow-hidden text-ellipsis py-2 text-sm leading-none text-gray-600 opacity-60 sm:max-w-[500px]">
            {eventType.description.substring(0, 100)}
            {eventType.description.length > 100 && "..."}
          </h2>
        )}
        <ul className="mt-2 flex flex-wrap space-x-2 sm:flex-nowrap">
          <li>
            <Badge variant="gray" size="lg" StartIcon={Icon.FiClock}>
              {eventType.length}m
            </Badge>
          </li>
          {eventType.schedulingType ? (
            <li>
              <Badge variant="gray" size="lg" StartIcon={Icon.FiUser}>
                {eventType.schedulingType === SchedulingType.ROUND_ROBIN && t("round_robin")}
                {eventType.schedulingType === SchedulingType.COLLECTIVE && t("collective")}
              </Badge>
            </li>
          ) : (
            <li>
              <Badge variant="gray" size="lg" StartIcon={Icon.FiUser}>
                {t("1_on_1")}
              </Badge>
            </li>
          )}
          {recurringEvent?.count && recurringEvent.count > 0 && (
            <li className="hidden xl:block">
              <Badge variant="gray" size="lg" StartIcon={Icon.FiRefreshCw}>
                {t("repeats_up_to", {
                  count: recurringEvent.count,
                })}
              </Badge>
            </li>
          )}
          {eventType.price > 0 && (
            <li>
              <Badge variant="gray" size="lg" StartIcon={Icon.FiCreditCard}>
                <IntlProvider locale="en">
                  <FormattedNumber
                    value={eventType.price / 100.0}
                    style="currency"
                    currency={eventType.currency.toUpperCase()}
                  />
                </IntlProvider>
              </Badge>
            </li>
          )}
          {eventType.requiresConfirmation && (
            <li className="hidden xl:block">
              <Badge variant="gray" size="lg" StartIcon={Icon.FiClipboard}>
                {t("requires_confirmation")}
              </Badge>
            </li>
          )}
          {/* TODO: Maybe add a tool tip to this? */}
          {eventType.requiresConfirmation || (recurringEvent?.count && recurringEvent.count) ? (
            <li className="block xl:hidden">
              <Badge variant="gray" size="lg" StartIcon={Icon.FiPlus}>
                <p>{[eventType.requiresConfirmation, recurringEvent?.count].filter(Boolean).length}</p>
              </Badge>
            </li>
          ) : (
            <></>
          )}
        </ul>
      </div>
    </>
  );
};

export default EventTypeDescription;
