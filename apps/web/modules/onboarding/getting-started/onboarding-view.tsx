"use client";

import { useRouter } from "next/navigation";

import { isCompanyEmail } from "@calcom/features/ee/organizations/lib/utils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Icon, type IconName } from "@calcom/ui/components/icon";
import { Logo } from "@calcom/ui/components/logo";
import { RadioAreaGroup } from "@calcom/ui/components/radio";

import { OnboardingContinuationPrompt } from "../components/onboarding-continuation-prompt";
import { useOnboardingStore, type PlanType } from "../store/onboarding-store";

type OnboardingViewProps = {
  userName: string;
  userEmail: string;
};

function PlanIcon({ icon }: { icon: IconName }) {
  return (
    <div className="relative h-[76px] w-[151px] shrink-0">
      {/* Outer ring - SVG with linear gradient */}
      <svg
        className="pointer-events-none absolute left-[calc(50%+0.627px)] top-[-42.34px] -translate-x-1/2"
        width="156"
        height="156"
        viewBox="0 0 156 156"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <circle opacity="0.3" cx="78" cy="78" r="77.5" stroke="url(#paint0_linear_outer)" strokeWidth="0.5" />
        <defs>
          <linearGradient
            id="paint0_linear_outer"
            x1="78"
            y1="0"
            x2="78"
            y2="156"
            gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--cal-border-default, #D3D3D3)" />
            <stop offset="1" stopColor="var(--cal-border-emphasis, #B2B2B2)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Middle ring - SVG with linear gradient */}
      <svg
        className="pointer-events-none absolute left-[calc(50%+0.628px)] top-[-20.01px] -translate-x-1/2"
        width="111"
        height="111"
        viewBox="0 0 111 111"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <circle
          opacity="0.4"
          cx="55.461"
          cy="55.455"
          r="55.211"
          stroke="url(#paint0_linear_middle)"
          strokeWidth="0.5"
        />
        <defs>
          <linearGradient
            id="paint0_linear_middle"
            x1="55.461"
            y1="-0.006"
            x2="55.461"
            y2="110.916"
            gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--cal-border-default, #D3D3D3)" />
            <stop offset="1" stopColor="var(--cal-border-emphasis, #B2B2B2)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Main icon container with gradient background */}
      <div
        className="bg-default absolute left-[calc(50%+1px)] top-[10px] flex h-[55px] w-[55px] -translate-x-1/2 items-center justify-center overflow-clip rounded-full"
        style={{
          background:
            "linear-gradient(to bottom, var(--cal-bg-default, #ffffff), var(--cal-bg-muted, #f7f7f7))",
          boxShadow:
            "0px 2.818px 5.635px 0px rgba(34, 42, 53, 0.05), 0px 0px 0px 0.704px rgba(34, 42, 53, 0.08), 0px 0.704px 3.522px -2.818px rgba(19, 19, 22, 0.7)",
        }}>
        {/* Icon with reduced opacity */}
        <div className="size-8 flex items-center justify-center opacity-70">
          <Icon name={icon} size={24} strokeWidth={1.75} className="text-emphasis" />
        </div>

        {/* Inner highlight/shine effect */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            boxShadow: "0px 0.704px 0.423px 0px inset #ffffff",
          }}
        />
      </div>
    </div>
  );
}

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
    organization: "building",
  };

  const allPlans = [
    {
      id: "personal" as PlanType,
      title: t("onboarding_plan_personal_title"),
      badge: t("onboarding_plan_personal_badge"),
      description: t("onboarding_plan_personal_description"),
      icon: planIconByType.personal,
    },
    {
      id: "team" as PlanType,
      title: t("onboarding_plan_team_title"),
      badge: t("onboarding_plan_team_badge"),
      description: t("onboarding_plan_team_description"),
      icon: planIconByType.team,
    },
    {
      id: "organization" as PlanType,
      title: t("onboarding_plan_organization_title"),
      badge: t("onboarding_plan_organization_badge"),
      description: t("onboarding_plan_organization_description"),
      icon: planIconByType.organization,
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
    <div className="bg-default flex min-h-screen w-full flex-col items-start overflow-clip">
      <OnboardingContinuationPrompt />
      {/* Header */}
      <div className="flex w-full items-center justify-between px-6 py-4">
        <Logo className="h-5 w-auto" />

        {/* Progress dots - centered */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-1">
          <div className="bg-emphasis h-1.5 w-1.5 rounded-full" />
          <div className="bg-subtle h-1 w-1 rounded-full" />
          <div className="bg-subtle h-1 w-1 rounded-full" />
          <div className="bg-subtle h-1 w-1 rounded-full" />
        </div>

        <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-2">
          <p className="text-emphasis font-mediumu text-sm leading-none">{userEmail}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex h-full w-full items-start justify-center px-6 py-8">
        <div className="flex w-full max-w-[600px] flex-col gap-6">
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
                        <PlanIcon icon={plan.icon} />
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
      </div>
    </div>
  );
};
