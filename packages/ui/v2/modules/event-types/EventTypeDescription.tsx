import { Prisma, SchedulingType } from "@prisma/client";
import { useMemo } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";
import { z } from "zod";

import { classNames, parseRecurringEvent } from "@calcom/lib";
import getStripeAppData from "@calcom/lib/getStripeAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { baseEventTypeSelect } from "@calcom/prisma";
import { EventTypeModel } from "@calcom/prisma/zod";
import { Icon } from "@calcom/ui";
import { Badge } from "@calcom/ui/components/badge";

export type EventTypeDescriptionProps = {
  eventType: Pick<
    z.infer<typeof EventTypeModel>,
    Exclude<keyof typeof baseEventTypeSelect, "recurringEvent"> | "metadata"
  > & {
    recurringEvent: Prisma.JsonValue;
  };
  className?: string;
};

export const EventTypeDescription = ({ eventType, className }: EventTypeDescriptionProps) => {
  const { t } = useLocale();

  const recurringEvent = useMemo(
    () => parseRecurringEvent(eventType.recurringEvent),
    [eventType.recurringEvent]
  );

  const stripeAppData = getStripeAppData(eventType);

  return (
    <>
      <div className={classNames("dark:text-darkgray-800 text-neutral-500", className)}>
        {eventType.description && (
          <h2 className="dark:text-darkgray-800 max-w-[200px] overflow-hidden text-ellipsis py-2 text-sm text-gray-600 opacity-60 sm:max-w-[500px]">
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
          {stripeAppData.price > 0 && (
            <li>
              <Badge variant="gray" size="lg" StartIcon={Icon.FiCreditCard}>
                <IntlProvider locale="en">
                  <FormattedNumber
                    value={stripeAppData.price / 100.0}
                    style="currency"
                    currency={stripeAppData.currency.toUpperCase()}
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
