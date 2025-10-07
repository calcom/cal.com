"use client";

import { Button } from "@calid/features/ui/components/button";
import { StepCard } from "@calid/features/ui/components/card";
import { Steps } from "@calid/features/ui/components/card";
import { Icon } from "@calid/features/ui/components/icon";
import type { TFunction } from "i18next";
import { signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Suspense, useTransition } from "react";
import { Toaster } from "sonner";
import { z } from "zod";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { trpc } from "@calcom/trpc";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import type { getServerSideProps } from "@lib/getting-started/[[...step]]/getServerSideProps";

import { ConnectedCalendars } from "@components/getting-started/steps-views/ConnectCalendars";
import { ConnectedVideoStep } from "@components/getting-started/steps-views/ConnectedVideoStep";
import { SetupAvailability } from "@components/getting-started/steps-views/SetupAvailability";
import UserProfile from "@components/getting-started/steps-views/UserProfile";
import { UserSettings } from "@components/getting-started/steps-views/UserSettings";

const INITIAL_STEP = "user-settings";
const BASE_STEPS = [
  "user-settings",
  "connected-calendar",
  "connected-video",
  "setup-availability",
  "user-profile",
] as const;

type StepType = (typeof BASE_STEPS)[number];

const getStepsAndHeadersForUser = (t: TFunction) => {
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
      title: t("connect_your_calendar"),
      subtitle: [t("connect_your_calendar_instructions")],
      skipText: t("connect_calendar_later"),
    },
    {
      title: t("connect_your_video_app"),
      subtitle: [t("connect_your_video_app_instructions")],
      skipText: t("set_up_later"),
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

  return {
    steps: [...BASE_STEPS],
    headers: [...baseHeaders],
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
  const { country = "IN" } = props;
  const pathname = usePathname();
  const params = useParamsWithFallback();

  useEffect(() => {
    if (!props.google_signup_tracked) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "gmail_signup_success",
        signup_method: "google",
        email_address: props.email,
      });
    }
  }, [props.google_signup_tracked, props.email]);

  const router = useRouter();
  const [user] = trpc.viewer.me.calid_get.useSuspenseQuery();
  const { t } = useLocale();
  const [isNextStepLoading, startTransition] = useTransition();

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

  const { steps, headers } = getStepsAndHeadersForUser(t);
  const stepTransform = (step: StepType) => {
    const stepIndex = steps.indexOf(step as (typeof steps)[number]);

    if (stepIndex > -1) {
      return steps[stepIndex];
    }
    return INITIAL_STEP;
  };
  const goToIndex = (index: number) => {
    const newStep = steps[index];
    router.push(`/getting-started/${stepTransform(newStep)}`);
  };
  const utils = trpc.useUtils();

  const currentStepIndex = steps.indexOf(currentStep);

  const onSuccess = async () => {
    await utils.viewer.me.invalidate();

    goToIndex(currentStepIndex + 1);
  };

  const userMutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: onSuccess,
  });

  const goToNextStep = () => {
    userMutation.mutate({
      metadata: {
        currentOnboardingStep: steps[currentStepIndex + 1],
      },
    });

    const nextIndex = currentStepIndex + 1;
    const newStep = steps[nextIndex];
    startTransition(() => {
      router.push(`/getting-started/${stepTransform(newStep)}`);
    });
  };

  return (
    <div
      className="bg-default flex min-h-screen items-center justify-center"
      data-testid="onboarding"
      key={pathname}>
      <div className="w-full max-w-[600px] px-4 py-8">
        <div className="relative">
          <div className="mx-auto sm:max-w-[520px]">
            <header className="text-center">
              <h1 className="text-emphasis mb-3 text-[32px] font-bold leading-8">
                {headers[currentStepIndex]?.title || "Undefined title"}
              </h1>

              {headers[currentStepIndex]?.subtitle.map((subtitle, index) => (
                <p className="text-subtle mb-1 text-sm font-normal" key={index}>
                  {subtitle}
                </p>
              ))}
            </header>
            <Steps maxSteps={steps.length} currentStep={currentStepIndex + 1} nextStep={goToNextStep} />
          </div>
          <StepCard>
            <Suspense fallback={<Icon name="loader-circle" />}>
              {currentStep === "user-settings" && (
                <UserSettings
                  nextStep={goToNextStep}
                  hideUsername={from === "signup"}
                  isPhoneFieldMandatory={country === "IN"}
                />
              )}
              {currentStep === "connected-calendar" && (
                <ConnectedCalendars nextStep={goToNextStep} isPageLoading={isNextStepLoading} />
              )}

              {currentStep === "connected-video" && (
                <ConnectedVideoStep nextStep={goToNextStep} isPageLoading={isNextStepLoading} />
              )}

              {currentStep === "setup-availability" && (
                <SetupAvailability nextStep={goToNextStep} defaultScheduleId={user.defaultScheduleId} />
              )}
              {currentStep === "user-profile" && <UserProfile />}
            </Suspense>
          </StepCard>

          {headers[currentStepIndex]?.skipText && (
            <div className="flex w-full flex-row justify-center">
              <Button
                color="secondary"
                data-testid="skip-step"
                onClick={(event) => {
                  event.preventDefault();
                  goToNextStep();
                }}
                className="mt-4 cursor-pointer text-sm font-medium">
                {headers[currentStepIndex]?.skipText}
              </Button>
            </div>
          )}

          <div className="flex w-full flex-row justify-center">
            <Button
              color="minimal"
              data-testid="sign-out"
              onClick={() => signOut({ callbackUrl: "/auth/logout" })}
              className="hover:text-emphasis mt-8 cursor-pointer border-none text-sm font-medium">
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
