import { Trans } from "next-i18next";
import Link from "next/link";
import type { EventTypeSetupProps } from "pages/event-types/[type]";
import { useFormContext } from "react-hook-form";

import type { GetAppData, SetAppData } from "@calcom/app-store/EventTypeAppContext";
import { EventTypeAppCard } from "@calcom/app-store/_components/EventTypeAppCardInterface";
import type { EventTypeAppCardComponentProps } from "@calcom/app-store/types";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, Button, EmptyScreen } from "@calcom/ui";

export type EventType = Pick<EventTypeSetupProps, "eventType">["eventType"] &
  EventTypeAppCardComponentProps["eventType"];

export const EventAppsTab = ({ eventType }: { eventType: EventType }) => {
  const { t } = useLocale();
  const { data: eventTypeApps, isPending } = trpc.viewer.integrations.useQuery({
    extendsFeature: "EventType",
    teamId: eventType.team?.id || eventType.parent?.teamId,
  });

  const formMethods = useFormContext<FormValues>();
  const installedApps =
    eventTypeApps?.items.filter((app) => app.userCredentialIds.length || app.teams.length) || [];
  const notInstalledApps =
    eventTypeApps?.items.filter((app) => !app.userCredentialIds.length && !app.teams.length) || [];
  const allAppsData = formMethods.watch("metadata")?.apps || {};

  const setAllAppsData = (_allAppsData: typeof allAppsData) => {
    formMethods.setValue(
      "metadata",
      {
        ...formMethods.getValues("metadata"),
        apps: _allAppsData,
      },
      { shouldDirty: true }
    );
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

  const eventTypeFormMetadata = formMethods.getValues("metadata");

  const getAppDataSetter = (
    appId: EventTypeAppsList,
    appCategories: string[],
    credentialId?: number
  ): SetAppData => {
    return function (key, value) {
      // Always get latest data available in Form because consequent calls to setData would update the Form but not allAppsData(it would update during next render)
      const allAppsDataFromForm = formMethods.getValues("metadata")?.apps || {};
      const appData = allAppsDataFromForm[appId];
      setAllAppsData({
        ...allAppsDataFromForm,
        [appId]: {
          ...appData,
          [key]: value,
          credentialId,
          appCategories,
        },
      });
    };
  };

  const { shouldLockDisableProps, isManagedEventType, isChildrenManagedEventType } = useLockedFieldsManager({
    eventType,
    translate: t,
    formMethods,
  });
  const appsDisableProps = shouldLockDisableProps("apps", { simple: true });
  const lockedText = appsDisableProps.isLocked ? "locked" : "unlocked";

  const appsWithTeamCredentials = eventTypeApps?.items.filter((app) => app.teams.length) || [];
  const cardsForAppsWithTeams = appsWithTeamCredentials.map((app) => {
    const appCards = [];

    if (app.userCredentialIds.length) {
      appCards.push(
        <EventTypeAppCard
          getAppData={getAppDataGetter(app.slug as EventTypeAppsList)}
          setAppData={getAppDataSetter(
            app.slug as EventTypeAppsList,
            app.categories,
            app.userCredentialIds[0]
          )}
          key={app.slug}
          app={app}
          eventType={eventType}
          eventTypeFormMetadata={eventTypeFormMetadata}
        />
      );
    }

    for (const team of app.teams) {
      if (team) {
        appCards.push(
          <EventTypeAppCard
            getAppData={getAppDataGetter(app.slug as EventTypeAppsList)}
            setAppData={getAppDataSetter(app.slug as EventTypeAppsList, app.categories, team.credentialId)}
            key={app.slug + team?.credentialId}
            app={{
              ...app,
              // credentialIds: team?.credentialId ? [team.credentialId] : [],
              credentialOwner: {
                name: team.name,
                avatar: team.logoUrl,
                teamId: team.teamId,
                credentialId: team.credentialId,
              },
            }}
            eventType={eventType}
            eventTypeFormMetadata={eventTypeFormMetadata}
            disabled={shouldLockDisableProps("apps").disabled}
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
          {(isManagedEventType || isChildrenManagedEventType) && (
            <Alert
              severity={appsDisableProps.isLocked ? "neutral" : "green"}
              className="mb-2"
              title={
                <Trans i18nKey={`${lockedText}_${isManagedEventType ? "for_members" : "by_team_admins"}`}>
                  {lockedText[0].toUpperCase()}
                  {lockedText.slice(1)} {isManagedEventType ? "for members" : "by team admins"}
                </Trans>
              }
              actions={<div className="flex h-full items-center">{appsDisableProps.LockedIcon}</div>}
              message={
                <Trans
                  i18nKey={`apps_${lockedText}_${
                    isManagedEventType ? "for_members" : "by_team_admins"
                  }_description`}>
                  {isManagedEventType ? "Members" : "You"}{" "}
                  {appsDisableProps.isLocked
                    ? "will be able to see the active apps but will not be able to edit any app settings"
                    : "will be able to see the active apps and will be able to edit any app settings"}
                </Trans>
              }
            />
          )}
          {!isPending && !installedApps?.length ? (
            <EmptyScreen
              Icon="grid-3x3"
              headline={t("empty_installed_apps_headline")}
              description={t("empty_installed_apps_description")}
              buttonRaw={
                appsDisableProps.disabled ? (
                  <Button StartIcon="lock" color="secondary" disabled>
                    {t("locked_by_team_admin")}
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
                  setAppData={getAppDataSetter(
                    app.slug as EventTypeAppsList,
                    app.categories,
                    app.userCredentialIds[0]
                  )}
                  key={app.slug}
                  app={app}
                  eventType={eventType}
                  eventTypeFormMetadata={eventTypeFormMetadata}
                />
              );
          })}
        </div>
      </div>
      {!appsDisableProps.disabled && (
        <div className="bg-muted mt-6 rounded-md p-8">
          {!isPending && notInstalledApps?.length ? (
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
                setAppData={getAppDataSetter(app.slug as EventTypeAppsList, app.categories)}
                key={app.slug}
                app={app}
                eventType={eventType}
                eventTypeFormMetadata={eventTypeFormMetadata}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};
