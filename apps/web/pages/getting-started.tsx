import { ArrowRightIcon } from "@heroicons/react/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import classnames from "classnames";
import debounce from "lodash/debounce";
import omit from "lodash/omit";
import { NextPageContext } from "next";
import { useSession } from "next-auth/react";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import getApps from "@calcom/app-store/utils";
import { getCalendarCredentials, getConnectedCalendars } from "@calcom/core/CalendarManager";
import dayjs from "@calcom/dayjs";
import { DOCS_URL } from "@calcom/lib/constants";
import { fetchUsername } from "@calcom/lib/fetchUsername";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/Alert";
import Button from "@calcom/ui/Button";
import { Form } from "@calcom/ui/form/fields";

import { getSession } from "@lib/auth";
import { DEFAULT_SCHEDULE } from "@lib/availability";
import { useLocale } from "@lib/hooks/useLocale";
import prisma from "@lib/prisma";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import { inferSSRProps } from "@lib/types/inferSSRProps";
import { Schedule as ScheduleType } from "@lib/types/schedule";

import { ClientSuspense } from "@components/ClientSuspense";
import Loader from "@components/Loader";
import Schedule from "@components/availability/Schedule";
import { CalendarListContainer } from "@components/integrations/CalendarListContainer";
import TimezoneSelect from "@components/ui/form/TimezoneSelect";

import getEventTypes from "../lib/queries/event-types/get-event-types";

type ScheduleFormValues = {
  schedule: ScheduleType;
};

let mutationComplete: ((err: Error | null) => void) | null;

export default function Onboarding(props: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const router = useRouter();
  const telemetry = useTelemetry();

  const mutation = trpc.useMutation("viewer.updateProfile", {
    onSuccess: async () => {
      setSubmitting(true);
      setEnteredName(nameRef.current?.value || "");
      if (mutationComplete) {
        mutationComplete(null);
        mutationComplete = null;
      }
      setSubmitting(false);
    },
    onError: (err) => {
      setError(new Error(err.message));
      if (mutationComplete) {
        mutationComplete(new Error(err.message));
      }
      setSubmitting(false);
    },
  });

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
  const { status } = useSession();
  const loading = status === "loading";
  const [ready, setReady] = useState(false);
  const [selectedImport, setSelectedImport] = useState("");
  const [error, setError] = useState<Error | null>(null);

  const updateUser = useCallback(
    async (data: Prisma.UserUpdateInput) => {
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
    },
    [props.user.id]
  );

  const createEventType = trpc.useMutation("viewer.eventTypes.create");

  const createSchedule = trpc.useMutation("viewer.availability.schedule.create", {
    onError: (err) => {
      throw new Error(err.message);
    },
  });

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
    // Always set timezone if new user
    let step = 0;

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
      const onComplete = steps[currentStep]?.onComplete;
      if (onComplete) {
        await onComplete();
      }
      incrementStep();
      setSubmitting(false);
    } catch (error) {
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
        await Promise.all(
          DEFAULT_EVENT_TYPES.map(async (event) => {
            return createEventType.mutate(event);
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

  const schema = z.object({
    token: z.string(),
  });

  const formMethods = useForm<{
    token: string;
  }>({ resolver: zodResolver(schema), mode: "onSubmit" });

  // Should update username on user when being redirected from sign up and doing google/saml
  useEffect(() => {
    async function validateAndSave(username: string) {
      const { data } = await fetchUsername(username);

      // Only persist username if its available and not premium
      // premium usernames are saved via stripe webhook
      if (data.available && !data.premium) {
        await updateUser({
          username,
        });
      }
      // Remove it from localStorage
      window.localStorage.removeItem("username");
      return;
    }

    // Looking for username on localStorage
    const username = window.localStorage.getItem("username");
    if (username) {
      validateAndSave(username);
    }
  }, [updateUser]);

  const availabilityForm = useForm({ defaultValues: { schedule: DEFAULT_SCHEDULE } });
  const steps = [
    {
      id: t("welcome"),
      title: t("welcome_to_calcom"),
      description: t("welcome_instructions"),
      Component: (
        <>
          {selectedImport == "" && (
            <div className="mb-4 grid grid-cols-2 gap-x-4">
              <Button color="secondary" onClick={() => setSelectedImport("calendly")}>
                {t("import_from")} Calendly
              </Button>
              <Button color="secondary" onClick={() => setSelectedImport("savvycal")}>
                {t("import_from")} SavvyCal
              </Button>
            </div>
          )}
          {selectedImport && (
            <div>
              <h2 className="font-cal text-2xl text-gray-900">
                {t("import_from")} {selectedImport === "calendly" ? "Calendly" : "SavvyCal"}
              </h2>
              <p className="mb-2 text-sm text-gray-500">
                {t("you_will_need_to_generate")}. Find out how to do this{" "}
                <a href={`${DOCS_URL}/import`}>here</a>.
              </p>
              <form
                className="flex"
                onSubmit={formMethods.handleSubmit(async (values) => {
                  // track the number of imports. Without personal data/payload
                  telemetry.event(telemetryEventTypes.importSubmitted, {
                    ...collectPageParameters(),
                    selectedImport,
                  });
                  setSubmitting(true);
                  const response = await fetch(`/api/import/${selectedImport}`, {
                    method: "POST",
                    body: JSON.stringify({
                      token: values.token,
                    }),
                    headers: {
                      "Content-Type": "application/json",
                    },
                  });
                  if (response.status === 201) {
                    setSubmitting(false);
                    handleSkipStep();
                  } else {
                    await response.json().catch((e) => {
                      console.log("Error: response.json invalid: " + e);
                      setSubmitting(false);
                    });
                  }
                })}>
                <input
                  onChange={async (e) => {
                    formMethods.setValue("token", e.target.value);
                  }}
                  type="text"
                  name="token"
                  id="token"
                  placeholder={t("access_token")}
                  required
                  className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                />
                <Button type="submit" className="mt-1 ml-4 h-10">
                  {t("import")}
                </Button>
              </form>
            </div>
          )}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-sm text-gray-500">or</span>
            </div>
          </div>
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
                  className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                />
              </fieldset>

              <fieldset>
                <section className="flex justify-between">
                  <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
                    {t("timezone")}
                  </label>
                  <p className="text-sm leading-tight text-gray-500 dark:text-white">
                    {t("current_time")}:&nbsp;
                    <span className="text-black">{dayjs().tz(selectedTimeZone).format("LT")}</span>
                  </p>
                </section>
                <TimezoneSelect
                  id="timeZone"
                  value={selectedTimeZone}
                  onChange={({ value }) => setSelectedTimeZone(value)}
                  className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </fieldset>
            </section>
          </form>
        </>
      ),
      hideConfirm: false,
      confirmText: t("continue"),
      showCancel: true,
      cancelText: t("set_up_later"),
      onComplete: async () => {
        mutationComplete = null;
        setError(null);
        const mutationAsync = new Promise((resolve, reject) => {
          mutationComplete = (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(null);
          };
        });

        const userUpdateData = {
          name: nameRef.current?.value,
          timeZone: selectedTimeZone,
        };

        mutation.mutate(userUpdateData);

        if (mutationComplete) {
          await mutationAsync;
        }
      },
    },
    {
      id: "connect-calendar",
      title: t("connect_your_calendar"),
      description: t("connect_your_calendar_instructions"),
      Component: (
        <ClientSuspense fallback={<Loader />}>
          <CalendarListContainer heading={false} fromOnboarding={true} />
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
          className="mx-auto max-w-lg bg-white text-black dark:bg-opacity-5 dark:text-white"
          form={availabilityForm}
          handleSubmit={async (values) => {
            try {
              setSubmitting(true);
              await createSchedule.mutate({
                name: t("default_schedule_name"),
                ...values,
              });
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
            <footer className="flex flex-col space-y-6 py-6 sm:mx-auto sm:w-full">
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
                className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
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
                className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                defaultValue={props.user.bio || undefined}
              />
              <p className="mt-2 text-sm leading-tight text-gray-500 dark:text-white">
                {t("few_sentences_about_yourself")}
              </p>
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

  if (loading || !ready) {
    return <div className="loader" />;
  }

  return (
    <div className="bg-brand min-h-screen" data-testid="onboarding">
      <Head>
        <title>Cal.com - {t("getting_started")}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {isSubmitting && (
        <div className="fixed z-10 flex h-full w-full flex-col content-center items-center justify-center bg-white bg-opacity-25">
          <Loader />
        </div>
      )}
      <div className="mx-auto px-4 py-24">
        <article className="relative">
          <section className="space-y-4 sm:mx-auto sm:w-full sm:max-w-lg">
            <header>
              <p className="font-cal mb-2 text-3xl tracking-wider text-white">{steps[currentStep].title}</p>
              <p className="text-sm font-normal text-white">{steps[currentStep].description}</p>
            </header>
            <section className="space-y-2 pt-4">
              <p className="text-xs font-medium text-gray-500 dark:text-white">
                Step {currentStep + 1} of {steps.length}
              </p>

              {error && <Alert severity="error" message={error?.message} />}

              <section className="flex w-full space-x-2 rtl:space-x-reverse">
                {steps.map((s, index) => {
                  return index <= currentStep ? (
                    <div
                      key={`step-${index}`}
                      onClick={() => goToStep(index)}
                      className={classnames(
                        "h-1 w-1/4 bg-white",
                        index < currentStep ? "cursor-pointer" : ""
                      )}
                    />
                  ) : (
                    <div key={`step-${index}`} className="h-1 w-1/4 bg-white bg-opacity-25" />
                  );
                })}
              </section>
            </section>
          </section>
          <section className="mx-auto mt-10 max-w-xl rounded-sm bg-white p-10">
            {steps[currentStep].Component}

            {!steps[currentStep].hideConfirm && (
              <footer className="mt-8 flex flex-col space-y-6 sm:mx-auto sm:w-full">
                <Button
                  className="justify-center"
                  disabled={isSubmitting}
                  onClick={debouncedHandleConfirmStep}
                  EndIcon={ArrowRightIcon}
                  data-testid={`continue-button-${currentStep}`}>
                  {steps[currentStep].confirmText}
                </Button>
              </footer>
            )}
          </section>
          <section className="mx-auto max-w-xl py-8">
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
      identityProvider: true,
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

  const credentials = await prisma.credential.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      type: true,
      key: true,
      userId: true,
      appId: true,
    },
  });

  const integrations = getApps(credentials)
    .filter((item) => item.type.endsWith("_calendar"))
    .map((item) => omit(item, "key"));

  // get user's credentials + their connected integrations
  const calendarCredentials = getCalendarCredentials(credentials, user.id);
  // get all the connected integrations' calendars (from third party)
  const connectedCalendars = await getConnectedCalendars(calendarCredentials, user.selectedCalendars);

  const eventTypes = await prisma.eventType.findMany({
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

  const schedules = await prisma.schedule.findMany({
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
