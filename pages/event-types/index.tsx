import { Dialog, DialogClose, DialogContent } from "@components/Dialog";
import EventTypeDescription from "@components/eventtype/EventTypeDescription";
import Shell from "@components/Shell";
import { Tooltip } from "@components/Tooltip";
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
// TODO: replace headlessui with radix-ui
import { Menu, Transition } from "@headlessui/react";
import {
  ChevronDownIcon,
  DotsHorizontalIcon,
  ExternalLinkIcon,
  LinkIcon,
  PlusIcon,
  UsersIcon,
} from "@heroicons/react/solid";
import { asStringOrNull } from "@lib/asStringOrNull";
import { getSession } from "@lib/auth";
import classNames from "@lib/classNames";
import { HttpError } from "@lib/core/http/error";
import { ONBOARDING_INTRODUCED_AT } from "@lib/getting-started";
import { useToggleQuery } from "@lib/hooks/useToggleQuery";
import createEventType from "@lib/mutations/event-types/create-event-type";
import showToast from "@lib/notification";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";
import { SchedulingType } from "@prisma/client";
import dayjs from "dayjs";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { Fragment, useRef } from "react";
import { useMutation } from "react-query";

type PageProps = inferSSRProps<typeof getServerSideProps>;
type EventType = PageProps["eventTypes"][number];
type Profile = PageProps["profiles"][number];
type MembershipCount = EventType["metadata"]["membershipCount"];

const EventTypesPage = (props: PageProps) => {
  const CreateFirstEventTypeView = () => (
    <div className="md:py-20">
      <UserCalendarIllustration />
      <div className="block mx-auto text-center md:max-w-screen-sm">
        <h3 className="mt-2 text-xl font-bold text-neutral-900">Create your first event type</h3>
        <p className="mt-1 mb-2 text-md text-neutral-600">
          Event types enable you to share links that show available times on your calendar and allow people to
          make bookings with you.
        </p>
        <CreateNewEventDialog canAddEvents={props.canAddEvents} profiles={props.profiles} />
      </div>
    </div>
  );

  const EventTypeListHeading = ({
    profile,
    membershipCount,
  }: {
    profile: Profile;
    membershipCount: MembershipCount;
  }) => (
    <div className="flex mb-4">
      <Link href="/settings/teams">
        <a>
          <Avatar
            displayName={profile.name}
            imageSrc={profile.image || undefined}
            size={8}
            className="inline mt-1 mr-2"
          />
        </a>
      </Link>
      <div>
        <Link href="/settings/teams">
          <a className="font-bold">{profile.name}</a>
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
        {typeof window !== "undefined" && (
          <Link href={profile.slug!}>
            <a className="block text-xs text-neutral-500">{`${window.location.host}/${profile.slug}`}</a>
          </Link>
        )}
      </div>
    </div>
  );

  const EventTypeList = ({
    readOnly,
    types,
    profile,
  }: {
    profile: PageProps["profiles"][number];
    readOnly: boolean;
    types: EventType[];
  }) => (
    <div className="mb-16 -mx-4 overflow-hidden bg-white border border-gray-200 rounded-sm sm:mx-0">
      <ul className="divide-y divide-neutral-200" data-testid="event-types">
        {types.map((type) => (
          <li
            key={type.id}
            className={classNames(
              type.$disabled && "opacity-30 cursor-not-allowed pointer-events-none select-none"
            )}
            data-disabled={type.$disabled ? 1 : 0}>
            <div className={classNames("hover:bg-neutral-50", type.$disabled && "pointer-events-none")}>
              <div className="flex items-center px-4 py-4 sm:px-6 hover:bg-neutral-50">
                <Link href={"/event-types/" + type.id}>
                  <a className="flex-grow text-sm truncate">
                    <div>
                      <span className="font-medium truncate text-neutral-900">{type.title}</span>
                      {type.hidden && (
                        <span className="ml-2 inline items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-yellow-100 text-yellow-800">
                          Hidden
                        </span>
                      )}
                      {readOnly && (
                        <span className="ml-2 inline items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-gray-100 text-gray-800">
                          Readonly
                        </span>
                      )}
                    </div>
                    <EventTypeDescription eventType={type} />
                  </a>
                </Link>

                <div className="flex-shrink-0 hidden mt-4 sm:flex sm:mt-0 sm:ml-5">
                  <div className="flex items-center space-x-5 overflow-hidden">
                    {type.users.length > 1 && (
                      <AvatarGroup
                        size={8}
                        truncateAfter={4}
                        items={type.users.map((organizer) => ({
                          alt: organizer.name,
                          image: organizer.avatar,
                        }))}
                      />
                    )}
                    <Tooltip content="Preview">
                      <a
                        href={`/${profile.slug}/${type.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 border border-transparent cursor-pointer group text-neutral-400 hover:border-gray-200">
                        <ExternalLinkIcon className="w-5 h-5 group-hover:text-black" />
                      </a>
                    </Tooltip>

                    <Tooltip content="Copy link">
                      <button
                        onClick={() => {
                          showToast("Link copied!", "success");
                          navigator.clipboard.writeText(
                            `${window.location.origin}/${profile.slug}/${type.slug}`
                          );
                        }}
                        className="p-2 border border-transparent group text-neutral-400 hover:border-gray-200">
                        <LinkIcon className="w-5 h-5 group-hover:text-black" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
              <div className="flex flex-shrink-0 ml-5 sm:hidden">
                <Menu as="div" className="inline-block text-left">
                  {({ open }) => (
                    <>
                      <div>
                        <Menu.Button className="p-2 mt-1 border border-transparent text-neutral-400 hover:border-gray-200">
                          <span className="sr-only">Open options</span>
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
                          className="absolute right-0 w-56 mt-2 origin-top-right bg-white divide-y rounded-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none divide-neutral-100">
                          <div className="py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <a
                                  href={`/${profile.slug}/${type.slug}`}
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
                                  Preview
                                </a>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => {
                                    showToast("Link copied!", "success");
                                    navigator.clipboard.writeText(
                                      `${window.location.origin}/${profile.slug}/${type.slug}`
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
                                  Copy link to event
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

  return (
    <div>
      <Head>
        <title>Event Types | Calendso</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Shell
        heading="Event Types"
        subtitle="Create events to share for people to book on your calendar."
        CTA={
          props.eventTypes.length !== 0 && (
            <CreateNewEventDialog canAddEvents={props.canAddEvents} profiles={props.profiles} />
          )
        }>
        {props.user.plan === "FREE" && !props.canAddEvents && typeof window !== "undefined" && (
          <Alert
            severity="warning"
            title={<>You need to upgrade your plan to have more than one active event type.</>}
            message={
              <>
                To upgrade go to{" "}
                <a href={process.env.UPGRADE_URL || "https://cal.com/upgrade"} className="underline">
                  {process.env.UPGRADE_URL || "https://cal.com/upgrade"}
                </a>
              </>
            }
            className="my-4"
          />
        )}
        {props.eventTypes &&
          props.eventTypes.map((input) => (
            <>
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
            </>
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
          New event type
        </Button>
      )}
      {profiles.filter((profile) => profile.teamId).length > 0 && (
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button EndIcon={ChevronDownIcon}>New event type</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Create an event type under your name or a team.</DropdownMenuLabel>
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
                {profile.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </Dropdown>
      )}
      <DialogContent>
        <div className="mb-8">
          <h3 className="text-lg font-bold leading-6 text-gray-900" id="modal-title">
            Add a new {teamId ? "team " : ""}event type
          </h3>
          <div>
            <p className="text-sm text-gray-500">Create a new event type for people to book times with.</p>
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
                Title
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
                  placeholder="Quick Chat"
                />
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                URL
              </label>
              <div className="mt-1">
                <div className="flex rounded-sm shadow-sm">
                  <span className="inline-flex items-center px-3 text-gray-500 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 sm:text-sm">
                    {location.hostname}/{router.query.eventPage || profiles[0].slug}/
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
                Description
              </label>
              <div className="mt-1">
                <textarea
                  name="description"
                  id="description"
                  className="block w-full border-gray-300 rounded-sm shadow-sm focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                  placeholder="A quick video meeting."
                />
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="length" className="block text-sm font-medium text-gray-700">
                Length
              </label>
              <div className="relative mt-1 rounded-sm shadow-sm">
                <input
                  type="number"
                  name="length"
                  id="length"
                  required
                  className="block w-full pr-20 border-gray-300 rounded-sm focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                  placeholder="15"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-400">
                  minutes
                </div>
              </div>
            </div>
          </div>
          {teamId && (
            <div className="mb-4">
              <label htmlFor="schedulingType" className="block text-sm font-medium text-gray-700">
                Scheduling Type
              </label>
              <RadioArea.Group
                name="schedulingType"
                className="relative flex mt-1 space-x-6 rounded-sm shadow-sm">
                <RadioArea.Item value={SchedulingType.COLLECTIVE} className="w-1/2 text-sm">
                  <strong className="block mb-1">Collective</strong>
                  <p>Schedule meetings when all selected team members are available.</p>
                </RadioArea.Item>
                <RadioArea.Item value={SchedulingType.ROUND_ROBIN} className="w-1/2 text-sm">
                  <strong className="block mb-1">Round Robin</strong>
                  <p>Cycle meetings between multiple team members.</p>
                </RadioArea.Item>
              </RadioArea.Group>
            </div>
          )}
          <div className="mt-8 sm:flex sm:flex-row-reverse gap-x-2">
            <Button type="submit" loading={createMutation.isLoading}>
              Continue
            </Button>
            <DialogClose asChild>
              <Button color="secondary">Cancel</Button>
            </DialogClose>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

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
                select: {
                  id: true,
                  title: true,
                  description: true,
                  length: true,
                  schedulingType: true,
                  slug: true,
                  hidden: true,
                  users: {
                    select: {
                      id: true,
                      avatar: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      eventTypes: {
        where: {
          team: null,
        },
        select: {
          id: true,
          title: true,
          description: true,
          length: true,
          schedulingType: true,
          slug: true,
          hidden: true,
          users: {
            select: {
              id: true,
              avatar: true,
              name: true,
            },
          },
        },
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

  if (!user.completedOnboarding && dayjs(user.createdDate).isAfter(ONBOARDING_INTRODUCED_AT)) {
    return {
      redirect: {
        permanent: false,
        destination: "/getting-started",
      },
    };
  }

  // backwards compatibility, TMP:
  const typesRaw = await prisma.eventType.findMany({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      schedulingType: true,
      hidden: true,
      users: {
        select: {
          id: true,
          avatar: true,
          name: true,
        },
      },
    },
  });

  type EventTypes = (Partial<typeof typesRaw[number]> & {
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
    eventTypes?: (Partial<typeof user["eventTypes"][number]> & { $disabled?: boolean })[];
  })[];

  let eventTypes: EventTypes = [];

  eventTypes.push({
    teamId: null,
    profile: {
      slug: user.username,
      name: user.name,
      image: user.avatar,
    },
    eventTypes: user.eventTypes.concat(typesRaw).map((type, index) =>
      user.plan === "FREE" && index > 0
        ? {
            ...type,
            $disabled: true,
          }
        : {
            ...type,
            $disabled: false,
          }
    ),
    metadata: {
      membershipCount: 1,
      readOnly: false,
    },
  });

  eventTypes = ([] as EventTypes).concat(
    eventTypes,
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

  const canAddEvents = user.plan !== "FREE" || eventTypes[0].eventTypes.length < 1;

  return {
    props: {
      canAddEvents,
      user: userObj,
      // don't display event teams without event types,
      eventTypes: eventTypes.filter((groupBy) => !!groupBy.eventTypes?.length),
      // so we can show a dropdown when the user has teams
      profiles: eventTypes.map((group) => ({
        teamId: group.teamId,
        ...group.profile,
        ...group.metadata,
      })),
    },
  };
}

export default EventTypesPage;
