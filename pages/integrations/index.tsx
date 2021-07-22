import Head from "next/head";
import Link from "next/link";
import prisma from "../../lib/prisma";
import Shell from "../../components/Shell";
import { useEffect, useState } from "react";
import { getSession, useSession } from "next-auth/client";
import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  PlusIcon,
  XCircleIcon,
} from "@heroicons/react/solid";
import { InformationCircleIcon } from "@heroicons/react/outline";
import { Switch } from "@headlessui/react";
import * as Dialog from "@radix-ui/react-dialog";

export default function Home({ integrations }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [session, loading] = useSession();
  const [selectableCalendars, setSelectableCalendars] = useState([]);

  function loadCalendars() {
    fetch("api/availability/calendar")
      .then((response) => response.json())
      .then((data) => {
        setSelectableCalendars(data);
      });
  }

  function integrationHandler(type) {
    fetch("/api/integrations/" + type.replace("_", "") + "/add")
      .then((response) => response.json())
      .then((data) => (window.location.href = data.url));
  }

  function calendarSelectionHandler(calendar) {
    return (selected) => {
      const cals = [...selectableCalendars];
      const i = cals.findIndex((c) => c.externalId === calendar.externalId);
      cals[i].selected = selected;
      setSelectableCalendars(cals);
      if (selected) {
        fetch("api/availability/calendar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cals[i]),
        }).then((response) => response.json());
      } else {
        fetch("api/availability/calendar", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cals[i]),
        }).then((response) => response.json());
      }
    };
  }

  function getCalendarIntegrationImage(integrationType: string) {
    switch (integrationType) {
      case "google_calendar":
        return "integrations/google-calendar.png";
      case "office365_calendar":
        return "integrations/office-365.png";
      default:
        return "";
    }
  }

  function classNames(...classes) {
    return classes.filter(Boolean).join(" ");
  }

  useEffect(loadCalendars, [integrations]);

  const integrationDialogContent = (
    <>
      <div className="sm:flex sm:items-start">
        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
          <PlusIcon className="h-6 w-6 text-blue-600" />
        </div>
        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
          <Dialog.Title className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
            Add a new integration
          </Dialog.Title>

          <Dialog.Description className="text-sm text-gray-400">
            Link a new integration to your account.
          </Dialog.Description>
        </div>
      </div>
      <div className="my-4">
        <ul className="divide-y divide-gray-200">
          {integrations
            .filter((integration) => integration.installed)
            .map((integration) => (
              <li key={integration.type} className="flex py-4">
                <div className="w-1/12 mr-4 pt-2">
                  <img className="h-8 w-8 mr-2" src={integration.imageSrc} alt={integration.title} />
                </div>
                <div className="w-10/12">
                  <h2 className="text-gray-800 font-medium">{integration.title}</h2>
                  <p className="text-gray-400 text-sm">{integration.description}</p>
                </div>
                <div className="w-2/12 text-right pt-2">
                  <button
                    onClick={() => integrationHandler(integration.type)}
                    className="font-medium text-blue-600 hover:text-blue-500">
                    Add
                  </button>
                </div>
              </li>
            ))}
        </ul>
      </div>
      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <Dialog.Close className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm">
          Close
        </Dialog.Close>
      </div>
    </>
  );

  if (loading) {
    return <div className="loader"></div>;
  }

  return (
    <div>
      <Head>
        <title>Integrations | Calendso</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Shell heading="Integrations" noPaddingBottom>
        <div className="text-right py-2">
          <Dialog.Root>
            <Dialog.Overlay className="fixed z-10 inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <Dialog.Trigger className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Add new integration
            </Dialog.Trigger>
            <Dialog.Content className="fixed bottom-20 sm:top-1/2 left-1/2 transform -translate-x-1/2 w-11/12 max-w-max bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transition-all sm:max-w-lg sm:w-full sm:bottom-auto sm:-translate-y-1/2">
              {integrationDialogContent}
            </Dialog.Content>
          </Dialog.Root>
        </div>
        <div className="bg-white shadow overflow-hidden rounded-lg mb-8">
          {integrations.filter((ig) => ig.credential).length !== 0 ? (
            <ul className="divide-y divide-gray-200">
              {integrations
                .filter((ig) => ig.credential)
                .map((ig) => (
                  <li key={ig.id}>
                    <Link href={"/integrations/" + ig.credential.id}>
                      <a className="block hover:bg-gray-50">
                        <div className="flex items-center px-4 py-4 sm:px-6">
                          <div className="min-w-0 flex-1 flex items-center">
                            <div className="flex-shrink-0">
                              <img className="h-10 w-10 mr-2" src={ig.imageSrc} alt={ig.title} />
                            </div>
                            <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                              <div>
                                <p className="text-sm font-medium text-blue-600 truncate">{ig.title}</p>
                                <p className="flex items-center text-sm text-gray-500">
                                  {ig.type.endsWith("_calendar") && (
                                    <span className="truncate">Calendar Integration</span>
                                  )}
                                  {ig.type.endsWith("_video") && (
                                    <span className="truncate">Video Conferencing</span>
                                  )}
                                </p>
                              </div>
                              <div className="hidden md:block">
                                {ig.credential.key && (
                                  <p className="mt-2 flex items-center text text-gray-500">
                                    <CheckCircleIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-green-400" />
                                    Connected
                                  </p>
                                )}
                                {!ig.credential.key && (
                                  <p className="mt-3 flex items-center text text-gray-500">
                                    <XCircleIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-yellow-400" />
                                    Not connected
                                  </p>
                                )}
                              </div>
                            </div>
                            <div>
                              <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      </a>
                    </Link>
                  </li>
                ))}
            </ul>
          ) : (
            <div className="bg-white shadow rounded-lg">
              <div className="flex">
                <div className="py-9 pl-8">
                  <InformationCircleIcon className="text-blue-600 w-16" />
                </div>
                <div className="py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    You don&apos;t have any integrations added.
                  </h3>
                  <div className="mt-2 text-sm text-gray-500">
                    <p>
                      You currently do not have any integrations set up. Add your first integration to get
                      started.
                    </p>
                  </div>
                  <div className="mt-3 text-sm">
                    <Dialog.Root>
                      <Dialog.Overlay className="fixed z-10 inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                      <Dialog.Trigger className="font-medium text-blue-600 hover:text-blue-500">
                        Add your first integration
                      </Dialog.Trigger>
                      <Dialog.Content className="fixed bottom-20 sm:top-1/2 left-1/2 transform -translate-x-1/2 w-11/12 max-w-max bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transition-all sm:max-w-lg sm:w-full sm:bottom-auto sm:-translate-y-1/2">
                        {integrationDialogContent}
                      </Dialog.Content>
                    </Dialog.Root>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Select calendars</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Select which calendars are checked for availability to prevent double bookings.</p>
            </div>
            <Dialog.Root>
              <Dialog.Overlay className="fixed z-10 inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              <div className="mt-5">
                <Dialog.Trigger className="btn btn-primary">Add your first integration</Dialog.Trigger>
              </div>
              <Dialog.Content className="fixed bottom-20 sm:top-1/2 left-1/2 transform -translate-x-1/2 w-11/12 max-w-max bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transition-all sm:max-w-lg sm:w-full sm:bottom-auto sm:-translate-y-1/2">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <CalendarIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <Dialog.Title className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Select calendars
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-400">
                      If no entry is selected, all calendars will be checked
                    </Dialog.Description>
                  </div>
                </div>
                <div className="my-4">
                  <ul className="divide-y divide-gray-200">
                    {selectableCalendars.map((calendar) => (
                      <li key={calendar.name} className="flex py-4">
                        <div className="w-1/12 mr-4 pt-2">
                          <img
                            className="h-8 w-8 mr-2"
                            src={getCalendarIntegrationImage(calendar.integration)}
                            alt={calendar.integration}
                          />
                        </div>
                        <div className="w-10/12 pt-3">
                          <h2 className="text-gray-800 font-medium">{calendar.name}</h2>
                        </div>
                        <div className="w-2/12 text-right pt-3">
                          <Switch
                            checked={calendar.selected}
                            onChange={calendarSelectionHandler(calendar)}
                            className={classNames(
                              calendar.selected ? "bg-indigo-600" : "bg-gray-200",
                              "relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            )}>
                            <span className="sr-only">Select calendar</span>
                            <span
                              aria-hidden="true"
                              className={classNames(
                                calendar.selected ? "translate-x-5" : "translate-x-0",
                                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"
                              )}
                            />
                          </Switch>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <Dialog.Close className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm">
                    Close
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Root>
          </div>
        </div>
      </Shell>
    </div>
  );
}

const validJson = (jsonString: string) => {
  try {
    const o = JSON.parse(jsonString);
    if (o && typeof o === "object") {
      return o;
    }
  } catch (e) {
    console.error(e);
  }
  return false;
};

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }
  const user = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
    },
  });

  const credentials = await prisma.credential.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      type: true,
      key: true,
    },
  });

  const integrations = [
    {
      installed: !!(process.env.GOOGLE_API_CREDENTIALS && validJson(process.env.GOOGLE_API_CREDENTIALS)),
      credential: credentials.find((integration) => integration.type === "google_calendar") || null,
      type: "google_calendar",
      title: "Google Calendar",
      imageSrc: "integrations/google-calendar.png",
      description: "For personal and business calendars",
    },
    {
      installed: !!(process.env.MS_GRAPH_CLIENT_ID && process.env.MS_GRAPH_CLIENT_SECRET),
      type: "office365_calendar",
      credential: credentials.find((integration) => integration.type === "office365_calendar") || null,
      title: "Office 365 / Outlook.com Calendar",
      imageSrc: "integrations/office-365.png",
      description: "For personal and business calendars",
    },
    {
      installed: !!(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET),
      type: "zoom_video",
      credential: credentials.find((integration) => integration.type === "zoom_video") || null,
      title: "Zoom",
      imageSrc: "integrations/zoom.png",
      description: "Video Conferencing",
    },
  ];

  return {
    props: { integrations },
  };
}
