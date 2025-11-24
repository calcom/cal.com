"use client";

import { cn } from "@calid/features/lib/cn";
import { Button } from "@calid/features/ui/components/button";
import Link from "next/link";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export const MostUsedApps = () => {
  const { t } = useLocale();
  const appDirNames = {
    "Google Calendar": "googlecalendar",
    "Outlook Calendar": "office365calendar",
    "Google Meet": "googlevideo",
    Razorpay: "razorpay",
    Stripe: "stripepayment",
    Zoom: "zoomvideo",
    "Google Analytics": "ga4",
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
      name: "Google Analytics",
      dirName: appDirNames["Google Analytics"],
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
                <p className="text-default truncate text-sm font-medium">{appName}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
