"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";

import { OnboardingCalendarBrowserView } from "../../components/onboarding-calendar-browser-view";
import { useSubmitPersonalOnboarding } from "../../hooks/useSubmitPersonalOnboarding";
import { InstallableAppCard } from "../_components/InstallableAppCard";
import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { useAppInstallation } from "../_components/useAppInstallation";

type PersonalCalendarViewProps = {
  userEmail: string;
};

export const PersonalCalendarView = ({ userEmail }: PersonalCalendarViewProps) => {
  const { t } = useLocale();
  const { installingAppSlug, setInstallingAppSlug, createInstallHandlers } = useAppInstallation();
  const { submitPersonalOnboarding, isSubmitting } = useSubmitPersonalOnboarding();

  const queryIntegrations = trpc.viewer.apps.integrations.useQuery({
    variant: "calendar",
    onlyInstalled: false,
    sortByMostPopular: true,
    sortByInstalledFirst: true,
  });

  const handleContinue = () => {
    submitPersonalOnboarding();
  };

  const handleSkip = () => {
    submitPersonalOnboarding();
  };

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={2}>
      {/* Left column - Main content */}
      <OnboardingCard
        title={t("connect_your_calendar")}
        subtitle={t("connect_calendar_to_prevent_conflicts")}
        isLoading={queryIntegrations.isPending}
        footer={
          <div className="flex w-full items-center justify-end gap-4">
            <Button
              color="minimal"
              className="rounded-[10px]"
              onClick={handleSkip}
              disabled={queryIntegrations.isPending || isSubmitting}>
              {t("onboarding_skip_for_now")}
            </Button>
            <Button
              color="primary"
              className="rounded-[10px]"
              onClick={handleContinue}
              loading={isSubmitting}
              disabled={queryIntegrations.isPending || isSubmitting}>
              {t("continue")}
            </Button>
          </div>
        }>
        <div className="scroll-bar grid max-h-[45vh] grid-cols-1 gap-3 overflow-y-scroll sm:grid-cols-2">
          {queryIntegrations.data?.items?.map((app) => (
            <InstallableAppCard
              key={app.slug}
              app={app}
              isInstalling={installingAppSlug === app.slug}
              onInstallClick={setInstallingAppSlug}
              installOptions={createInstallHandlers(app.slug)}
            />
          ))}
        </div>
      </OnboardingCard>

      {/* Right column - Browser view */}
      <OnboardingCalendarBrowserView />
    </OnboardingLayout>
  );
};
