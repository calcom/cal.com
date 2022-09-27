import dynamic from "next/dynamic";
import { EventTypeSetupInfered, FormValues } from "pages/v2/event-types/[type]";
import React, { useEffect, useState } from "react";

import AppCard from "@calcom/app-store/_components/AppCard";
import { EventTypeAddonMap } from "@calcom/app-store/apps.browser.generated";
// import { EventTypeAddonMap } from "@calcom/app-store/apps.browser.generated";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import ErrorBoundary from "@calcom/ui/ErrorBoundary";
import { Button, EmptyScreen } from "@calcom/ui/v2";

type EventType = Pick<EventTypeSetupInfered, "eventType">["eventType"];

function AppCardFactory({ app }: { app: inferQueryOutput<"viewer.apps">[number] }) {
  return function AppCardDefault() {
    const APP_DIR = "packages/app-store/";
    return (
      <AppCard
        description={
          <span>
            You can configure this AppCard by creating a file{" "}
            <span className="font-semibold italic">
              {APP_DIR + app.slug + "/extensions/EventTypeAppCard.tsx"}
            </span>
            . See{" "}
            <span className="font-semibold italic">{APP_DIR + "giphy/extensions/EventTypeAppCard.tsx"}</span>{" "}
            for an example
          </span>
        }
        app={app}
      />
    );
  };
}

function AppCardWrapper({
  app,
  eventType,
}: {
  app: inferQueryOutput<"viewer.apps">[number];
  eventType: EventType;
}) {
  const Component = EventTypeAddonMap[app.slug as keyof typeof EventTypeAddonMap];
  if (!Component) {
    return null;
  }
  return (
    <ErrorBoundary>
      <Component key={app.slug} app={app} eventType={eventType} />
    </ErrorBoundary>
  );
}

export const EventAppsTab = ({ eventType }: { eventType: EventType }) => {
  const { t } = useLocale();
  const { data: eventTypeApps, isLoading } = trpc.useQuery([
    "viewer.apps",
    {
      extendsFeature: "EventType",
    },
  ]);

  const installedApps = eventTypeApps?.filter((app) => app.credentials.length);
  const notInstalledApps = eventTypeApps?.filter((app) => !app.credentials.length);

  return (
    <>
      <div>
        <div className="before:border-0">
          {!isLoading && !installedApps?.length ? (
            <EmptyScreen
              Icon={Icon.FiGrid}
              headline={t("empty_installed_apps_headline")}
              description={t("empty_installed_apps_description")}
              buttonRaw={
                <Button target="_blank" color="secondary" href="/apps">
                  {t("empty_installed_apps_button")}{" "}
                </Button>
              }
            />
          ) : null}
          {installedApps?.map((app) => (
            <AppCardWrapper key={app.slug} app={app} eventType={eventType} />
          ))}
        </div>
      </div>
      <div>
        {!isLoading && notInstalledApps?.length ? (
          <h2 className="mt-0 mb-2 text-lg font-semibold text-gray-900">Other Apps</h2>
        ) : null}
        <div className="before:border-0">
          {notInstalledApps?.map((app) => (
            <AppCardWrapper key={app.slug} app={app} eventType={eventType} />
          ))}
        </div>
      </div>
    </>
  );
};
