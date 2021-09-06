import Head from "next/head";
import prisma from "@lib/prisma";
import { useSession } from "next-auth/client";
import {
  EventTypeCreateInput,
  ScheduleCreateInput,
  User,
  UserUpdateInput,
  EventType,
  Schedule,
} from "@prisma/client";
import { NextPageContext } from "next";
import React, { useState, useEffect, useRef } from "react";
import { validJson } from "@lib/jsonUtils";
import TimezoneSelect from "react-timezone-select";
import Text from "@components/ui/Text";
import ErrorAlert from "@components/ui/alerts/Error";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
import AddCalDavIntegration, {
  ADD_CALDAV_INTEGRATION_FORM_TITLE,
} from "@lib/integrations/CalDav/components/AddCalDavIntegration";
import { Dialog, DialogClose, DialogContent, DialogHeader } from "@components/Dialog";
import SchedulerForm, { SCHEDULE_FORM_ID } from "@components/ui/Schedule/Schedule";
import { useRouter } from "next/router";
import { Integration } from "pages/integrations";
import { AddCalDavIntegrationRequest } from "../lib/integrations/CalDav/components/AddCalDavIntegration";
import classnames from "classnames";
import { ArrowRightIcon } from "@heroicons/react/outline";
import { getSession } from "@lib/auth";
import Button from "@components/ui/Button";

const DEFAULT_EVENT_TYPES = [
  {
    title: "15 Min Meeting",
    slug: "15min",
    length: 15,
  },
  {
    title: "30 Min Meeting",
    slug: "30min",
    length: 30,
  },
  {
    title: "Secret Meeting",
    slug: "secret",
    length: 15,
    hidden: true,
  },
];

type OnboardingProps = {
  user: User;
  integrations?: Record<string, string>[];
  eventTypes?: EventType[];
  schedules?: Schedule[];
};

export default function Onboarding(props: OnboardingProps) {
  const router = useRouter();

  const [enteredName, setEnteredName] = React.useState();
  const Sess = useSession();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  const updateUser = async (data: UserUpdateInput) => {
    const res = await fetch(`/api/user/${props.user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ data: { ...data } }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error((await res.json()).message);
    }
    const responseData = await res.json();
    return responseData.data;
  };

  const createEventType = async (data: EventTypeCreateInput) => {
    const res = await fetch(`/api/availability/eventtype`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error((await res.json()).message);
    }
    const responseData = await res.json();
    return responseData.data;
  };

  const createSchedule = async (data: ScheduleCreateInput) => {
    const res = await fetch(`/api/schedule`, {
      method: "POST",
      body: JSON.stringify({ data: { ...data } }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error((await res.json()).message);
    }
    const responseData = await res.json();
    return responseData.data;
  };

  const integrationHandler = (type: string) => {
    if (type === "caldav_calendar") {
      setAddCalDavError(null);
      setIsAddCalDavIntegrationDialogOpen(true);
      return;
    }

    fetch("/api/integrations/" + type.replace("_", "") + "/add")
      .then((response) => response.json())
      .then((data) => {
        window.location.href = data.url;
      });
  };

  /** Internal Components */
  const IntegrationGridListItem = ({ integration }: { integration: Integration }) => {
    if (!integration || !integration.installed) {
      return null;
    }

    return (
      <li onClick={() => integrationHandler(integration.type)} key={integration.type} className="flex py-4">
        <div className="w-1/12 mr-4 pt-2">
          <img className="h-8 w-8 mr-2" src={integration.imageSrc} alt={integration.title} />
        </div>
        <div className="w-10/12">
          <Text className="text-gray-800 font-medium">{integration.title}</Text>
          <Text className="text-gray-400" variant="subtitle">
            {integration.description}
          </Text>
        </div>
        <div className="w-2/12 text-right pt-2">
          <Button color="secondary" onClick={() => integrationHandler(integration.type)}>
            Connect
          </Button>
        </div>
      </li>
    );
  };
  /** End Internal Components */

  /** Name */
  const nameRef = useRef(null);
  const bioRef = useRef(null);
  /** End Name */
  /** TimeZone */
  const [selectedTimeZone, setSelectedTimeZone] = useState({
    value: props.user.timeZone ?? dayjs.tz.guess(),
    label: null,
  });
  const currentTime = React.useMemo(() => {
    return dayjs().tz(selectedTimeZone.value).format("H:mm A");
  }, [selectedTimeZone]);
  /** End TimeZone */

  /** CalDav Form */
  const addCalDavIntegrationRef = useRef<HTMLFormElement>(null);
  const [isAddCalDavIntegrationDialogOpen, setIsAddCalDavIntegrationDialogOpen] = useState(false);
  const [addCalDavError, setAddCalDavError] = useState<{ message: string } | null>(null);

  const handleAddCalDavIntegration = async ({ url, username, password }: AddCalDavIntegrationRequest) => {
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
        incrementStep();
      } else {
        const j = await addCalDavIntegrationResponse.json();
        setAddCalDavError({ message: j.message });
      }
    } catch (reason) {
      console.error(reason);
    }
  };

  const ConnectCalDavServerDialog = () => {
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
              <p className="text-red-700 text-sm">
                <span className="font-bold">Error: </span>
                {addCalDavError.message}
              </p>
            )}
            <AddCalDavIntegration
              ref={addCalDavIntegrationRef}
              onSubmit={handleAddCalDavIntegrationSaveButtonPress}
            />
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              form={ADD_CALDAV_INTEGRATION_FORM_TITLE}
              className="flex justify-center py-2 px-4 border border-transparent rounded-sm shadow-sm text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900">
              Save
            </button>
            <DialogClose
              onClick={() => {
                setIsAddCalDavIntegrationDialogOpen(false);
              }}
              as="button"
              className="btn btn-white mx-2">
              Cancel
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
  /**End CalDav Form */

  /** Onboarding Steps */
  const [currentStep, setCurrentStep] = useState(0);
  const detectStep = () => {
    let step = 0;
    const hasSetUserNameOrTimeZone = props.user.name && props.user.timeZone;
    if (hasSetUserNameOrTimeZone) {
      step = 1;
    }

    const hasConfigureCalendar = props.integrations.some((integration) => integration.credential != null);
    if (hasConfigureCalendar) {
      step = 2;
    }

    const hasSchedules = props.schedules && props.schedules.length > 0;
    if (hasSchedules) {
      step = 3;
    }

    setCurrentStep(step);
  };

  const handleConfirmStep = async () => {
    try {
      if (
        steps[currentStep] &&
        steps[currentStep]?.onComplete &&
        typeof steps[currentStep]?.onComplete === "function"
      ) {
        await steps[currentStep].onComplete();
      }
      incrementStep();
    } catch (error) {
      console.log("handleConfirmStep", error);
      setError(error);
    }
  };

  const handleSkipStep = () => {
    incrementStep();
  };

  const incrementStep = () => {
    const nextStep = currentStep + 1;

    if (nextStep >= steps.length) {
      completeOnboarding();
      return;
    }
    setCurrentStep(nextStep);
  };

  const decrementStep = () => {
    const previous = currentStep - 1;

    if (previous < 0) {
      return;
    }
    setCurrentStep(previous);
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  /**
   * Complete Onboarding finalizes the onboarding flow for a new user.
   *
   * Here, 3 event types are pre-created for the user as well.
   * Set to the availability the user enter during the onboarding.
   *
   * If a user skips through the Onboarding flow,
   * then the default availability is applied.
   */
  const completeOnboarding = async () => {
    if (!props.eventTypes || props.eventTypes.length === 0) {
      Promise.all(
        DEFAULT_EVENT_TYPES.map(async (event) => {
          return await createEventType(event);
        })
      );
    }
    await updateUser({
      completedOnboarding: true,
    });

    router.push("/event-types");
  };

  const steps = [
    {
      id: "welcome",
      title: "Welcome to Calendso",
      description:
        "Tell us what to call you and let us know what timezone you’re in. You’ll be able to edit this later.",
      Component: (
        <form className="sm:mx-auto sm:w-full sm:max-w-md">
          <section className="space-y-4">
            <fieldset>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full name
              </label>
              <input
                ref={nameRef}
                type="text"
                name="name"
                id="name"
                autoComplete="given-name"
                placeholder="Your name"
                defaultValue={props.user.name}
                required
                className="mt-1 block w-full border border-gray-300 rounded-sm shadow-sm py-2 px-3 focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
              />
            </fieldset>

            <fieldset>
              <section className="flex justify-between">
                <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
                  Timezone
                </label>
                <Text variant="caption">
                  Current time:&nbsp;
                  <span className="text-black">{currentTime}</span>
                </Text>
              </section>
              <TimezoneSelect
                id="timeZone"
                value={selectedTimeZone}
                onChange={setSelectedTimeZone}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-1 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </fieldset>
          </section>
        </form>
      ),
      hideConfirm: false,
      confirmText: "Continue",
      showCancel: true,
      cancelText: "Set up later",
      onComplete: async () => {
        try {
          await updateUser({
            name: nameRef.current.value,
            timeZone: selectedTimeZone.value,
          });
          setEnteredName(nameRef.current.value);
        } catch (error) {
          setError(error);
        }
      },
    },
    {
      id: "connect-calendar",
      title: "Connect your calendar",
      description:
        "Connect your calendar to automatically check for busy times and new events as they’re scheduled.",
      Component: (
        <ul className="divide-y divide-gray-200 sm:mx-auto sm:w-full sm:max-w-md">
          {props.integrations.map((integration) => {
            return <IntegrationGridListItem key={integration.type} integration={integration} />;
          })}
        </ul>
      ),
      hideConfirm: true,
      confirmText: "Continue",
      showCancel: true,
      cancelText: "Continue without calendar",
    },
    {
      id: "set-availability",
      title: "Set your availability",
      description:
        "Define ranges of time when you are available on a recurring basis. You can create more of these later and assign them to different calendars.",
      Component: (
        <>
          <section className="bg-white dark:bg-opacity-5 text-black dark:text-white mx-auto max-w-lg">
            <SchedulerForm
              onSubmit={async (data) => {
                try {
                  await createSchedule({
                    freeBusyTimes: data,
                  });
                  handleConfirmStep();
                } catch (error) {
                  setError(error);
                }
              }}
            />
          </section>
          <footer className="py-6 sm:mx-auto sm:w-full sm:max-w-md flex flex-col space-y-6">
            <Button className="justify-center" EndIcon={ArrowRightIcon} type="submit" form={SCHEDULE_FORM_ID}>
              Continue
            </Button>
          </footer>
        </>
      ),
      hideConfirm: true,
      showCancel: false,
    },
    {
      id: "profile",
      title: "Nearly there",
      description:
        "Last thing, a brief description about you and a photo really help you get bookings and let people know who they’re booking with.",
      Component: (
        <form className="sm:mx-auto sm:w-full sm:max-w-md" id="ONBOARDING_STEP_4">
          <section className="space-y-4">
            <fieldset>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full name
              </label>
              <input
                ref={nameRef}
                type="text"
                name="name"
                id="name"
                autoComplete="given-name"
                placeholder="Your name"
                defaultValue={props.user.name || enteredName}
                required
                className="mt-1 block w-full border border-gray-300 rounded-sm shadow-sm py-2 px-3 focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
              />
            </fieldset>
            <fieldset>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                About
              </label>
              <input
                ref={bioRef}
                type="text"
                name="bio"
                id="bio"
                required
                className="mt-1 block w-full border border-gray-300 rounded-sm shadow-sm py-2 px-3 focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                defaultValue={props.user.bio}
              />
              <Text variant="caption">
                A few sentences about yourself. This will appear on your personal url page.
              </Text>
            </fieldset>
          </section>
        </form>
      ),
      hideConfirm: false,
      confirmText: "Finish",
      showCancel: true,
      cancelText: "Set up later",
      onComplete: async () => {
        try {
          await updateUser({
            bio: bioRef.current.value,
          });
        } catch (error) {
          setError(error);
        }
      },
    },
  ];
  /** End Onboarding Steps */

  useEffect(() => {
    detectStep();
    setReady(true);
  }, []);

  if (Sess[1] || !ready) {
    return <div className="loader"></div>;
  }

  return (
    <div className="bg-black min-h-screen">
      <Head>
        <title>Calendso - Getting Started</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="mx-auto py-24 px-4">
        <article>
          <section className="sm:mx-auto sm:w-full sm:max-w-md space-y-4">
            <header className="">
              <Text className="text-white" variant="largetitle">
                {steps[currentStep].title}
              </Text>
              <Text className="text-white" variant="subtitle">
                {steps[currentStep].description}
              </Text>
            </header>
            <section className="space-y-2">
              <Text variant="footnote">
                Step {currentStep + 1} of {steps.length}
              </Text>

              {error && <ErrorAlert {...error} />}

              <section className="w-full space-x-2 flex">
                {steps.map((s, index) => {
                  return index <= currentStep ? (
                    <div
                      key={`step-${index}`}
                      onClick={() => goToStep(index)}
                      className={classnames(
                        "h-1 bg-white w-1/4",
                        index < currentStep ? "cursor-pointer" : ""
                      )}></div>
                  ) : (
                    <div key={`step-${index}`} className="h-1 bg-white bg-opacity-25 w-1/4"></div>
                  );
                })}
              </section>
            </section>
          </section>
          <section className="py-6 mt-10 mx-auto max-w-xl bg-white p-10 rounded-sm">
            {steps[currentStep].Component}

            {!steps[currentStep].hideConfirm && (
              <footer className="py-6 sm:mx-auto sm:w-full sm:max-w-md flex flex-col space-y-6 mt-8">
                <Button className="justify-center" onClick={handleConfirmStep} EndIcon={ArrowRightIcon}>
                  {steps[currentStep].confirmText}
                </Button>
              </footer>
            )}
          </section>
          <section className="py-6 mt-8 mx-auto max-w-xl">
            <div className="flex justify-between flex-row-reverse">
              <button onClick={handleSkipStep}>
                <Text variant="caption">Skip Step</Text>
              </button>
              {currentStep !== 0 && (
                <button onClick={decrementStep}>
                  <Text variant="caption">Prev Step</Text>
                </button>
              )}
            </div>
          </section>
        </article>
      </div>
      <ConnectCalDavServerDialog />
    </div>
  );
}

export async function getServerSideProps(context: NextPageContext) {
  const session = await getSession(context);

  let integrations = [];
  let credentials = [];
  let eventTypes = [];
  let schedules = [];
  if (!session?.user?.id) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      } as const,
    };
  }
  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      timeZone: true,
      completedOnboarding: true,
    },
  });
  if (!user) {
    throw new Error(`Signed in as ${session.user.id} but cannot be found in db`);
  }

  if (user.completedOnboarding) {
    return {
      redirect: {
        permanent: false,
        destination: "/event-types",
      },
    };
  }

  credentials = await prisma.credential.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      type: true,
      key: true,
    },
  });

  integrations = [
    {
      installed: !!(process.env.GOOGLE_API_CREDENTIALS && validJson(process.env.GOOGLE_API_CREDENTIALS)),
      credential: credentials.find((integration) => integration.type === "google_calendar") || null,
      type: "google_calendar",
      title: "Google Calendar",
      imageSrc: "integrations/google-calendar.svg",
      description: "Gmail, G Suite",
    },
    {
      installed: !!(process.env.MS_GRAPH_CLIENT_ID && process.env.MS_GRAPH_CLIENT_SECRET),
      credential: credentials.find((integration) => integration.type === "office365_calendar") || null,
      type: "office365_calendar",
      title: "Office 365 Calendar",
      imageSrc: "integrations/outlook.svg",
      description: "Office 365, Outlook.com, live.com, or hotmail calendar",
    },
    {
      installed: !!(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET),
      credential: credentials.find((integration) => integration.type === "zoom_video") || null,
      type: "zoom_video",
      title: "Zoom",
      imageSrc: "integrations/zoom.svg",
      description: "Video Conferencing",
    },
    {
      installed: true,
      credential: credentials.find((integration) => integration.type === "caldav_calendar") || null,
      type: "caldav_calendar",
      title: "Caldav",
      imageSrc: "integrations/caldav.svg",
      description: "CalDav Server",
    },
  ];

  eventTypes = await prisma.eventType.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      hidden: true,
    },
  });

  schedules = await prisma.schedule.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
    },
  });

  return {
    props: {
      user,
      integrations,
      eventTypes,
      schedules,
    },
  };
}
