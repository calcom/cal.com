import { Badge } from "@calid/features/ui/components/badge";
import type { Prisma } from "@prisma/client";
import { useMemo } from "react";
import type { z } from "zod";

import { Price } from "@calcom/features/bookings/components/event-meta/Price";
import { PriceIcon } from "@calcom/features/bookings/components/event-meta/PriceIcon";
import { getPaymentAppData } from "@calcom/lib/getPaymentAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import type { baseEventTypeSelect } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import type { EventTypeModel } from "@calcom/prisma/zod";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";
import classNames from "@calcom/ui/classNames";
import { Tooltip } from "@calcom/ui/components/tooltip";

export type EventTypeDescriptionProps = {
  eventType: Pick<
    z.infer<typeof EventTypeModel>,
    Exclude<keyof typeof baseEventTypeSelect, "recurringEvent"> | "metadata" | "seatsPerTimeSlot"
  > & {
    descriptionAsSafeHTML?: string | null;
    recurringEvent: Prisma.JsonValue;
  };
  showDescription?: string;
  className?: string;
  shortenDescription?: boolean;
  isPublic?: boolean;
};

export const EventTypeDescription = ({
  eventType,
  className,
  shortenDescription,
  showDescription,
  isPublic,
}: EventTypeDescriptionProps) => {
  const { t, i18n } = useLocale();

  const recurringEvent = useMemo(
    () => parseRecurringEvent(eventType.recurringEvent),
    [eventType.recurringEvent]
  );

  const paymentAppData = getPaymentAppData({
    ...eventType,
    metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
  });
  return (
    <>
      <div className={classNames("text-subtle", className)}>
        {showDescription && eventType.description && (
          <div
            className={classNames(
              "text-subtle line-clamp-3 break-words py-1 text-sm sm:max-w-[650px] [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600",
              shortenDescription ? "line-clamp-4 [&>*:not(:first-child)]:hidden" : ""
            )}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: markdownToSafeHTML(eventType.descriptionAsSafeHTML || ""),
            }}
          />
        )}
        <ul className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
          {eventType.metadata?.multipleDuration ? (
            eventType.metadata.multipleDuration.map((dur, idx) => (
              <li key={idx}>
                <Tooltip content="Duration of the meeting" className="cursor-pointer">
                  <Badge variant="secondary" startIcon="clock">
                    {dur}m
                  </Badge>
                </Tooltip>
              </li>
            ))
          ) : (
            <li>
              <Tooltip content="Duration of the meeting" className="cursor-pointer">
                <Badge variant="secondary" startIcon="clock">
                  {eventType.length}m
                </Badge>
              </Tooltip>
            </li>
          )}
          {eventType.schedulingType && eventType.schedulingType !== SchedulingType.MANAGED && (
            <li>
              <Badge variant="secondary" startIcon="users">
                {eventType.schedulingType === SchedulingType.ROUND_ROBIN && t("round_robin")}
                {eventType.schedulingType === SchedulingType.COLLECTIVE && t("collective")}
              </Badge>
            </li>
          )}
          {recurringEvent?.count && recurringEvent.count > 0 && (
            <li data-testid="repeat-eventtype">
              <Tooltip
                content={t("repeats_up_to", {
                  count: recurringEvent.count,
                })}
                className="cursor-pointer">
                <Badge variant="secondary" startIcon="refresh-cw">
                  {/* {t("repeats_up_to", {
                  count: recurringEvent.count,
                })} */}
                  {recurringEvent.count}
                </Badge>
              </Tooltip>
            </li>
          )}
          {paymentAppData.enabled && (
            <li>
              <Badge
                variant="secondary"
                customStartIcon={
                  <PriceIcon currency={paymentAppData.currency} className="h-3 w-3 stroke-[3px]" />
                }>
                <Price
                  currency={paymentAppData.currency}
                  price={paymentAppData.price}
                  displayAlternateSymbol={false}
                />
              </Badge>
            </li>
          )}
          {eventType.requiresConfirmation && (
            <li data-testid="requires-confirmation-badge">
              <Badge variant="secondary" startIcon="clipboard">
                {eventType.metadata?.requiresConfirmationThreshold
                  ? t("may_require_confirmation")
                  : t("requires_confirmation")}
              </Badge>
            </li>
          )}
          {eventType?.seatsPerTimeSlot ? (
            <li>
              <Badge variant="secondary" startIcon="user">
                <p>{t("event_type_seats", { numberOfSeats: eventType.seatsPerTimeSlot })} </p>
              </Badge>
            </li>
          ) : null}
        </ul>
      </div>
    </>
  );
};

export default EventTypeDescription;
