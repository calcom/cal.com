import type { EventTypeSetupProps, FormValues } from "pages/event-types/[type]";
import { useFormContext } from "react-hook-form";

import type { GetAppData, SetAppData } from "@calcom/app-store/EventTypeAppContext";
import { EventTypeAppCard } from "@calcom/app-store/_components/EventTypeAppCardInterface";
import type { EventTypeAppCardComponentProps } from "@calcom/app-store/types";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, EmptyScreen, Alert } from "@calcom/ui";
import { Grid, Lock } from "@calcom/ui/components/icon";

export type EventType = Pick<EventTypeSetupProps, "eventType">["eventType"] &
  EventTypeAppCardComponentProps["eventType"];

export const EventAppsTab = ({ eventType }: { eventType: EventType }) => {
  const { t } = useLocale();
  const methods = useFormContext<FormValues>();

  // const installedApps = [];
  const allAppsData = methods.watch("metadata")?.apps || {};

  const { data: eventTypeApps, isLoading } = trpc.viewer.appsRouter.getEventTypeApps.useQuery(
    { eventTypeId: eventType.id },
    {
      onSuccess: (data) => {
        console.log("🚀 ~ file: EventAppsTab.tsx:25 ~ EventAppsTab ~ query:", data);
      },
    }
  );

  // const { data: eventTypeApps, isLoading } = trpc.viewer.apps.useQuery({
  //   extendsFeature: "EventType",
  // });
  // console.log("🚀 ~ file: EventAppsTab.tsx:22 ~ EventAppsTab ~ eventTypeApps:", eventTypeApps);
  // const installedApps = eventTypeApps?.filter((app) => app.credentials.length);
  // console.log("🚀 ~ file: EventAppsTab.tsx:38 ~ EventAppsTab ~ installedApps:", installedApps);
  // const notInstalledApps = eventTypeApps?.filter((app) => !app.credentials.length);
  // console.log("🚀 ~ file: EventAppsTab.tsx:40 ~ EventAppsTab ~ notInstalledApps:", notInstalledApps);
  // console.log("🚀 ~ file: EventAppsTab.tsx:27 ~ EventAppsTab ~ allAppsData:", allAppsData);

  // console.log("🚀 ~ file: EventAppsTab.tsx:24 ~ EventAppsTab ~ installedApps:", installedApps);

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
      console.log("🚀 ~ file: EventAppsTab.tsx:50 ~ allAppsDataFromForm:", allAppsDataFromForm);
      const appData = allAppsDataFromForm[appId];
      console.log("🚀 ~ file: EventAppsTab.tsx:52 ~ appData:", appData);
      setAllAppsData({
        ...allAppsDataFromForm,
        [appId]: {
          ...appData,
          [key]: value,
        },
      });
    };
  };

  const { shouldLockDisableProps, isManagedEventType, isChildrenManagedEventType } = useLockedFieldsManager(
    eventType,
    t("locked_fields_admin_description"),
    t("locked_fields_member_description")
  );

  if (isLoading) return <p>Loading</p>;

  return (
    <>
      <div>
        <div className="before:border-0">
          {!eventTypeApps.installedApps?.length && isManagedEventType && (
            <Alert
              severity="neutral"
              className="mb-2"
              title={t("locked_for_members")}
              message={t("locked_apps_description")}
            />
          )}
          {!isLoading && !eventTypeApps.installedApps?.length ? (
            <EmptyScreen
              Icon={Grid}
              headline={t("empty_installed_apps_headline")}
              description={t("empty_installed_apps_description")}
              buttonRaw={
                isChildrenManagedEventType && !isManagedEventType ? (
                  <Button StartIcon={Lock} color="secondary" disabled>
                    {t("locked_by_admin")}
                  </Button>
                ) : (
                  <Button target="_blank" color="secondary" href="/apps">
                    {t("empty_installed_apps_button")}{" "}
                  </Button>
                )
              }
            />
          ) : null}
          {eventTypeApps.installedApps?.map((app) => (
            <EventTypeAppCard
              getAppData={getAppDataGetter(app.slug as EventTypeAppsList)}
              setAppData={getAppDataSetter(app.slug as EventTypeAppsList)}
              key={app.slug}
              app={app}
              eventType={eventType}
            />
          ))}
        </div>
      </div>
      {!shouldLockDisableProps("apps").disabled && (
        <div>
          {!isLoading && eventTypeApps.notInstalledApps?.length ? (
            <h2 className="text-emphasis mt-0 mb-2 text-lg font-semibold">{t("available_apps")}</h2>
          ) : null}
          <div className="before:border-0">
            {eventTypeApps.notInstalledApps?.map((app) => (
              <EventTypeAppCard
                getAppData={getAppDataGetter(app.slug as EventTypeAppsList)}
                setAppData={getAppDataSetter(app.slug as EventTypeAppsList)}
                key={app.slug}
                app={app}
                eventType={eventType}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};
