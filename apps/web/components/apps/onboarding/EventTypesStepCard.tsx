import type { FC } from "react";
import React from "react";

import type { EventType, Team } from "@calcom/prisma/client";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { ScrollableArea, Badge } from "@calcom/ui";
import { Clock } from "@calcom/ui/components/icon";

export type EventTypeProp = Pick<
  EventType,
  | "description"
  | "id"
  | "metadata"
  | "length"
  | "title"
  | "position"
  | "requiresConfirmation"
  | "recurringEvent"
  | "slug"
> & { team: Pick<Team, "slug"> | null };

type EventTypesCardProps = {
  eventTypes: EventTypeProp[];
  onSelect: (id: number) => void;
  userName: string;
};

export const EventTypesStepCard: FC<EventTypesCardProps> = ({ eventTypes, onSelect, userName }) => {
  return (
    <div className="sm:border-subtle bg-default mt-10  border dark:bg-black sm:rounded-md ">
      <ScrollableArea className="rounded-md">
        <ul className="border-subtle max-h-97 !static w-full divide-y">
          {eventTypes.map((eventType) => (
            <EventTypeCard
              key={eventType.id}
              {...eventType}
              onClick={() => onSelect(eventType.id)}
              userName={userName}
            />
          ))}
        </ul>
      </ScrollableArea>
    </div>
  );
};

type EventTypeCardProps = EventTypeProp & { onClick: () => void; userName: string };

const EventTypeCard: FC<EventTypeCardProps> = ({
  title,
  description,
  id,
  metadata,
  length,
  onClick,
  slug,
  team,
  userName,
}) => {
  const parsedMetaData = EventTypeMetaDataSchema.safeParse(metadata);
  const durations =
    parsedMetaData.success &&
    parsedMetaData.data?.multipleDuration &&
    Boolean(parsedMetaData.data?.multipleDuration.length)
      ? [length, ...parsedMetaData.data?.multipleDuration?.filter((duration) => duration !== length)].sort()
      : [length];
  return (
    <li
      className="hover:bg-muted min-h-20 box-border flex w-full cursor-pointer flex-col px-4 py-3"
      onClick={onClick}>
      <div>
        <span className="text-default font-semibold ltr:mr-1 rtl:ml-1">{title}</span>{" "}
        <small className="text-subtle hidden font-normal sm:inline">
          /{team ? team.slug : userName}/{slug}
        </small>
      </div>
      {Boolean(description) && (
        <div className="text-subtle line-clamp-4 break-words  text-sm sm:max-w-[650px] [&>*:not(:first-child)]:hidden [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600">
          {description}
        </div>
      )}
      <div className="mt-2 flex flex-row flex-wrap gap-2">
        {Boolean(durations.length) &&
          durations.map((duration) => (
            <Badge key={`event-type-${id}-duration-${duration}`} variant="gray" startIcon={Clock}>
              {duration}m
            </Badge>
          ))}
      </div>
    </li>
  );
};
