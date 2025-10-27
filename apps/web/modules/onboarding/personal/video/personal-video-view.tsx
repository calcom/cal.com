"use client";

import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTelemetry } from "@calcom/lib/hooks/useTelemetry";
import { telemetryEventTypes } from "@calcom/lib/telemetry";
import { userMetadata } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";

import { InstallableAppCard } from "../_components/InstallableAppCard";
import { OnboardingCard } from "../_components/OnboardingCard";
import { OnboardingLayout } from "../_components/OnboardingLayout";
import { SkipButton } from "../_components/SkipButton";
import { useAppInstallation } from "../_components/useAppInstallation";

type PersonalVideoViewProps = {
  userEmail: string;
};

const DEFAULT_EVENT_TYPES = [
  {
    title: "15min_meeting",
    slug: "15min",
    length: 15,
  },
  {
    title: "30min_meeting",
    slug: "30min",
    length: 30,
  },
  {
    title: "secret_meeting",
    slug: "secret",
    length: 15,
    hidden: true,
  },
];

export const PersonalVideoView = ({ userEmail }: PersonalVideoViewProps) => {
  const { data: user } = trpc.viewer.me.get.useQuery();
  const router = useRouter();
  const { t } = useLocale();
  const telemetry = useTelemetry();
  const utils = trpc.useUtils();
  const { installingAppSlug, setInstallingAppSlug, createInstallHandlers } = useAppInstallation();

  const { data: queryConnectedVideoApps, isPending } = trpc.viewer.apps.integrations.useQuery({
    variant: "conferencing",
    onlyInstalled: false,
    sortByMostPopular: true,
    sortByInstalledFirst: true,
  });

  const setDefaultConferencingApp = trpc.viewer.apps.setDefaultConferencingApp.useMutation({
    onSuccess: async () => {
      await utils.viewer.me.invalidate();
    },
    onError: (error) => {
      showToast(t("something_went_wrong"), "error");
      console.error(error);
    },
  });

  const { data: eventTypes } = trpc.viewer.eventTypes.list.useQuery();
  const createEventType = trpc.viewer.eventTypesHeavy.create.useMutation();

  const mutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async () => {
      try {
        // Create default event types if user has none
        if (eventTypes?.length === 0) {
          await Promise.all(
            DEFAULT_EVENT_TYPES.map(async (event) => {
              return createEventType.mutateAsync({
                title: t(event.title),
                slug: event.slug,
                length: event.length,
                hidden: event.hidden,
              });
            })
          );
        }
      } catch (error) {
        console.error(error);
      }

      await utils.viewer.me.get.refetch();
      router.push("/event-types");
    },
  });

  const handleContinue = async () => {
    telemetry.event(telemetryEventTypes.onboardingFinished);
    mutation.mutate({
      completedOnboarding: true,
    });
  };

  const handleSkip = async () => {
    telemetry.event(telemetryEventTypes.onboardingFinished);
    mutation.mutate({
      completedOnboarding: true,
    });
  };

  if (!user) {
    return null;
  }

  // Check if user has a default conferencing app
  const result = userMetadata.safeParse(user.metadata);
  const metadata = result?.success ? result.data : null;
  const hasDefaultConferencingApp = !!metadata?.defaultConferencingApp?.appSlug;

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={4}>
      <OnboardingCard
        title={t("connect_video_app")}
        subtitle={t("video_app_connection_subtitle")}
        isLoading={isPending}
        footer={
          <Button
            color="primary"
            className="rounded-[10px]"
            onClick={handleContinue}
            loading={mutation.isPending}
            disabled={mutation.isPending}>
            {t("finish_and_start")}
          </Button>
        }>
        <div className="scroll-bar grid max-h-[45vh] grid-cols-1 gap-3 overflow-y-scroll sm:grid-cols-2">
          {queryConnectedVideoApps?.items
            .filter((app) => app.slug !== "daily-video")
            .map((app) => {
              const shouldAutoSetDefault =
                !hasDefaultConferencingApp && app.appData?.location?.linkType === "dynamic";

              return (
                <InstallableAppCard
                  key={app.slug}
                  app={app}
                  isInstalling={installingAppSlug === app.slug}
                  onInstallClick={setInstallingAppSlug}
                  installOptions={createInstallHandlers(app.slug, (appSlug) => {
                    // Auto-set as default if it's the first connected video app
                    if (shouldAutoSetDefault) {
                      setDefaultConferencingApp.mutate({ slug: appSlug });
                    }
                  })}
                />
              );
            })}
        </div>
      </OnboardingCard>

      <SkipButton onClick={handleSkip} disabled={mutation.isPending} />
    </OnboardingLayout>
  );
};
