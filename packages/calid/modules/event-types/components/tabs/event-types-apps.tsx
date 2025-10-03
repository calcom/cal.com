import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import Link from "next/link";
import React, { useMemo } from "react";
import type z from "zod";

import type { GetAppData, SetAppData } from "@calcom/app-store/EventTypeAppContext";
import EventTypeAppContext from "@calcom/app-store/EventTypeAppContext";
import { EventTypeAddonMap } from "@calcom/app-store/apps.browser.generated";
import type { EventTypeAppCardComponentProps, CredentialOwner } from "@calcom/app-store/types";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import useAppsData from "@calcom/lib/hooks/useAppsData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { ErrorBoundary } from "@calcom/ui/components/errorBoundary";

export type EventTypeApp = RouterOutputs["viewer"]["apps"]["calid_integrations"]["items"][number] & {
  credentialOwner?: CredentialOwner;
};

export type EventTypeForAppCard = EventTypeAppCardComponentProps["eventType"];

export type EventType = Pick<EventTypeSetupProps, "eventType">["eventType"] &
  EventTypeAppCardComponentProps["eventType"];

export type EventAppsTabCustomClassNames = {
  container?: string;
  alertContainer?: string;
  emptyScreen?: string;
  installedAppsContainer?: string;
  availableAppsContainer?: string;
  appCard?: string;
};

export interface EventAppsTabProps {
  eventType: EventType;
  customClassNames?: EventAppsTabCustomClassNames;
}

const EmptyScreen = ({
  headline,
  description,
  buttonRaw,
  className = "",
}: {
  headline: string;
  description: string;
  buttonRaw?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={classNames("flex flex-col items-center justify-center py-12 text-center", className)}>
      <Icon name="blocks" className="mb-4 h-12 w-12 text-gray-400" />
      <h3 className="mb-2 text-lg font-medium text-gray-900">{headline}</h3>
      <p className="mb-6 max-w-md text-sm text-gray-600">{description}</p>
      {buttonRaw}
    </div>
  );
};

const Section = {
  Title: ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <h3 className={classNames("text-default text-sm font-medium", className)}>{children}</h3>
  ),
  Description: ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={classNames("text-subtle text-sm", className)}>{children}</div>
  ),
};

const DynamicComponent = ({
  slug,
  componentMap,
  ...props
}: {
  slug: string;
  componentMap: Record<string, any>;
  [key: string]: any;
}) => {
  // Handle special case where stripe app uses different component name
  const componentKey = slug === "stripe" ? "stripepayment" : slug;
  const Component = componentMap[componentKey];

  if (!Component) {
    return (
      <div className="rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-500">App component not found for {slug}</p>
      </div>
    );
  }

  return <Component {...props} />;
};

const EventTypeAppCard = ({
  app,
  eventType,
  getAppData,
  setAppData,
  LockedIcon,
  eventTypeFormMetadata,
  disabled = false,
}: {
  app: EventTypeApp;
  eventType: EventTypeForAppCard;
  getAppData: GetAppData;
  setAppData: SetAppData;
  LockedIcon?: JSX.Element | false;
  eventTypeFormMetadata: z.infer<typeof EventTypeMetaDataSchema>;
  disabled?: boolean;
}) => {
  return (
    <ErrorBoundary message={`There is some problem with ${app.name} App`}>
      <EventTypeAppContext.Provider value={{ getAppData, setAppData, LockedIcon, disabled }}>
        <DynamicComponent
          slug={app.slug}
          componentMap={EventTypeAddonMap}
          app={app}
          eventType={eventType}
          getAppData={getAppData}
          setAppData={setAppData}
          LockedIcon={LockedIcon}
          eventTypeFormMetadata={eventTypeFormMetadata}
          disabled={disabled}
        />
      </EventTypeAppContext.Provider>
    </ErrorBoundary>
  );
};

const useAppCategorization = (eventTypeApps: any) => {
  const installedApps = useMemo(() => {
    return (
      eventTypeApps?.items.filter(
        (app: any) => (app.userCredentialIds?.length || 0) > 0 || (app.calIdTeams?.length || 0) > 0
      ) || []
    );
  }, [eventTypeApps]);

  const notInstalledApps = useMemo(() => {
    return (
      eventTypeApps?.items.filter(
        (app: any) => (app.userCredentialIds?.length || 0) === 0 && (app.calIdTeams?.length || 0) === 0
      ) || []
    );
  }, [eventTypeApps]);

  const appsWithTeamCredentials = useMemo(() => {
    return eventTypeApps?.items.filter((app: any) => (app.calIdTeams?.length || 0) > 0) || [];
  }, [eventTypeApps]);

  return {
    installedApps,
    notInstalledApps,
    appsWithTeamCredentials,
  };
};

const useTeamAppCards = (
  appsWithTeamCredentials: any[],
  getAppDataGetter: any,
  getAppDataSetter: any,
  eventType: EventType,
  eventTypeFormMetadata: any
) => {
  return useMemo(() => {
    return appsWithTeamCredentials.map((app) => {
      const appCards: JSX.Element[] = [];
      if ((app.userCredentialIds?.length || 0) > 0) {
        appCards.push(
          <EventTypeAppCard
            key={`${app.slug}-user`}
            getAppData={getAppDataGetter(app.slug as EventTypeAppsList)}
            setAppData={getAppDataSetter(
              app.slug as EventTypeAppsList,
              app.categories,
              app.userCredentialIds?.[0]
            )}
            app={app}
            eventType={eventType}
            eventTypeFormMetadata={eventTypeFormMetadata}
          />
        );
      }

      app.calIdTeams?.forEach((team: any) => {
        if (team) {
          appCards.push(
            <EventTypeAppCard
              key={`${app.slug}-team-${team.credentialId}`}
              getAppData={getAppDataGetter(app.slug as EventTypeAppsList)}
              setAppData={getAppDataSetter(app.slug as EventTypeAppsList, app.categories, team.credentialId)}
              app={{
                ...app,
                credentialOwner: {
                  name: team.name,
                  avatar: team.logoUrl,
                  teamId: team.calIdTeamId,
                  credentialId: team.credentialId,
                },
              }}
              eventType={eventType}
              eventTypeFormMetadata={eventTypeFormMetadata}
            />
          );
        }
      });

      return appCards;
    });
  }, [appsWithTeamCredentials, getAppDataGetter, getAppDataSetter, eventType, eventTypeFormMetadata]);
};

/**
 * Main EventApps component
 * Manages the complete app integration interface for event types
 * Handles both installed apps and available apps from the app store
 * Includes permission management for managed event types
 */
export const EventApps = ({ eventType, customClassNames = {} }: EventAppsTabProps) => {
  const { t } = useLocale();

  // Fetch app integrations data for the current team/user
  const { data: eventTypeApps, isPending } = trpc.viewer.apps.calid_integrations.useQuery({
    extendsFeature: "EventType",
    calIdTeamId: (eventType as any).calIdTeamId || undefined,
  });

  // Categorize apps based on installation status
  const { installedApps, notInstalledApps, appsWithTeamCredentials } = useAppCategorization(eventTypeApps);

  // Initialize app data management hooks
  const { getAppDataGetter, getAppDataSetter, eventTypeFormMetadata } = useAppsData();

  // Generate app cards for team credentials
  const teamAppCards = useTeamAppCards(
    appsWithTeamCredentials,
    getAppDataGetter,
    getAppDataSetter,
    eventType,
    eventTypeFormMetadata
  );

  // Render user-only apps (apps without team credentials)
  const userOnlyApps = useMemo(() => {
    return installedApps.filter((app: any) => (app.calIdTeams?.length || 0) === 0);
  }, [installedApps]);

  return (
    <div className={classNames("block items-start", customClassNames.container)}>
      <div className="flex flex-col gap-4 before:border-0">
        {/* Empty State - No Installed Apps */}
        {!isPending && !installedApps.length && (
          <EmptyScreen
            headline={t("empty_installed_apps_headline")}
            description={t("empty_installed_apps_description")}
            className={customClassNames.emptyScreen}
            buttonRaw={
              <Button target="_blank" color="primary" href="/apps">
                {t("empty_installed_apps_button")}
              </Button>
            }
          />
        )}

        {/* Installed Apps Section */}
        <div className={classNames("space-y-4", customClassNames.installedAppsContainer)}>
          {/* Team Apps - Apps with team credentials */}
          {teamAppCards.flat().map((card, index) => (
            <div key={`team-app-${index}`} className={customClassNames.appCard}>
              {card}
            </div>
          ))}

          {/* User-Only Apps - Apps without team credentials */}
          {userOnlyApps.map((app: any) => (
            <div key={`user-app-${app.slug}`} className={customClassNames.appCard}>
              <EventTypeAppCard
                getAppData={getAppDataGetter(app.slug as EventTypeAppsList)}
                setAppData={getAppDataSetter(
                  app.slug as EventTypeAppsList,
                  app.categories,
                  app.userCredentialIds?.[0]
                )}
                app={app}
                eventType={eventType}
                eventTypeFormMetadata={eventTypeFormMetadata}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Available Apps Section - Apps from store not yet installed */}
      <div className={classNames("mt-4 rounded-2xl", customClassNames.availableAppsContainer)}>
        {!isPending && notInstalledApps.length > 0 && (
          <>
            <div className="mb-4 flex flex-col">
              <Section.Title>{t("available_apps_lower_case")}</Section.Title>
              <Section.Description>
                <ServerTrans
                  t={t}
                  i18nKey="available_apps_desc"
                  components={[
                    <Link key="app-store-link" className="cursor-pointer underline" href="/apps">
                      App Store
                    </Link>,
                  ]}
                />
              </Section.Description>
            </div>

            <div className="flex flex-col gap-4">
              {notInstalledApps.map((app: any) => (
                <div key={`available-app-${app.slug}`} className={customClassNames.appCard}>
                  <EventTypeAppCard
                    getAppData={getAppDataGetter(app.slug as EventTypeAppsList)}
                    setAppData={getAppDataSetter(app.slug as EventTypeAppsList, app.categories)}
                    app={app}
                    eventType={eventType}
                    eventTypeFormMetadata={eventTypeFormMetadata}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EventApps;
