"use client";

import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTelemetry } from "@calcom/lib/hooks/useTelemetry";
import { telemetryEventTypes } from "@calcom/lib/telemetry";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Logo } from "@calcom/ui/components/logo";
import { SkeletonText } from "@calcom/ui/components/skeleton";

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

  const { data: queryConnectedVideoApps, isPending } = trpc.viewer.apps.integrations.useQuery({
    variant: "conferencing",
    onlyInstalled: false,
    sortByMostPopular: true,
    sortByInstalledFirst: true,
  });

  const { data: eventTypes } = trpc.viewer.eventTypes.list.useQuery();
  const createEventType = trpc.viewer.eventTypes.heavy.create.useMutation();

  const utils = trpc.useUtils();
  const mutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async () => {
      try {
        // Create default event types if user has none
        if (eventTypes?.length === 0) {
          await Promise.all(
            DEFAULT_EVENT_TYPES.map(async (event) => {
              return createEventType.mutate({
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

    // Complete onboarding
    mutation.mutate({
      completedOnboarding: true,
    });
  };

  const handleSkip = async () => {
    telemetry.event(telemetryEventTypes.onboardingFinished);

    // Complete onboarding
    mutation.mutate({
      completedOnboarding: true,
    });
  };

  if (!user) {
    return null; // or a loading spinner
  }

  return (
    <div className="bg-default flex min-h-screen w-full flex-col items-start overflow-clip rounded-xl">
      {/* Header */}
      <div className="flex w-full items-center justify-between px-6 py-4">
        <Logo className="h-5 w-auto" />

        {/* Progress dots - centered */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-1">
          <div className="bg-emphasis h-1 w-1 rounded-full" />
          <div className="bg-emphasis h-1 w-1 rounded-full" />
          <div className="bg-emphasis h-1 w-1 rounded-full" />
          <div className="bg-emphasis h-1.5 w-1.5 rounded-full" />
        </div>

        <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-2">
          <p className="text-emphasis text-sm font-medium leading-none">{userEmail}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex h-full w-full items-start justify-center px-6 py-8">
        <div className="flex w-full max-w-[600px] flex-col gap-4">
          {/* Card */}
          <div className="bg-muted border-muted relative rounded-xl border p-1">
            <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
              {/* Card Header */}
              <div className="flex w-full gap-1.5 px-5 py-4">
                <div className="flex w-full flex-col gap-1">
                  <h1 className="font-cal text-xl font-semibold leading-6">{t("connect_video_app")}</h1>
                  <p className="text-subtle text-sm font-medium leading-tight">
                    {t("video_app_connection_subtitle")}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="flex w-full flex-col gap-4 px-5 py-5">
                {isPending ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SkeletonText className="h-40 w-full" />
                    <SkeletonText className="h-40 w-full" />
                  </div>
                ) : (
                  <div className="scroll-bar grid max-h-[45vh] grid-cols-1 gap-3 overflow-y-scroll sm:grid-cols-2">
                    {queryConnectedVideoApps?.items
                      .filter((app) => app.slug !== "daily-video")
                      .map((app) => (
                        <div
                          key={app.slug}
                          className="border-subtle bg-default relative flex flex-col items-start gap-4 rounded-xl border p-5">
                          {app.userCredentialIds.length > 0 && (
                            <span className="bg-success text-success absolute right-2 top-2 rounded-md px-2 py-1 text-xs font-medium">
                              {t("connected")}
                            </span>
                          )}
                          {app.logo && (
                            <img src={app.logo} alt={app.name} className="h-9 w-9 rounded-md" />
                          )}
                          <p
                            className="text-default line-clamp-1 max-w- break-words text-left text-sm font-medium leading-none"
                            title={app.name}>
                            {app.name}
                          </p>
                          <p className="text-subtle line-clamp-2 text-left text-xs leading-tight">{app.description}</p>
                          <Button
                            color="secondary"
                            href={`/apps/${app.slug}`}
                            className="mt-auto w-full items-center justify-center rounded-[10px]">
                            {t("connect")}
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex w-full items-center justify-end gap-1 px-5 py-4">
                <Button
                  color="primary"
                  className="rounded-[10px]"
                  onClick={handleContinue}
                  loading={mutation.isPending}
                  disabled={mutation.isPending}>
                  {t("finish_and_start")}
                </Button>
              </div>
            </div>
          </div>

          {/* Skip button */}
          <div className="flex w-full justify-center">
            <button
              onClick={handleSkip}
              disabled={mutation.isPending}
              className="text-subtle hover:bg-subtle rounded-[10px] px-2 py-1.5 text-sm font-medium leading-4 disabled:opacity-50">
              {t("ill_do_this_later")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
