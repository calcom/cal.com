import { EventTypeSetupInfered, FormValues } from "pages/v2/event-types/[type]";
import React, { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { z } from "zod";

import { EventTypeAddonMap } from "@calcom/app-store/apps.browser.generated";
// import { EventTypeAddonMap } from "@calcom/app-store/apps.browser.generated";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { _EventTypeModel } from "@calcom/prisma/zod";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import ErrorBoundary from "@calcom/ui/ErrorBoundary";
import { Button, EmptyScreen } from "@calcom/ui/v2";

type EventType = Pick<EventTypeSetupInfered, "eventType">["eventType"];
type GetAppData = (key: string) => any;
type SetAppData = (key: string, value: any) => void;
type EventTypeApps = keyof NonNullable<NonNullable<z.infer<typeof _EventTypeModel>["metadata"]>["apps"]>;
export const eventTypeAppContext = React.createContext<[GetAppData, SetAppData]>([() => ({}), () => {}]);

export const getEventTypeAppData = (
  eventType: Pick<z.infer<typeof _EventTypeModel>, "price" | "currency" | "metadata">,
  appId: EventTypeApps
) => {
  const metadata = eventType.metadata;
  if (!metadata) {
    return {};
  }
  let appMetadata = metadata.apps && metadata.apps[appId];
  if (appMetadata) {
    return appMetadata;
  }

  // Backward compatibility for existing event types.
  // TODO: Write code here to migrate metadata to new format and delete this backwards compatibility once we there is no hit for it.

  if (appId === "stripe") {
    appMetadata = {
      price: eventType.price,
      currency: eventType.currency,
    };
  } else if (appId === "rainbow") {
    appMetadata = {
      smartContractAddress: eventType.metadata?.smartContractAddress,
      blockchainId: eventType.metadata?.blockchainId,
    };
  } else if (appId === "giphy") {
    appMetadata = {
      thankYouPage: eventType.metadata?.giphyThankYouPage,
    };
  }
  return appMetadata;
};

function AppCardWrapper({
  app,
  eventType,
  getAppData,
  setAppData,
}: {
  app: inferQueryOutput<"viewer.apps">[number];
  eventType: EventType;
  getAppData: GetAppData;
  setAppData: SetAppData;
}) {
  // Handle special case for stripe. All new apps creates using CLI should have slug equal to dirName.
  const dirName = app.slug === "stripe" ? "stripepayment" : app.slug;
  const Component = EventTypeAddonMap[dirName as keyof typeof EventTypeAddonMap];

  if (!Component) {
    throw new Error('No component found for "' + dirName + '"');
  }
  return (
    <ErrorBoundary>
      <eventTypeAppContext.Provider value={[getAppData, setAppData]}>
        <Component key={app.slug} app={app} eventType={eventType} />
      </eventTypeAppContext.Provider>
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
  const methods = useFormContext<FormValues>();
  const installedApps = eventTypeApps?.filter((app) => app.credentials.length);
  const notInstalledApps = eventTypeApps?.filter((app) => !app.credentials.length);
  const allAppsData = methods.watch("metadata")?.apps || {};

  const setAllAppsData = (_allAppsData: typeof allAppsData) => {
    methods.setValue("metadata", {
      ...methods.getValues("metadata"),
      apps: _allAppsData,
    });
  };

  const getAppDataGetter = (appId: EventTypeApps): GetAppData => {
    return function (key) {
      const appData = allAppsData[appId];
      if (key) {
        return appData[key];
      }
      return appData;
    };
  };

  const getAppDataSetter = (appId: EventTypeApps): SetAppData => {
    return function (key, value) {
      const appData = allAppsData[appId];
      setAllAppsData({
        ...allAppsData,
        [appId]: {
          ...appData,
          [key]: value,
        },
      });
    };
  };

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
            <AppCardWrapper
              getAppData={getAppDataGetter(app.slug as EventTypeApps)}
              setAppData={getAppDataSetter(app.slug as EventTypeApps)}
              key={app.slug}
              app={app}
              eventType={eventType}
            />
          ))}
        </div>
      </div>
      <div>
        {!isLoading && notInstalledApps?.length ? (
          <h2 className="mt-0 mb-2 text-lg font-semibold text-gray-900">Other Apps</h2>
        ) : null}
        <div className="before:border-0">
          {notInstalledApps?.map((app) => (
            <AppCardWrapper
              getAppData={getAppDataGetter(app.slug as EventTypeApps)}
              setAppData={getAppDataSetter(app.slug as EventTypeApps)}
              key={app.slug}
              app={app}
              eventType={eventType}
            />
          ))}
        </div>
      </div>
    </>
  );
};
