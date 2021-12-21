import { ArrowRightIcon } from "@heroicons/react/outline";
import { Prisma } from "@prisma/client";
import classnames from "classnames";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import debounce from "lodash/debounce";
import omit from "lodash/omit";
import { NextPageContext } from "next";
import { useSession } from "next-auth/client";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import TimezoneSelect from "react-timezone-select";

import { getSession } from "@lib/auth";
import { DEFAULT_SCHEDULE } from "@lib/availability";
import { useLocale } from "@lib/hooks/useLocale";
import { getCalendarCredentials, getConnectedCalendars } from "@lib/integrations/calendar/CalendarManager";
import getIntegrations from "@lib/integrations/getIntegrations";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";
import { Schedule as ScheduleType } from "@lib/types/schedule";

import { ClientSuspense } from "@components/ClientSuspense";
import Loader from "@components/Loader";
import { Form } from "@components/form/fields";
import { CalendarListContainer } from "@components/integrations/CalendarListContainer";
import { Alert } from "@components/ui/Alert";
import Button from "@components/ui/Button";
import Text from "@components/ui/Text";
import Schedule from "@components/ui/form/Schedule";

import getEventTypes from "../lib/queries/event-types/get-event-types";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);

type ScheduleFormValues = {
  schedule: ScheduleType;
};

export default function Onboarding(props: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const router = useRouter();

  const DEFAULT_EVENT_TYPES = [
    {
      title: t("15min_meeting"),
      slug: "15min",
      length: 15,
    },
    {
      title: t("30min_meeting"),
      slug: "30min",
      length: 30,
    },
    {
      title: t("secret_meeting"),
      slug: "secret",
      length: 15,
      hidden: true,
    },
  ];

  const [isSubmitting, setSubmitting] = React.useState(false);
  const [enteredName, setEnteredName] = React.useState("");
  const Sess = useSession();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateUser = async (data: Prisma.UserUpdateInput) => {
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

  const createEventType = async (data: Prisma.EventTypeCreateInput) => {
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

  const createSchedule = async ({ schedule }: ScheduleFormValues) => {
    const res = await fetch(`/api/schedule`, {
      method: "POST",
      body: JSON.stringify({ schedule }),
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

  /** Name */
  const nameRef = useRef<HTMLInputElement>(null);
  const bioRef = useRef<HTMLInputElement>(null);
  /** End Name */
  /** TimeZone */
  const [selectedTimeZone, setSelectedTimeZone] = useState(props.user.timeZone ?? dayjs.tz.guess());
  /** End TimeZone */

  /** Onboarding Steps */
  const [currentStep, setCurrentStep] = useState(0);
  const detectStep = () => {
    let step = 0;
    const hasSetUserNameOrTimeZone = props.user?.name && props.user?.timeZone;
    if (hasSetUserNameOrTimeZone) {
      step = 1;
    }

    const hasConfigureCalendar = props.integrations.some((integration) => integration.credential !== null);
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
      setSubmitting(true);
      if (
        steps[currentStep] &&
        steps[currentStep].onComplete &&
        typeof steps[currentStep].onComplete === "function"
      ) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        await steps[currentStep].onComplete!();
      }
      incrementStep();
      setSubmitting(false);
    } catch (error) {
      console.log("handleConfirmStep", error);
      setSubmitting(false);
      setError(error as Error);
    }
  };

  const debouncedHandleConfirmStep = debounce(handleConfirmStep, 850);

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
    setSubmitting(true);
    if (!props.eventTypes || props.eventTypes.length === 0) {
      const eventTypes = await getEventTypes();
      if (eventTypes.length === 0) {
        Promise.all(
          DEFAULT_EVENT_TYPES.map(async (event) => {
            return await createEventType(event);
          })
        );
      }
    }
    await updateUser({
      completedOnboarding: true,
    });

    setSubmitting(false);
    router.push("/event-types");
  };

  const availabilityForm = useForm({ defaultValues: { schedule: DEFAULT_SCHEDULE } });
  const steps = [
    {
      id: t("welcome"),
      title: t("welcome_to_calcom"),
      description: t("welcome_instructions"),
      Component: (
        <form className="sm:mx-auto sm:w-full">
          <section className="space-y-8">
            <fieldset>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                {t("full_name")}
              </label>
              <input
                ref={nameRef}
                type="text"
                name="name"
                id="name"
                autoComplete="given-name"
                placeholder={t("your_name")}
                defaultValue={props.user.name ?? enteredName}
                required
                className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
              />
            </fieldset>

            <fieldset>
              <section className="flex justify-between">
                <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
                  {t("timezone")}
                </label>
                <Text variant="caption">
                  {t("current_time")}:&nbsp;
                  <span className="text-black">{dayjs().tz(selectedTimeZone).format("LT")}</span>
                </Text>
              </section>
              <TimezoneSelect
                id="timeZone"
                value={selectedTimeZone}
                onChange={({ value }) => setSelectedTimeZone(value)}
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </fieldset>
          </section>
        </form>
      ),
      hideConfirm: false,
      confirmText: t("continue"),
      showCancel: true,
      cancelText: t("set_up_later"),
      onComplete: async () => {
        try {
          setSubmitting(true);
          await updateUser({
            name: nameRef.current?.value,
            timeZone: selectedTimeZone,
          });
          setEnteredName(nameRef.current?.value || "");
          setSubmitting(true);
        } catch (error) {
          setError(error as Error);
          setSubmitting(false);
        }
      },
    },
    {
      id: "connect-calendar",
      title: t("connect_your_calendar"),
      description: t("connect_your_calendar_instructions"),
      Component: (
        <ClientSuspense fallback={<Loader />}>
          <CalendarListContainer heading={false} />
        </ClientSuspense>
      ),
      hideConfirm: true,
      confirmText: t("continue"),
      showCancel: true,
      cancelText: t("continue_without_calendar"),
    },
    {
      id: "set-availability",
      title: t("set_availability"),
      description: t("set_availability_instructions"),
      Component: (
        <Form<ScheduleFormValues>
          className="max-w-lg mx-auto text-black bg-white dark:bg-opacity-5 dark:text-white"
          form={availabilityForm}
          handleSubmit={async (values) => {
            try {
              setSubmitting(true);
              await createSchedule({ ...values });
              debouncedHandleConfirmStep();
              setSubmitting(false);
            } catch (error) {
              if (error instanceof Error) {
                setError(error);
              }
            }
          }}>
          <section>
            <Schedule name="schedule" />
            <footer className="flex flex-col py-6 space-y-6 sm:mx-auto sm:w-full">
              <Button className="justify-center" EndIcon={ArrowRightIcon} type="submit">
                {t("continue")}
              </Button>
            </footer>
          </section>
        </Form>
      ),
      hideConfirm: true,
      showCancel: false,
    },
    {
      id: "profile",
      title: t("nearly_there"),
      description: t("nearly_there_instructions"),
      Component: (
        <form className="sm:mx-auto sm:w-full" id="ONBOARDING_STEP_4">
          <section className="space-y-4">
            <fieldset>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                {t("full_name")}
              </label>
              <input
                ref={nameRef}
                type="text"
                name="name"
                id="name"
                autoComplete="given-name"
                placeholder={t("your_name")}
                defaultValue={props.user.name || enteredName}
                required
                className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
              />
            </fieldset>
            <fieldset>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                {t("about")}
              </label>
              <input
                ref={bioRef}
                type="text"
                name="bio"
                id="bio"
                required
                className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                defaultValue={props.user.bio || undefined}
              />
              <Text variant="caption" className="mt-2">
                {t("few_sentences_about_yourself")}
              </Text>
            </fieldset>
          </section>
        </form>
      ),
      hideConfirm: false,
      confirmText: t("finish"),
      showCancel: true,
      cancelText: t("set_up_later"),
      onComplete: async () => {
        try {
          setSubmitting(true);
          console.log("updating");
          await updateUser({
            bio: bioRef.current?.value,
          });
          setSubmitting(false);
        } catch (error) {
          setError(error as Error);
          setSubmitting(false);
        }
      },
    },
  ];
  /** End Onboarding Steps */

  useEffect(() => {
    detectStep();
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (Sess[1] || !ready) {
    return <div className="loader"></div>;
  }

  return (
    <div className="min-h-screen bg-brand" data-testid="onboarding">
      <Head>
        <title>Cal.com - {t("getting_started")}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {isSubmitting && (
        <div className="fixed z-10 flex flex-col items-center content-center justify-center w-full h-full bg-white bg-opacity-25">
          <Loader />
        </div>
      )}
      <div className="px-4 py-24 mx-auto">
        <article className="relative">
          <section className="space-y-4 sm:mx-auto sm:w-full sm:max-w-lg">
            <header>
              <Text className="text-white" variant="largetitle">
                {steps[currentStep].title}
              </Text>
              <Text className="text-white" variant="subtitle">
                {steps[currentStep].description}
              </Text>
            </header>
            <section className="pt-4 space-y-2">
              <Text variant="footnote">
                Step {currentStep + 1} of {steps.length}
              </Text>

              {error && <Alert severity="error" {...error} />}

              <section className="flex w-full space-x-2">
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
                    <div key={`step-${index}`} className="w-1/4 h-1 bg-white bg-opacity-25"></div>
                  );
                })}
              </section>
            </section>
          </section>
          <section className="max-w-xl p-10 mx-auto mt-10 bg-white rounded-sm">
            {steps[currentStep].Component}

            {!steps[currentStep].hideConfirm && (
              <footer className="flex flex-col mt-8 space-y-6 sm:mx-auto sm:w-full">
                <Button
                  className="justify-center"
                  disabled={isSubmitting}
                  onClick={debouncedHandleConfirmStep}
                  EndIcon={ArrowRightIcon}>
                  {steps[currentStep].confirmText}
                </Button>
              </footer>
            )}
          </section>
          <section className="max-w-xl py-8 mx-auto">
            <div className="flex flex-row-reverse justify-between">
              <button
                disabled={isSubmitting}
                onClick={handleSkipStep}
                className="text-sm leading-tight text-gray-500 dark:text-white">
                {t("next_step")}
              </button>
              {currentStep !== 0 && (
                <button
                  disabled={isSubmitting}
                  onClick={decrementStep}
                  className="text-sm leading-tight text-gray-500 dark:text-white">
                  {t("prev_step")}
                </button>
              )}
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}

export async function getServerSideProps(context: NextPageContext) {
  const session = await getSession(context);

  let integrations = [];
  let connectedCalendars = [];
  let credentials = [];
  let eventTypes = [];
  let schedules = [];
  if (!session?.user?.id) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
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
      selectedCalendars: {
        select: {
          externalId: true,
          integration: true,
        },
      },
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

  integrations = getIntegrations(credentials)
    .filter((item) => item.type.endsWith("_calendar"))
    .map((item) => omit(item, "key"));

  // get user's credentials + their connected integrations
  const calendarCredentials = getCalendarCredentials(credentials, user.id);
  // get all the connected integrations' calendars (from third party)
  connectedCalendars = await getConnectedCalendars(calendarCredentials, user.selectedCalendars);

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
      session,
      user,
      integrations,
      connectedCalendars,
      eventTypes,
      schedules,
    },
  };
}
