"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useTransition } from "react";
import { OnboardingCard } from "../components/OnboardingCard";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { PlanIcon } from "../components/plan-icon";

type OnboardingViewProps = {
  userEmail: string;
};

export const OnboardingView = ({ userEmail }: OnboardingViewProps): JSX.Element => {
  const router = useRouter();
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleContinue = (): void => {
    posthog.capture("onboarding_plan_continue_clicked", {
      plan_type: "personal",
    });
    startTransition(() => {
      router.push("/onboarding/personal/settings");
    });
  };
  let continueLabel = t("continue");
  if (isPending) {
    continueLabel = t("loading");
  }

  return (
    <OnboardingLayout userEmail={userEmail}>
      <OnboardingCard
        title={t("getting_started")}
        subtitle={t("onboarding_plan_personal_description")}
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button
              data-testid="onboarding-continue-btn"
              color="primary"
              className="rounded-[10px]"
              onClick={handleContinue}
              disabled={isPending}>
              {continueLabel}
            </Button>
          </div>
        }>
        <div className="relative flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-muted bg-cal-muted p-1">
          <div className="flex w-full flex-col items-start overflow-clip rounded-[10px] border border-emphasis bg-default p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-1">
              <p className="font-semibold text-emphasis text-sm leading-4">
                {t("onboarding_plan_personal_title")}
              </p>
              <Badge variant="gray" size="md" className="h-4 rounded-md px-1 py-1">
                <span className="font-medium text-emphasis text-xs leading-3">
                  {t("onboarding_plan_personal_badge")}
                </span>
              </Badge>
            </div>
            <p className="mt-2 max-w-full font-medium text-sm text-subtle leading-[1.25]">
              {t("onboarding_plan_personal_description")}
            </p>
          </div>
        </div>
      </OnboardingCard>

      <div className="hidden h-full w-full rounded-l-2xl border-subtle border-y border-s bg-cal-muted xl:flex xl:items-center xl:justify-center">
        <PlanIcon icon="user" />
      </div>
    </OnboardingLayout>
  );
};
