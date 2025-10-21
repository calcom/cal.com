"use client";

import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Logo } from "@calcom/ui/components/logo";
import { SkeletonText } from "@calcom/ui/components/skeleton";

type PersonalCalendarViewProps = {
  userEmail: string;
};

export const PersonalCalendarView = ({ userEmail }: PersonalCalendarViewProps) => {
  const router = useRouter();
  const { t } = useLocale();

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
    <div className="bg-default flex min-h-screen w-full flex-col items-start overflow-clip rounded-xl">
      {/* Header */}
      <div className="flex w-full items-center justify-between px-6 py-4">
        <Logo className="h-5 w-auto" />

        {/* Progress dots - centered */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-1">
          <div className="bg-emphasis h-1 w-1 rounded-full" />
          <div className="bg-emphasis h-1 w-1 rounded-full" />
          <div className="bg-emphasis h-1.5 w-1.5 rounded-full" />
          <div className="bg-subtle h-1 w-1 rounded-full" />
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
                  <h1 className="font-cal text-xl font-semibold leading-6">{t("connect_your_calendar")}</h1>
                  <p className="text-subtle text-sm font-medium leading-tight">
                    {t("connect_calendar_to_prevent_conflicts")}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="flex w-full flex-col gap-4 px-5 py-5">
                {queryIntegrations.isPending ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SkeletonText className="h-40 w-full" />
                    <SkeletonText className="h-40 w-full" />
                  </div>
                ) : (
                  <div className="scroll-bar grid max-h-[45vh] grid-cols-1 gap-3 overflow-y-scroll sm:grid-cols-2">
                    {queryIntegrations.data?.items.map((app) => (
                      <div
                        key={app.slug}
                        className="border-subtle bg-default flex flex-col items-start gap-4 rounded-xl border p-5">
                        {app.logo && <img src={app.logo} alt={app.name} className="h-9 w-9 rounded-md" />}
                        <p
                          className="text-default line-clamp-1 max-w- break-words text-left text-sm font-medium leading-none"
                          title={app.name}>
                          {app.name}
                        </p>
                        <p className="text-subtle line-clamp-2 text-left text-xs leading-tight">
                          {app.description}
                        </p>
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
                <Button color="primary" className="rounded-[10px]" onClick={handleContinue}>
                  {t("continue")}
                </Button>
              </div>
            </div>
          </div>

          {/* Skip button */}
          <div className="flex w-full justify-center">
            <button
              onClick={handleSkip}
              className="text-subtle hover:bg-subtle rounded-[10px] px-2 py-1.5 text-sm font-medium leading-4">
              {t("ill_do_this_later")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
