"use client";

import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";

import { InstallableAppCard } from "../_components/InstallableAppCard";
import { OnboardingCard } from "../_components/OnboardingCard";
import { OnboardingLayout } from "../_components/OnboardingLayout";
import { SkipButton } from "../_components/SkipButton";
import { useAppInstallation } from "../_components/useAppInstallation";

type PersonalCalendarViewProps = {
  userEmail: string;
};

export const PersonalCalendarView = ({ userEmail }: PersonalCalendarViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const { installingAppSlug, setInstallingAppSlug, createInstallHandlers } = useAppInstallation();

  const queryIntegrations = trpc.viewer.apps.integrations.useQuery({
    variant: "calendar",
    onlyInstalled: false,
    sortByMostPopular: true,
    sortByInstalledFirst: true,
  });

  const handleContinue = () => {
    router.push("/onboarding/personal/video");
  };

  const handleSkip = () => {
    router.push("/onboarding/personal/video");
  };

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={3}>
      <OnboardingCard
        title={t("connect_your_calendar")}
        subtitle={t("connect_calendar_to_prevent_conflicts")}
        isLoading={queryIntegrations.isPending}
        footer={
          <Button color="primary" className="rounded-[10px]" onClick={handleContinue}>
            {t("continue")}
          </Button>
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

      <SkipButton onClick={handleSkip} />
    </OnboardingLayout>
  );
};
