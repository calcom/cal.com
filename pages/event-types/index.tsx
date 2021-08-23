import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@components/Dialog";
import { Tooltip } from "@components/Tooltip";
import Loader from "@components/Loader";
import { Menu, Transition } from "@headlessui/react";
import {
  ClockIcon,
  DotsHorizontalIcon,
  ExternalLinkIcon,
  InformationCircleIcon,
  LinkIcon,
  PlusIcon,
  UserIcon, UsersIcon,
} from "@heroicons/react/solid";
import classNames from "@lib/classNames";
import { getSession, useSession } from "next-auth/client";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, {Fragment, useRef, useState} from "react";
import Shell from "../../components/Shell";
import prisma from "../../lib/prisma";
import { User, EventType } from "@prisma/client";
import showToast from "@lib/notification";
import { RadioAreaInput, RadioAreaInputGroup } from "@components/ui/form/RadioAreaInput";
import Avatar from "@components/Avatar";
import { UserCalendarImage } from "@components/svg/UserCalendarImage";

export default function Availability({ user, eventTypes }: {
  user: User,
  eventTypes: EventType[],
}) {
  const [session, loading] = useSession();
  const router = useRouter();

  const titleRef = useRef<HTMLInputElement>();
  const slugRef = useRef<HTMLInputElement>();
  const descriptionRef = useRef<HTMLTextAreaElement>();
  const lengthRef = useRef<HTMLInputElement>();

  async function createEventTypeHandler(event) {
    event.preventDefault();

    const formData: {
      title: string,
      url: string,
      description: string,
      length: number,
      schedulingType?: 'collective' | 'roundRobin',
    } = Object.fromEntries((new FormData(event.target)).entries());

    await fetch("/api/availability/eventtype", {
      method: "POST",
      body: JSON.stringify(formData),
      headers: {
        "Content-Type": "application/json",
      },
    });

    await router.replace(router.asPath);

    showToast("Event Type created", "success");
  }

  function autoPopulateSlug() {
    let t = titleRef.current.value;
    t = t.replace(/\s+/g, "-").toLowerCase();
    slugRef.current.value = t;
  }

  if (loading) {
    return <Loader />;
  }

  const CreateNewEventDialog = () => {
    const [isTeamEvent, setIsTeamEvent] = useState<boolean>(false);
    return (
      <Dialog>
        <DialogTrigger
          className="py-2 px-4 mt-6 border border-transparent rounded-sm shadow-sm text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900">
          <PlusIcon className="w-5 h-5 mr-1 inline"/>
          New event type
        </DialogTrigger>
        <DialogTrigger onClick={() => setIsTeamEvent(true)}
                       className="py-2 ml-2 px-4 mt-6 border border-transparent rounded-sm shadow-sm text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900">
          <PlusIcon className="w-5 h-5 mr-1 inline"/>
          New team event type
        </DialogTrigger>
        <DialogContent>
          <div className="mb-8">
            <h3 className="text-lg leading-6 font-bold text-gray-900" id="modal-title">
              Add a new {isTeamEvent ? 'team ' : ''}event type
            </h3>
            <div>
              <p className="text-sm text-gray-500">Create a new event type for people to book times with.</p>
            </div>
          </div>
          <form onSubmit={createEventTypeHandler}>
            <div>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <div className="mt-1">
                  <input
                    onChange={autoPopulateSlug}
                    ref={titleRef}
                    type="text"
                    name="title"
                    id="title"
                    required
                    className="shadow-sm focus:ring-neutral-900 focus:border-neutral-900 block w-full sm:text-sm border-gray-300 rounded-sm"
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
                    <span
                      className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                      {location.hostname}/{user.username}/
                    </span>
                    <input
                      ref={slugRef}
                      type="text"
                      name="slug"
                      id="slug"
                      required
                      className="flex-1 block w-full focus:ring-neutral-900 focus:border-neutral-900 min-w-0 rounded-none rounded-r-md sm:text-sm border-gray-300"
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
                    ref={descriptionRef}
                    name="description"
                    id="description"
                    className="shadow-sm focus:ring-neutral-900 focus:border-neutral-900 block w-full sm:text-sm border-gray-300 rounded-sm"
                    placeholder="A quick video meeting."></textarea>
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="length" className="block text-sm font-medium text-gray-700">
                  Length
                </label>
                <div className="mt-1 relative rounded-sm shadow-sm">
                  <input
                    ref={lengthRef}
                    type="number"
                    name="length"
                    id="length"
                    required
                    className="focus:ring-neutral-900 focus:border-neutral-900 block w-full pr-20 sm:text-sm border-gray-300 rounded-sm"
                    placeholder="15"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 text-sm">
                    minutes
                  </div>
                </div>
              </div>
            </div>
            {isTeamEvent && <div className="mb-4">
              <label htmlFor="schedulingType" className="block text-sm font-medium text-gray-700">
                Scheduling Type
              </label>
              <RadioAreaInputGroup name="schedulingType" className="flex space-x-6 mt-1 relative rounded-sm shadow-sm">
                <RadioAreaInput value="collective" className="text-sm w-1/2">
                  <strong className="block mb-1">Collective</strong>
                  <p>
                    Schedule meetings when all selected team members are available.
                  </p>
                </RadioAreaInput>
                <RadioAreaInput value="roundRobin" className="text-sm w-1/2">
                  <strong className="block mb-1">Round Robin</strong>
                  <p>
                    Cycle meetings between multiple team members.
                  </p>
                </RadioAreaInput>
              </RadioAreaInputGroup>
            </div>}
            <div className="mt-8 sm:flex sm:flex-row-reverse">
              <button type="submit" className="btn btn-primary">
                Continue
              </button>
              <DialogClose as="button" className="btn btn-white mx-2">
                Cancel
              </DialogClose>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  const CreateFirstEventTypeView = () =>
    <div className="md:py-20">
      <UserCalendarImage />
      <div className="text-center block md:max-w-screen-sm mx-auto">
        <h3 className="mt-2 text-xl font-bold text-neutral-900">Create your first event type</h3>
        <p className="mt-1 text-md text-neutral-600">
          Event types enable you to share links that show available times on your calendar and allow
          people to make bookings with you.
        </p>
        <CreateNewEventDialog/>
      </div>
    </div>;

  const EventTypeListHeading = ({ displayName, imageSrc, slug, membershipCount }) =>
    <div className="flex mb-3">
      <Avatar
        displayName={displayName}
        imageSrc={imageSrc}
        className="w-8 mt-1 h-8 rounded-full inline mr-2"
      />
      <div>
        <span className="font-bold">{displayName}</span>{membershipCount && <span className="text-neutral-500 ml-2"><UsersIcon className="w-4 h-4 inline" /> {membershipCount}</span>}
        <p className="text-neutral-500 leading-none">calendso.com/{slug}</p>
      </div>
    </div>;

  const EventTypeList = ({ owner, types }: { types: EventType[] }) =>
    <div className="bg-white border border-gray-200 rounded-sm overflow-hidden -mx-4 sm:mx-0 mb-4">
      <ul className="divide-y divide-neutral-200">
        {types.map((type: EventType) => (
          <li key={type.id}>
            <div className="hover:bg-neutral-50">
              <div className="px-4 py-4 flex items-center sm:px-6">
                <Link href={"/event-types/" + type.id}>
                  <a className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                    <span className="truncate ">
                      <div className="flex text-sm">
                        <p className="font-medium text-neutral-900 truncate">{type.title}</p>
                        {type.hidden && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-yellow-100 text-yellow-800">
                            Hidden
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex space-x-4">
                        <div className="flex items-center text-sm text-neutral-500">
                          <ClockIcon
                            className="flex-shrink-0 mr-1.5 h-4 w-4 text-neutral-400"
                            aria-hidden="true"
                          />
                          <p>{type.length}m</p>
                        </div>
                        {type.schedulingType ? (
                          <div className="flex items-center text-sm text-neutral-500">
                            <UsersIcon
                              className="flex-shrink-0 mr-1.5 h-4 w-4 text-neutral-400"
                              aria-hidden="true"
                            />
                            <p>{type.schedulingType === "ROUND_ROBIN" ? "Round Robin" : "Collective"}</p>
                          </div>
                        ) : (
                          <div className="flex items-center text-sm text-neutral-500">
                            <UserIcon
                              className="flex-shrink-0 mr-1.5 h-4 w-4 text-neutral-400"
                              aria-hidden="true"
                            />
                            <p>1-on-1</p>
                          </div>
                        )}
                        <div className="flex items-center text-sm text-neutral-500">
                          <InformationCircleIcon
                            className="flex-shrink-0 mr-1.5 h-4 w-4 text-neutral-400"
                            aria-hidden="true"
                          />
                          <div className="max-w-32 sm:max-w-full truncate">
                            {type.description.substring(0, 100)}
                          </div>
                        </div>
                      </div>
                    </span>
                  </a>
                </Link>

                <div className="hidden sm:flex mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                  <div className="flex overflow-hidden space-x-5">
                    {type.team && type.organizers.map((organizer) => (
                      <div className="p-2">
                        <Avatar
                          className="h-6 w-6 rounded-full"
                          displayName={organizer.name}
                          imageSrc={organizer.avatar}
                        />
                      </div>
                    ))}
                    <Tooltip content="Preview">
                      <a
                        href={"/" + owner.slug + "/" + type.slug}
                        target="_blank"
                        rel="noreferrer"
                        className="group cursor-pointer text-neutral-400 p-2 border border-transparent hover:border-gray-200">
                        <ExternalLinkIcon className="group-hover:text-black w-5 h-5" />
                      </a>
                    </Tooltip>

                    <Tooltip content="Copy link">
                      <button
                        onClick={() => {
                          showToast("Link copied!", "success");
                          navigator.clipboard.writeText(
                            window.location.hostname + "/" + owner.slug
                          );
                        }}
                        className="group text-neutral-400 p-2 border border-transparent hover:border-gray-200">
                        <LinkIcon className="group-hover:text-black w-5 h-5" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
                <div className="flex sm:hidden ml-5 flex-shrink-0">
                  <Menu as="div" className="inline-block text-left">
                    {({ open }) => (
                      <>
                        <div>
                          <Menu.Button className="text-neutral-400 mt-1 p-2 border border-transparent hover:border-gray-200">
                            <span className="sr-only">Open options</span>
                            <DotsHorizontalIcon className="h-5 w-5" aria-hidden="true" />
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
                            className="origin-top-right absolute right-0 mt-2 w-56 rounded-sm shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-neutral-100">
                            <div className="py-1">
                              <Menu.Item>
                                {({ active }) => (
                                  <a
                                    href={"/" + owner.slug + "/" + type.slug}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={classNames(
                                      active ? "bg-neutral-100 text-neutral-900" : "text-neutral-700",
                                      "group flex items-center px-4 py-2 text-sm font-medium"
                                    )}>
                                    <ExternalLinkIcon
                                      className="mr-3 h-4 w-4 text-neutral-400 group-hover:text-neutral-500"
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
                                        window.location.hostname +
                                        "/" +
                                        owner.slug +
                                        "/" +
                                        type.slug
                                      );
                                    }}
                                    className={classNames(
                                      active ? "bg-neutral-100 text-neutral-900" : "text-neutral-700",
                                      "group flex items-center px-4 py-2 text-sm w-full font-medium"
                                    )}>
                                    <LinkIcon
                                      className="mr-3 h-4 w-4 text-neutral-400 group-hover:text-neutral-500"
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
            </div>
          </li>
        ))}
      </ul>
    </div>;

  return (
    <div>
      <Head>
        <title>Event Types | Calendso</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Shell
        heading="Event Types"
        subtitle="Create events to share for people to book on your calendar."
        CTA={eventTypes.length !== 0 && <CreateNewEventDialog />}>

        {eventTypes.map( (eventTypeGroup: OwnerGroupedEventType) => (
          <>
            <EventTypeListHeading
              membershipCount={eventTypeGroup.owner.teamMemberCount}
              displayName={eventTypeGroup.owner.displayName}
              imageSrc={eventTypeGroup.owner.image}
              slug={eventTypeGroup.owner.slug}
            />
            <EventTypeList owner={eventTypeGroup.owner} types={eventTypeGroup.eventTypes} />
          </>
        ))}

        {eventTypes.length === 0 && <CreateFirstEventTypeView />}
      </Shell>
    </div>
  );
}

type EventTypeOwner = {
  displayName: string;
  image: string;
  slug: string;
  id: number;
  teamMemberCount?: number;
};

type OwnerGroupedEventType = {
  owner: EventTypeOwner;
  eventTypes: EventType[];
};

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user: User = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      username: true,
      name: true,
      startTime: true,
      endTime: true,
      bufferTime: true,
      avatar: true,
      eventTypes: {
        select: {
          schedulingType: true,
          id: true,
          length: true,
          description: true,
          team: true,
          hidden: true,
          title: true,
          slug: true,
          organizers: {
            select: {
              name: true,
              avatar: true,
            }
          },
        },
      },
    },
  });

  const eventTypes: OwnerGroupedEventType[] = user.eventTypes.reduce( (acc: OwnerGroupedEventType[], eventType: EventType) => {

    const owner: EventTypeOwner = {
      id: eventType.team ? eventType.team.id : user.id,
      displayName: eventType.team ? eventType.team.name : user.name,
      image: (eventType.team ? eventType.team.logo : user.avatar) || null,
      slug: eventType.team ? eventType.team.slug : user.username,
    };

    const groupIndex: number = acc.findIndex( (group: OwnerGroupedEventType) => group.owner.slug === owner.slug );
    if (groupIndex !== -1) {
      acc[ groupIndex ].eventTypes.push(eventType);
    } else {
      acc.push({
        owner,
        eventTypes: [eventType],
      });
    }
    return acc;
  }, []);

  const countMemberships = await Promise.all(
    eventTypes.map( async (eventTypes: OwnerGroupedEventType) => {
      if (eventTypes.owner.slug === user.username) {
        return;
      }
      return await prisma.team.findUnique({
        where: {
          id: eventTypes.owner.id,
        },
        select: {
          id: true,
          members: true,
        }
      });
    })
  );

  eventTypes.forEach( (eventType: OwnerGroupedEventType, idx: number) => {
    if (eventType.owner.slug !== user.username) {
      eventTypes[idx].owner.teamMemberCount = countMemberships.find((countResult) => eventType.owner.id === countResult?.id).members.length
    }
  });

  const sortedEventTypes: OwnerGroupedEventType[] = eventTypes.sort( (group) => {
    if (group.owner.displayName === user.name) return -1;
    else return 1;
  });

  return {
    props: { eventTypes: sortedEventTypes, user }, // will be passed to the page component as props
  };
}
