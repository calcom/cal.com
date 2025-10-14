import { useCallback, useState } from "react";

import { InstallAppButton } from "@calcom/app-store/InstallAppButton";
import { AppSettings } from "@calcom/app-store/_components/AppSettings";
import { getLocationFromApp, type EventLocationType } from "@calcom/app-store/locations";
import type { AppCardApp } from "@calcom/app-store/types";
import AppListCard from "@calcom/features/apps/components/AppListCard";
import type { UpdateUsersDefaultConferencingAppParams } from "@calcom/features/apps/components/AppSetDefaultLinkDialog";
import { AppSetDefaultLinkDialog } from "@calcom/features/apps/components/AppSetDefaultLinkDialog";
import type {
  BulkUpdatParams,
  EventTypes,
} from "@calcom/features/eventtypes/components/BulkEditDefaultForEventsModal";
import { BulkEditDefaultForEventsModal } from "@calcom/features/eventtypes/components/BulkEditDefaultForEventsModal";
import { isDelegationCredential } from "@calcom/lib/delegationCredential";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppCategories } from "@calcom/prisma/enums";
import { type RouterOutputs } from "@calcom/trpc";
import type { App } from "@calcom/types/App";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { List } from "@calcom/ui/components/list";
import { showToast } from "@calcom/ui/components/toast";

export type HandleDisconnect = (credentialId: number, app: App["slug"], teamId?: number) => void;

interface AppListProps {
  variant?: AppCategories;
  data: RouterOutputs["viewer"]["apps"]["integrations"];
  handleDisconnect: HandleDisconnect;
  listClassName?: string;
  defaultConferencingApp: RouterOutputs["viewer"]["apps"]["getUsersDefaultConferencingApp"];
  handleUpdateUserDefaultConferencingApp: (params: UpdateUsersDefaultConferencingAppParams) => void;
  handleBulkUpdateDefaultLocation: (params: BulkUpdatParams) => void;
  isBulkUpdateDefaultLocationPending: boolean;
  eventTypes?: EventTypes;
  isEventTypesFetching?: boolean;
  handleConnectDisconnectIntegrationMenuToggle: () => void;
  handleBulkEditDialogToggle: () => void;
}

export const AppList = ({
  data,
  handleDisconnect,
  variant,
  listClassName,
  defaultConferencingApp,
  handleUpdateUserDefaultConferencingApp,
  handleBulkUpdateDefaultLocation,
  isBulkUpdateDefaultLocationPending,
  eventTypes,
  isEventTypesFetching,
  handleConnectDisconnectIntegrationMenuToggle,
  handleBulkEditDialogToggle,
}: AppListProps) => {
  const [bulkUpdateModal, setBulkUpdateModal] = useState(false);
  const [locationType, setLocationType] = useState<(EventLocationType & { slug: string }) | undefined>(
    undefined
  );
  const onSuccessCallback = useCallback(() => {
    setBulkUpdateModal(true);
    showToast("Default app updated successfully", "success");
  }, []);

  const ChildAppCard = ({ item }: { item: AppCardApp }) => {
    const appSlug = item?.slug;
    const appIsDefault =
      appSlug === defaultConferencingApp?.appSlug ||
      (appSlug === "daily-video" && !defaultConferencingApp?.appSlug);
    return (
      <AppListCard
        key={item.name}
        description={item.description}
        title={item.name}
        logo={item.logo}
        isDefault={appIsDefault}
        shouldHighlight
        slug={item.slug}
        invalidCredential={item?.invalidCredentialIds ? item.invalidCredentialIds.length > 0 : false}
        credentialOwner={item?.credentialOwner}
        actions={
          !item.credentialOwner?.readOnly ? (
            <div className="flex justify-end">
              <Dropdown modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button StartIcon="ellipsis" variant="icon" color="secondary" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {!appIsDefault && variant === "conferencing" && (
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        color="secondary"
                        StartIcon="video"
                        onClick={() => {
                          const locationType = getLocationFromApp(item?.locationOption?.value ?? "");
                          if (locationType?.linkType === "static") {
                            setLocationType({ ...locationType, slug: appSlug });
                          } else {
                            handleUpdateUserDefaultConferencingApp({
                              appSlug,
                              onSuccessCallback: () => setBulkUpdateModal(true),
                              onErrorCallback: () => {
                                return;
                              },
                            });
                          }
                        }}>
                        {t("set_as_default")}
                      </DropdownItem>
                    </DropdownMenuItem>
                  )}
                  <ConnectOrDisconnectIntegrationMenuItem
                    credentialId={item.credentialOwner?.credentialId || item.userCredentialIds[0]}
                    type={item.type}
                    app={item.slug}
                    isGlobal={item.isGlobal}
                    installed
                    invalidCredentialIds={item.invalidCredentialIds}
                    handleDisconnect={handleDisconnect}
                    teamId={item.credentialOwner ? item.credentialOwner?.teamId : undefined}
                    handleConnectDisconnectIntegrationMenuToggle={
                      handleConnectDisconnectIntegrationMenuToggle
                    }
                  />
                </DropdownMenuContent>
              </Dropdown>
            </div>
          ) : null
        }>
        <AppSettings slug={item.slug} />
      </AppListCard>
    );
  };

  const appsWithTeamCredentials = data.items.filter((app) => app.teams.length);
  const cardsForAppsWithTeams = appsWithTeamCredentials.map((app) => {
    const appCards = [];

    if (app.userCredentialIds.length) {
      appCards.push(<ChildAppCard item={app} />);
    }
    for (const team of app.teams) {
      if (team) {
        appCards.push(
          <ChildAppCard
            item={{
              ...app,
              credentialOwner: {
                name: team.name,
                avatar: team.logoUrl,
                teamId: team.teamId,
                credentialId: team.credentialId,
                readOnly: !team.isAdmin,
              },
            }}
          />
        );
      }
    }
    return appCards;
  });

  const { t } = useLocale();
  return (
    <>
      <List className={listClassName}>
        {cardsForAppsWithTeams.map((apps) => apps.map((cards) => cards))}
        {data.items
          .filter((item) => item.invalidCredentialIds)
          .map((item, i) => {
            if (!item.teams.length) return <ChildAppCard key={i} item={item} />;
          })}
      </List>
      {locationType && (
        <AppSetDefaultLinkDialog
          locationType={locationType}
          setLocationType={() => setLocationType(undefined)}
          onSuccess={onSuccessCallback}
          handleUpdateUserDefaultConferencingApp={handleUpdateUserDefaultConferencingApp}
        />
      )}

      {bulkUpdateModal && (
        <BulkEditDefaultForEventsModal
          bulkUpdateFunction={handleBulkUpdateDefaultLocation}
          open={bulkUpdateModal}
          setOpen={setBulkUpdateModal}
          isPending={isBulkUpdateDefaultLocationPending}
          description={t("default_conferencing_bulk_description")}
          eventTypes={eventTypes}
          isEventTypesFetching={isEventTypesFetching}
          handleBulkEditDialogToggle={handleBulkEditDialogToggle}
        />
      )}
    </>
  );
};

function ConnectOrDisconnectIntegrationMenuItem(props: {
  credentialId: number;
  type: App["type"];
  isGlobal?: boolean;
  installed?: boolean;
  invalidCredentialIds?: number[];
  teamId?: number;
  app: App["slug"];
  handleDisconnect: HandleDisconnect;
  handleConnectDisconnectIntegrationMenuToggle: () => void;
}) {
  const { type, credentialId, isGlobal, installed, handleDisconnect, teamId, app } = props;
  const { t } = useLocale();

  if (credentialId || type === "stripe_payment" || isGlobal) {
    return (
      <DropdownMenuItem>
        <DropdownItem
          color="destructive"
          onClick={() => handleDisconnect(credentialId, app, teamId)}
          disabled={isGlobal || isDelegationCredential({ credentialId })}
          StartIcon="trash">
          {t("remove_app")}
        </DropdownItem>
      </DropdownMenuItem>
    );
  }

  if (!installed) {
    return (
      <div className="flex items-center truncate">
        <Alert severity="warning" title={t("not_installed")} />
      </div>
    );
  }

  return (
    <InstallAppButton
      type={type}
      render={(buttonProps) => (
        <Button color="secondary" {...buttonProps} data-testid="integration-connection-button">
          {t("install")}
        </Button>
      )}
      onChanged={props.handleConnectDisconnectIntegrationMenuToggle}
    />
  );
}
