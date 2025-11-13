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
  const { organizationDetails, resetOnboarding } = useOnboardingStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if there's existing organization data
    const hasExistingData = organizationDetails.name && organizationDetails.link;
    setIsVisible(!!hasExistingData);
  }, [organizationDetails]);

  if (!isVisible) {
    return null;
  }

  const handleContinue = () => {
    // Navigate to the next step in the flow (brand page)
    router.push("/onboarding/organization/brand");
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
          <h3 className="text-emphasis mb-1 text-base font-semibold">{t("onboarding_continue_prompt_title")}</h3>
          <p className="text-subtle text-sm">
            {t("onboarding_continue_prompt_description", { organizationName: organizationDetails.name })}
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
