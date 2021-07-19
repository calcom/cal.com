import Head from "next/head";
import Link from "next/link";
import prisma from "../lib/prisma";
import Shell from "../components/Shell";
import { getSession, useSession } from "next-auth/client";
import { CheckIcon, ClockIcon, InformationCircleIcon } from "@heroicons/react/outline";
import DonateBanner from "../components/DonateBanner";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Home(props) {
  const [session, loading] = useSession();
  if (loading) {
    return <div className="loader"></div>;
  }

  function convertMinsToHrsMins(mins) {
    let h = Math.floor(mins / 60);
    let m = mins % 60;
    h = h < 10 ? "0" + h : h;
    m = m < 10 ? "0" + m : m;
    return `${h}:${m}`;
  }

  const stats = [
    { name: "Event Types", stat: props.eventTypeCount },
    { name: "Integrations", stat: props.integrationCount },
    {
      name: "Available Hours",
      stat: Math.round(((props.user.endTime - props.user.startTime) / 60) * 100) / 100 + " hours",
    },
  ];

  let timeline = [];

  if (session) {
    timeline = [
      {
        id: 1,
        content: "Add your first",
        target: "integration",
        href: "/integrations",
        icon: props.integrationCount != 0 ? CheckIcon : InformationCircleIcon,
        iconBackground: props.integrationCount != 0 ? "bg-green-400" : "bg-gray-400",
      },
      {
        id: 2,
        content: "Add one or more",
        target: "event types",
        href: "/availability",
        icon: props.eventTypeCount != 0 ? CheckIcon : InformationCircleIcon,
        iconBackground: props.eventTypeCount != 0 ? "bg-green-400" : "bg-gray-400",
      },
      {
        id: 3,
        content: "Complete your",
        target: "profile",
        href: "/settings/profile",
        icon: session.user.image ? CheckIcon : InformationCircleIcon,
        iconBackground: session.user.image ? "bg-green-400" : "bg-gray-400",
      },
    ];
  } else {
    timeline = [];
  }

  return (
    <div>
      <Head>
        <title>Calendso</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Shell heading="Dashboard">
        <div className="md:grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <div className="rounded-lg bg-white shadow dark:bg-gray-800">
              <div className="pt-5 pb-2 px-6 sm:flex sm:items-center sm:justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Your stats</h3>
              </div>
              <dl className="grid grid-cols-1 overflow-hidden divide-y divide-gray-200 dark:divide-gray-900 md:grid-cols-3 md:divide-y-0 md:divide-x">
                {stats.map((item) => (
                  <div key={item.name} className="px-4 py-5 sm:p-6">
                    <dt className="text-base font-normal dark:text-white text-gray-900">{item.name}</dt>
                    <dd className="mt-1 flex justify-between items-baseline md:block lg:flex">
                      <div className="flex items-baseline text-2xl font-semibold text-blue-600">
                        {item.stat}
                      </div>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="mt-8 bg-white shadow dark:bg-gray-800 overflow-hidden rounded-md">
              <div className="pt-5 pb-2 px-6 sm:flex sm:items-center sm:justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Your event types
                </h3>
              </div>
              <ul className="divide-y divide-gray-200">
                {props.eventTypes.map((type) => (
                  <li key={type.id} className="flex">
                    <div className="px-4 py-4 flex items-center sm:px-6 w-2/3">
                      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                        <div className="truncate">
                          <div className="flex text-sm">
                            <p className="flex-shrink-0 font-medium text-blue-600 truncate">{type.title}</p>
                            <p className="ml-1 font-normal text-gray-500 truncate">in {type.description}</p>
                          </div>
                          <div className="mt-2 flex">
                            <div className="flex items-center text-sm text-gray-500">
                              <ClockIcon
                                className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                                aria-hidden="true"
                              />
                              <p>{type.length} minutes</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-5 w-1/3 text-right pt-5 pr-4">
                      <Link href={"/availability/event/" + type.id}>
                        <a className="text-gray-400 hover:text-gray-900 mr-4 font-medium">Edit</a>
                      </Link>
                      <Link href={"/" + session.user.username + "/" + type.slug}>
                        <a target="_blank" className="text-blue-600 hover:text-blue-900 mr-2 font-medium">
                          View
                        </a>
                      </Link>
                    </div>
                  </li>
                ))}
                {props.eventTypes.length == 0 && (
                  <div className="text-center text-gray-400 py-12">
                    <p>You haven&apos;t created any event types.</p>
                  </div>
                )}
              </ul>
            </div>
            <div className="mt-8 bg-white dark:bg-gray-800 shadow overflow-hidden rounded-md p-6 mb-8 md:mb-0">
              <div className="md:flex">
                <div className="md:w-1/2 self-center mb-8 md:mb-0">
                  <h2 className="text-2xl dark:text-white font-semibold">Getting started</h2>
                  <p className="text-gray-600 dark:text-gray-200 text-sm">
                    Steps you should take to get started with Calendso.
                  </p>
                </div>
                <div className="md:w-1/2">
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {timeline.map((event, eventIdx) => (
                        <li key={event.id}>
                          <div className="relative pb-8">
                            {eventIdx !== timeline.length - 1 ? (
                              <span
                                className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-900"
                                aria-hidden="true"
                              />
                            ) : null}
                            <div className="relative flex space-x-3">
                              <div>
                                <span
                                  className={classNames(
                                    event.iconBackground,
                                    "h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800"
                                  )}>
                                  <event.icon className="h-5 w-5 text-white" aria-hidden="true" />
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                <div>
                                  <p className="text-sm text-gray-500 dark:text-gray-200">
                                    {event.content}{" "}
                                    <Link href={event.href}>
                                      <a className="font-medium dark:text-white text-gray-900">
                                        {event.target}
                                      </a>
                                    </Link>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow px-5 py-6 md:py-7 sm:px-6">
              <div className="mb-4 sm:flex sm:items-center sm:justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Your day</h3>
                <div className="mt-3 sm:mt-0 sm:ml-4">
                  <Link href="/availability">
                    <a className="text-sm text-gray-400">Configure</a>
                  </Link>
                </div>
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-600 dark:text-white">
                  Offering time slots between{" "}
                  <span className="text-blue-600">{convertMinsToHrsMins(props.user.startTime)}</span> and{" "}
                  <span className="text-blue-600">{convertMinsToHrsMins(props.user.endTime)}</span>
                </p>
              </div>
            </div>
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow px-5 py-6 md:py-7 sm:px-6">
              <div className="mb-8 sm:flex sm:items-center sm:justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Your integrations
                </h3>
                <div className="mt-3 sm:mt-0 sm:ml-4">
                  <Link href="/integrations">
                    <a className="text-sm text-gray-400">View more</a>
                  </Link>
                </div>
              </div>
              <ul className="divide-y divide-gray-200">
                {props.credentials.map((integration) => (
                  <li key={integration.type} className="pb-4 flex">
                    {integration.type == "google_calendar" && (
                      <img
                        className="h-10 w-10 mr-2"
                        src="integrations/google-calendar.png"
                        alt="Google Calendar"
                      />
                    )}
                    {integration.type == "office365_calendar" && (
                      <img
                        className="h-10 w-10 mr-2"
                        src="integrations/office-365.png"
                        alt="Office 365 / Outlook.com Calendar"
                      />
                    )}
                    {integration.type == "zoom_video" && (
                      <img className="h-10 w-10 mr-2" src="integrations/zoom.png" alt="Zoom" />
                    )}
                    <div className="ml-3">
                      {integration.type == "office365_calendar" && (
                        <p className="text-sm font-medium text-gray-900">Office 365 / Outlook.com Calendar</p>
                      )}
                      {integration.type == "google_calendar" && (
                        <p className="text-sm font-medium text-gray-900">Google Calendar</p>
                      )}
                      {integration.type == "zoom_video" && (
                        <p className="text-sm font-medium text-gray-900">Zoom</p>
                      )}
                      {integration.type.endsWith("_calendar") && (
                        <p className="text-sm text-gray-500">Calendar Integration</p>
                      )}
                      {integration.type.endsWith("_video") && (
                        <p className="text-sm text-gray-500">Video Conferencing</p>
                      )}
                    </div>
                  </li>
                ))}
                {props.credentials.length == 0 && (
                  <div className="text-center text-gray-400 py-2">
                    <p>You haven&apos;t added any integrations.</p>
                  </div>
                )}
              </ul>
            </div>
            <div className="mt-8 bg-white dark:bg-gray-800  rounded-lg shadow px-5 py-6 md:py-7 sm:px-6">
              <div className="mb-4 sm:flex sm:items-center sm:justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Your event types
                </h3>
                <div className="mt-3 sm:mt-0 sm:ml-4">
                  <Link href="/availability">
                    <a className="text-sm text-gray-400">View more</a>
                  </Link>
                </div>
              </div>
              <ul className="divide-y divide-gray-200">
                {props.eventTypes.map((type) => (
                  <li
                    key={type.id}
                    className="relative py-5  focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
                    <div className="flex justify-between space-x-3">
                      <div className="min-w-0 flex-1">
                        <a href="#" className="block focus:outline-none">
                          <span className="absolute inset-0" aria-hidden="true" />
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {type.title}
                          </p>
                          <p className="text-sm text-gray-500 truncate">{type.description}</p>
                        </a>
                      </div>
                      <span className="flex-shrink-0 whitespace-nowrap text-sm text-gray-500">
                        {type.length} minutes
                      </span>
                    </div>
                  </li>
                ))}
                {props.eventTypes.length == 0 && (
                  <div className="text-center text-gray-400 py-2">
                    <p>You haven&apos;t created any event types.</p>
                  </div>
                )}
              </ul>
            </div>
          </div>
        </div>
        <DonateBanner />
      </Shell>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);

  let user = [];
  let credentials = [];
  let eventTypes = [];

  if (session) {
    user = await prisma.user.findFirst({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
      },
    });

    credentials = await prisma.credential.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        type: true,
      },
    });

    eventTypes = (
      await prisma.eventType.findMany({
        where: {
          userId: session.user.id,
        },
      })
    ).map((eventType) => {
      return {
        ...eventType,
        periodStartDate: eventType.periodStartDate?.toString() ?? null,
        periodEndDate: eventType.periodEndDate?.toString() ?? null,
      };
    });
  }
  return {
    props: {
      user,
      credentials,
      eventTypes,
      eventTypeCount: eventTypes.length,
      integrationCount: credentials.length,
    }, // will be passed to the page component as props
  };
}
