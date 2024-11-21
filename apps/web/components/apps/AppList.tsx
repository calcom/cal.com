import { useCallback, useState } from "react";

import { AppSettings } from "@calcom/app-store/_components/AppSettings";
import useAddAppMutation from "@calcom/app-store/_utils/useAddAppMutation";
import { InstallAppButton } from "@calcom/app-store/components";
import { getLocationFromApp, type EventLocationType } from "@calcom/app-store/locations";
import type { CredentialOwner } from "@calcom/app-store/types";
import { AppSetDefaultLinkDialog } from "@calcom/features/apps/components/AppSetDefaultLinkDialog";
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
  Icon,
} from "@calcom/ui";

import AppListCard from "@components/AppListCard";

interface AppListProps {
  variant?: AppCategories;
  data: RouterOutputs["viewer"]["integrations"];
  handleDisconnect: (credentialId: number) => void;
  listClassName?: string;
  upgrade?: boolean;
}

export const AppList = ({ data, handleDisconnect, variant, listClassName, upgrade }: AppListProps) => {
  const { data: defaultConferencingApp } = trpc.viewer.getUsersDefaultConferencingApp.useQuery();
  const utils = trpc.useUtils();
  const [bulkUpdateModal, setBulkUpdateModal] = useState(false);
  const [locationType, setLocationType] = useState<(EventLocationType & { slug: string }) | undefined>(
    undefined
  );

  const isUpgrade = upgrade == "true";
  const mutation = useAddAppMutation(null, {
    onSuccess: (data) => {
      if (data?.setupPending) return;
      showToast(t("app_successfully_installed"), "success");
    },
    onError: (error) => {
      if (error instanceof Error) showToast(error.message || t("app_could_not_be_installed"), "error");
    },
  });

  const handleUpgrade = async (
    type: string,
    slug: string,
    variant: string,
    credentialId: string,
    teamId?: number
  ) => {
    mutation.mutate({
      type: type,
      variant: variant,
      slug: slug,
      upgrade: true,
      credentialId: credentialId,
      ...(teamId && { teamId }),
      // for oAuth apps
      ...{
        returnTo: `/apps/installed/${variant}${isUpgrade ? "upgrade=true" : ""}`,
      },
    });
  };

  const onSuccessCallback = useCallback(() => {
    setBulkUpdateModal(true);
    showToast("Default app updated successfully", "success");
  }, []);

  const updateDefaultAppMutation = trpc.viewer.updateUserDefaultConferencingApp.useMutation({
    onSuccess: () => {
      showToast("Default app updated successfully", "success");
      utils.viewer.getUsersDefaultConferencingApp.invalidate();
      setBulkUpdateModal(true);
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, "error");
    },
  });

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
        isUpgradable={item?.isUpgradable}
        actions={
          !item.credentialOwner?.readOnly ? (
            <div className="flex justify-end gap-2">
              {item?.isUpgradable && (
                <div
                  onClick={() => {
                    handleUpgrade(
                      item.type,
                      item.slug,
                      item.variant,
                      item.credentialOwner?.credentialId || item.userCredentialIds[0],
                      item.credentialOwner?.teamId
                    );
                  }}>
                  <Icon name="refresh-ccw" className="text-muted inline-block h-5 w-5 cursor-pointer" />
                </div>
              )}
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
                            updateDefaultAppMutation.mutate({
                              appSlug,
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

    if (app.userCredentialIds.length && (!isUpgrade || (isUpgrade && team.isUpgradable))) {
      appCards.push(<ChildAppCard item={app} />);
    }
    for (const team of app.teams) {
      if (team && (!isUpgrade || (isUpgrade && team.isUpgradable))) {
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
              isUpgradable: team.isUpgradable,
            }}
          />
        );
      }
    }
    return appCards;
  });

  const { t } = useLocale();
  const updateLocationsMutation = trpc.viewer.eventTypes.bulkUpdateToDefaultLocation.useMutation({
    onSuccess: () => {
      utils.viewer.getUsersDefaultConferencingApp.invalidate();
      setBulkUpdateModal(false);
    },
  });
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
          bulkUpdateFunction={updateLocationsMutation.mutate}
          open={bulkUpdateModal}
          setOpen={setBulkUpdateModal}
          isPending={updateLocationsMutation.isPending}
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
