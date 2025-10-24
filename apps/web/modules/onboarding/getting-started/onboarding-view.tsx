"use client";

import { useRouter } from "next/navigation";

import { isCompanyEmail } from "@calcom/features/ee/organizations/lib/utils";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Logo } from "@calcom/ui/components/logo";
import { RadioAreaGroup } from "@calcom/ui/components/radio";

import { OnboardingContinuationPrompt } from "../components/onboarding-continuation-prompt";
import { useOnboardingStore, type PlanType } from "../store/onboarding-store";

type OnboardingViewProps = {
  userName: string;
  userEmail: string;
};

export const OnboardingView = ({ userName, userEmail }: OnboardingViewProps) => {
  const router = useRouter();
  const { selectedPlan, setSelectedPlan } = useOnboardingStore();

  const handleContinue = () => {
    if (selectedPlan === "organization") {
      router.push("/onboarding/organization/details");
    }
    // TODO: Handle other plan types
  };

  const allPlans = [
    {
      id: "personal" as PlanType,
      title: "For personal use",
      badge: "Free",
      description: "Good for individuals who are just starting out and simply want the essentials.",
    },
    {
      id: "team" as PlanType,
      title: "With my team",
      badge: "$15 p/mo p/person",
      description:
        "Highly recommended for small teams who seek to upgrade their time and perform better as a unit.",
    },
    {
      id: "organization" as PlanType,
      title: "For my organization",
      badge: "$37 p/mo p/person",
      description: "Robust scheduling for larger teams looking to have more control, privacy, and security.",
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
                  <h1 className="font-cal text-xl font-semibold leading-6">Hey {userName}</h1>
                  <p className="text-subtle text-sm font-medium leading-tight">
                    To personalize your experience, what do you plan to use Cal.com for?
                  </p>
                </div>
              </div>

              {/* Plan options */}
              <RadioAreaGroup.Group
                value={selectedPlan ?? undefined}
                onValueChange={(value) => setSelectedPlan(value as PlanType)}
                className="flex w-full flex-col gap-1 rounded-[10px]">
                {plans.map((plan) => (
                  <RadioAreaGroup.Item
                    key={plan.id}
                    value={plan.id}
                    className={
                      selectedPlan === plan.id ? "border-emphasis bg-default" : "bg-default border-subtle"
                    }>
                    <div className="flex w-full flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <p className="text-emphasis text-base font-semibold leading-4">{plan.title}</p>
                        <Badge variant="gray" size="md" className="hidden h-4 rounded-md px-1 py-1 md:block">
                          <span className="text-emphasis text-xs font-medium leading-3">{plan.badge}</span>
                        </Badge>
                      </div>
                      <Badge variant="gray" size="md" className="h-4 w-fit rounded-md px-1 py-1 md:hidden">
                        <span className="text-emphasis text-xs font-medium leading-3">{plan.badge}</span>
                      </Badge>
                      <p className="text-subtle max-w-full text-sm font-normal leading-tight">
                        {plan.description}
                      </p>
                    </div>
                  </RadioAreaGroup.Item>
                ))}
              </RadioAreaGroup.Group>

              {/* Footer */}
              <div className="flex w-full items-center justify-end gap-1 px-5 py-4">
                <Button color="primary" className="rounded-[10px]" onClick={handleContinue}>
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
