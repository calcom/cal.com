"use client";

import { useRouter } from "next/navigation";

import { isCompanyEmail } from "@calcom/features/ee/organizations/lib/utils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { type IconName } from "@calcom/ui/components/icon";
import { RadioAreaGroup } from "@calcom/ui/components/radio";

import { OnboardingContinuationPrompt } from "../components/onboarding-continuation-prompt";
import { PlanIcon } from "../components/plan-icon";
import { OnboardingLayout } from "../personal/_components/OnboardingLayout";
import { useOnboardingStore, type PlanType } from "../store/onboarding-store";

type OnboardingViewProps = {
  userName: string;
  userEmail: string;
};

export const OnboardingView = ({ userName, userEmail }: OnboardingViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const { selectedPlan, setSelectedPlan } = useOnboardingStore();

  const handleContinue = () => {
    if (selectedPlan === "organization") {
      router.push("/onboarding/organization/details");
    } else if (selectedPlan === "team") {
      router.push("/onboarding/teams/details");
    } else if (selectedPlan === "personal") {
      router.push("/onboarding/personal/settings");
    }
  };

  const planIconByType: Record<PlanType, IconName> = {
    personal: "user",
    team: "users",
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
      variant: "single" as const,
    },
    {
      id: "organization" as PlanType,
      title: t("onboarding_plan_organization_title"),
      badge: t("onboarding_plan_organization_badge"),
      description: t("onboarding_plan_organization_description"),
      icon: planIconByType.organization,
      variant: "double" as const,
    },
  ];

  // Only show organization plan for company emails
  const plans = allPlans.filter((plan) => {
    if (plan.id === "organization") {
      return isCompanyEmail(userEmail);
    }
    return true;
  });

  return (
    <>
      <OnboardingContinuationPrompt />
      <OnboardingLayout userEmail={userEmail} currentStep={1}>
        <div className="flex w-full flex-col gap-6">
          {/* Card */}
          <div className="bg-muted border-muted relative rounded-xl border p-1">
            <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
              {/* Card Header */}
              <div className="flex w-full gap-1.5 px-5 py-4">
                <div className="flex w-full flex-col gap-1">
                  <h1 className="font-cal text-xl font-semibold leading-6">
                    {t("onboarding_welcome_message", { userName })}
                  </h1>
                  <p className="text-subtle text-sm font-medium leading-tight">
                    {t("onboarding_welcome_question")}
                  </p>
                </div>
              </div>

              {/* Plan options */}
              <RadioAreaGroup.Group
                value={selectedPlan ?? undefined}
                onValueChange={(value) => setSelectedPlan(value as PlanType)}
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
                        container: "flex w-full items-center gap-4 p-4 pl-5 pr-12 md:p-5 md:pr-14",
                      }}>
                      <div className="flex w-full items-center gap-4">
                        <PlanIcon icon={plan.icon} variant={plan.variant} />
                        <div className="flex flex-1 flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-emphasis text-base font-semibold leading-5">{plan.title}</p>
                            <Badge
                              variant="gray"
                              size="md"
                              className="hidden h-4 rounded-md px-1 py-1 md:flex md:items-center">
                              <span className="text-emphasis text-xs font-medium leading-3">
                                {plan.badge}
                              </span>
                            </Badge>
                          </div>
                          <Badge
                            variant="gray"
                            size="md"
                            className="h-4 w-fit rounded-md px-1 py-1 md:hidden">
                            <span className="text-emphasis text-xs font-medium leading-3">{plan.badge}</span>
                          </Badge>
                          <p className="text-subtle max-w-full text-sm font-normal leading-tight">
                            {plan.description}
                          </p>
                        </div>
                      </div>
                    </RadioAreaGroup.Item>
                  );
                })}
              </RadioAreaGroup.Group>

              {/* Footer */}
              <div className="flex w-full items-center justify-end gap-1 px-5 py-4">
                <Button color="primary" className="rounded-[10px]" onClick={handleContinue}>
                  {t("continue")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </OnboardingLayout>
    </>
  );
};
