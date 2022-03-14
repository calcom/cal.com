import {
  ArrowDownIcon,
  ArrowUpIcon,
  DotsHorizontalIcon,
  ExternalLinkIcon,
  LinkIcon,
  UsersIcon,
  UploadIcon,
  ClipboardCopyIcon,
} from "@heroicons/react/solid";
import { Trans } from "next-i18next";
import Head from "next/head";
import Link from "next/link";
import React, { Fragment, useEffect, useState } from "react";

import { Button } from "@calcom/ui";

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
import Dropdown, {
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@components/ui/Dropdown";
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
      <div className="mx-auto block text-center md:max-w-screen-sm">
        <h3 className="mt-2 text-xl font-bold text-neutral-900">{t("new_event_type_heading")}</h3>
        <p className="text-md mt-1 mb-2 text-neutral-600">{t("new_event_type_description")}</p>
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

  const [isNativeShare, setNativeShare] = useState(true);

  useEffect(() => {
    if (!navigator.share) {
      setNativeShare(false);
    }
  }, []);

  return (
    <div className="-mx-4 mb-16 overflow-hidden rounded-sm border border-gray-200 bg-white sm:mx-0">
      <ul className="divide-y divide-neutral-200" data-testid="event-types">
        {sortableTypes.map((type, index) => (
          <li
            key={type.id}
            className={classNames(
              type.$disabled && "pointer-events-none cursor-not-allowed select-none opacity-30"
            )}
            data-disabled={type.$disabled ? 1 : 0}>
            <div
              className={classNames(
                "flex items-center justify-between hover:bg-neutral-50 ",
                type.$disabled && "pointer-events-none"
              )}>
              <div className="group flex w-full items-center justify-between px-4 py-4 hover:bg-neutral-50 sm:px-6">
                {sortableTypes.length > 1 && (
                  <>
                    <button
                      className="invisible absolute left-1/2 -mt-4 mb-4 -ml-4 hidden h-7 w-7 scale-0 rounded-full border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow group-hover:visible group-hover:scale-100 sm:left-[19px] sm:ml-0 sm:block"
                      onClick={() => moveEventType(index, -1)}>
                      <ArrowUpIcon />
                    </button>

                    <button
                      className="invisible absolute left-1/2 mt-4 -ml-4 hidden h-7 w-7 scale-0 rounded-full border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow group-hover:visible group-hover:scale-100 sm:left-[19px] sm:ml-0 sm:block"
                      onClick={() => moveEventType(index, 1)}>
                      <ArrowDownIcon />
                    </button>
                  </>
                )}
                <Link href={"/event-types/" + type.id}>
                  <a
                    className="flex-grow truncate text-sm"
                    title={`${type.title} ${type.description ? `– ${type.description}` : ""}`}>
                    <div>
                      <span className="truncate font-medium text-neutral-900">{type.title} </span>
                      <small className="hidden text-neutral-500 sm:inline">{`/${profile.slug}/${type.slug}`}</small>
                      {type.hidden && (
                        <span className="rtl:mr-2inline items-center rounded-sm bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800 ltr:ml-2">
                          {t("hidden")}
                        </span>
                      )}
                      {readOnly && (
                        <span className="rtl:mr-2inline items-center rounded-sm bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800 ltr:ml-2">
                          {t("readonly")}
                        </span>
                      )}
                    </div>
                    <EventTypeDescription eventType={type} />
                  </a>
                </Link>

                <div className="mt-4 hidden flex-shrink-0 sm:mt-0 sm:ml-5 sm:flex">
                  <div className="flex items-center space-x-2 overflow-hidden rtl:space-x-reverse">
                    {type.users?.length > 1 && (
                      <AvatarGroup
                        border="border-2 border-white"
                        size={8}
                        truncateAfter={4}
                        items={type.users.map((organizer) => ({
                          alt: organizer.name || "",
                          image: `${process.env.NEXT_PUBLIC_APP_URL}/${organizer.username}/avatar.png`,
                        }))}
                      />
                    )}
                    <Tooltip content={t("preview")}>
                      <a
                        href={`${process.env.NEXT_PUBLIC_APP_URL}/${profile.slug}/${type.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-icon appearance-none">
                        <ExternalLinkIcon className="h-5 w-5 group-hover:text-black" />
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
                        <LinkIcon className="h-5 w-5 group-hover:text-black" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
              <div className="mr-5 flex flex-shrink-0 sm:hidden">
                <Dropdown>
                  <DropdownMenuTrigger className="h-[38px] w-[38px] cursor-pointer rounded-sm border border-transparent text-neutral-500 hover:border-gray-300 hover:text-neutral-900">
                    <DotsHorizontalIcon className="h-5 w-5 group-hover:text-gray-800" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent portalled>
                    <DropdownMenuItem>
                      <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/${profile.slug}/${type.slug}`}>
                        <a target="_blank">
                          <Button color="minimal" StartIcon={ExternalLinkIcon} className="w-full font-normal">
                            {t("preview")}
                          </Button>
                        </a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Button
                        type="button"
                        color="minimal"
                        className="w-full font-normal"
                        data-testid={"event-type-duplicate-" + type.id}
                        StartIcon={ClipboardCopyIcon}
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${process.env.NEXT_PUBLIC_APP_URL}/${profile.slug}/${type.slug}`
                          );
                          showToast(t("link_copied"), "success");
                        }}>
                        {t("copy_link")}
                      </Button>
                    </DropdownMenuItem>
                    {isNativeShare ? (
                      <DropdownMenuItem>
                        <Button
                          type="button"
                          color="minimal"
                          className="w-full font-normal"
                          data-testid={"event-type-duplicate-" + type.id}
                          StartIcon={UploadIcon}
                          onClick={() => {
                            navigator
                              .share({
                                title: t("share"),
                                text: t("share_event"),
                                url: `${process.env.NEXT_PUBLIC_APP_URL}/${profile.slug}/${type.slug}`,
                              })
                              .then(() => showToast(t("link_shared"), "success"))
                              .catch(() => showToast(t("failed"), "error"));
                          }}>
                          {t("share")}
                        </Button>
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </Dropdown>
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
  <div className="mb-4 flex">
    <Link href="/settings/teams">
      <a>
        <Avatar
          alt={profile?.name || ""}
          imageSrc={profile?.image || undefined}
          size={8}
          className="mt-1 inline ltr:mr-2 rtl:ml-2"
        />
      </a>
    </Link>
    <div>
      <Link href="/settings/teams">
        <a className="font-bold">{profile?.name || ""}</a>
      </Link>
      {membershipCount && (
        <span className="relative -top-px text-xs text-neutral-500 ltr:ml-2 rtl:mr-2">
          <Link href="/settings/teams">
            <a>
              <Badge variant="gray">
                <UsersIcon className="mr-1 -mt-px inline h-3 w-3" />
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
                    <Trans i18nKey="plan_upgrade_instructions">
                      You can
                      <a href="/api/upgrade" className="underline">
                        upgrade here
                      </a>
                      .
                    </Trans>
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
