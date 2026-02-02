"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

import { useOnboardingStore } from "../store/onboarding-store";

export const OnboardingContinuationPrompt = () => {
  const router = useRouter();
  const { t } = useLocale();
  const { selectedPlan, organizationDetails, teamDetails, resetOnboarding } = useOnboardingStore();
  const [isVisible, setIsVisible] = useState(false);
  const [entityName, setEntityName] = useState<string>("");
  const [entityType, setEntityType] = useState<"organization" | "team" | null>(null);

  useEffect(() => {
    // Check for organization plan and data
    const hasOrganizationPlan = selectedPlan === "organization";
    const hasOrganizationData = organizationDetails.name?.trim() && organizationDetails.link?.trim();

    // Check for team plan and data
    const hasTeamPlan = selectedPlan === "team";
    const hasTeamData = teamDetails.name?.trim() && teamDetails.slug?.trim();

    // Show if either organization or team has data
    if (hasOrganizationPlan && hasOrganizationData) {
      setIsVisible(true);
      setEntityName(organizationDetails.name);
      setEntityType("organization");
    } else if (hasTeamPlan && hasTeamData) {
      setIsVisible(true);
      setEntityName(teamDetails.name);
      setEntityType("team");
    } else {
      setIsVisible(false);
      setEntityName("");
      setEntityType(null);
    }
  }, [selectedPlan, organizationDetails, teamDetails]);

  if (!isVisible || !entityName || !entityType) {
    return null;
  }

  const handleContinue = () => {
    // Navigate to the next step based on plan type
    if (entityType === "organization") {
      // Organization flow: details -> brand -> teams -> invite
      router.push("/onboarding/organization/brand");
    } else if (entityType === "team") {
      // Team flow: details -> invite
      router.push("/onboarding/teams/invite");
    }
  };

  const handleStartOver = () => {
    resetOnboarding();
    setIsVisible(false);
  };

  return (
    <div className="animate-fade-in fixed bottom-4 right-4 z-50">
      <div className="bg-default border-muted shadow-default relative w-[360px] rounded-lg border p-4">
        <button
          onClick={() => setIsVisible(false)}
          className="text-muted hover:text-emphasis absolute right-2 top-2 rounded-md p-1 transition-colors">
          <Icon name="x" className="h-4 w-4" />
        </button>

        <div className="mb-3 pr-6">
          <h3 className="text-emphasis mb-1 text-base font-semibold">
            {t("onboarding_continue_prompt_title")}
          </h3>
          <p className="text-subtle text-sm">
            {t("onboarding_continue_prompt_description", { entityName: entityName })}
          </p>
        </div>

        <div className="ml-auto flex gap-2">
          <Button onClick={handleStartOver} color="secondary">
            {t("onboarding_start_over")}
          </Button>
          <Button onClick={handleContinue} color="primary">
            {t("continue")}
          </Button>
        </div>
      </div>
    </div>
  );
};
