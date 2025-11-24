"use client";

import { Button } from "@calid/features/ui/components/button";
import { StepCard } from "@calid/features/ui/components/card";
import { Steps } from "@calid/features/ui/components/card";
import { Icon } from "@calid/features/ui/components/icon";
import { triggerToast } from "@calid/features/ui/components/toast";
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
import { UserSettings } from "@components/getting-started/steps-views/UserSettings";

const INITIAL_STEP = "user-settings";
const BASE_STEPS = ["user-settings", "connected-calendar", "connected-video"] as const;

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
    },
  ];

  return {
    steps: [...BASE_STEPS],
    headers: [...baseHeaders],
  };
};

const stepRouteSchema = z.object({
  step: z.array(z.enum(["user-settings", "connected-calendar", "connected-video"])).default([INITIAL_STEP]),
  from: z.string().optional(),
});

export type PageProps = inferSSRProps<typeof getServerSideProps>;
const OnboardingPage = (props: PageProps) => {
  const { country = "IN" } = props;
  const pathname = usePathname();
  const params = useParamsWithFallback();

  useEffect(() => {
    if (props.google_signup_to_be_tracked) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "gmail_signup_success",
        signup_method: "google",
        email_address: props.email,
      });
      console.log("Gmail event pushed");
    }
  }, [props.google_signup_to_be_tracked, props.email]);
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
  const { steps, headers } = getStepsAndHeadersForUser(t);
  const stepTransform = (step: StepType) => {
    const stepIndex = steps.indexOf(step as (typeof steps)[number]);

    if (stepIndex > -1) {
      return steps[stepIndex];
    }
    return INITIAL_STEP;
  };
  const goToIndex = (index: number) => {
    if (index >= steps.length) {
      router.push("/home");
      return;
    }
    const newStep = steps[index];
    router.push(`/getting-started/${stepTransform(newStep)}`);
  };
  const utils = trpc.useUtils();

  const currentStepIndex = steps.indexOf(currentStep);

  const onSuccess = async () => {
    await utils.viewer.me.invalidate();

    // Only navigate to next step if we're not on the last step
    // and we're not completing the onboarding
    if (currentStepIndex < steps.length - 1) {
      goToIndex(currentStepIndex + 1);
    } else {
    }
  };

  const userMutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: onSuccess,
  });

  const completionMutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.viewer.me.invalidate();
      await utils.viewer.me.calid_get.invalidate();

      await utils.viewer.me.get.refetch();

      router.push("/home");
    },
    onError: () => {
      triggerToast(t("problem_saving_user_profile"), "error");
    },
  });

  const onSchedulePresent = async () => {
    const data = utils.viewer.me.get.getData();

    if (data) {
      window.dataLayer = window.dataLayer || [];
      const gtmEvent = {
        event: data.identityProvider === "GOOGLE" ? "gmail_onboarding_success" : "email_onboarding_success",
        signup_method: data.identityProvider === "GOOGLE" ? "google" : "email",
        user_name: data.username,
        full_name: data.name,
        email_address: data.email,
      };

      console.log("Pushed gtm onboarding event: ", gtmEvent);

      if (!data.completedOnboarding) {
        window.dataLayer.push(gtmEvent);
      }
    }
    // After creating the default schedule, complete the onboarding with a generic bio
    completionMutation.mutate({
      metadata: {
        currentOnboardingStep: "completed",
      },
      completedOnboarding: true,
      bio: t("default_user_bio"),
    });
  };

  const createDefaultScheduleMutation = trpc.viewer.availability.schedule.create.useMutation({
    onSuccess: async () => {
      onSchedulePresent();
    },
    onError: () => {
      triggerToast(t("problem_creating_default_schedule"), "error");
    },
  });

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;

    // If we're on the last step (connected-video), create default schedule and complete onboarding
    if (currentStepIndex === steps.length - 1) {
      createDefaultScheduleMutation.mutate({
        name: t("default_schedule_name"),
      });
      return;
    }

    userMutation.mutate({
      metadata: {
        currentOnboardingStep: steps[nextIndex],
      },
    });

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
            <Steps
              maxSteps={steps.length}
              currentStep={currentStepIndex + 1}
              nextStep={goToNextStep}
              goToStep={goToIndex} // Add this prop
            />{" "}
          </div>
          <StepCard>
            <Suspense fallback={<Icon name="loader-circle" />}>
              {currentStep === "user-settings" && (
                <UserSettings
                  nextStep={goToNextStep}
                  hideUsername={false}
                  isPhoneFieldMandatory={country === "IN"}
                />
              )}
              {currentStep === "connected-calendar" && (
                <ConnectedCalendars nextStep={goToNextStep} isPageLoading={isNextStepLoading} />
              )}

              {currentStep === "connected-video" && (
                <ConnectedVideoStep nextStep={goToNextStep} isPageLoading={isNextStepLoading} />
              )}
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
