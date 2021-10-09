import { InformationCircleIcon } from "@heroicons/react/outline";
import { CheckCircleIcon, ChevronRightIcon, PlusIcon, XCircleIcon } from "@heroicons/react/solid";
import { GetServerSidePropsContext } from "next";
import { useSession } from "next-auth/client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { getSession } from "@lib/auth";
import { ONBOARDING_NEXT_REDIRECT, shouldShowOnboarding } from "@lib/getting-started";
import AddAppleIntegration, {
  ADD_APPLE_INTEGRATION_FORM_TITLE,
} from "@lib/integrations/Apple/components/AddAppleIntegration";
import AddCalDavIntegration, {
  ADD_CALDAV_INTEGRATION_FORM_TITLE,
} from "@lib/integrations/CalDav/components/AddCalDavIntegration";
import getIntegrations from "@lib/integrations/getIntegrations";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTrigger } from "@components/Dialog";
import Loader from "@components/Loader";
import Shell from "@components/Shell";
import Button from "@components/ui/Button";
import Switch from "@components/ui/Switch";

export default function Home({ integrations }: inferSSRProps<typeof getServerSideProps>) {
  const [, loading] = useSession();

  const [selectableCalendars, setSelectableCalendars] = useState([]);
  const addCalDavIntegrationRef = useRef<HTMLFormElement>(null);
  const [isAddCalDavIntegrationDialogOpen, setIsAddCalDavIntegrationDialogOpen] = useState(false);
  const [addCalDavError, setAddCalDavError] = useState<{ message: string } | null>(null);

  const addAppleIntegrationRef = useRef<HTMLFormElement>(null);
  const [isAddAppleIntegrationDialogOpen, setIsAddAppleIntegrationDialogOpen] = useState(false);
  const [addAppleError, setAddAppleError] = useState<{ message: string } | null>(null);

  useEffect(loadCalendars, [integrations]);

  function loadCalendars() {
    fetch("api/availability/calendar")
      .then((response) => response.json())
      .then((data) => {
        setSelectableCalendars(data);
      });
  }

  function integrationHandler(type) {
    if (type === "caldav_calendar") {
      setAddCalDavError(null);
      setIsAddCalDavIntegrationDialogOpen(true);
      return;
    }

    if (type === "apple_calendar") {
      setAddAppleError(null);
      setIsAddAppleIntegrationDialogOpen(true);
      return;
    }

    fetch("/api/integrations/" + type.replace("_", "") + "/add")
      .then((response) => response.json())
      .then((data) => (window.location.href = data.url));
  }

  const handleAddCalDavIntegration = async ({ url, username, password }) => {
    const requestBody = JSON.stringify({
      url,
      username,
      password,
    });

    return await fetch("/api/integrations/caldav/add", {
      method: "POST",
      body: requestBody,
      headers: {
        "Content-Type": "application/json",
      },
    });
  };

  const handleAddAppleIntegration = async ({ username, password }) => {
    const requestBody = JSON.stringify({
      username,
      password,
    });

    return await fetch("/api/integrations/apple/add", {
      method: "POST",
      body: requestBody,
      headers: {
        "Content-Type": "application/json",
      },
    });
  };

  function calendarSelectionHandler(calendar) {
    return (selected) => {
      const i = selectableCalendars.findIndex((c) => c.externalId === calendar.externalId);
      selectableCalendars[i].selected = selected;
      if (selected) {
        fetch("api/availability/calendar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(selectableCalendars[i]),
        }).then((response) => response.json());
      } else {
        fetch("api/availability/calendar", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(selectableCalendars[i]),
        }).then((response) => response.json());
      }
    };
  }

  function getCalendarIntegrationImage(integrationType: string) {
    switch (integrationType) {
      case "google_calendar":
        return "integrations/google-calendar.svg";
      case "office365_calendar":
        return "integrations/outlook.svg";
      case "caldav_calendar":
        return "integrations/caldav.svg";
      case "apple_calendar":
        return "integrations/apple-calendar.svg";
      default:
        return "";
    }
  }

  function onCloseSelectCalendar() {
    setSelectableCalendars([...selectableCalendars]);
  }

  const ConnectNewAppDialog = () => (
    <Dialog>
      <DialogTrigger className="px-4 py-2 mt-6 text-sm font-medium text-white border border-transparent rounded-sm shadow-sm bg-neutral-900 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900">
        <PlusIcon className="inline w-5 h-5 mr-1" />
        Connect a new App
      </DialogTrigger>

      <DialogContent>
        <DialogHeader title="Connect a new App" subtitle="Integrate your account with other services." />
        <div className="my-4">
          <ul className="divide-y divide-gray-200">
            {integrations
              .filter((integration) => integration.installed)
              .map((integration) => {
                return (
                  <li key={integration.type} className="flex py-4">
                    <div className="w-1/12 pt-2 mr-4">
                      <img className="w-8 h-8 mr-2" src={integration.imageSrc} alt={integration.title} />
                    </div>
                    <div className="w-10/12">
                      <h2 className="font-medium text-gray-800 font-cal">{integration.title}</h2>
                      <p className="text-sm text-gray-400">{integration.description}</p>
                    </div>
                    <div className="w-2/12 pt-2 text-right">
                      <button
                        onClick={() => integrationHandler(integration.type)}
                        className="font-medium text-neutral-900 hover:text-neutral-500">
                        Add
                      </button>
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
        <div className="gap-2 mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <DialogClose asChild>
            <Button color="secondary">Cancel</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );

  const SelectCalendarDialog = () => (
    <Dialog onOpenChange={(open) => !open && onCloseSelectCalendar()}>
      <DialogTrigger className="px-4 py-2 mt-6 text-sm font-medium text-white border border-transparent rounded-sm shadow-sm bg-neutral-900 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900">
        Select calendars
      </DialogTrigger>

      <DialogContent>
        <DialogHeader
          title="Select calendars"
          subtitle="If no entry is selected, all calendars will be checked"
        />
        <div className="my-4">
          <ul className="overflow-y-auto divide-y divide-gray-200 max-h-96">
            {selectableCalendars.map((calendar) => (
              <li key={calendar.name} className="flex py-4">
                <div className="w-1/12 pt-2 mr-4">
                  <img
                    className="w-8 h-8 mr-2"
                    src={getCalendarIntegrationImage(calendar.integration)}
                    alt={calendar.integration}
                  />
                </div>
                <div className="w-10/12 pt-3">
                  <h2 className="font-medium text-gray-800">{calendar.name}</h2>
                </div>
                <div className="w-2/12 pt-3 text-right">
                  <Switch
                    defaultChecked={calendar.selected}
                    onCheckedChange={calendarSelectionHandler(calendar)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="gap-2 mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <DialogClose asChild>
            <Button color="secondary">Confirm</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );

  const handleAddCalDavIntegrationSaveButtonPress = async () => {
    const form = addCalDavIntegrationRef.current.elements;
    const url = form.url.value;
    const password = form.password.value;
    const username = form.username.value;

    try {
      setAddCalDavError(null);
      const addCalDavIntegrationResponse = await handleAddCalDavIntegration({ username, password, url });
      if (addCalDavIntegrationResponse.ok) {
        setIsAddCalDavIntegrationDialogOpen(false);
      } else {
        const j = await addCalDavIntegrationResponse.json();
        setAddCalDavError({ message: j.message });
      }
    } catch (reason) {
      console.error(reason);
    }
  };

  const handleAddAppleIntegrationSaveButtonPress = async () => {
    const form = addAppleIntegrationRef.current.elements;
    const password = form.password.value;
    const username = form.username.value;

    try {
      setAddAppleError(null);
      const addAppleIntegrationResponse = await handleAddAppleIntegration({ username, password });
      if (addAppleIntegrationResponse.ok) {
        setIsAddAppleIntegrationDialogOpen(false);
      } else {
        const j = await addAppleIntegrationResponse.json();
        setAddAppleError({ message: j.message });
      }
    } catch (reason) {
      console.error(reason);
    }
  };

  const ConnectCalDavServerDialog = useCallback(() => {
    return (
      <Dialog
        open={isAddCalDavIntegrationDialogOpen}
        onOpenChange={(isOpen) => setIsAddCalDavIntegrationDialogOpen(isOpen)}>
        <DialogContent>
          <DialogHeader
            title="Connect to CalDav Server"
            subtitle="Your credentials will be stored and encrypted."
          />
          <div className="my-4">
            {addCalDavError && (
              <p className="text-sm text-red-700">
                <span className="font-bold">Error: </span>
                {addCalDavError.message}
              </p>
            )}
            <AddCalDavIntegration
              ref={addCalDavIntegrationRef}
              onSubmit={handleAddCalDavIntegrationSaveButtonPress}
            />
          </div>
          <div className="gap-2 mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <Button
              type="submit"
              form={ADD_CALDAV_INTEGRATION_FORM_TITLE}
              className="flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-sm shadow-sm bg-neutral-900 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900">
              Save
            </Button>
            <DialogClose
              onClick={() => {
                setIsAddCalDavIntegrationDialogOpen(false);
              }}
              asChild>
              <Button color="secondary">Cancel</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    );
  }, [isAddCalDavIntegrationDialogOpen, addCalDavError]);

  const ConnectAppleServerDialog = useCallback(() => {
    return (
      <Dialog
        open={isAddAppleIntegrationDialogOpen}
        onOpenChange={(isOpen) => setIsAddAppleIntegrationDialogOpen(isOpen)}>
        <DialogContent>
          <DialogHeader
            title="Connect to Apple Server"
            subtitle={
              <p>
                Generate an app specific password to use with Cal.com at{" "}
                <a
                  className="text-indigo-400"
                  href="https://appleid.apple.com/account/manage"
                  target="_blank"
                  rel="noopener noreferrer">
                  https://appleid.apple.com/account/manage
                </a>
                . Your credentials will be stored and encrypted.
              </p>
            }
          />
          <div className="my-4">
            {addAppleError && (
              <p className="text-sm text-red-700">
                <span className="font-bold">Error: </span>
                {addAppleError.message}
              </p>
            )}
            <AddAppleIntegration
              ref={addAppleIntegrationRef}
              onSubmit={handleAddAppleIntegrationSaveButtonPress}
            />
          </div>
          <div className="gap-2 mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              form={ADD_APPLE_INTEGRATION_FORM_TITLE}
              className="flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-sm shadow-sm bg-neutral-900 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900">
              Save
            </button>
            <DialogClose
              onClick={() => {
                setIsAddAppleIntegrationDialogOpen(false);
              }}
              asChild>
              <Button color="secondary">Cancel</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    );
  }, [isAddAppleIntegrationDialogOpen, addAppleError]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <Shell heading="Integrations" subtitle="Connect your favourite apps." CTA={<ConnectNewAppDialog />}>
        <div className="mb-8 overflow-hidden bg-white border border-gray-200 rounded-sm">
          {integrations.filter((ig) => ig.credential).length !== 0 ? (
            <ul className="divide-y divide-gray-200">
              {integrations
                .filter((ig) => ig.credential)
                .map((ig) => (
                  <li key={ig.credential.id}>
                    <Link href={"/integrations/" + ig.credential.id}>
                      <a className="block hover:bg-gray-50">
                        <div className="flex items-center px-4 py-4 sm:px-6">
                          <div className="flex items-center flex-1 min-w-0">
                            <div className="flex-shrink-0">
                              <img className="w-10 h-10 mr-2" src={ig.imageSrc} alt={ig.title} />
                            </div>
                            <div className="flex-1 min-w-0 px-4 md:grid md:grid-cols-2 md:gap-4">
                              <div>
                                <p className="text-sm font-medium truncate text-neutral-900">{ig.title}</p>
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
                                  <p className="flex items-center mt-2 text-gray-500 text">
                                    <CheckCircleIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-green-400" />
                                    Connected
                                  </p>
                                )}
                                {!ig.credential.key && (
                                  <p className="flex items-center mt-3 text-gray-500 text">
                                    <XCircleIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-yellow-400" />
                                    Not connected
                                  </p>
                                )}
                              </div>
                            </div>
                            <div>
                              <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      </a>
                    </Link>
                  </li>
                ))}
            </ul>
          ) : (
            <div className="bg-white rounded-sm shadow">
              <div className="flex">
                <div className="pl-8 py-9">
                  <InformationCircleIcon className="w-16 text-neutral-900" />
                </div>
                <div className="py-5 sm:p-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    You don&apos;t have any apps connected.
                  </h3>
                  <div className="mt-2 text-sm text-gray-500">
                    <p>
                      You currently do not have any apps connected. Connect your first app to get started.
                    </p>
                  </div>
                  <ConnectNewAppDialog />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="mb-8 bg-white border border-gray-200 rounded-sm">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 font-cal">Select calendars</h3>
            <div className="max-w-xl mt-2 text-sm text-gray-500">
              <p>Select which calendars are checked for availability to prevent double bookings.</p>
            </div>
            <SelectCalendarDialog />
          </div>
        </div>
        <div className="border border-gray-200 rounded-sm">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 font-cal">Launch your own App</h3>
            <div className="max-w-xl mt-2 text-sm text-gray-500">
              <p>If you want to add your own App here, get in touch with us.</p>
            </div>
            <div className="mt-5">
              <a href="mailto:apps@cal.com" className="btn btn-white">
                Contact us
              </a>
            </div>
          </div>
        </div>
        <ConnectCalDavServerDialog />
        <ConnectAppleServerDialog />
      </Shell>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getSession(context);
  if (!session?.user?.email) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }
  const user = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      credentials: {
        select: {
          id: true,
          type: true,
          key: true,
        },
      },
      completedOnboarding: true,
      createdDate: true,
    },
  });

  if (!user)
    return {
      redirect: { permanent: false, destination: "/auth/login" },
    };

  if (
    shouldShowOnboarding({ completedOnboarding: user.completedOnboarding, createdDate: user.createdDate })
  ) {
    return ONBOARDING_NEXT_REDIRECT;
  }

  const integrations = getIntegrations(user.credentials);

  return {
    props: { session, integrations },
  };
}
