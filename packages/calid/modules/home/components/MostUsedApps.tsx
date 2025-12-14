"use client";

import { cn } from "@calid/features/lib/cn";
import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import Link from "next/link";
import { useMemo } from "react";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

export const MostUsedApps = () => {
  const { t } = useLocale();
  const appDirNames = {
    "Google Calendar": "googlecalendar",
    "Outlook Calendar": "office365calendar",
    "Google Meet": "googlevideo",
    Razorpay: "razorpay",
    Stripe: "stripepayment",
    Zoom: "zoomvideo",
    "Whatsapp Business": "whatsapp-business",
    "Meta Pixel": "metapixel",
    Zapier: "zapier",
    Make: "make",
    "Hubspot CRM": "hubspot",
  } as const;

  const apps = [
    {
      name: "Google Calendar",
      dirName: appDirNames["Google Calendar"],
    },
    {
      name: "Outlook Calendar",
      dirName: appDirNames["Outlook Calendar"],
    },
    {
      name: "Google Meet",
      dirName: appDirNames["Google Meet"],
    },
    {
      name: "Zoom",
      dirName: appDirNames["Zoom"],
    },
    {
      name: "Razorpay",
      dirName: appDirNames["Razorpay"],
    },
    {
      name: "Stripe",
      dirName: appDirNames["Stripe"],
    },
    {
      name: "Whatsapp Business",
      dirName: appDirNames["Whatsapp Business"],
    },
    {
      name: "Meta Pixel",
      dirName: appDirNames["Meta Pixel"],
    },
    {
      name: "Zapier",
      dirName: appDirNames["Zapier"],
    },
    {
      name: "Make",
      dirName: appDirNames["Make"],
    },
  ];

  const { data: integrationsData } = trpc.viewer.apps.integrations.useQuery({
    includeTeamInstalledApps: true,
    sortByInstalledFirst: true,
  });

  const installedAppSlugs = useMemo(() => {
    const connectedApps = integrationsData?.items ?? [];
    return new Set(
      connectedApps
        .filter((connectedApp) => connectedApp.isInstalled)
        .map((connectedApp) => connectedApp.slug)
    );
  }, [integrationsData?.items]);

  return (
    <div className="border-default bg-default flex h-full w-full flex-col rounded-md border px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-default mb-1 text-lg font-bold">{t("most_used_apps")}</h2>
        <Button
          color="secondary"
          size="sm"
          onClick={() => window.open("/apps", "_blank", "noopener,noreferrer")}>
          {t("view_all_apps")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {apps.map((app) => {
          const appMetadata = appStoreMetadata[app.dirName as keyof typeof appStoreMetadata];
          const logo = appMetadata?.logo || "";
          const appName = appMetadata?.name || app.name;
          const appSlug = appMetadata?.slug || "";
          const isInstalled = !!appSlug && installedAppSlugs.has(appSlug);

          if (!appSlug) return null;

          return (
            <Link
              key={app.dirName}
              href={`/apps/${appSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-default border-default hover:border-primary flex cursor-pointer items-center gap-3 rounded-md border p-4 transition-all duration-200 hover:scale-105 hover:shadow-md">
              {logo && (
                <img
                  src={logo}
                  alt={`${appName} Logo`}
                  className={cn(
                    logo.includes("-dark") && "dark:invert",
                    "h-8 w-8 flex-shrink-0 rounded-sm object-contain"
                  )}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-col justify-between gap-1">
                  <p className="text-default truncate text-sm font-medium">{appName}</p>
                  {isInstalled && (
                    <Badge className="w-fit" size="xs">
                      {t("installed")}
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
