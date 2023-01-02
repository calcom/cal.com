import { EventTypeSetupProps, FormValues } from "pages/event-types/[type]";
import { useFormContext } from "react-hook-form";

import EventTypeAppContext, { GetAppData, SetAppData } from "@calcom/app-store/EventTypeAppContext";
import { EventTypeAddonMap } from "@calcom/app-store/apps.browser.generated";
import { EventTypeAppCardComponentProps } from "@calcom/app-store/types";
import { EventTypeAppsList } from "@calcom/app-store/utils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs, trpc } from "@calcom/trpc/react";
import { Button, EmptyScreen, ErrorBoundary, Icon } from "@calcom/ui";

type EventType = Pick<EventTypeSetupProps, "eventType">["eventType"] &
  EventTypeAppCardComponentProps["eventType"];

function AppCardWrapper({
  app,
  eventType,
  getAppData,
  setAppData,
}: {
  app: RouterOutputs["viewer"]["apps"][number];
  eventType: EventType;
  getAppData: GetAppData;
  setAppData: SetAppData;
}) {
  const dirName = app.slug === "stripe" ? "stripepayment" : app.slug;
  const Component = EventTypeAddonMap[dirName as keyof typeof EventTypeAddonMap];

  if (!Component) {
    throw new Error('No component found for "' + dirName + '"');
  }
  return (
    <ErrorBoundary message={`There is some problem with ${app.name} App`}>
      <EventTypeAppContext.Provider value={[getAppData, setAppData]}>
        <Component key={app.slug} app={app} eventType={eventType} />
      </EventTypeAppContext.Provider>
    </ErrorBoundary>
  );
}

export const EventAppsTab = ({ eventType }: { eventType: EventType }) => {
  const { t } = useLocale();
  const { data: eventTypeApps, isLoading } = trpc.viewer.apps.useQuery({
    extendsFeature: "EventType",
  });
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

  const getAppDataGetter = (appId: EventTypeAppsList): GetAppData => {
    return function (key) {
      const appData = allAppsData[appId as keyof typeof allAppsData] || {};
      if (key) {
        return appData[key as keyof typeof appData];
      }
      return appData;
    };
  };

  const getAppDataSetter = (appId: EventTypeAppsList): SetAppData => {
    return function (key, value) {
      // Always get latest data available in Form because consequent calls to setData would update the Form but not allAppsData(it would update during next render)
      const allAppsDataFromForm = methods.getValues("metadata")?.apps || {};
      const appData = allAppsDataFromForm[appId];
      setAllAppsData({
        ...allAppsDataFromForm,
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
              getAppData={getAppDataGetter(app.slug as EventTypeAppsList)}
              setAppData={getAppDataSetter(app.slug as EventTypeAppsList)}
              key={app.slug}
              app={app}
              eventType={eventType}
            />
          ))}
        </div>
      </div>
      <div>
        {!isLoading && notInstalledApps?.length ? (
          <h2 className="mt-0 mb-2 text-lg font-semibold text-gray-900">Available Apps</h2>
        ) : null}
        <div className="before:border-0">
          {notInstalledApps?.map((app) => (
            <AppCardWrapper
              getAppData={getAppDataGetter(app.slug as EventTypeAppsList)}
              setAppData={getAppDataSetter(app.slug as EventTypeAppsList)}
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
