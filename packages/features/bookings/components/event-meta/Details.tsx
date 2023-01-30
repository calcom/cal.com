import classNames from "@calcom/lib/classNames";
import { Icon } from "@calcom/ui";

import { PublicEvent } from "../types";

enum EventDetailBlocks {
  DESCRIPTION,
  DURATION,
  LOCATION,
}

interface EventDetailsProps {
  blocks?: (EventDetailBlocks | React.FC)[];
  event: PublicEvent;
  className?: string;
}

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

const EventMeta = ({ icon: Icon, children, highlight, className, contentClassName }: EventMetaProps) => {
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
          return block(event);
        }

        switch (block) {
          case EventDetailBlocks.DESCRIPTION:
            // @TODO: Parse markdown
            return (
              <EventMeta icon={Icon.FiInfo} contentClassName="break-words max-w-full overflow-clip">
                {event.description}
              </EventMeta>
            );

          case EventDetailBlocks.DURATION:
            return <EventMeta icon={Icon.FiClock}>{event.length} mins</EventMeta>;

          case EventDetailBlocks.LOCATION:
            if (!event?.locations?.length) return null;
            // @TODO: Proper parse location names into translations.
            return (
              <EventMeta icon={Icon.FiMapPin}>
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
