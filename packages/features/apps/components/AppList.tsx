import { useCallback, useState } from "react";

import { AppSettings } from "@calcom/app-store/_components/AppSettings";
import { InstallAppButton } from "@calcom/app-store/components";
import { getLocationFromApp, type EventLocationType } from "@calcom/app-store/locations";
import type { CredentialOwner } from "@calcom/app-store/types";
import AppListCard from "@calcom/features/apps/components/AppListCard";
import { AppSetDefaultLinkDialog } from "@calcom/features/apps/components/AppSetDefaultLinkDialog";
import type { BulkUpdatParams } from "@calcom/features/eventtypes/components/BulkEditDefaultForEventsModal";
import { BulkEditDefaultForEventsModal } from "@calcom/features/eventtypes/components/BulkEditDefaultForEventsModal";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppCategories } from "@calcom/prisma/enums";
import { trpc, type RouterOutputs } from "@calcom/trpc";
import type { App } from "@calcom/types/App";
import {
  Alert,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  List,
  showToast,
} from "@calcom/ui";

export type UpdateDefaultConferencingAppParams = { appSlug: string; callback: () => void };

interface AppListProps {
  variant?: AppCategories;
  data: RouterOutputs["viewer"]["integrations"];
  handleDisconnect: (credentialId: number) => void;
  listClassName?: string;
  defaultConferencingApp: RouterOutputs["viewer"]["getUsersDefaultConferencingApp"];
  handleUpdateDefaultConferencingApp: (params: UpdateDefaultConferencingAppParams) => void;
  handleBulkUpdateDefaultLocation: (params: BulkUpdatParams) => void;
  isBulkUpdateDefaultLocationPending: boolean;
}

export const AppList = ({
  data,
  handleDisconnect,
  variant,
  listClassName,
  defaultConferencingApp,
  handleUpdateDefaultConferencingApp,
  handleBulkUpdateDefaultLocation,
  isBulkUpdateDefaultLocationPending,
}: AppListProps) => {
  const [bulkUpdateModal, setBulkUpdateModal] = useState(false);
  const [locationType, setLocationType] = useState<(EventLocationType & { slug: string }) | undefined>(
    undefined
  );

  const onSuccessCallback = useCallback(() => {
    setBulkUpdateModal(true);
    showToast("Default app updated successfully", "success");
  }, []);

  const ChildAppCard = ({
    item,
  }: {
    item: RouterOutputs["viewer"]["integrations"]["items"][number] & {
      credentialOwner?: CredentialOwner;
    };
  }) => {
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
                  {!appIsDefault && variant === "conferencing" && !item.credentialOwner?.teamId && (
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
                            handleUpdateDefaultConferencingApp({
                              appSlug,
                              callback: () => setBulkUpdateModal(true),
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
                    isGlobal={item.isGlobal}
                    installed
                    invalidCredentialIds={item.invalidCredentialIds}
                    handleDisconnect={handleDisconnect}
                    teamId={item.credentialOwner ? item.credentialOwner?.teamId : undefined}
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
        />
      )}

      {bulkUpdateModal && (
        <BulkEditDefaultForEventsModal
          bulkUpdateFunction={handleBulkUpdateDefaultLocation}
          open={bulkUpdateModal}
          setOpen={setBulkUpdateModal}
          isPending={isBulkUpdateDefaultLocationPending}
          description={t("default_conferencing_bulk_description")}
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
  handleDisconnect: (credentialId: number, teamId?: number) => void;
}) {
  const { type, credentialId, isGlobal, installed, handleDisconnect, teamId } = props;
  const { t } = useLocale();

  const utils = trpc.useUtils();
  const handleOpenChange = () => {
    utils.viewer.integrations.invalidate();
  };

  if (credentialId || type === "stripe_payment" || isGlobal) {
    return (
      <DropdownMenuItem>
        <DropdownItem
          color="destructive"
          onClick={() => handleDisconnect(credentialId, teamId)}
          disabled={isGlobal}
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
      onChanged={handleOpenChange}
    />
  );
}
