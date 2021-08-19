import Head from "next/head";
import prisma from "@lib/prisma";
import { getSession, useSession } from "next-auth/client";
import { User, UserUpdateInput } from "@prisma/client";
import { NextPageContext } from "next";
import React, { useState, useEffect, useRef } from "react";
import { validJson } from "@lib/jsonUtils";
import AvailableTimes from "@lib/availability/forms/AvailableTimes";
import TimezoneSelect from "react-timezone-select";
import useTheme from "@components/Theme";
import Text from "@components/ui/Text";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

export const ONBOARDING_INTRODUCED_AT = "1628520977921";
export default function Page(props) {
  const [session, loading] = useSession();

  useTheme();
  const [ready, setReady] = useState(false);

  const [selectedTimeZone, setSelectedTimeZone] = useState({ value: dayjs.tz.guess() });
  const currentTime = React.useMemo(() => {
    return dayjs().tz(selectedTimeZone.value).format("H:mm A");
  }, [selectedTimeZone]);
  const [currentStep, setCurrentStep] = useState(0);

  const availableTimesRef = useRef<HTMLFormElement>(null);
  
  const updateUser = async (data: UserUpdateInput) => {};
  const detectStep = () => {
    const hasConfigureCalendar = props.integrations.some((integration) => integration.credential != null);
    // if (hasConfigureCalendar) {
    //   setCurrentStep(1);
    // }
  };

  const handleConfirmStep = () => {
    steps[currentStep]?.onComplete && steps[currentStep]?.onComplete();
    incrementStep();
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
    setCurrentStep(currentStep + 1);
  };

  const completeOnboarding = () => {
    console.log("complete onboarding");
  };

  const integrationHandler = (type) => {
    fetch("/api/integrations/" + type.replace("_", "") + "/add")
      .then((response) => response.json())
      .then((data) => {
        window.location.href = data.url;
      });
  };

  useEffect(() => {
    detectStep();
    setReady(true);

    console.log({
      user: props.user,
      integrations: props.integrations,
      credentials: props.credentials,
      eventTypes: props.eventTypes,
    });
  }, []);

  const IntegrationGridListItem = ({ integration }) => {
    if (!integration || !integration.installed) {
      return null;
    }

    return (
      <div
        onClick={() => integrationHandler(integration.type)}
        className="flex flex-col items-center rounded text-center py-8 group hover:bg-blue-100 hover:bg-opacity-50 hover:cursor-pointer">
        <header>
          <div className="bg-gray-100 dark:bg-opacity-10 h-16 w-16 mb-4 flex flex-col justify-center items-center content-center mx-auto rounded-full">
            <img className="mx-auto w-1/2 h-1/2" src={integration.imageSrc} alt={integration.title} />
          </div>
        </header>

        <section className="space-y-2">
          <p className="">{integration.title}</p>
          {integration?.description && <p className="opacity-50">{integration.description}</p>}
        </section>
      </div>
    );
  };

  const steps = [
    {
      id: "welcome",
      title: "Welcome to Calendso",
      description:
        "Tell us what to call you and let us know what timezone you’re in. You’ll be able to edit this later.",
      Component: (
        <form id="ONBOARDING_STEP_1">
          <section className="space-y-4">
            <fieldset>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full name
              </label>
              <input
                // ref={nameRef}
                type="text"
                name="name"
                id="name"
                autoComplete="given-name"
                placeholder="Your name"
                required
                className="mt-1 block w-full border border-gray-300 rounded-sm shadow-sm py-2 px-3 focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                // defaultValue={props.user.name}
              />
            </fieldset>

            <fieldset>
              <section className="flex justify-between">
                <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
                  Timezone
                </label>
                <Text variant="caption">Current time: {currentTime}</Text>
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
      onComplete: () => {
        console.log("Save Name and TimeZone");
      },
    },
    {
      id: "connect-calendar",
      title: "Connect your calendar",
      description:
        "Connect your calendar to automatically check for busy times and new events as they’re scheduled.",
      Component: (
        <section className="bg-white dark:bg-opacity-5 text-black dark:text-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
          {props.integrations.map((integration) => {
            return <IntegrationGridListItem key={integration.type} integration={integration} />;
          })}
        </section>
      ),
      hideConfirm: true,
      confirmText: "Continue",
      showCancel: true,
      cancelText: "Continue without calendar",
      onComplete: () => {
        console.log("completing");
      },
    },
    {
      id: "set-availability",
      title: "Set your availability",
      description:
        "Define ranges of time when you are available on a recurring basis. You can create more of these later and assign them to different calendars.",
      Component: (
        <section className="bg-white dark:bg-opacity-5 text-black dark:text-white p-8">
          <AvailableTimes
            startTime={null}
            endTime={null}
            bufferTime={null}
            externallySubmitted={true}
            ref={availableTimesRef}
          />
        </section>
      ),
      hideConfirm: false,
      confirmText: "Continue",
      showCancel: true,
      cancelText: "Set up later",
      onComplete: () => {
        console.log("Save Availability");
      },
    },
    {
      id: "profile",
      title: "Nearly there",
      description:
        "Last thing, a brief description about you and a photo really help you get bookings and let people know who they’re booking with.",
      Component: (
        <form id="ONBOARDING_STEP_4">
          <section className="space-y-4">
            <fieldset>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full name
              </label>
              <input
                // ref={nameRef}
                type="text"
                name="name"
                id="name"
                autoComplete="given-name"
                placeholder="Your name"
                required
                className="mt-1 block w-full border border-gray-300 rounded-sm shadow-sm py-2 px-3 focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                // defaultValue={props.user.name}
              />
            </fieldset>
            <fieldset>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                About
              </label>
              <input
                // ref={nameRef}
                type="text"
                name="bio"
                id="bio"
                placeholder="Your name"
                required
                className="mt-1 block w-full border border-gray-300 rounded-sm shadow-sm py-2 px-3 focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                // defaultValue={props.user.name}
              />
              <Text variant="caption">
                A few sentences about yourself. This will appear on your personal url page.
              </Text>
            </fieldset>

            <fieldset>
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
                Profile Photo
              </label>
              <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true">
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
            </fieldset>
          </section>
        </form>
      ),
      hideConfirm: false,
      confirmText: "Finish",
      showCancel: true,
      cancelText: "Set up later",
      onComplete: () => {
        console.log("Save Name, Bio, Photo");
      },
    },
  ];

  if (loading || !ready) {
    return <div className="loader"></div>;
  }

  return (
    <div>
      <Head>
        <title>Calendso - Getting Started</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="mx-auto py-24 px-4">
        <article className="max-w-3xl mx-auto  overflow-hidden rounded-md">
          <section className="mx-auto py-6 px-6 max-w-lg space-y-4">
            <header className="">
              <Text variant="headline">{steps[currentStep].title}</Text>
              <Text>{steps[currentStep].description}</Text>
            </header>
            <section>
              <Text>
                Step {currentStep + 1} of {steps.length}
              </Text>

              <section className="w-full space-x-2 flex">
                {steps.map((s, index) => {
                  return index <= currentStep ? (
                    <div key={`step-${index}`} className="h-2 bg-black w-1/4"></div>
                  ) : (
                    <div key={`step-${index}`} className="h-2 bg-black bg-opacity-25 w-1/4"></div>
                  );
                })}
              </section>
            </section>
          </section>
          <section className="py-6 px-6 mx-auto max-w-2xl">{steps[currentStep].Component}</section>
          <footer className="py-6 px-6 mx-auto max-w-2xl flex flex-col space-y-6">
            {!steps[currentStep].hideConfirm && (
              <button
                onClick={handleConfirmStep}
                type="button"
                className="w-full btn btn-primary text-center justify-center">
                {steps[currentStep].confirmText}
              </button>
            )}
            <button onClick={handleSkipStep}>{steps[currentStep].cancelText}</button>
          </footer>
        </article>
      </div>
    </div>
  );
}

export async function getServerSideProps(context: NextPageContext) {
  const session = await getSession(context);

  let user: User = null;
  let integrations = [];
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
        username: true,
        name: true,
        email: true,
        bio: true,
        avatar: true,
        timeZone: true,
        completedOnboarding: true,
      },
    });

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
  }

  return {
    props: {
      user,
      integrations,
      credentials,
      eventTypes,
    },
  };
}
