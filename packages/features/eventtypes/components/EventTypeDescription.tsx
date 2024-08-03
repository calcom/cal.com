import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { useMemo } from "react";
import type { z } from "zod";

import { Price } from "@calcom/features/bookings/components/event-meta/Price";
import { PriceIcon } from "@calcom/features/bookings/components/event-meta/PriceIcon";
import { classNames, parseRecurringEvent } from "@calcom/lib";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { baseEventTypeSelect } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import type { EventTypeModel } from "@calcom/prisma/zod";
import { Badge, Tooltip } from "@calcom/ui";

export type EventTypeDescriptionProps = {
  eventType: Pick<
    z.infer<typeof EventTypeModel>,
    Exclude<keyof typeof baseEventTypeSelect, "recurringEvent"> | "metadata" | "seatsPerTimeSlot"
  > & {
    descriptionAsSafeHTML?: string | null;
    recurringEvent: Prisma.JsonValue;
    managedBy?: { teamId: number | undefined; admins: string[] };
  };
  className?: string;
  shortenDescription?: boolean;
  isPublic?: boolean;
};

export const EventTypeDescription = ({
  eventType,
  className,
  shortenDescription,
  isPublic,
}: EventTypeDescriptionProps) => {
  const { t, i18n } = useLocale();

  const recurringEvent = useMemo(
    () => parseRecurringEvent(eventType.recurringEvent),
    [eventType.recurringEvent]
  );

  const paymentAppData = getPaymentAppData(eventType);

  const showManagedBadge = eventType.metadata?.managedEventConfig && !isPublic;
  const numberOfAdmins = eventType.managedBy?.admins.length || 0;
  let managedByToolTipContent;

  if (numberOfAdmins > 0) {
    managedByToolTipContent = t("managed_by_teamAdmins", {
      teamAdmins: eventType.managedBy?.admins?.slice(0, 2).join(", "),
    });
    if (numberOfAdmins > 2) {
      managedByToolTipContent = (
        <>
          {`${managedByToolTipContent} ${t("and")} `}
          {!!eventType.managedBy?.teamId ? (
            <Link
              href={`/settings/teams/${eventType.managedBy?.teamId}/members`}
              className="text-blue-500 underline  hover:text-blue-600 focus:outline-none">
              {`${numberOfAdmins - 2} ${t("more")}`}
            </Link>
          ) : (
            <span>{`${numberOfAdmins - 2} ${t("more")}`}</span>
          )}
        </>
      );
    }
  }

  return (
    <>
      <div className={classNames("text-subtle", className)}>
        {eventType.description && (
          <div
            className={classNames(
              "text-subtle line-clamp-3 break-words py-1 text-sm sm:max-w-[650px] [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600",
              shortenDescription ? "line-clamp-4 [&>*:not(:first-child)]:hidden" : ""
            )}
            dangerouslySetInnerHTML={{
              __html: eventType.descriptionAsSafeHTML || "",
            }}
          />
        )}
        <ul className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
          {eventType.metadata?.multipleDuration ? (
            eventType.metadata.multipleDuration.map((dur, idx) => (
              <li key={idx}>
                <Badge variant="gray" startIcon="clock">
                  {dur}m
                </Badge>
              </li>
            ))
          ) : (
            <li>
              <Badge variant="gray" startIcon="clock">
                {eventType.length}m
              </Badge>
            </li>
          )}
          {eventType.schedulingType && eventType.schedulingType !== SchedulingType.MANAGED && (
            <li>
              <Badge variant="gray" startIcon="users">
                {eventType.schedulingType === SchedulingType.ROUND_ROBIN && t("round_robin")}
                {eventType.schedulingType === SchedulingType.COLLECTIVE && t("collective")}
              </Badge>
            </li>
          )}
          {showManagedBadge &&
            (numberOfAdmins === 0 ? (
              <div>
                <Badge variant="gray" startIcon="lock">
                  {t("managed")}
                </Badge>
              </div>
            ) : (
              <Tooltip content={managedByToolTipContent}>
                <div>
                  <Badge variant="gray" startIcon="lock">
                    {t("managed")}
                  </Badge>
                </div>
              </Tooltip>
            ))}
          {recurringEvent?.count && recurringEvent.count > 0 && (
            <li className="hidden xl:block" data-testid="repeat-eventtype">
              <Badge variant="gray" startIcon="refresh-cw">
                {t("repeats_up_to", {
                  count: recurringEvent.count,
                })}
              </Badge>
            </li>
          )}
          {paymentAppData.enabled && (
            <li>
              <Badge
                variant="gray"
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
            <li className="hidden xl:block" data-testid="requires-confirmation-badge">
              <Badge variant="gray" startIcon="clipboard">
                {eventType.metadata?.requiresConfirmationThreshold
                  ? t("may_require_confirmation")
                  : t("requires_confirmation")}
              </Badge>
            </li>
          )}
          {/* TODO: Maybe add a tool tip to this? */}
          {eventType.requiresConfirmation || (recurringEvent?.count && recurringEvent.count) ? (
            <li className="block xl:hidden">
              <Badge variant="gray" startIcon="plus">
                <p>{[eventType.requiresConfirmation, recurringEvent?.count].filter(Boolean).length}</p>
              </Badge>
            </li>
          ) : (
            <></>
          )}
          {eventType?.seatsPerTimeSlot ? (
            <li>
              <Badge variant="gray" startIcon="user">
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
