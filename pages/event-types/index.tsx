// TODO: replace headlessui with radix-ui
import { ChevronDownIcon, PlusIcon } from "@heroicons/react/solid";
import { Prisma, SchedulingType } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { Fragment, useRef } from "react";
import { useMutation } from "react-query";

import { asStringOrNull } from "@lib/asStringOrNull";
import { getSession } from "@lib/auth";
import { HttpError } from "@lib/core/http/error";
import { getOrSetUserLocaleFromHeaders } from "@lib/core/i18n/i18n.utils";
import { ONBOARDING_NEXT_REDIRECT, shouldShowOnboarding } from "@lib/getting-started";
import { useLocale } from "@lib/hooks/useLocale";
import { useToggleQuery } from "@lib/hooks/useToggleQuery";
import createEventType from "@lib/mutations/event-types/create-event-type";
import showToast from "@lib/notification";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import { Dialog, DialogClose, DialogContent } from "@components/Dialog";
import Shell from "@components/Shell";
import EventTypeList from "@components/eventtype/EventTypeList";
import EventTypeListHeading from "@components/eventtype/EventTypeListHeading";
import { Alert } from "@components/ui/Alert";
import Avatar from "@components/ui/Avatar";
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

type PageProps = inferSSRProps<typeof getServerSideProps>;
type Profile = PageProps["profiles"][number];

const EventTypesPage = (props: PageProps) => {
  const { t } = useLocale();

  const CreateFirstEventTypeView = () => (
    <div className="md:py-20">
      <UserCalendarIllustration />
      <div className="block mx-auto text-center md:max-w-screen-sm">
        <h3 className="mt-2 text-xl font-bold text-neutral-900">{t("new_event_type_heading")}</h3>
        <p className="mt-1 mb-2 text-md text-neutral-600">{t("new_event_type_description")}</p>
        <CreateNewEventDialog canAddEvents={props.canAddEvents} profiles={props.profiles} />
      </div>
    </div>
  );

  return (
    <div>
      <Head>
        <title>{t("event_types_page_title")}| Cal.com</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Shell
        heading={t("event_types_page_title")}
        subtitle={t("event_types_page_subtitle")}
        CTA={
          props.eventTypes.length !== 0 && (
            <CreateNewEventDialog canAddEvents={props.canAddEvents} profiles={props.profiles} />
          )
        }>
        {props.user.plan === "FREE" && !props.canAddEvents && (
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
            className="my-4"
          />
        )}
        {props.eventTypes &&
          props.eventTypes.map((input) => (
            <Fragment key={input.profile?.slug}>
              {/* hide list heading when there is only one (current user) */}
              {(props.eventTypes.length !== 1 || input.teamId) && (
                <EventTypeListHeading
                  profile={input.profile}
                  membershipCount={input.metadata?.membershipCount}
                />
              )}
              <EventTypeList
                types={input.eventTypes}
                profile={input.profile}
                readOnly={input.metadata?.readOnly}
              />
            </Fragment>
          ))}

        {props.eventTypes.length === 0 && <CreateFirstEventTypeView />}
      </Shell>
    </div>
  );
};

const CreateNewEventDialog = ({ profiles, canAddEvents }: { profiles: Profile[]; canAddEvents: boolean }) => {
  const router = useRouter();
  const teamId: number | null = Number(router.query.teamId) || null;
  const modalOpen = useToggleQuery("new");
  const { t } = useLocale();

  const createMutation = useMutation(createEventType, {
    onSuccess: async ({ eventType }) => {
      await router.push("/event-types/" + eventType.id);
      showToast(`${eventType.title} event type created successfully`, "success");
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
                <Avatar
                  displayName={profile.name}
                  imageSrc={profile.image}
                  size={6}
                  className="inline mr-2"
                />
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

            const payload = {
              title: target.title.value,
              slug: target.slug.value,
              description: target.description.value,
              length: parseInt(target.length.value),
            };

            if (router.query.teamId) {
              payload.teamId = parseInt(asStringOrNull(router.query.teamId), 10);
              payload.schedulingType = target.schedulingType.value;
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
          <div className="mt-8 sm:flex sm:flex-row-reverse gap-x-2">
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

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getSession(context);
  const locale = await getOrSetUserLocaleFromHeaders(context.req);

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  /**
   * This makes the select reusable and type safe.
   * @url https://www.prisma.io/docs/concepts/components/prisma-client/advanced-type-safety/prisma-validator#using-the-prismavalidator
   * */
  const eventTypeSelect = Prisma.validator<Prisma.EventTypeSelect>()({
    id: true,
    title: true,
    description: true,
    length: true,
    schedulingType: true,
    slug: true,
    hidden: true,
    price: true,
    currency: true,
    users: {
      select: {
        id: true,
        avatar: true,
        name: true,
      },
    },
  });

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      username: true,
      name: true,
      startTime: true,
      endTime: true,
      bufferTime: true,
      avatar: true,
      completedOnboarding: true,
      createdDate: true,
      plan: true,
      teams: {
        where: {
          accepted: true,
        },
        select: {
          role: true,
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              members: {
                select: {
                  userId: true,
                },
              },
              eventTypes: {
                select: eventTypeSelect,
              },
            },
          },
        },
      },
      eventTypes: {
        where: {
          team: null,
        },
        select: eventTypeSelect,
      },
    },
  });

  if (!user) {
    // this shouldn't happen
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }

  if (
    shouldShowOnboarding({ completedOnboarding: user.completedOnboarding, createdDate: user.createdDate })
  ) {
    return ONBOARDING_NEXT_REDIRECT;
  }

  // backwards compatibility, TMP:
  const typesRaw = await prisma.eventType.findMany({
    where: {
      userId: session.user.id,
    },
    select: eventTypeSelect,
  });

  type EventTypeGroup = {
    teamId?: number | null;
    profile?: {
      slug: typeof user["username"];
      name: typeof user["name"];
      image: typeof user["avatar"];
    };
    metadata: {
      membershipCount: number;
      readOnly: boolean;
    };
    eventTypes: (typeof user.eventTypes[number] & { $disabled?: boolean })[];
  };

  let eventTypeGroups: EventTypeGroup[] = [];
  const eventTypesHashMap = user.eventTypes.concat(typesRaw).reduce((hashMap, newItem) => {
    const oldItem = hashMap[newItem.id] || {};
    hashMap[newItem.id] = { ...oldItem, ...newItem };
    return hashMap;
  }, {} as Record<number, EventTypeGroup["eventTypes"][number]>);
  const mergedEventTypes = Object.values(eventTypesHashMap).map((et, index) => ({
    ...et,
    $disabled: user.plan === "FREE" && index > 0,
  }));

  eventTypeGroups.push({
    teamId: null,
    profile: {
      slug: user.username,
      name: user.name,
      image: user.avatar,
    },
    eventTypes: mergedEventTypes,
    metadata: {
      membershipCount: 1,
      readOnly: false,
    },
  });

  eventTypeGroups = ([] as EventTypeGroup[]).concat(
    eventTypeGroups,
    user.teams.map((membership) => ({
      teamId: membership.team.id,
      profile: {
        name: membership.team.name,
        image: membership.team.logo || "",
        slug: "team/" + membership.team.slug,
      },
      metadata: {
        membershipCount: membership.team.members.length,
        readOnly: membership.role !== "OWNER",
      },
      eventTypes: membership.team.eventTypes,
    }))
  );

  const userObj = Object.assign({}, user, {
    createdDate: user.createdDate.toString(),
  });

  const canAddEvents = user.plan !== "FREE" || eventTypeGroups[0].eventTypes.length < 1;

  return {
    props: {
      session,
      localeProp: locale,
      canAddEvents,
      user: userObj,
      // don't display event teams without event types,
      eventTypes: eventTypeGroups.filter((groupBy) => !!groupBy.eventTypes?.length),
      // so we can show a dropdown when the user has teams
      profiles: eventTypeGroups.map((group) => ({
        teamId: group.teamId,
        ...group.profile,
        ...group.metadata,
      })),
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}

export default EventTypesPage;
