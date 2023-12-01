import { Trans } from "next-i18next";
import Link from "next/link";
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
  const { data: eventTypeApps, isLoading } = trpc.viewer.integrations.useQuery({
    extendsFeature: "EventType",
    teamId: eventType.team?.id || eventType.parent?.teamId,
  });

  const methods = useFormContext<FormValues>();
  const installedApps =
    eventTypeApps?.items.filter((app) => app.userCredentialIds.length || app.teams.length) || [];
  const notInstalledApps =
    eventTypeApps?.items.filter((app) => !app.userCredentialIds.length && !app.teams.length) || [];
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

  const getAppDataSetter = (appId: EventTypeAppsList, credentialId?: number): SetAppData => {
    return function (key, value) {
      // Always get latest data available in Form because consequent calls to setData would update the Form but not allAppsData(it would update during next render)
      const allAppsDataFromForm = methods.getValues("metadata")?.apps || {};
      const appData = allAppsDataFromForm[appId];
      setAllAppsData({
        ...allAppsDataFromForm,
        [appId]: {
          ...appData,
          [key]: value,
          credentialId,
        },
      });
    };
  };

  const { shouldLockDisableProps, isManagedEventType, isChildrenManagedEventType } = useLockedFieldsManager(
    eventType,
    t("locked_fields_admin_description"),
    t("locked_fields_member_description")
  );

  const appsWithTeamCredentials = eventTypeApps?.items.filter((app) => app.teams.length) || [];
  const cardsForAppsWithTeams = appsWithTeamCredentials.map((app) => {
    const appCards = [];

    if (app.userCredentialIds.length) {
      appCards.push(
        <EventTypeAppCard
          getAppData={getAppDataGetter(app.slug as EventTypeAppsList)}
          setAppData={getAppDataSetter(app.slug as EventTypeAppsList, app.userCredentialIds[0])}
          key={app.slug}
          app={app}
          eventType={eventType}
          {...shouldLockDisableProps("apps")}
        />
      );
    }

    for (const team of app.teams) {
      if (team) {
        appCards.push(
          <EventTypeAppCard
            getAppData={getAppDataGetter(app.slug as EventTypeAppsList)}
            setAppData={getAppDataSetter(app.slug as EventTypeAppsList, team.credentialId)}
            key={app.slug + team?.credentialId}
            app={{
              ...app,
              // credentialIds: team?.credentialId ? [team.credentialId] : [],
              credentialOwner: {
                name: team.name,
                avatar: team.logo,
                teamId: team.teamId,
                credentialId: team.credentialId,
              },
            }}
            eventType={eventType}
            {...shouldLockDisableProps("apps")}
          />
        );
      }
    }
    return appCards;
  });

  return (
    <>
      <div>
        <div className="before:border-0">
          {isManagedEventType && (
            <Alert
              severity="neutral"
              className="mb-2"
              title={t("locked_for_members")}
              message={t("locked_apps_description")}
            />
          )}
          {!isLoading && !installedApps?.length ? (
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
          {cardsForAppsWithTeams.map((apps) => apps.map((cards) => cards))}
          {installedApps.map((app) => {
            if (!app.teams.length)
              return (
                <EventTypeAppCard
                  getAppData={getAppDataGetter(app.slug as EventTypeAppsList)}
                  setAppData={getAppDataSetter(app.slug as EventTypeAppsList, app.userCredentialIds[0])}
                  key={app.slug}
                  app={app}
                  eventType={eventType}
                  {...shouldLockDisableProps("apps")}
                />
              );
          })}
        </div>
      </div>
      {!shouldLockDisableProps("apps").disabled && (
        <div className="bg-muted mt-6 rounded-md p-8">
          {!isLoading && notInstalledApps?.length ? (
            <>
              <h2 className="text-emphasis mb-2 text-xl font-semibold leading-5 tracking-[0.01em]">
                {t("available_apps_lower_case")}
              </h2>
              <p className="text-default mb-6 text-sm font-normal">
                <Trans i18nKey="available_apps_desc">
                  View popular apps below and explore more in our &nbsp;
                  <Link className="cursor-pointer underline" href="/apps">
                    App Store
                  </Link>
                </Trans>
              </p>
            </>
          ) : null}
          <div className="bg-default border-subtle divide-subtle divide-y rounded-md border before:border-0">
            {notInstalledApps?.map((app) => (
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
