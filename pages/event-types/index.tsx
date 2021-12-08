// TODO: replace headlessui with radix-ui
import { Menu, Transition } from "@headlessui/react";
import {
  DotsHorizontalIcon,
  ExternalLinkIcon,
  LinkIcon,
  ArrowDownIcon,
  ChevronDownIcon,
  PlusIcon,
  ArrowUpIcon,
  UsersIcon,
} from "@heroicons/react/solid";
import { SchedulingType } from "@prisma/client";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { Fragment, useRef, useState, useEffect } from "react";
import { useMutation } from "react-query";

import { QueryCell } from "@lib/QueryCell";
import classNames from "@lib/classNames";
import { HttpError } from "@lib/core/http/error";
import { useLocale } from "@lib/hooks/useLocale";
import { useToggleQuery } from "@lib/hooks/useToggleQuery";
import createEventType from "@lib/mutations/event-types/create-event-type";
import showToast from "@lib/notification";
import { inferQueryOutput, trpc } from "@lib/trpc";
import { CreateEventType } from "@lib/types/event-type";

import { Dialog, DialogClose, DialogContent } from "@components/Dialog";
import Shell from "@components/Shell";
import { Tooltip } from "@components/Tooltip";
import EventTypeDescription from "@components/eventtype/EventTypeDescription";
import { Alert } from "@components/ui/Alert";
import Avatar from "@components/ui/Avatar";
import AvatarGroup from "@components/ui/AvatarGroup";
import Badge from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/Dropdown";
import * as RadioArea from "@components/ui/form/radio-area";
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
        <CreateNewEventButton canAddEvents={canAddEvents} profiles={profiles} />
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
                  className="absolute mb-8 left-1/2 -ml-4 sm:ml-0 sm:left-[19px] border hover:border-transparent text-gray-400 transition-all hover:text-black hover:shadow group-hover:scale-100 scale-0 w-7 h-7 p-1 invisible group-hover:visible bg-white rounded-full"
                  onClick={() => moveEventType(index, -1)}>
                  <ArrowUpIcon />
                </button>
                <button
                  className="absolute mt-8 left-1/2 -ml-4 sm:ml-0 sm:left-[19px] border hover:border-transparent text-gray-400 transition-all hover:text-black hover:shadow group-hover:scale-100 scale-0 w-7 h-7 p-1 invisible group-hover:visible bg-white rounded-full"
                  onClick={() => moveEventType(index, 1)}>
                  <ArrowDownIcon />
                </button>
                <Link href={"/event-types/" + type.id}>
                  <a
                    className="flex-grow text-sm truncate"
                    title={`${type.title} ${type.description ? `– ${type.description}` : ""}`}>
                    <div>
                      <span className="font-medium truncate text-neutral-900">{type.title}</span>
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
            <CreateNewEventButton
              canAddEvents={query.data.viewer.canAddEvents}
              profiles={query.data.profiles}
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

const CreateNewEventButton = ({ profiles, canAddEvents }: CreateEventTypeProps) => {
  const router = useRouter();
  const teamId: number | null = Number(router.query.teamId) || null;
  const modalOpen = useToggleQuery("new");
  const { t } = useLocale();

  const createMutation = useMutation(createEventType, {
    onSuccess: async ({ eventType }) => {
      await router.push("/event-types/" + eventType.id);
      showToast(t("event_type_created_successfully", { eventTypeTitle: eventType.title }), "success");
    },
    onError: (err: HttpError) => {
      const message = `${err.statusCode}: ${err.message}`;
      showToast(message, "error");
    },
  });

  const slugRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog
      open={modalOpen.isOn}
      onOpenChange={(isOpen) => {
        router.push(isOpen ? modalOpen.hrefOn : modalOpen.hrefOff);
      }}>
      {!profiles.filter((profile) => profile.teamId).length && (
        <Button
          data-testid="new-event-type"
          {...(canAddEvents
            ? {
                href: modalOpen.hrefOn,
              }
            : {
                disabled: true,
              })}
          StartIcon={PlusIcon}>
          {t("new_event_type_btn")}
        </Button>
      )}
      {profiles.filter((profile) => profile.teamId).length > 0 && (
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button EndIcon={ChevronDownIcon}>{t("new_event_type_btn")}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("new_event_subtitle")}</DropdownMenuLabel>
            <DropdownMenuSeparator className="h-px bg-gray-200" />
            {profiles.map((profile) => (
              <DropdownMenuItem
                key={profile.slug}
                className="px-3 py-2 cursor-pointer hover:bg-neutral-100 focus:outline-none"
                onSelect={() =>
                  router.push({
                    pathname: router.pathname,
                    query: {
                      ...router.query,
                      new: "1",
                      eventPage: profile.slug,
                      ...(profile.teamId
                        ? {
                            teamId: profile.teamId,
                          }
                        : {}),
                    },
                  })
                }>
                <Avatar alt={profile.name || ""} imageSrc={profile.image} size={6} className="inline mr-2" />
                {profile.name ? profile.name : profile.slug}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </Dropdown>
      )}
      <DialogContent>
        <div className="mb-8">
          <h3 className="text-lg font-bold leading-6 text-gray-900" id="modal-title">
            {teamId ? t("add_new_team_event_type") : t("add_new_event_type")}
          </h3>
          <div>
            <p className="text-sm text-gray-500">{t("new_event_type_to_book_description")}</p>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();

            const target = e.target as unknown as Record<
              "title" | "slug" | "description" | "length" | "schedulingType",
              { value: string }
            >;

            const payload: CreateEventType = {
              title: target.title.value,
              slug: target.slug.value,
              description: target.description.value,
              length: parseInt(target.length.value),
            };

            if (router.query.teamId) {
              payload.teamId = parseInt(`${router.query.teamId}`, 10);
              payload.schedulingType = target.schedulingType.value as SchedulingType;
            }

            createMutation.mutate(payload);
          }}>
          <div>
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                {t("title")}
              </label>
              <div className="mt-1">
                <input
                  onChange={(e) => {
                    if (!slugRef.current) {
                      return;
                    }
                    slugRef.current.value = e.target.value.replace(/\s+/g, "-").toLowerCase();
                  }}
                  type="text"
                  name="title"
                  id="title"
                  required
                  className="block w-full border-gray-300 rounded-sm shadow-sm focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                  placeholder={t("quick_chat")}
                />
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                {t("url")}
              </label>
              <div className="mt-1">
                <div className="flex rounded-sm shadow-sm">
                  <span className="inline-flex items-center px-3 text-gray-500 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 sm:text-sm">
                    {process.env.NEXT_PUBLIC_APP_URL}/{router.query.eventPage || profiles[0].slug}/
                  </span>
                  <input
                    ref={slugRef}
                    type="text"
                    name="slug"
                    id="slug"
                    required
                    className="flex-1 block w-full min-w-0 border-gray-300 rounded-none focus:ring-neutral-900 focus:border-neutral-900 rounded-r-md sm:text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                {t("description")}
              </label>
              <div className="mt-1">
                <textarea
                  name="description"
                  id="description"
                  className="block w-full border-gray-300 rounded-sm shadow-sm focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                  placeholder={t("quick_video_meeting")}
                />
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="length" className="block text-sm font-medium text-gray-700">
                {t("length")}
              </label>
              <div className="relative mt-1 rounded-sm shadow-sm">
                <input
                  type="number"
                  name="length"
                  id="length"
                  required
                  className="block w-full pr-20 border-gray-300 rounded-sm focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                  placeholder="15"
                  defaultValue={15}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-400">
                  {t("minutes")}
                </div>
              </div>
            </div>
          </div>
          {teamId && (
            <div className="mb-4">
              <label htmlFor="schedulingType" className="block text-sm font-medium text-gray-700">
                {t("scheduling_type")}
              </label>
              <RadioArea.Group
                name="schedulingType"
                className="relative flex mt-1 space-x-6 rounded-sm shadow-sm">
                <RadioArea.Item value={SchedulingType.COLLECTIVE} className="w-1/2 text-sm">
                  <strong className="block mb-1">{t("collective")}</strong>
                  <p>{t("collective_description")}</p>
                </RadioArea.Item>
                <RadioArea.Item value={SchedulingType.ROUND_ROBIN} className="w-1/2 text-sm">
                  <strong className="block mb-1">{t("round_robin")}</strong>
                  <p>{t("round_robin_description")}</p>
                </RadioArea.Item>
              </RadioArea.Group>
            </div>
          )}
          <div className="flex flex-row-reverse mt-8 gap-x-2">
            <Button type="submit" loading={createMutation.isLoading}>
              {t("continue")}
            </Button>
            <DialogClose asChild>
              <Button color="secondary">{t("cancel")}</Button>
            </DialogClose>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EventTypesPage;
