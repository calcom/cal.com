"use client";

import { signOut } from "next-auth/react";
import type { TFunction } from "next-i18next";
import Head from "next/head";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { z } from "zod";

import { classNames } from "@calcom/lib";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { IdentityProvider } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button, StepCard, Steps } from "@calcom/ui";
import { Icon } from "@calcom/ui";

import type { getServerSideProps } from "@lib/getting-started/[[...step]]/getServerSideProps";

import { ConnectedCalendars } from "@components/getting-started/steps-views/ConnectCalendars";
import { ConnectedVideoStep } from "@components/getting-started/steps-views/ConnectedVideoStep";
import { SetupAvailability } from "@components/getting-started/steps-views/SetupAvailability";
import UserProfile from "@components/getting-started/steps-views/UserProfile";
import { UserSettings } from "@components/getting-started/steps-views/UserSettings";

const INITIAL_STEP = "user-settings";
const BASE_STEPS = ["user-settings", "setup-availability", "user-profile"] as const;
const EXTRA_STEPS = ["connected-calendar", "connected-video"] as const;
type StepType = (typeof BASE_STEPS)[number] | (typeof EXTRA_STEPS)[number];

const getStepsAndHeadersForUser = (identityProvider: IdentityProvider, t: TFunction) => {
  const baseHeaders: {
    title: string;
    subtitle: string[];
    skipText?: string;
  }[] = [
    {
      title: t("welcome_to_cal_header", { appName: APP_NAME }),
      subtitle: [t("we_just_need_basic_info"), t("edit_form_later_subtitle")],
    },
    {
      title: t("set_availability"),
      subtitle: [
        t("set_availability_getting_started_subtitle_1"),
        t("set_availability_getting_started_subtitle_2"),
      ],
    },
    {
      title: t("nearly_there"),
      subtitle: [t("nearly_there_instructions")],
    },
  ];

  const additionalHeaders: {
    title: string;
    subtitle: string[];
    skipText?: string;
  }[] = [
    {
      title: t("connect_your_calendar"),
      subtitle: [t("connect_your_calendar_instructions")],
      skipText: t("connect_calendar_later"),
    },
    {
      title: t("connect_your_video_app"),
      subtitle: [t("connect_your_video_app_instructions")],
      skipText: t("set_up_later"),
    },
  ];

  if (identityProvider === IdentityProvider.GOOGLE) {
    return {
      steps: [...BASE_STEPS] as StepType[],
      headers: [...baseHeaders],
    };
  }

  return {
    steps: [...BASE_STEPS.slice(0, 1), ...EXTRA_STEPS, ...BASE_STEPS.slice(1)] as StepType[],
    headers: [baseHeaders[0], ...additionalHeaders, ...baseHeaders.slice(1)],
  };
};

const stepRouteSchema = z.object({
  step: z
    .array(
      z.enum(["user-settings", "setup-availability", "user-profile", "connected-calendar", "connected-video"])
    )
    .default([INITIAL_STEP]),
  from: z.string().optional(),
});

export type PageProps = inferSSRProps<typeof getServerSideProps>;
const OnboardingPage = (props: PageProps) => {
  const pathname = usePathname();
  const params = useParamsWithFallback();

  const router = useRouter();
  const [user] = trpc.viewer.me.useSuspenseQuery();
  const { t } = useLocale();

  const result = stepRouteSchema.safeParse({
    ...params,
    step: Array.isArray(params.step) ? params.step : [params.step],
  });

  const currentStep = result.success ? result.data.step[0] : INITIAL_STEP;
  const from = result.success ? result.data.from : "";

  // TODO: Add this in when we have solved the ability to move to tokens accept invite and note invitedto
  // Ability to accept other pending invites if any (low priority)
  // if (props.hasPendingInvites) {
  //   headers.unshift(
  //     props.hasPendingInvites && {
  //       title: `${t("email_no_user_invite_heading", { appName: APP_NAME })}`,
  //       subtitle: [], // TODO: come up with some subtitle text here
  //     }
  //   );
  // }
  const { steps, headers } = getStepsAndHeadersForUser(user.identityProvider, t);
  const stepTransform = (step: StepType) => {
    const stepIndex = steps.indexOf(step as (typeof steps)[number]);

    if (stepIndex > -1) {
      return steps[stepIndex];
    }
    return INITIAL_STEP;
  };
  const currentStepIndex = steps.indexOf(currentStep);

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    const newStep = steps[nextIndex];
    router.push(`/getting-started/${stepTransform(newStep)}`);
  };

  return (
    <div
      className={classNames(
        "dark:bg-brand dark:text-brand-contrast text-emphasis min-h-screen [--cal-brand:#111827] dark:[--cal-brand:#FFFFFF]",
        "[--cal-brand-emphasis:#101010] dark:[--cal-brand-emphasis:#e1e1e1]",
        "[--cal-brand-subtle:#9CA3AF]",
        "[--cal-brand-text:#FFFFFF]  dark:[--cal-brand-text:#000000]"
      )}
      data-testid="onboarding"
      key={pathname}>
      <Head>
        <title>{`${APP_NAME} - ${t("getting_started")}`}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="mx-auto py-6 sm:px-4 md:py-24">
        <div className="relative">
          <div className="sm:mx-auto sm:w-full sm:max-w-[600px]">
            <div className="mx-auto px-4 sm:max-w-[520px]">
              <header>
                <p className="font-cal mb-3 text-[28px] font-medium leading-7">
                  {headers[currentStepIndex]?.title || "Undefined title"}
                </p>

                {headers[currentStepIndex]?.subtitle.map((subtitle, index) => (
                  <p className="text-subtle font-sans text-sm font-normal" key={index}>
                    {subtitle}
                  </p>
                ))}
              </header>
              <Steps maxSteps={steps.length} currentStep={currentStepIndex + 1} nextStep={goToNextStep} />
            </div>
            <StepCard>
              <Suspense fallback={<Icon name="loader" />}>
                {currentStep === "user-settings" && (
                  <UserSettings nextStep={goToNextStep} hideUsername={from === "signup"} />
                )}
                {currentStep === "connected-calendar" && <ConnectedCalendars nextStep={goToNextStep} />}

                {currentStep === "connected-video" && <ConnectedVideoStep nextStep={goToNextStep} />}

                {currentStep === "setup-availability" && (
                  <SetupAvailability nextStep={goToNextStep} defaultScheduleId={user.defaultScheduleId} />
                )}
                {currentStep === "user-profile" && <UserProfile />}
              </Suspense>
            </StepCard>

            {headers[currentStepIndex]?.skipText && (
              <div className="flex w-full flex-row justify-center">
                <Button
                  color="minimal"
                  data-testid="skip-step"
                  onClick={(event) => {
                    event.preventDefault();
                    goToNextStep();
                  }}
                  className="mt-8 cursor-pointer px-4 py-2 font-sans text-sm font-medium">
                  {headers[currentStepIndex]?.skipText}
                </Button>
              </div>
            )}
          </div>
          <div className="flex w-full flex-row justify-center">
            <Button
              color="minimal"
              data-testid="sign-out"
              onClick={() => signOut({ callbackUrl: "/auth/logout" })}
              className="mt-8 cursor-pointer px-4 py-2 font-sans text-sm font-medium">
              {t("sign_out")}
            </Button>
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
};

export default OnboardingPage;
