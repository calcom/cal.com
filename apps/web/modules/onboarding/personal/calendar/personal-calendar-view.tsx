"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";

import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { OnboardingCalendarBrowserView } from "../../components/onboarding-calendar-browser-view";
import { useSubmitPersonalOnboarding } from "../../hooks/useSubmitPersonalOnboarding";
import { InstallableAppCard } from "../_components/InstallableAppCard";
import { useAppInstallation } from "../_components/useAppInstallation";

type PersonalCalendarViewProps = {
  userEmail: string;
};

export const PersonalCalendarView = ({ userEmail }: PersonalCalendarViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const { installingAppSlug, setInstallingAppSlug, createInstallHandlers } = useAppInstallation();
  const { submitPersonalOnboarding, isSubmitting } = useSubmitPersonalOnboarding();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showFadeGradient, setShowFadeGradient] = useState(false);

  const queryIntegrations = trpc.viewer.apps.integrations.useQuery({
    variant: "calendar",
    onlyInstalled: false,
    sortByMostPopular: true,
    sortByInstalledFirst: true,
  });

  const checkOverflow = () => {
    const element = scrollContainerRef.current;
    if (!element) return;

    const hasOverflow = element.scrollHeight > element.clientHeight;
    const isAtBottom = Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop) < 1;

    setShowFadeGradient(hasOverflow && !isAtBottom);
  };

  const handleScroll = () => {
    checkOverflow();
  };

  // Check for overflow when data loads, container size changes, or window resizes
  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return;

    // Use requestAnimationFrame to ensure DOM and container queries are fully calculated
    const checkWithRAF = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          checkOverflow();
        });
      });
    };

    // Check immediately with double RAF for container query calculations
    checkWithRAF();

    // Also check after a delay to catch any late layout calculations
    const timeoutId = setTimeout(checkOverflow, 100);

    // Observe container size changes (handles container query recalculations)
    const resizeObserver = new ResizeObserver(() => {
      checkWithRAF();
    });
    resizeObserver.observe(element);

    // Also listen to window resize as a fallback
    window.addEventListener("resize", checkWithRAF);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", checkWithRAF);
    };
  }, [queryIntegrations.data?.items]);

  const handleContinue = () => {
    submitPersonalOnboarding();
  };

  const handleSkip = () => {
    submitPersonalOnboarding();
  };

  const handleBack = () => {
    router.push("/onboarding/personal/settings");
  };

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={2} totalSteps={2}>
      {/* Left column - Main content */}
      <OnboardingCard
        title={t("connect_your_calendar")}
        subtitle={t("connect_calendar_to_prevent_conflicts")}
        isLoading={queryIntegrations.isPending}
        floatingFooter={true}
        footer={
          <div className="flex w-full items-center justify-between gap-4">
            <Button color="minimal" className="rounded-[10px]" onClick={handleBack} disabled={isSubmitting}>
              {t("back")}
            </Button>
            <div className="flex items-center gap-2">
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
          </div>
        }>
        <div className="relative">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="scroll-bar grid max-h-[95cqh] grid-cols-1 gap-3 overflow-y-scroll sm:grid-cols-2">
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
          {showFadeGradient && (
            <div className="from-default pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t to-transparent md:h-20 xl:h-24" />
          )}
        </div>
      </OnboardingCard>

      {/* Right column - Browser view */}
      <OnboardingCalendarBrowserView />
    </OnboardingLayout>
  );
};
