import { Fragment } from "react";

import classNames from "@calcom/lib/classNames";
import { FiInfo, FiClock, FiMapPin } from "@calcom/ui/components/icon";

import { PublicEvent } from "../types";

enum EventDetailBlocks {
  DESCRIPTION,
  DURATION,
  LOCATION,
}

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
  className?: string;
  contentClassName?: string;
}

const defaultEventDetailsBlocks = [
  EventDetailBlocks.DESCRIPTION,
  EventDetailBlocks.DURATION,
  EventDetailBlocks.LOCATION,
];

export const EventMeta = ({
  icon: Icon,
  children,
  highlight,
  className,
  contentClassName,
}: EventMetaProps) => {
  return (
    <div
      className={classNames(
        "flex items-baseline justify-start text-gray-600",
        highlight ? "dark:text-white" : "dark:text-darkgray-600 ",
        className
      )}>
      <Icon className="mr-2 h-4 w-4 flex-shrink-0" />
      <div className={contentClassName}>{children}</div>
    </div>
  );
};

export const EventDetails = ({ event, blocks = defaultEventDetailsBlocks, className }: EventDetailsProps) => {
  return (
    <div className={className}>
      {blocks.map((block) => {
        if (typeof block === "function") {
          return <Fragment key={block.name}>block(event)</Fragment>;
        }

        switch (block) {
          case EventDetailBlocks.DESCRIPTION:
            // @TODO: Parse markdown
            return (
              <EventMeta key={block} icon={FiInfo} contentClassName="break-words max-w-full overflow-clip">
                {event.description}
              </EventMeta>
            );

          case EventDetailBlocks.DURATION:
            return (
              <EventMeta key={block} icon={FiClock}>
                {event.length} mins
              </EventMeta>
            );

          case EventDetailBlocks.LOCATION:
            if (!event?.locations?.length) return null;
            // @TODO: Proper parse location names into translations.
            return (
              <EventMeta key={block} icon={FiMapPin}>
                {event.locations.map((location) => (
                  <div key={location.type} className="flex flex-row items-center text-sm font-medium">
                    {location.type}
                  </div>
                ))}
              </EventMeta>
            );
        }
      })}
    </div>
  );
};
