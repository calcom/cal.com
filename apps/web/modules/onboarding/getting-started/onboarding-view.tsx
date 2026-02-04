"use client";

import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef, useTransition } from "react";

import { isCompanyEmail } from "@calcom/features/ee/organizations/lib/utils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { type IconName } from "@calcom/ui/components/icon";
import { RadioAreaGroup } from "@calcom/ui/components/radio";
import { useHasTeamMembership } from "@calcom/web/modules/billing/hooks/useHasPaidPlan";

import { OnboardingCard } from "../components/OnboardingCard";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { OnboardingContinuationPrompt } from "../components/onboarding-continuation-prompt";
import { PlanIcon } from "../components/plan-icon";
import { useOnboardingStore, type PlanType } from "../store/onboarding-store";

type OnboardingViewProps = {
  userEmail: string;
};

export const OnboardingView = ({ userEmail }: OnboardingViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const { selectedPlan, setSelectedPlan, resetOnboardingPreservingPlan } = useOnboardingStore();
  const previousPlanRef = useRef<PlanType | null>(null);
  const [isPending, startTransition] = useTransition();
  const { hasTeamMembership, isPending: isPendingMembership } = useHasTeamMembership();

  // Reset onboarding data when visiting this page, but preserve the selected plan
  useEffect(() => {
    resetOnboardingPreservingPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If user has any team membership (pending or accepted), redirect them directly to personal onboarding
  // This handles the case where users sign up with an invite token (membership is auto-accepted)
  useEffect(() => {
    if (!isPendingMembership && hasTeamMembership) {
      setSelectedPlan("personal");
      startTransition(() => {
        router.push("/onboarding/personal/settings");
      });
    }
  }, [isPendingMembership, hasTeamMembership, router, setSelectedPlan]);

  // Plan order mapping for determining direction
  const planOrder: Record<PlanType, number> = {
    personal: 0,
    team: 1,
    organization: 2,
  };

  // Calculate animation direction synchronously
  const getDirection = (): "up" | "down" => {
    if (!selectedPlan || !previousPlanRef.current) return "down";
    const previousOrder = planOrder[previousPlanRef.current];
    const currentOrder = planOrder[selectedPlan];
    return currentOrder > previousOrder ? "up" : "down";
  };

  const direction = getDirection();

  // Update previous plan ref after render
  useEffect(() => {
    previousPlanRef.current = selectedPlan;
  }, [selectedPlan]);

  const handleContinue = () => {
    if (selectedPlan) {
      posthog.capture("onboarding_plan_continue_clicked", {
        plan_type: selectedPlan,
      });
    }
    startTransition(() => {
      if (selectedPlan === "organization") {
        router.push("/onboarding/organization/details");
      } else if (selectedPlan === "team") {
        router.push("/onboarding/teams/details");
      } else if (selectedPlan === "personal") {
        router.push("/onboarding/personal/settings");
      }
    });
  };

  const planIconByType: Record<PlanType, IconName> = {
    personal: "user",
    team: "user",
    organization: "users",
  };

  const allPlans = [
    {
      id: "personal" as PlanType,
      title: t("onboarding_plan_personal_title"),
      badge: t("onboarding_plan_personal_badge"),
      description: t("onboarding_plan_personal_description"),
      icon: planIconByType.personal,
      variant: "single" as const,
    },
    {
      id: "team" as PlanType,
      title: t("onboarding_plan_team_title"),
      badge: t("onboarding_plan_team_badge"),
      description: t("onboarding_plan_team_description"),
      icon: planIconByType.team,
      variant: "team" as const,
    },
    {
      id: "organization" as PlanType,
      title: t("onboarding_plan_organization_title"),
      badge: t("onboarding_plan_organization_badge"),
      description: t("onboarding_plan_organization_description"),
      icon: planIconByType.organization,
      variant: "organization" as const,
    },
  ];

  // Only show organization plan for company emails
  const plans = allPlans.filter((plan) => {
    if (plan.id === "organization") {
      return isCompanyEmail(userEmail);
    }
    return true;
  });

  const selectedPlanData = plans.find((plan) => plan.id === selectedPlan);

  // Show loading state while checking for team membership or if redirecting
  if (isPendingMembership || hasTeamMembership) {
    return (
      <OnboardingLayout userEmail={userEmail}>
        <OnboardingCard title={t("loading")} subtitle="" />
      </OnboardingLayout>
    );
  }

  return (
    <>
      <OnboardingContinuationPrompt />
      <OnboardingLayout userEmail={userEmail}>
        {/* Left column - Main content */}
        <OnboardingCard
          title={t("onboarding_select_plan")}
          subtitle={t("onboarding_welcome_question")}
          footer={
            <div className="flex w-full justify-end gap-2">
              <Button
                color="primary"
                className="rounded-[10px]"
                onClick={handleContinue}
                disabled={isPending}>
                {isPending ? t("loading") : t("continue")}
              </Button>
            </div>
          }>
          {/* Card */}
          <div className="bg-cal-muted border-muted relative flex min-h-0 w-full flex-col overflow-hidden rounded-xl border p-1">
            <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
              {/* Plan options */}
              <RadioAreaGroup.Group
                value={selectedPlan ?? undefined}
                onValueChange={(value) => {
                  const planType = value as PlanType;
                  setSelectedPlan(planType);
                  posthog.capture("onboarding_plan_selected", {
                    plan_type: planType,
                  });
                }}
                className="flex w-full flex-col gap-1 rounded-[10px]">
                {plans.map((plan) => {
                  const isSelected = selectedPlan === plan.id;

                  return (
                    <RadioAreaGroup.Item
                      key={plan.id}
                      value={plan.id}
                      className={classNames(
                        "bg-default relative flex items-center overflow-hidden rounded-[10px] border transition",
                        isSelected ? "border-emphasis shadow-sm" : "border-subtle",
                        "pr-12 [&>button]:left-auto [&>button]:right-6 [&>button]:mt-0 [&>button]:transform"
                      )}
                      classNames={{
                        container: "flex w-full items-center gap-3 p-5 pr-12",
                      }}>
                      <div className="flex w-full flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-1">
                          <p className="text-emphasis text-sm font-semibold leading-4">{plan.title}</p>
                          <Badge
                            variant="gray"
                            size="md"
                            className="hidden h-4 rounded-md px-1 py-1 md:flex md:items-center">
                            <span className="text-emphasis text-xs font-medium leading-3">{plan.badge}</span>
                          </Badge>
                        </div>
                        <Badge variant="gray" size="md" className="h-4 w-fit rounded-md px-1 py-1 md:hidden">
                          <span className="text-emphasis text-xs font-medium leading-3">{plan.badge}</span>
                        </Badge>
                        <p className="text-subtle max-w-full text-sm font-medium leading-[1.25]">
                          {plan.description}
                        </p>
                      </div>
                    </RadioAreaGroup.Item>
                  );
                })}
              </RadioAreaGroup.Group>
            </div>
          </div>
        </OnboardingCard>

        {/* Right column - Icon display */}
        <div className="bg-cal-muted border-subtle hidden h-full w-full rounded-l-2xl border-b border-l border-t xl:flex xl:items-center xl:justify-center">
          <AnimatePresence mode="wait">
            {selectedPlanData && (
              <PlanIcon
                key={selectedPlan}
                icon={selectedPlanData.icon}
                variant={selectedPlanData.variant}
                animationDirection={direction}
              />
            )}
          </AnimatePresence>
        </div>
      </OnboardingLayout>
    </>
  );
};
