import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Price } from "EventTypeList/components/price";
import { Clock, Users, Lock, RefreshCw, Clipboard, Plus, User } from "lucide-react";
import type { Prisma } from "prisma/client";
import { useMemo } from "react";
import type { z } from "zod";

import { getPriceIcon } from "@calcom/features/bookings/components/event-meta";
import { parseRecurringEvent } from "@calcom/lib";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import type { baseEventTypeSelect } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import type { EventTypeModel } from "@calcom/prisma/zod";

type EventTypeDescriptionProps = {
  eventType: Pick<
    z.infer<typeof EventTypeModel>,
    Exclude<keyof typeof baseEventTypeSelect, "recurringEvent"> | "metadata"
  > & {
    descriptionAsSafeHTML?: string | null;
    recurringEvent: Prisma.JsonValue;
    seatsPerTimeSlot?: number;
  };
  className?: string;
  shortenDescription?: boolean;
  isPublic?: boolean;
};

export function EventTypeDescription({
  eventType,
  className,
  shortenDescription,
  isPublic,
}: EventTypeDescriptionProps) {
  const recurringEvent = useMemo(
    () => parseRecurringEvent(eventType.recurringEvent),
    [eventType.recurringEvent]
  );
  const paymentAppData = getPaymentAppData(eventType);
  const priceIcon = getPriceIcon(paymentAppData.currency);

  return (
    <>
      <div className={cn("text-subtle", className)}>
        {eventType.description && (
          <div
            className={cn(
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
                <Badge variant="default" className="rounded-sm">
                  <Clock />
                  {dur}m
                </Badge>
              </li>
            ))
          ) : (
            <li>
              <Badge variant="default" className="rounded-sm">
                <Clock />
                {eventType.length}m
              </Badge>
            </li>
          )}
          {eventType.schedulingType && eventType.schedulingType !== SchedulingType.MANAGED && (
            <li>
              <Badge variant="default" className="rounded-sm">
                <Users />
                {eventType.schedulingType === SchedulingType.ROUND_ROBIN && "Round Robin"}
                {eventType.schedulingType === SchedulingType.COLLECTIVE && "Collective"}
              </Badge>
            </li>
          )}
          {eventType.metadata?.managedEventConfig && !isPublic && (
            <Badge variant="default" className="rounded-sm">
              <Lock />
              Managed
            </Badge>
          )}
          {recurringEvent?.count && recurringEvent.count > 0 && (
            <li className="hidden xl:block">
              <Badge variant="default" className="rounded-sm">
                <RefreshCw />
                Repeats up to{" "}
                {recurringEvent.count === 1
                  ? `${recurringEvent.count} time`
                  : `${recurringEvent.count} times`}
              </Badge>
            </li>
          )}
          {paymentAppData.enabled && (
            <li>
              <Badge variant="default" className="rounded-sm">
                <>{priceIcon}</>
                <Price
                  currency={paymentAppData.currency}
                  price={paymentAppData.price}
                  displayAlternateSymbol={false}
                />
              </Badge>
            </li>
          )}
          {eventType.requiresConfirmation && (
            <li className="hidden xl:block">
              <Badge variant="default" className="rounded-sm">
                <Clipboard />
                {eventType.metadata?.requiresConfirmationThreshold
                  ? "May require confirmation"
                  : "Requires confirmation"}
              </Badge>
            </li>
          )}
          {/* TODO: Maybe add a tool tip to this? */}
          {eventType.requiresConfirmation || (recurringEvent?.count && recurringEvent.count) ? (
            <li className="block xl:hidden">
              <Badge variant="default" className="rounded-sm">
                <Plus />
                <p>{[eventType.requiresConfirmation, recurringEvent?.count].filter(Boolean).length}</p>
              </Badge>
            </li>
          ) : (
            <></>
          )}
          {eventType?.seatsPerTimeSlot ? (
            <li>
              <Badge variant="default">
                <User />
                <p>{eventType.seatsPerTimeSlot} seats</p>
              </Badge>
            </li>
          ) : null}
        </ul>
      </div>
    </>
  );
}
