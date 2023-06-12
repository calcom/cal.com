import { Fragment } from "react";
import React from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Clock, CheckSquare, RefreshCcw, CreditCard } from "@calcom/ui/components/icon";

import type { PublicEvent } from "../../types";
import { EventDetailBlocks } from "../../types";
import { EventDuration } from "./Duration";
import { EventLocations } from "./Locations";
import { EventOccurences } from "./Occurences";
import { EventPrice } from "./Price";

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
  icon?: React.FC<{ className: string }> | string;
  children: React.ReactNode;
  // Emphasises the text in the block. For now only
  // applying in dark mode.
  highlight?: boolean;
  contentClassName?: string;
  className?: string;
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
  icon: Icon,
  children,
  highlight,
  contentClassName,
  className,
}: EventMetaProps) => {
  if (!React.Children.count(children)) return null;

  return (
    <div
      className={classNames(
        "flex items-start justify-start text-sm",
        highlight ? "text-emphasis" : "text-text",
        className
      )}>
      {typeof Icon === "string" ? (
        <img
          src={Icon}
          alt=""
          // @TODO: Use SVG's instead of images, so we can get rid of the filter.
          className="mr-2 mt-[2px] h-4 w-4 flex-shrink-0 [filter:invert(0.5)_brightness(0.5)] dark:[filter:invert(1)_brightness(0.9)]"
        />
      ) : (
        <>{!!Icon && <Icon className="relative z-20 mr-2 mt-[2px] h-4 w-4 flex-shrink-0" />}</>
      )}
      <div className={classNames("relative z-10", contentClassName)}>{children}</div>
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

  return (
    <>
      {blocks.map((block) => {
        if (typeof block === "function") {
          return <Fragment key={block.name}>{block(event)}</Fragment>;
        }

        switch (block) {
          case EventDetailBlocks.DURATION:
            return (
              <EventMetaBlock key={block} icon={Clock}>
                <EventDuration event={event} />
              </EventMetaBlock>
            );

          case EventDetailBlocks.LOCATION:
            if (!event?.locations?.length) return null;
            return (
              <React.Fragment key={block}>
                <EventLocations event={event} />
              </React.Fragment>
            );

          case EventDetailBlocks.REQUIRES_CONFIRMATION:
            if (!event.requiresConfirmation) return null;

            return (
              <EventMetaBlock key={block} icon={CheckSquare}>
                {t("requires_confirmation")}
              </EventMetaBlock>
            );

          case EventDetailBlocks.OCCURENCES:
            if (!event.recurringEvent) return null;

            return (
              <EventMetaBlock key={block} icon={RefreshCcw}>
                <EventOccurences event={event} />
              </EventMetaBlock>
            );

          case EventDetailBlocks.PRICE:
            if (event.price === 0) return null;

            return (
              <EventMetaBlock key={block} icon={CreditCard}>
                <EventPrice event={event} />
              </EventMetaBlock>
            );
        }
      })}
    </>
  );
};
