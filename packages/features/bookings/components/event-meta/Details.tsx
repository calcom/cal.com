import { Fragment } from "react";
import React from "react";

import { locationKeyToString } from "@calcom/app-store/locations";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  FiInfo,
  FiClock,
  FiMapPin,
  FiCheckSquare,
  FiRefreshCcw,
  FiCreditCard,
} from "@calcom/ui/components/icon";

import { PublicEvent, EventDetailBlocks } from "../types";
import { EventDuration } from "./Duration";
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
  icon: React.FC<{ className: string }>;
  children: React.ReactNode;
  // Emphasises the text in the block. For now only
  // applying in dark mode.
  highlight?: boolean;
  contentClassName?: string;
}

/**
 * Default order in which the event details will be rendered.
 */
const defaultEventDetailsBlocks = [
  EventDetailBlocks.DESCRIPTION,
  EventDetailBlocks.REQUIRES_CONFIRMATION,
  EventDetailBlocks.DURATION,
  EventDetailBlocks.OCCURENCES,
  EventDetailBlocks.LOCATION,
  EventDetailBlocks.PRICE,
];

export const EventMeta = ({ icon: Icon, children, highlight, contentClassName }: EventMetaProps) => {
  if (!React.Children.count(children)) return null;
  console.log(React.Children.count(children), children);
  return (
    <div
      className={classNames(
        "flex items-start justify-start text-gray-600",
        highlight ? "dark:text-white" : "dark:text-darkgray-600 "
      )}>
      <Icon className="mr-2 mt-1 h-4 w-4 flex-shrink-0" />
      <div className={contentClassName}>{children}</div>
    </div>
  );
};

export const EventDetails = ({ event, blocks = defaultEventDetailsBlocks }: EventDetailsProps) => {
  const { t } = useLocale();
  return (
    <>
      {blocks.map((block) => {
        if (typeof block === "function") {
          return <Fragment key={block.name}>block(event)</Fragment>;
        }

        switch (block) {
          case EventDetailBlocks.DESCRIPTION:
            if (!event.description) return null;
            // @TODO: Parse markdown
            return (
              <EventMeta key={block} icon={FiInfo} contentClassName="break-words max-w-full overflow-clip">
                {event.description}
              </EventMeta>
            );

          case EventDetailBlocks.DURATION:
            return (
              <EventMeta key={block} icon={FiClock}>
                <EventDuration event={event} />
              </EventMeta>
            );

          case EventDetailBlocks.LOCATION:
            if (!event?.locations?.length) return null;
            return (
              <>
                {/* @TODO: Add correct icons for even ttype */}
                {event.locations.map((location) => (
                  <EventMeta key={block} icon={FiMapPin}>
                    <div key={location.type} className="flex flex-row items-center text-sm font-medium">
                      {t(locationKeyToString(location) ?? "")}
                    </div>
                  </EventMeta>
                ))}
              </>
            );

          case EventDetailBlocks.REQUIRES_CONFIRMATION:
            if (!event.requiresConfirmation) return null;

            return (
              <EventMeta key={block} icon={FiCheckSquare}>
                {t("requires_confirmation")}
              </EventMeta>
            );

          case EventDetailBlocks.OCCURENCES:
            if (!event.requiresConfirmation) return null;

            return (
              <EventMeta key={block} icon={FiRefreshCcw}>
                <EventOccurences event={event} />
              </EventMeta>
            );

          case EventDetailBlocks.PRICE:
            if (event.price === 0) return null;

            return (
              <EventMeta key={block} icon={FiCreditCard}>
                <EventPrice event={event} />
              </EventMeta>
            );
        }
      })}
    </>
  );
};
