import dynamic from "next/dynamic";
import { EventTypeSetupInfered, FormValues } from "pages/v2/event-types/[type]";
import React, { useEffect, useState } from "react";

import AppCard from "@calcom/app-store/_components/AppCard";
// import { EventTypeAddonMap } from "@calcom/app-store/apps.browser.generated";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import ErrorBoundary from "@calcom/ui/ErrorBoundary";
import { Button, EmptyScreen } from "@calcom/ui/v2";

type EventType = Pick<EventTypeSetupInfered, "eventType">["eventType"];

function AppCardFactory({ app }: { app: inferQueryOutput<"viewer.apps">[number] }) {
  return function AppCardDefault() {
    return <AppCard app={app} />;
  };
}

function AppCardWrapper({
  app,
  eventType,
}: {
  app: inferQueryOutput<"viewer.apps">[number];
  eventType: EventType;
}) {
  // TODO: dirName isn't directly available in app(it requires a get from DB which doesn't happen currently).
  // All new apps being created would have slug equal to dirName. So, stripe is only exception, which we can handle here.
  const dirName = app.slug === "stripe" ? "stripepayment" : app.slug;
  const [Component, setComponent] =
    useState<React.ComponentType<{ eventType: EventType; app: inferQueryOutput<"viewer.apps">[number] }>>();
  useEffect(() => {
    (async function () {
      try {
        await import(`@calcom/app-store/${dirName}/extensions/EventTypeAppCard`);
        setComponent(dynamic(() => import(`@calcom/app-store/${dirName}/extensions/EventTypeAppCard`)));
      } catch (e) {
        setComponent(() => {
          return AppCardFactory({ app });
        });
      }
    })();
  }, [app, dirName]);
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
  const numberOfInstalledEventTypeApps = installedApps?.length ?? 0;

  return (
    <>
      <div>
        <h2 className="mt-0 mb-2 text-lg font-semibold text-gray-900">Installed Apps</h2>
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
        <h2 className="mt-0 mb-2 text-lg font-semibold text-gray-900">Available Apps</h2>
        <div className="before:border-0">
          {!isLoading && !notInstalledApps?.length ? (
            <div className="before:border-0">
              <EmptyScreen
                Icon={Icon.FiGrid}
                headline={t("Hurray !! All Event Type apps are installed")}
                description={t("Go and explore the app store to install other apps")}
                buttonRaw={
                  <Button target="_blank" color="secondary" href="/apps">
                    {t("empty_installed_apps_button")}{" "}
                  </Button>
                }
              />
            </div>
          ) : null}
          {notInstalledApps?.map((app) => (
            <AppCardWrapper key={app.slug} app={app} eventType={eventType} />
          ))}
        </div>
      </div>
    </>
  );
};
