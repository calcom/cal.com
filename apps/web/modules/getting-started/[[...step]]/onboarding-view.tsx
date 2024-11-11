"use client";

import { signOut } from "next-auth/react";
import Head from "next/head";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { classNames } from "@calcom/lib";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button, StepCard, Steps } from "@calcom/ui";
import { Icon } from "@calcom/ui";

import type { getServerSideProps } from "@lib/getting-started/[[...step]]/getServerSideProps";

import { ConnectedCalendars } from "@components/getting-started/steps-views/ConnectCalendars";
import { ConnectedVideoStep } from "@components/getting-started/steps-views/ConnectedVideoStep";
import { UserSettings } from "@components/getting-started/steps-views/UserSettings";

const INITIAL_STEP = "user-settings";
const steps = ["user-settings", "connected-calendar", "connected-video"] as const;

const stepTransform = (step: (typeof steps)[number]) => {
  const stepIndex = steps.indexOf(step);
  if (stepIndex > -1) {
    return steps[stepIndex];
  }
  return INITIAL_STEP;
};

const stepRouteSchema = z.object({
  step: z.array(z.enum(steps)).default([INITIAL_STEP]),
  from: z.string().optional(),
});

export type PageProps = inferSSRProps<typeof getServerSideProps>;
// TODO: Refactor how steps work to be contained in one array/object. Currently we have steps,initalsteps,headers etc. These can all be in one place
const OnboardingPage = (props: PageProps) => {
  const pathname = usePathname();
  const params = useParamsWithFallback();

  const router = useRouter();
  const { t } = useLocale();

  const result = stepRouteSchema.safeParse({
    ...params,
    step: Array.isArray(params.step) ? params.step : [params.step],
  });

  // remove the user-settings page for invited users that have already accepted the team invite.
  const includeUserSettings = !props.memberOf.length;
  const _steps = [
    ...(includeUserSettings ? ["user-settings"] : []),
    "connected-calendar",
    "connected-video",
  ] as const;

  const currentStep = result.success ? result.data.step[0] : _steps[0];
  const headers = [
    ...(includeUserSettings
      ? [
          {
            title: `${t("individual_or_team_title")}`,
            subtitle: [`${t("individual_or_team_subtitle")}`],
          },
        ]
      : []),
    {
      title: `${t("connect_your_calendar")}`,
      subtitle: [`${t("connect_your_calendar_instructions")}`],
      skipText: `${t("connect_calendar_later")}`,
    },
    {
      title: `${t("connect_your_video_app")}`,
      subtitle: [`${t("connect_your_video_app_instructions")}`],
    },
  ];

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

  const goToIndex = (index: number) => {
    const newStep = _steps[index];
    router.push(`/getting-started/${stepTransform(newStep)}`);
  };

  const currentStepIndex = _steps.indexOf(currentStep);
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
                  {headers[currentStepIndex].title}
                </p>

                {headers[currentStepIndex].subtitle.map((subtitle, index) => (
                  <p className="text-subtle font-sans text-sm font-normal" key={index}>
                    {subtitle}
                  </p>
                ))}
              </header>
              {currentStep !== INITIAL_STEP && (
                <Steps
                  maxSteps={_steps.length}
                  currentStep={currentStepIndex + 1}
                  navigateToStep={goToIndex}
                />
              )}
            </div>
            <StepCard>
              <Suspense fallback={<Icon name="loader" />}>
                {currentStep === "user-settings" && <UserSettings nextStep={() => goToIndex(1)} />}
                {currentStep === "connected-calendar" && <ConnectedCalendars nextStep={() => goToIndex(2)} />}
                {currentStep === "connected-video" && <ConnectedVideoStep />}
              </Suspense>
            </StepCard>

            {headers[currentStepIndex]?.skipText && (
              <div className="flex w-full flex-row justify-center">
                <Button
                  color="minimal"
                  data-testid="skip-step"
                  onClick={(event) => {
                    event.preventDefault();
                    goToIndex(currentStepIndex + 1);
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
    </div>
  );
};

export default OnboardingPage;
