import Link from "next/link";
import { useFormContext } from "react-hook-form";

import { EventTypeAppCard } from "@calcom/app-store/_components/EventTypeAppCardInterface";
import type { EventTypeAppCardComponentProps } from "@calcom/app-store/types";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type { FormValues, EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import useAppsData from "@calcom/lib/hooks/useAppsData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Section } from "@calcom/ui/components/section";

export type EventType = Pick<EventTypeSetupProps, "eventType">["eventType"] &
  EventTypeAppCardComponentProps["eventType"];

export const EventAppsTab = ({ eventType }: { eventType: EventType }) => {
  const { t } = useLocale();
  const { data: eventTypeApps, isPending } = trpc.viewer.apps.integrations.useQuery({
    extendsFeature: "EventType",
    teamId: eventType.team?.id || eventType.parent?.teamId,
  });

  const formMethods = useFormContext<FormValues>();
  const installedApps =
    eventTypeApps?.items.filter((app) => app.userCredentialIds.length || app.teams.length) || [];
  const notInstalledApps =
    eventTypeApps?.items.filter((app) => !app.userCredentialIds.length && !app.teams.length) || [];

  const { getAppDataGetter, getAppDataSetter, eventTypeFormMetadata } = useAppsData();

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
        <div className="flex flex-col gap-4 before:border-0">
          {(isManagedEventType || isChildrenManagedEventType) && (
            <Alert
              severity={appsDisableProps.isLocked ? "neutral" : "info"}
              className="mb-2"
              title={
                <ServerTrans
                  t={t}
                  i18nKey={`${lockedText}_${isManagedEventType ? "for_members" : "by_team_admins"}`}
                />
              }
              actions={<div className="flex h-full items-center">{appsDisableProps.LockedIcon}</div>}
              message={
                <ServerTrans
                  t={t}
                  i18nKey={`apps_${lockedText}_${
                    isManagedEventType ? "for_members" : "by_team_admins"
                  }_description`}
                />
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
      {/* TODO: Add back after salesforce v3 dev */}
      {!appsDisableProps.disabled && (
        <div className="bg-muted mt-4 rounded-2xl p-4">
          {!isPending && notInstalledApps?.length ? (
            <div className="mb-4 flex flex-col">
              <Section.Title>{t("available_apps_lower_case")}</Section.Title>
              <Section.Description>
                <ServerTrans
                  t={t}
                  i18nKey="available_apps_desc"
                  components={[
                    <Link key="available_apps_desc" className="cursor-pointer underline" href="/apps">
                      App Store
                    </Link>,
                  ]}
                />
              </Section.Description>
            </div>
          ) : null}
          <div className="bg-default border-muted flex flex-col gap-4 rounded-xl border p-3">
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
