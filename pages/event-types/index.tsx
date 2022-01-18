// TODO: replace headlessui with radix-ui
import { Menu, Transition } from "@headlessui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DotsHorizontalIcon,
  ExternalLinkIcon,
  LinkIcon,
  UsersIcon,
} from "@heroicons/react/solid";
import Head from "next/head";
import Link from "next/link";
import React, { Fragment, useEffect, useState } from "react";

import { QueryCell } from "@lib/QueryCell";
import classNames from "@lib/classNames";
import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { inferQueryOutput, trpc } from "@lib/trpc";

import Shell from "@components/Shell";
import { Tooltip } from "@components/Tooltip";
import CreateEventTypeButton from "@components/eventtype/CreateEventType";
import EventTypeDescription from "@components/eventtype/EventTypeDescription";
import { Alert } from "@components/ui/Alert";
import Avatar from "@components/ui/Avatar";
import AvatarGroup from "@components/ui/AvatarGroup";
import Badge from "@components/ui/Badge";
import UserCalendarIllustration from "@components/ui/svg/UserCalendarIllustration";

type Profiles = inferQueryOutput<"viewer.eventTypes">["profiles"];
type EventTypeGroups = inferQueryOutput<"viewer.eventTypes">["eventTypeGroups"];
type EventTypeGroupProfile = EventTypeGroups[number]["profile"];

interface CreateEventTypeProps {
  canAddEvents: boolean;
  profiles: Profiles;
}

const CreateFirstEventTypeView = ({ canAddEvents, profiles }: CreateEventTypeProps) => {
  const { t } = useLocale();

  return (
    <div className="md:py-20">
      <UserCalendarIllustration />
      <div className="block mx-auto text-center md:max-w-screen-sm">
        <h3 className="mt-2 text-xl font-bold text-neutral-900">{t("new_event_type_heading")}</h3>
        <p className="mt-1 mb-2 text-md text-neutral-600">{t("new_event_type_description")}</p>
        <CreateEventTypeButton canAddEvents={canAddEvents} options={profiles} />
      </div>
    </div>
  );
};

type EventTypeGroup = inferQueryOutput<"viewer.eventTypes">["eventTypeGroups"][number];
type EventType = EventTypeGroup["eventTypes"][number];
interface EventTypeListProps {
  profile: { slug: string | null };
  readOnly: boolean;
  types: EventType[];
}
const EventTypeList = ({ readOnly, types, profile }: EventTypeListProps): JSX.Element => {
  const { t } = useLocale();

  const utils = trpc.useContext();
  const mutation = trpc.useMutation("viewer.eventTypeOrder", {
    onError: (err) => {
      console.error(err.message);
    },
    async onSettled() {
      await utils.cancelQuery(["viewer.eventTypes"]);
      await utils.invalidateQueries(["viewer.eventTypes"]);
    },
  });
  const [sortableTypes, setSortableTypes] = useState(types);
  useEffect(() => {
    setSortableTypes(types);
  }, [types]);
  function moveEventType(index: number, increment: 1 | -1) {
    const newList = [...sortableTypes];

    const type = sortableTypes[index];
    const tmp = sortableTypes[index + increment];
    if (tmp) {
      newList[index] = tmp;
      newList[index + increment] = type;
    }
    setSortableTypes(newList);
    mutation.mutate({
      ids: newList.map((type) => type.id),
    });
  }

  return (
    <div className="mb-16 -mx-4 overflow-hidden bg-white border border-gray-200 rounded-sm sm:mx-0">
      <ul className="divide-y divide-neutral-200" data-testid="event-types">
        {sortableTypes.map((type, index) => (
          <li
            key={type.id}
            className={classNames(
              type.$disabled && "opacity-30 cursor-not-allowed pointer-events-none select-none"
            )}
            data-disabled={type.$disabled ? 1 : 0}>
            <div
              className={classNames(
                "hover:bg-neutral-50 flex justify-between items-center ",
                type.$disabled && "pointer-events-none"
              )}>
              <div className="flex items-center justify-between w-full px-4 py-4 group sm:px-6 hover:bg-neutral-50">
                <button
                  className="hidden sm:block absolute -mt-4 mb-4 left-1/2 -ml-4 sm:ml-0 sm:left-[19px] border hover:border-transparent text-gray-400 transition-all hover:text-black hover:shadow group-hover:scale-100 scale-0 w-7 h-7 p-1 invisible group-hover:visible bg-white rounded-full"
                  onClick={() => moveEventType(index, -1)}>
                  <ArrowUpIcon />
                </button>
                <button
                  className="hidden sm:block absolute mt-4 left-1/2 -ml-4 sm:ml-0 sm:left-[19px] border hover:border-transparent text-gray-400 transition-all hover:text-black hover:shadow group-hover:scale-100 scale-0 w-7 h-7 p-1 invisible group-hover:visible bg-white rounded-full"
                  onClick={() => moveEventType(index, 1)}>
                  <ArrowDownIcon />
                </button>
                <Link href={"/event-types/" + type.id}>
                  <a
                    className="flex-grow text-sm truncate"
                    title={`${type.title} ${type.description ? `– ${type.description}` : ""}`}>
                    <div>
                      <span className="font-medium truncate text-neutral-900">{type.title} </span>
                      <small className="hidden sm:inline text-neutral-500">{`/${profile.slug}/${type.slug}`}</small>
                      {type.hidden && (
                        <span className="ml-2 inline items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-yellow-100 text-yellow-800">
                          {t("hidden")}
                        </span>
                      )}
                      {readOnly && (
                        <span className="ml-2 inline items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-gray-100 text-gray-800">
                          {t("readonly")}
                        </span>
                      )}
                    </div>
                    <EventTypeDescription eventType={type} />
                  </a>
                </Link>

                <div className="flex-shrink-0 hidden mt-4 sm:flex sm:mt-0 sm:ml-5">
                  <div className="flex items-center space-x-2 overflow-hidden">
                    {type.users?.length > 1 && (
                      <AvatarGroup
                        size={8}
                        truncateAfter={4}
                        items={type.users.map((organizer) => ({
                          alt: organizer.name || "",
                          image: organizer.avatar || "",
                        }))}
                      />
                    )}
                    <Tooltip content={t("preview")}>
                      <a
                        href={`${process.env.NEXT_PUBLIC_APP_URL}/${profile.slug}/${type.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-icon">
                        <ExternalLinkIcon className="w-5 h-5 group-hover:text-black" />
                      </a>
                    </Tooltip>

                    <Tooltip content={t("copy_link")}>
                      <button
                        onClick={() => {
                          showToast(t("link_copied"), "success");
                          navigator.clipboard.writeText(
                            `${process.env.NEXT_PUBLIC_APP_URL}/${profile.slug}/${type.slug}`
                          );
                        }}
                        className="btn-icon">
                        <LinkIcon className="w-5 h-5 group-hover:text-black" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
              <div className="flex flex-shrink-0 mr-5 sm:hidden">
                <Menu as="div" className="inline-block text-left">
                  {({ open }) => (
                    <>
                      <div>
                        <Menu.Button className="p-2 mt-1 border border-transparent text-neutral-400 hover:border-gray-200">
                          <span className="sr-only">{t("open_options")}</span>
                          <DotsHorizontalIcon className="w-5 h-5" aria-hidden="true" />
                        </Menu.Button>
                      </div>

                      <Transition
                        show={open}
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95">
                        <Menu.Items
                          static
                          className="absolute right-0 z-10 w-56 mt-2 origin-top-right bg-white divide-y rounded-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none divide-neutral-100">
                          <div className="py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <a
                                  href={`${process.env.NEXT_PUBLIC_APP_URL}/${profile.slug}/${type.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={classNames(
                                    active ? "bg-neutral-100 text-neutral-900" : "text-neutral-700",
                                    "group flex items-center px-4 py-2 text-sm font-medium"
                                  )}>
                                  <ExternalLinkIcon
                                    className="w-4 h-4 mr-3 text-neutral-400 group-hover:text-neutral-500"
                                    aria-hidden="true"
                                  />
                                  {t("preview")}
                                </a>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => {
                                    showToast("Link copied!", "success");
                                    navigator.clipboard.writeText(
                                      `${process.env.NEXT_PUBLIC_APP_URL}/${profile.slug}/${type.slug}`
                                    );
                                  }}
                                  className={classNames(
                                    active ? "bg-neutral-100 text-neutral-900" : "text-neutral-700",
                                    "group flex items-center px-4 py-2 text-sm w-full font-medium"
                                  )}>
                                  <LinkIcon
                                    className="w-4 h-4 mr-3 text-neutral-400 group-hover:text-neutral-500"
                                    aria-hidden="true"
                                  />
                                  {t("copy_link")}
                                </button>
                              )}
                            </Menu.Item>
                          </div>
                        </Menu.Items>
                      </Transition>
                    </>
                  )}
                </Menu>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

interface EventTypeListHeadingProps {
  profile: EventTypeGroupProfile;
  membershipCount: number;
}
const EventTypeListHeading = ({ profile, membershipCount }: EventTypeListHeadingProps): JSX.Element => (
  <div className="flex mb-4">
    <Link href="/settings/teams">
      <a>
        <Avatar
          alt={profile?.name || ""}
          imageSrc={profile?.image || undefined}
          size={8}
          className="inline mt-1 mr-2"
        />
      </a>
    </Link>
    <div>
      <Link href="/settings/teams">
        <a className="font-bold">{profile?.name || ""}</a>
      </Link>
      {membershipCount && (
        <span className="relative ml-2 text-xs text-neutral-500 -top-px">
          <Link href="/settings/teams">
            <a>
              <Badge variant="gray">
                <UsersIcon className="inline w-3 h-3 mr-1 -mt-px" />
                {membershipCount}
              </Badge>
            </a>
          </Link>
        </span>
      )}
      {profile?.slug && (
        <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/${profile.slug}`}>
          <a className="block text-xs text-neutral-500">{`${process.env.NEXT_PUBLIC_APP_URL?.replace(
            "https://",
            ""
          )}/${profile.slug}`}</a>
        </Link>
      )}
    </div>
  </div>
);

const EventTypesPage = () => {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.eventTypes"]);

  return (
    <div>
      <Head>
        <title>Home | Cal.com</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Shell
        heading={t("event_types_page_title")}
        subtitle={t("event_types_page_subtitle")}
        CTA={
          query.data &&
          query.data.eventTypeGroups.length !== 0 && (
            <CreateEventTypeButton
              canAddEvents={query.data.viewer.canAddEvents}
              options={query.data.profiles}
            />
          )
        }>
        <QueryCell
          query={query}
          success={({ data }) => (
            <>
              {data.viewer.plan === "FREE" && !data.viewer.canAddEvents && (
                <Alert
                  severity="warning"
                  title={<>{t("plan_upgrade")}</>}
                  message={
                    <>
                      {t("to_upgrade_go_to")}{" "}
                      <a href={"https://cal.com/upgrade"} className="underline">
                        {"https://cal.com/upgrade"}
                      </a>
                    </>
                  }
                  className="mb-4"
                />
              )}
              {data.eventTypeGroups.map((group) => (
                <Fragment key={group.profile.slug}>
                  {/* hide list heading when there is only one (current user) */}
                  {(data.eventTypeGroups.length !== 1 || group.teamId) && (
                    <EventTypeListHeading
                      profile={group.profile}
                      membershipCount={group.metadata.membershipCount}
                    />
                  )}
                  <EventTypeList
                    types={group.eventTypes}
                    profile={group.profile}
                    readOnly={group.metadata.readOnly}
                  />
                </Fragment>
              ))}

              {data.eventTypeGroups.length === 0 && (
                <CreateFirstEventTypeView profiles={data.profiles} canAddEvents={data.viewer.canAddEvents} />
              )}
            </>
          )}
        />
      </Shell>
    </div>
  );
};

export default EventTypesPage;
