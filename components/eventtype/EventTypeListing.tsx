import { EventType } from "@prisma/client";
import React from "react";
import {ArrowRightIcon} from "@heroicons/react/solid";
import Link from "next/link";
import EventTypeDescription from "@components/eventtype/EventTypeDescription";
import classNames from "@lib/classNames";
import Avatar from "@components/Avatar";

type ListItemProps = {
  type: EventType;
  eventPageLink: string;
};

type EventTypeListingProps = {
  types: EventType;
  currentPage: string;
};

const ListItem = ({ type, eventPageLink }: ListItemProps) => (
  <li
    key={type.id}
    className="rounded-sm bg-white border border-neutral-200 group relative dark:bg-neutral-900 dark:border-0 dark:hover:border-neutral-600 bg-white hover:bg-gray-50  hover:border-black rounded-sm">
    <ArrowRightIcon className="absolute transition-opacity h-4 w-4 right-3 top-3 text-black dark:text-white opacity-0 group-hover:opacity-100" />
    <Link href={eventPageLink}>
      <a className="block px-6 py-4 flex items-center">
        <div className="flex-grow">
          <h2 className="font-semibold text-neutral-900 dark:text-white">{type.title}</h2>
          <EventTypeDescription className="text-sm" eventType={type} />
        </div>
        <ul className="flex-shrink inline-flex">
          {type.users.map((user, idx: number) => (
            <li className={classNames(idx && "-ml-3", "w-10 h-10")} key={user.id}>
              <Avatar displayName={user.name} imageSrc={user.avatar} />
            </li>
          ))}
        </ul>
      </a>
    </Link>
  </li>
);

const EventTypeListing = ({ currentPage, eventTypes }: EventTypeListingProps) => (
  <div className="overflow-hidden -mx-4 sm:mx-0 mb-4">
    <ul className="space-y-3">
      {eventTypes.map(type => <ListItem type={type} eventPageLink={`${currentPage}/${type.slug}`} />)}
    </ul>
  </div>
);

export default EventTypeListing;
