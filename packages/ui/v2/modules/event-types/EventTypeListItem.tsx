import { Prisma, SchedulingType } from "@prisma/client";

import { baseEventTypeSelect } from "@calcom/prisma/selects";

import { AvatarGroup } from "../../core";
import EventTypeDescription from "./EventTypeDescription";

const eventTypeData = Prisma.validator<Prisma.EventTypeArgs>()({
  select: baseEventTypeSelect,
});

type EventType = Prisma.EventTypeGetPayload<typeof eventTypeData>;

type Props = {
  eventType: EventType;
  usersAvatars: {
    alt: string;
    image: string;
  }[];
};

function EventTypeListItem({ eventType, usersAvatars }: Props) {
  return (
    <div className="dark:border-darkgray-600 dark:bg-darkgray-100 flex flex-col border-b bg-white p-5 first:rounded-t-md last:rounded-b-md">
      <span
        className="truncate font-semibold text-gray-700 ltr:mr-1 rtl:ml-1"
        data-testid={"event-type-title-" + type.id}>
        {type.title}
      </span>
      <small
        className="hidden font-normal leading-4 text-gray-600 sm:inline"
        data-testid={"event-type-slug-" + type.id}>{`/${group.profile.slug}/${type.slug}`}</small>
      <EventTypeDescription eventType={eventType} />
      <div className="mt-1">
        <AvatarGroup className="flex flex-shrink-0" size="sm" items={usersAvatars} />
      </div>
    </div>
  );
}

export default EventTypeListItem;
