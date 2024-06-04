import React, { Fragment } from "react";

import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { PriceIcon } from "@calcom/features/bookings/components/event-meta/PriceIcon";
import classNames from "@calcom/lib/classNames";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon, type IconName } from "@calcom/ui";

import type { PublicEvent } from "../../types";
import { EventDetailBlocks } from "../../types";
import { AvailableEventLocations } from "./AvailableEventLocations";
import { EventDuration } from "./Duration";
import { EventOccurences } from "./Occurences";
import { Price } from "./Price";

type EventDetailsPropsBase = {
  event: PublicEvent;
  className?: string;
};

type EventDetailDefaultBlock = {
  blocks?: EventDetailBlocks[];
};

// Rendering a custom block requires passing a name prop,
// which is used as a key for the block.
type EventDetailCustomBlock = {
  blocks?: React.FC[];
  name: string;
};

type EventDetailsProps = EventDetailsPropsBase & (EventDetailDefaultBlock | EventDetailCustomBlock);

interface EventMetaProps {
  customIcon?: React.ReactNode;
  icon?: IconName;
  iconUrl?: string;
  children: React.ReactNode;
  // Emphasises the text in the block. For now only
  // applying in dark mode.
  highlight?: boolean;
  contentClassName?: string;
  className?: string;
  isDark?: boolean;
}

/**
 * Default order in which the event details will be rendered.
 */
const defaultEventDetailsBlocks = [
  EventDetailBlocks.REQUIRES_CONFIRMATION,
  EventDetailBlocks.DURATION,
  EventDetailBlocks.OCCURENCES,
  EventDetailBlocks.LOCATION,
  EventDetailBlocks.PRICE,
];

/**
 * Helper component that ensures the meta data of an event is
 * rendered in a consistent way — adds an icon and children (text usually).
 */
export const EventMetaBlock = ({
  customIcon,
  icon,
  iconUrl,
  children,
  highlight,
  contentClassName,
  className,
  isDark,
}: EventMetaProps) => {
  if (!React.Children.count(children)) return null;

  return (
    <div
      className={classNames(
        "flex items-start justify-start text-sm",
        highlight ? "text-emphasis" : "text-text",
        className
      )}>
      {iconUrl ? (
        <img
          src={iconUrl}
          alt=""
          // @TODO: Use SVG's instead of images, so we can get rid of the filter.
          className={classNames(
            "mr-2 mt-[2px] h-4 w-4 flex-shrink-0",
            isDark === undefined && "[filter:invert(0.5)_brightness(0.5)]",
            (isDark === undefined || isDark) && "dark:[filter:invert(0.65)_brightness(0.9)]"
          )}
        />
      ) : (
        <>
          {customIcon ||
            (!!icon && (
              <Icon name={icon} className="relative z-20 mr-2 mt-[2px] h-4 w-4 flex-shrink-0 rtl:ml-2" />
            ))}
        </>
      )}
      <div className={classNames("relative z-10 max-w-full break-words", contentClassName)}>{children}</div>
    </div>
  );
};

/**
 * Component that renders event meta data in a structured way, with icons and labels.
 * The component can be configured to show only specific blocks by overriding the
 * `blocks` prop. The blocks prop takes in an array of block names, defined
 * in the `EventDetailBlocks` enum. See the `defaultEventDetailsBlocks` const
 * for the default order in which the blocks will be rendered.
 *
 * As part of the blocks array you can also decide to render a custom React Component,
 * which will then also be rendered.
 *
 * Example:
 * const MyCustomBlock = () => <div>Something nice</div>;
 * <EventDetails event={event} blocks={[EventDetailBlocks.LOCATION, MyCustomBlock]} />
 */
export const EventDetails = ({ event, blocks = defaultEventDetailsBlocks }: EventDetailsProps) => {
  const { t } = useLocale();
  const rescheduleUid = useBookerStore((state) => state.rescheduleUid);
  const isInstantMeeting = useBookerStore((store) => store.isInstantMeeting);

  return (
    <>
      {blocks.map((block) => {
        if (typeof block === "function") {
          return <Fragment key={block.name}>{block(event)}</Fragment>;
        }

        switch (block) {
          case EventDetailBlocks.DURATION:
            return (
              <EventMetaBlock key={block} icon="clock">
                <EventDuration event={event} />
              </EventMetaBlock>
            );

          case EventDetailBlocks.LOCATION:
            if (!event?.locations?.length || isInstantMeeting) return null;
            return (
              <EventMetaBlock key={block}>
                <AvailableEventLocations locations={event.locations} />
              </EventMetaBlock>
            );

          case EventDetailBlocks.REQUIRES_CONFIRMATION:
            if (!event.requiresConfirmation) return null;

            return (
              <EventMetaBlock key={block} icon="square-check">
                {t("requires_confirmation")}
              </EventMetaBlock>
            );

          case EventDetailBlocks.OCCURENCES:
            if (!event.recurringEvent || rescheduleUid) return null;

            return (
              <EventMetaBlock key={block} icon="refresh-ccw">
                <EventOccurences event={event} />
              </EventMetaBlock>
            );

          case EventDetailBlocks.PRICE:
            const paymentAppData = getPaymentAppData(event);
            if (event.price <= 0 || paymentAppData.price <= 0) return null;

            return (
              <EventMetaBlock
                key={block}
                customIcon={
                  <PriceIcon
                    className="relative z-20 mr-2 mt-[2px] h-4 w-4 flex-shrink-0 rtl:ml-2"
                    currency={event.currency}
                  />
                }>
                <Price
                  price={paymentAppData.price}
                  currency={event.currency}
                  displayAlternateSymbol={false}
                />
              </EventMetaBlock>
            );
        }
      })}
    </>
  );
};
